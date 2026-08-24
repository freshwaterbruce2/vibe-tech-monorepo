#![allow(unused_imports)]

pub(crate) mod commands;
mod protocol;
mod provider;
mod secure_continuation;
mod tool_checkpoint;
mod tools;
mod validation;

pub use commands::{chat_with_agent, get_agent_status, set_active_model, update_capabilities};
pub use provider::dispatch_model_request;

pub(crate) fn retire_task_continuation(reference: &str) -> Result<(), String> {
    secure_continuation::delete(reference)
}
