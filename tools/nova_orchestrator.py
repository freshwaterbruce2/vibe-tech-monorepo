import sys
from typing import List

from anthropic import Anthropic

from claude_orchestration_harness import ClaudeOrchestrationHarness, HarnessConfig


def extract_text_blocks(content: List[dict]) -> str:
    texts: List[str] = []
    for block in content:
        if isinstance(block, dict) and block.get("type") == "text":
            texts.append(block.get("text", ""))
    return "\n".join(t for t in texts if t)


def main() -> None:
    if len(sys.argv) < 2:
        print("No prompt provided.", end="")
        return

    prompt = " ".join(sys.argv[1:])

    client = Anthropic()
    cfg = HarnessConfig(
        system_prompt=(
            "You are Nova's orchestration layer. You run on a Windows 11 desktop "
            "with access to external tools and MCP servers. When asked to perform "
            "desktop actions, you should produce a clear natural-language plan and, "
            "when appropriate, rely on the surrounding MCP/agent stack to actually "
            "execute those actions."
        )
    )

    harness = ClaudeOrchestrationHarness(client=client, config=cfg)

    # NOTE: Tool registration is expected to be done in the surrounding Python
    # process or extended here in the future. For now, this provides a single
    # conversation turn using the harness machinery.

    resp = harness.run_conversation(prompt)
    output = extract_text_blocks(resp.content)
    print(output, end="")


if __name__ == "__main__":
    main()

