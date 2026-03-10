use serde::{Deserialize, Serialize};
use tracing::{debug, error, info};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RagDocument {
    pub id: String,
    pub content: String,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RagSearchResult {
    pub id: String,
    pub document: String,
    pub distance: f32,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone)]
pub struct ChromaDBClient {
    base_url: String,
    collection_name: String,
}

impl ChromaDBClient {
    pub fn new(base_url: String, collection_name: String) -> Self {
        Self {
            base_url,
            collection_name,
        }
    }

    /// Ensure the collection exists, create if not
    pub async fn ensure_collection(&self) -> Result<(), String> {
        let client = reqwest::Client::new();
        let url = format!("{}/api/v1/collections", self.base_url);

        // Try to create collection (will fail if exists, which is OK)
        let create_payload = serde_json::json!({
            "name": self.collection_name,
            "metadata": {
                "description": "Nova Agent codebase semantic search"
            }
        });

        match client.post(&url).json(&create_payload).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    info!("Created ChromaDB collection: {}", self.collection_name);
                } else {
                    debug!(
                        "Collection may already exist (status: {})",
                        response.status()
                    );
                }
                Ok(())
            }
            Err(e) => Err(format!("Failed to ensure collection: {}", e)),
        }
    }

    /// Add documents to the collection
    pub async fn add_documents(&self, documents: Vec<RagDocument>) -> Result<(), String> {
        if documents.is_empty() {
            return Ok(());
        }

        let client = reqwest::Client::new();
        let url = format!(
            "{}/api/v1/collections/{}/add",
            self.base_url, self.collection_name
        );

        let ids: Vec<String> = documents.iter().map(|d| d.id.clone()).collect();
        let docs: Vec<String> = documents.iter().map(|d| d.content.clone()).collect();
        let metadatas: Vec<serde_json::Value> =
            documents.iter().map(|d| d.metadata.clone()).collect();

        let payload = serde_json::json!({
            "ids": ids,
            "documents": docs,
            "metadatas": metadatas
        });

        match client.post(&url).json(&payload).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    debug!("Added {} documents to ChromaDB", documents.len());
                    Ok(())
                } else {
                    let status = response.status();
                    let error_text = response.text().await.unwrap_or_default();
                    Err(format!(
                        "Failed to add documents (status {}): {}",
                        status, error_text
                    ))
                }
            }
            Err(e) => Err(format!("Request failed: {}", e)),
        }
    }

    /// Query for similar documents
    pub async fn query(
        &self,
        query_texts: Vec<String>,
        n_results: usize,
    ) -> Result<Vec<RagSearchResult>, String> {
        let client = reqwest::Client::new();
        let url = format!(
            "{}/api/v1/collections/{}/query",
            self.base_url, self.collection_name
        );

        let payload = serde_json::json!({
            "query_texts": query_texts,
            "n_results": n_results
        });

        match client.post(&url).json(&payload).send().await {
            Ok(response) => {
                if !response.status().is_success() {
                    let status = response.status();
                    let error_text = response.text().await.unwrap_or_default();
                    return Err(format!(
                        "Query failed (status {}): {}",
                        status, error_text
                    ));
                }

                let data: serde_json::Value = response
                    .json()
                    .await
                    .map_err(|e| format!("Failed to parse response: {}", e))?;

                // ChromaDB returns: { ids: [[...]], documents: [[...]], distances: [[...]], metadatas: [[...]] }
                let mut results = Vec::new();

                if let Some(ids_outer) = data["ids"].as_array() {
                    if let Some(ids) = ids_outer.get(0).and_then(|v| v.as_array()) {
                        if let Some(docs_outer) = data["documents"].as_array() {
                            if let Some(docs) = docs_outer.get(0).and_then(|v| v.as_array()) {
                                let distances = data["distances"]
                                    .get(0)
                                    .and_then(|v| v.as_array())
                                    .cloned()
                                    .unwrap_or_default();
                                let metadatas = data["metadatas"]
                                    .get(0)
                                    .and_then(|v| v.as_array())
                                    .cloned()
                                    .unwrap_or_default();

                                for i in 0..ids.len() {
                                    if let Some(id_str) = ids[i].as_str() {
                                        if let Some(doc_str) = docs.get(i).and_then(|v| v.as_str()) {
                                            let distance = distances
                                                .get(i)
                                                .and_then(|v| v.as_f64())
                                                .unwrap_or(0.0)
                                                as f32;
                                            let metadata = metadatas
                                                .get(i)
                                                .cloned()
                                                .unwrap_or(serde_json::json!({}));

                                            results.push(RagSearchResult {
                                                id: id_str.to_string(),
                                                document: doc_str.to_string(),
                                                distance,
                                                metadata,
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                Ok(results)
            }
            Err(e) => Err(format!("Query request failed: {}", e)),
        }
    }

    /// Delete documents by IDs
    #[allow(dead_code)]
    pub async fn delete(&self, ids: Vec<String>) -> Result<(), String> {
        let client = reqwest::Client::new();
        let url = format!(
            "{}/api/v1/collections/{}/delete",
            self.base_url, self.collection_name
        );

        let payload = serde_json::json!({
            "ids": ids
        });

        match client.post(&url).json(&payload).send().await {
            Ok(response) => {
                if response.status().is_success() {
                    debug!("Deleted {} documents from ChromaDB", ids.len());
                    Ok(())
                } else {
                    Err(format!("Failed to delete: status {}", response.status()))
                }
            }
            Err(e) => Err(format!("Delete request failed: {}", e)),
        }
    }
}

/// Helper function to chunk text
fn chunk_text(text: &str, chunk_size: usize) -> Vec<String> {
    let mut chunks = Vec::new();
    let lines: Vec<&str> = text.lines().collect();
    let mut current_chunk = String::new();

    for line in lines {
        if current_chunk.len() + line.len() > chunk_size && !current_chunk.is_empty() {
            chunks.push(current_chunk.clone());
            current_chunk.clear();
        }
        current_chunk.push_str(line);
        current_chunk.push('\n');
    }

    if !current_chunk.is_empty() {
        chunks.push(current_chunk);
    }

    if chunks.is_empty() {
        chunks.push(text.to_string());
    }

    chunks
}

// ======================
// TAURI COMMANDS
// ======================

#[tauri::command]
pub async fn rag_index_file(
    file_path: String,
    content: String,
    metadata: serde_json::Value,
) -> Result<(), String> {
    info!("Indexing file: {}", file_path);

    let config = crate::modules::state::Config::from_env();
    let client = ChromaDBClient::new(
        config.chroma_url,
        "nova_codebase".to_string(),
    );

    // Ensure collection exists
    client.ensure_collection().await?;

    // Chunk the content
    let chunks = chunk_text(&content, 500);
    debug!("Split {} into {} chunks", file_path, chunks.len());

    // Create documents
    let documents: Vec<RagDocument> = chunks
        .iter()
        .enumerate()
        .map(|(i, chunk)| {
            let mut doc_metadata = metadata.clone();
            doc_metadata["file_path"] = serde_json::Value::String(file_path.clone());
            doc_metadata["chunk_index"] = serde_json::Value::Number(i.into());

            RagDocument {
                id: format!("{}::{}", file_path, i),
                content: chunk.clone(),
                metadata: doc_metadata,
            }
        })
        .collect();

    // Add to ChromaDB
    client.add_documents(documents).await?;
    info!("Successfully indexed {}", file_path);
    Ok(())
}

#[tauri::command]
pub async fn rag_search(query: String, top_k: usize) -> Result<Vec<RagSearchResult>, String> {
    debug!("RAG search: '{}' (top_k: {})", query, top_k);

    let config = crate::modules::state::Config::from_env();
    let client = ChromaDBClient::new(
        config.chroma_url,
        "nova_codebase".to_string(),
    );

    let results = client.query(vec![query], top_k).await?;
    info!("Found {} RAG results", results.len());
    Ok(results)
}

#[tauri::command]
pub async fn rag_index_directory(
    dir_path: String,
    file_extensions: Vec<String>,
) -> Result<usize, String> {
    info!("Indexing directory: {} (extensions: {:?})", dir_path, file_extensions);

    let config = crate::modules::state::Config::from_env();
    let client = ChromaDBClient::new(
        config.chroma_url,
        "nova_codebase".to_string(),
    );

    client.ensure_collection().await?;

    let mut indexed_count = 0;

    // Walk directory
    #[allow(dead_code)]
    fn walk_dir(
        path: &std::path::Path,
        extensions: &[String],
        count: &mut usize,
    ) -> Result<Vec<std::path::PathBuf>, String> {
        let mut files = Vec::new();

        if !path.exists() {
            return Err(format!("Path does not exist: {:?}", path));
        }

        if path.is_file() {
            if let Some(ext) = path.extension() {
                if extensions.contains(&ext.to_string_lossy().to_string()) {
                    files.push(path.to_path_buf());
                    *count += 1;
                }
            }
            return Ok(files);
        }

        let entries = std::fs::read_dir(path)
            .map_err(|e| format!("Failed to read directory {:?}: {}", path, e))?;

        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let entry_path = entry.path();

            if entry_path.is_dir() {
                // Skip node_modules, .git, target, etc.
                if let Some(dir_name) = entry_path.file_name() {
                    let dir_str = dir_name.to_string_lossy();
                    if dir_str == "node_modules"
                        || dir_str == ".git"
                        || dir_str == "target"
                        || dir_str == "dist"
                        || dir_str == ".nx"
                    {
                        continue;
                    }
                }
                files.extend(walk_dir(&entry_path, extensions, count)?);
            } else if let Some(ext) = entry_path.extension() {
                if extensions.contains(&ext.to_string_lossy().to_string()) {
                    files.push(entry_path);
                    *count += 1;
                }
            }
        }

        Ok(files)
    }

    let files = walk_dir(std::path::Path::new(&dir_path), &file_extensions, &mut indexed_count)?;

    // Index files in batches
    for file_path in files {
        if let Ok(content) = std::fs::read_to_string(&file_path) {
            let metadata = serde_json::json!({
                "language": file_path.extension().and_then(|s| s.to_str()).unwrap_or("unknown")
            });

            if let Err(e) = rag_index_file(
                file_path.to_string_lossy().to_string(),
                content,
                metadata,
            ).await {
                error!("Failed to index {:?}: {}", file_path, e);
                // Continue with other files
            }
        }
    }

    info!("Indexed {} files from {}", indexed_count, dir_path);
    Ok(indexed_count)
}

#[tauri::command]
pub async fn rag_clear_index() -> Result<(), String> {
    info!("Clearing RAG index");

    let config = crate::modules::state::Config::from_env();
    let client = ChromaDBClient::new(
        config.chroma_url.clone(),
        "nova_codebase".to_string(),
    );

    // ChromaDB doesn't have a "clear all" endpoint, we'd need to delete the collection
    // and recreate it
    let http_client = reqwest::Client::new();
    let delete_url = format!("{}/api/v1/collections/nova_codebase", config.chroma_url);

    match http_client.delete(&delete_url).send().await {
        Ok(_) => {
            info!("Deleted collection");
            // Recreate it
            client.ensure_collection().await?;
            Ok(())
        }
        Err(e) => Err(format!("Failed to clear index: {}", e)),
    }
}
