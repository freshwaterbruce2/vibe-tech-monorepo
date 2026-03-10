from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Dict, Iterable, List, Optional, Protocol, TypedDict

from anthropic import Anthropic


ToolDef = Dict[str, Any]
Block = Dict[str, Any]
Message = Dict[str, Any]


@dataclass
class HarnessConfig:
    model: str = "claude-sonnet-4-5-20250929"
    max_tokens: int = 2048
    betas: List[str] = None
    system_prompt: Optional[str] = None

    def __post_init__(self) -> None:
        if self.betas is None:
            self.betas = ["advanced-tool-use-2025-11-20"]


class CodeExecutionToolCall(TypedDict):
    tool_use_id: str
    name: str
    input: Dict[str, Any]


class CodeExecutionResult(TypedDict, total=False):
    stdout: str
    stderr: str
    error: Optional[str]


class CodeExecutionRuntime(Protocol):
    def start(self, tool_use_id: str, code: str) -> None:
        ...

    def dispatch_tool_call(self, call: CodeExecutionToolCall) -> Any:
        ...

    def poll_finished(self, tool_use_id: str) -> Optional[CodeExecutionResult]:
        ...


class ClaudeOrchestrationHarness:
    def __init__(
        self,
        client: Optional[Anthropic] = None,
        config: Optional[HarnessConfig] = None,
        code_execution_runtime: Optional[CodeExecutionRuntime] = None,
    ) -> None:
        self.client = client or Anthropic()
        self.config = config or HarnessConfig()
        self._tool_defs: List[ToolDef] = []
        self._tool_handlers: Dict[str, Callable[[Dict[str, Any]], Any]] = {}
        self._code_execution_runtime = code_execution_runtime

        self._install_core_tools()

    def _install_core_tools(self) -> None:
        self._tool_defs.append(
            {
                "type": "tool_search_tool_regex_20251119",
                "name": "tool_search_tool_regex",
            }
        )
        self._tool_defs.append(
            {
                "type": "code_execution_20250825",
                "name": "code_execution",
            }
        )

    def register_tool(
        self,
        name: str,
        description: str,
        input_schema: Dict[str, Any],
        *,
        handler: Callable[[Dict[str, Any]], Any],
        defer_loading: bool = True,
        allowed_callers: Optional[List[str]] = None,
        input_examples: Optional[List[Dict[str, Any]]] = None,
        extra: Optional[Dict[str, Any]] = None,
    ) -> None:
        tool: ToolDef = {
            "name": name,
            "description": description,
            "input_schema": input_schema,
            "defer_loading": defer_loading,
        }
        if allowed_callers:
            tool["allowed_callers"] = allowed_callers
        if input_examples:
            tool["input_examples"] = input_examples
        if extra:
            tool.update(extra)

        self._tool_defs.append(tool)
        self._tool_handlers[name] = handler

    def run_conversation(
        self,
        user_message: str,
        *,
        max_steps: int = 8,
    ) -> Message:
        messages: List[Message] = [{"role": "user", "content": user_message}]

        for _ in range(max_steps):
            resp = self.client.beta.messages.create(
                betas=self.config.betas,
                model=self.config.model,
                max_tokens=self.config.max_tokens,
                tools=self._tool_defs,
                system=self.config.system_prompt,
                messages=messages,
            )

            messages.append({"role": "assistant", "content": resp.content})

            tool_blocks = [
                b
                for b in resp.content
                if isinstance(b, dict)
                and b.get("type") in ("tool_use", "server_tool_use")
            ]
            if not tool_blocks:
                return resp

            result_blocks = list(self._handle_tool_blocks(tool_blocks))
            if not result_blocks:
                return resp

            messages.append({"role": "user", "content": result_blocks})

        return resp

    def _handle_tool_blocks(self, blocks: Iterable[Block]) -> Iterable[Block]:
        for block in blocks:
            btype = block.get("type")
            if btype == "tool_use":
                yield from self._handle_tool_use(block)
            elif btype == "server_tool_use":
                yield from self._handle_server_tool_use(block)

    def _handle_tool_use(self, block: Block) -> Iterable[Block]:
        tool_name = block["name"]
        tool_input = block.get("input", {})
        tool_use_id = block["id"]
        caller = block.get("caller")

        if caller and caller.get("type") == "code_execution_20250825":
            if not self._code_execution_runtime:
                yield {
                    "type": "tool_result",
                    "tool_use_id": tool_use_id,
                    "content": {"error": "code_execution runtime not configured"},
                }
                return

            result = self._code_execution_runtime.dispatch_tool_call(
                CodeExecutionToolCall(
                    tool_use_id=tool_use_id,
                    name=tool_name,
                    input=tool_input,
                )
            )
            yield {
                "type": "tool_result",
                "tool_use_id": tool_use_id,
                "content": result,
            }
            return

        handler = self._tool_handlers.get(tool_name)
        if not handler:
            yield {
                "type": "tool_result",
                "tool_use_id": tool_use_id,
                "content": {"error": f"no handler registered for tool {tool_name}"},
            }
            return

        try:
            result = handler(tool_input)
        except Exception as e:
            result = {"error": f"handler exception: {e!r}"}

        yield {
            "type": "tool_result",
            "tool_use_id": tool_use_id,
            "content": result,
        }

    def _handle_server_tool_use(self, block: Block) -> Iterable[Block]:
        name = block["name"]
        if name != "code_execution":
            yield {
                "type": "code_execution_tool_result",
                "tool_use_id": block["id"],
                "content": {
                    "stdout": "",
                    "stderr": "",
                    "error": f"Unsupported server tool: {name}",
                },
            }
            return

        if not self._code_execution_runtime:
            yield {
                "type": "code_execution_tool_result",
                "tool_use_id": block["id"],
                "content": {
                    "stdout": "",
                    "stderr": "",
                    "error": "code_execution runtime not configured",
                },
            }
            return

        tool_use_id = block["id"]
        code = block.get("input", {}).get("code", "")

        self._code_execution_runtime.start(tool_use_id, code)

        result = self._code_execution_runtime.poll_finished(tool_use_id)
        if result is None:
            result = {
                "stdout": "",
                "stderr": "",
                "error": "execution not finished in single poll",
            }

        yield {
            "type": "code_execution_tool_result",
            "tool_use_id": tool_use_id,
            "content": result,
        }

