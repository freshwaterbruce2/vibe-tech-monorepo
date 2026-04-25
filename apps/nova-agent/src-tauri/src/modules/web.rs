use reqwest::{self, redirect::Policy};
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tracing::{debug, info};

#[derive(Debug, Serialize, Deserialize)]
pub struct WebSearchResult {
    pub title: String,
    pub link: String,
    pub snippet: String,
}

const MAX_QUERY_LENGTH: usize = 2048;
const MAX_RESPONSE_BYTES: usize = 512 * 1024;
const REQUEST_TIMEOUT_SECONDS: u64 = 8;

#[tauri::command]
pub async fn web_search(query: String) -> Result<Vec<WebSearchResult>, String> {
    debug!("Performing web search for: {}", query);

    let query = query.trim();
    if query.is_empty() {
        return Ok(Vec::new());
    }
    if query.len() > MAX_QUERY_LENGTH || query.chars().any(|c| c.is_control()) {
        return Err("Invalid search query".to_string());
    }

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
        .redirect(Policy::limited(2))
        .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECONDS))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let mut endpoint = reqwest::Url::parse("https://html.duckduckgo.com/html/")
        .map_err(|e| format!("Failed to parse search URL: {}", e))?;
    endpoint.query_pairs_mut().append_pair("q", query);

    let response = client
        .get(endpoint)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch search results: {}", e))?
        .error_for_status()
        .map_err(|e| format!("Search request failed: {}", e))?;

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response bytes: {}", e))?;

    if bytes.len() > MAX_RESPONSE_BYTES {
        return Err("Search response exceeds configured size limit".to_string());
    }

    let response_body = String::from_utf8_lossy(&bytes);
    if response_body.trim().is_empty() {
        return Ok(Vec::new());
    }

    let document = Html::parse_document(&response_body);
    let result_selector =
        Selector::parse(".result").map_err(|_| "Failed to parse selector".to_string())?;
    let title_selector = Selector::parse(".result__title .result__a")
        .map_err(|_| "Failed to parse title selector".to_string())?;
    let snippet_selector = Selector::parse(".result__snippet")
        .map_err(|_| "Failed to parse snippet selector".to_string())?;

    let mut results = Vec::new();

    for element in document.select(&result_selector) {
        let title_elem = element.select(&title_selector).next();
        let snippet_elem = element.select(&snippet_selector).next();

        if let (Some(title), Some(snippet)) = (title_elem, snippet_elem) {
            let title_text = title.text().collect::<Vec<_>>().join("");
            let link = title.value().attr("href").unwrap_or_default().to_string();
            let snippet_text = snippet.text().collect::<Vec<_>>().join("");

            if !link.is_empty() {
                results.push(WebSearchResult {
                    title: title_text.trim().to_string(),
                    link,
                    snippet: snippet_text.trim().to_string(),
                });
            }
        }
    }

    if results.is_empty() {
        return Ok(Vec::new());
    }

    info!("Found {} search results", results.len());
    Ok(results)
}
