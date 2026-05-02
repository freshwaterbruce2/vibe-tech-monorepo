use std::sync::Arc;

use arrow_array::{FixedSizeListArray, Float32Array, RecordBatch, StringArray};
use arrow_schema::{DataType, Field, Schema};
use futures_util::TryStreamExt;
#[allow(unused_imports)]
use lancedb::query::{ExecutableQuery, QueryBase};
use serde::{Deserialize, Serialize};
use tracing::{debug, error, info, warn};

use crate::modules::{path_policy, state::Config};

// ─── Constants ───────────────────────────────────────────────────────────────

const EMBEDDING_DIM: i32 = 1536;
const TABLE_NAME: &str = "nova_codebase";
const EMBED_MODEL: &str = "openai/text-embedding-3-small";
const MAX_CHUNK_CHARS: usize = 1_000;
const MAX_FILE_BYTES: u64 = 500_000;
const MAX_SEARCH_RESULTS: usize = 25;

#[path = "rag_collect.rs"]
mod rag_collect;
use rag_collect::collect_files;

// ─── Public types (must match RAGService.ts) ────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RagSearchResult {
    pub id: String,
    pub document: String,
    pub distance: f32,
    pub metadata: serde_json::Value,
}

// ─── Schema ──────────────────────────────────────────────────────────────────

fn rag_schema() -> Arc<Schema> {
    Arc::new(Schema::new(vec![
        Field::new("id", DataType::Utf8, false),
        Field::new("file_path", DataType::Utf8, false),
        Field::new("document", DataType::Utf8, false),
        Field::new("metadata", DataType::Utf8, true),
        Field::new(
            "vector",
            DataType::FixedSizeList(
                Arc::new(Field::new("item", DataType::Float32, true)),
                EMBEDDING_DIM,
            ),
            true,
        ),
    ]))
}

// ─── Embedding ───────────────────────────────────────────────────────────────

async fn embed(text: &str, api_key: &str) -> Result<Vec<f32>, String> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "model": EMBED_MODEL,
        "input": text,
    });

    let resp = client
        .post("https://openrouter.ai/api/v1/embeddings")
        .header("Authorization", format!("Bearer {api_key}"))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Embedding request failed: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body_text = resp.text().await.unwrap_or_default();
        return Err(format!("Embedding API error {status}: {body_text}"));
    }

    let json: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse embedding response: {e}"))?;

    let vector: Vec<f32> = json["data"][0]["embedding"]
        .as_array()
        .ok_or_else(|| "No embedding array in response".to_string())?
        .iter()
        .map(|v| v.as_f64().unwrap_or(0.0) as f32)
        .collect();

    if vector.len() != EMBEDDING_DIM as usize {
        return Err(format!(
            "Unexpected embedding dimension: {} (expected {EMBEDDING_DIM})",
            vector.len()
        ));
    }

    Ok(vector)
}

// ─── Chunking ────────────────────────────────────────────────────────────────

fn chunk_text(content: &str) -> Vec<String> {
    if content.len() <= MAX_CHUNK_CHARS {
        return vec![content.to_string()];
    }

    let mut chunks = Vec::new();
    let mut current = String::new();

    for line in content.lines() {
        if !current.is_empty() && current.len() + line.len() + 1 > MAX_CHUNK_CHARS {
            let trimmed = current.trim().to_string();
            if !trimmed.is_empty() {
                chunks.push(trimmed);
            }
            current.clear();
        }
        current.push_str(line);
        current.push('\n');
    }

    let trimmed = current.trim().to_string();
    if !trimmed.is_empty() {
        chunks.push(trimmed);
    }

    if chunks.is_empty() {
        chunks.push(content.chars().take(MAX_CHUNK_CHARS).collect());
    }

    chunks
}

// ─── Arrow batch builder ─────────────────────────────────────────────────────

fn build_batch(
    schema: Arc<Schema>,
    ids: Vec<String>,
    file_paths: Vec<String>,
    documents: Vec<String>,
    metadatas: Vec<String>,
    vectors: Vec<Vec<f32>>,
) -> Result<RecordBatch, String> {
    let flat: Vec<f32> = vectors.into_iter().flatten().collect();
    let float_vals = Float32Array::from(flat);
    let vector_col = FixedSizeListArray::try_new(
        Arc::new(Field::new("item", DataType::Float32, true)),
        EMBEDDING_DIM,
        Arc::new(float_vals),
        None,
    )
    .map_err(|e| format!("Failed to build vector column: {e}"))?;

    RecordBatch::try_new(
        schema,
        vec![
            Arc::new(StringArray::from(ids)),
            Arc::new(StringArray::from(file_paths)),
            Arc::new(StringArray::from(documents)),
            Arc::new(StringArray::from(metadatas)),
            Arc::new(vector_col),
        ],
    )
    .map_err(|e| format!("Failed to build RecordBatch: {e}"))
}

// ─── LanceDB helpers ─────────────────────────────────────────────────────────

async fn connect(path: &str) -> Result<lancedb::Connection, String> {
    std::fs::create_dir_all(path)
        .map_err(|e| format!("Failed to create LanceDB directory: {e}"))?;
    lancedb::connect(path)
        .execute()
        .await
        .map_err(|e| format!("Failed to connect to LanceDB: {e}"))
}

async fn table_exists(conn: &lancedb::Connection) -> Result<bool, String> {
    let names = conn
        .table_names()
        .execute()
        .await
        .map_err(|e| format!("Failed to list tables: {e}"))?;
    Ok(names.contains(&TABLE_NAME.to_string()))
}

// ─── Tauri Commands ──────────────────────────────────────────────────────────

#[tauri::command]
pub async fn rag_index_file(
    file_path: String,
    content: String,
    metadata: serde_json::Value,
) -> Result<(), String> {
    info!("RAG: indexing {}", file_path);

    let config = Config::from_env();
    let conn = connect(&config.lance_db_path).await?;
    let schema = rag_schema();

    let chunks = chunk_text(&content);
    debug!("RAG: split {} into {} chunks", file_path, chunks.len());

    let mut ids: Vec<String> = Vec::new();
    let mut fps: Vec<String> = Vec::new();
    let mut docs: Vec<String> = Vec::new();
    let mut metas: Vec<String> = Vec::new();
    let mut vecs: Vec<Vec<f32>> = Vec::new();

    // Detect language from extension
    let language = std::path::Path::new(&file_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("unknown")
        .to_string();

    for (i, chunk) in chunks.iter().enumerate() {
        match embed(chunk, &config.openrouter_api_key).await {
            Ok(v) => {
                let chunk_meta = {
                    let mut m = metadata.clone();
                    if let Some(obj) = m.as_object_mut() {
                        obj.insert("file_path".to_string(), serde_json::json!(file_path));
                        obj.insert("language".to_string(), serde_json::json!(language));
                        obj.insert("chunk_index".to_string(), serde_json::json!(i));
                    }
                    m
                };

                ids.push(format!("{file_path}::{i}"));
                fps.push(file_path.clone());
                docs.push(chunk.clone());
                metas.push(chunk_meta.to_string());
                vecs.push(v);
            }
            Err(e) => {
                warn!("RAG: skipping chunk {i} of {file_path}: {e}");
            }
        }
    }

    if ids.is_empty() {
        info!("RAG: no chunks embedded for {}", file_path);
        return Ok(());
    }

    let batch = build_batch(schema.clone(), ids, fps, docs, metas, vecs)?;

    if table_exists(&conn).await? {
        let table = conn
            .open_table(TABLE_NAME)
            .execute()
            .await
            .map_err(|e| format!("Failed to open table: {e}"))?;

        // Remove stale chunks for this file before re-indexing
        let escaped = file_path.replace('\'', "''");
        if let Err(e) = table.delete(&format!("file_path = '{escaped}'")).await {
            warn!("RAG: failed to delete old chunks for {file_path}: {e}");
        }

        table
            .add(vec![batch])
            .execute()
            .await
            .map_err(|e| format!("Failed to add chunks: {e}"))?;
    } else {
        conn.create_table(TABLE_NAME, vec![batch])
            .execute()
            .await
            .map_err(|e| format!("Failed to create table: {e}"))?;
    }

    info!("RAG: indexed {} ({} chunks)", file_path, chunks.len());
    Ok(())
}

#[tauri::command]
pub async fn rag_search(query: String, top_k: usize) -> Result<Vec<RagSearchResult>, String> {
    let top_k = top_k.clamp(1, MAX_SEARCH_RESULTS);
    debug!("RAG search: '{query}' (top_k={top_k})");

    let config = Config::from_env();
    let conn = connect(&config.lance_db_path).await?;

    if !table_exists(&conn).await? {
        return Ok(vec![]);
    }

    let query_vec = embed(&query, &config.openrouter_api_key).await?;

    let table = conn
        .open_table(TABLE_NAME)
        .execute()
        .await
        .map_err(|e| format!("Failed to open table: {e}"))?;

    let mut stream = table
        .query()
        .nearest_to(query_vec.as_slice())
        .map_err(|e| format!("Failed to build vector query: {e}"))?
        .column("vector")
        .limit(top_k)
        .execute()
        .await
        .map_err(|e| format!("Vector search failed: {e}"))?;

    let mut results: Vec<RagSearchResult> = Vec::new();

    while let Some(batch) = stream
        .try_next()
        .await
        .map_err(|e| format!("Stream error: {e}"))?
    {
        let schema = batch.schema();

        let id_idx = schema.index_of("id").unwrap_or(0);
        let doc_idx = schema.index_of("document").unwrap_or(2);
        let meta_idx = schema.index_of("metadata").unwrap_or(3);
        let dist_idx = schema.index_of("_distance").ok();

        let ids = batch.column(id_idx).as_any().downcast_ref::<StringArray>();
        let docs = batch.column(doc_idx).as_any().downcast_ref::<StringArray>();
        let metas = batch
            .column(meta_idx)
            .as_any()
            .downcast_ref::<StringArray>();

        if let (Some(ids_arr), Some(docs_arr)) = (ids, docs) {
            for i in 0..batch.num_rows() {
                let distance = dist_idx
                    .and_then(|di| {
                        batch
                            .column(di)
                            .as_any()
                            .downcast_ref::<Float32Array>()
                            .map(|a| a.value(i))
                    })
                    .unwrap_or(0.0);

                let meta_str = metas.map(|m| m.value(i)).unwrap_or("{}");
                let metadata: serde_json::Value =
                    serde_json::from_str(meta_str).unwrap_or(serde_json::json!({}));

                results.push(RagSearchResult {
                    id: ids_arr.value(i).to_string(),
                    document: docs_arr.value(i).to_string(),
                    distance,
                    metadata,
                });
            }
        }
    }

    info!("RAG: found {} results for '{query}'", results.len());
    Ok(results)
}

#[tauri::command]
pub async fn rag_index_directory(
    dir_path: String,
    file_extensions: Vec<String>,
) -> Result<usize, String> {
    info!(
        "RAG: indexing directory {} (extensions: {:?})",
        dir_path, file_extensions
    );

    let root = path_policy::validate_directory_path(&dir_path)?;

    let files = collect_files(&root, &file_extensions)?;
    let total = files.len();
    let mut indexed = 0usize;

    for path in files {
        let file_meta = match std::fs::metadata(&path) {
            Ok(m) => m,
            Err(e) => {
                warn!("RAG: skipping {:?}: {e}", path);
                continue;
            }
        };

        if file_meta.len() > MAX_FILE_BYTES {
            debug!(
                "RAG: skipping large file {:?} ({} bytes)",
                path,
                file_meta.len()
            );
            continue;
        }

        let content = match std::fs::read_to_string(&path) {
            Ok(c) => c,
            Err(_) => continue, // binary file
        };

        let language = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("unknown")
            .to_string();

        let metadata = serde_json::json!({
            "language": language,
            "size": file_meta.len(),
        });

        match rag_index_file(path.to_string_lossy().to_string(), content, metadata).await {
            Ok(_) => indexed += 1,
            Err(e) => error!("RAG: failed to index {:?}: {e}", path),
        }
    }

    info!("RAG: indexed {indexed}/{total} files from {dir_path}");
    Ok(indexed)
}

#[tauri::command]
pub async fn rag_clear_index() -> Result<(), String> {
    info!("RAG: clearing index");

    let config = Config::from_env();
    let conn = connect(&config.lance_db_path).await?;

    if table_exists(&conn).await? {
        conn.drop_table(TABLE_NAME, &[])
            .await
            .map_err(|e| format!("Failed to drop table: {e}"))?;
        info!("RAG: index cleared");
    } else {
        info!("RAG: nothing to clear (table did not exist)");
    }

    Ok(())
}
