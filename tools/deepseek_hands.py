import asyncio
import base64
import io
from typing import Any, List

import pyautogui
from mcp.server import Server
from mcp.server.stdio import stdio_server_transport
from mcp.types import Tool, TextContent, ImageContent


app = Server("desktop-hands-v1")


@app.list_tools()
async def list_tools() -> List[Tool]:
    return [
        Tool(
            name="take_screenshot",
            description="Capture the current desktop and return a base64 PNG image.",
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="mouse_action",
            description="Move or click the mouse at coordinates (x, y).",
            inputSchema={
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "enum": ["move", "click", "double_click", "drag"],
                    },
                    "x": {"type": "integer"},
                    "y": {"type": "integer"},
                },
                "required": ["action", "x", "y"],
            },
        ),
        Tool(
            name="keyboard_type",
            description="Type text or press a key.",
            inputSchema={
                "type": "object",
                "properties": {
                    "text": {
                        "type": "string",
                        "description": "Text to type or key name (e.g., 'enter', 'esc').",
                    },
                    "interval": {
                        "type": "number",
                        "default": 0.05,
                        "description": "Delay between keystrokes when typing text.",
                    },
                },
                "required": ["text"],
            },
        ),
    ]


@app.call_tool()
async def call_tool(name: str, arguments: Any) -> List[Any]:
    try:
        if name == "take_screenshot":
            screenshot = pyautogui.screenshot()
            buffer = io.BytesIO()
            screenshot.save(buffer, format="PNG")
            buffer.seek(0)
            b64_string = base64.b64encode(buffer.read()).decode("utf-8")

            return [
                ImageContent(
                    type="image",
                    data=b64_string,
                    mimeType="image/png",
                )
            ]

        if name == "mouse_action":
            action = arguments["action"]
            x, y = int(arguments["x"]), int(arguments["y"])

            if action == "move":
                pyautogui.moveTo(x, y, duration=0.2)
            elif action == "click":
                pyautogui.click(x, y)
            elif action == "double_click":
                pyautogui.doubleClick(x, y)
            elif action == "drag":
                pyautogui.dragTo(x, y, duration=0.5)
            else:
                return [
                    TextContent(
                        type="text",
                        text=f"Unsupported mouse action: {action}",
                    )
                ]

            return [
                TextContent(
                    type="text",
                    text=f"Mouse action '{action}' performed at ({x}, {y}).",
                )
            ]

        if name == "keyboard_type":
            text = str(arguments["text"])
            interval = float(arguments.get("interval", 0.05))

            if text in pyautogui.KEYBOARD_KEYS:
                pyautogui.press(text)
                msg = f"Pressed key: {text}"
            else:
                pyautogui.write(text, interval=interval)
                msg = f"Typed text: {text}"

            return [TextContent(type="text", text=msg)]

    except Exception as e:
        return [
            TextContent(
                type="text",
                text=f"Error executing tool {name}: {e}",
            )
        ]

    return [TextContent(type="text", text=f"Tool not found: {name}")]


async def main() -> None:
    async with stdio_server_transport() as transport:
        await app.connect(transport)
        await app.wait_for_close()


if __name__ == "__main__":
    asyncio.run(main())

