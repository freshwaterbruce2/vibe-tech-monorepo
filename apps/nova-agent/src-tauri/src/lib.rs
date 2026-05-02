pub mod context_engine;
pub mod database;
pub mod guidance_engine;
pub mod http_server;
pub mod modules;
pub mod websocket_client;

#[cfg(test)]
pub mod tests {
    pub mod ipc_integration;
}
