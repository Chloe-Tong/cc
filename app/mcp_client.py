"""One-shot MCP client calls used by the voice pipeline (STT/TTS via the
ElevenLabs MCP connector). Each call spawns the connector's stdio process,
calls one tool, and tears down — simple and correct for the message volume
this app sees; not meant for high-throughput use.
"""

import os
from pathlib import Path
from typing import Any

from mcp import ClientSession
from mcp.client.stdio import StdioServerParameters, stdio_client

from app import home_store
from app.home_store import resolve_connector_env as _resolve_env


class McpConnectorError(RuntimeError):
    pass


def get_connector(name: str) -> dict[str, Any]:
    for connector in home_store.list_connectors():
        if connector["name"] == name:
            return connector
    raise McpConnectorError(f"MCP 连接器未配置：{name}")


async def list_tool_names(connector_name: str) -> list[str]:
    connector = get_connector(connector_name)
    if connector["transport"] != "stdio":
        raise McpConnectorError("目前只支持 stdio 传输的连接器")
    params = StdioServerParameters(
        command=connector["command"],
        args=connector["args"],
        env={**os.environ, **_resolve_env(connector["env"])},
    )
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            result = await session.list_tools()
            return [tool.name for tool in result.tools]


async def call_tool(
    connector_name: str,
    tool_keyword: str,
    arguments: dict[str, Any],
) -> Any:
    """Calls the tool on `connector_name` whose name contains `tool_keyword`.

    Matching by keyword (rather than an exact hardcoded name) is a small
    defensive measure against upstream MCP servers renaming/versioning their
    tool names slightly between releases.
    """
    connector = get_connector(connector_name)
    if not connector["enabled"]:
        raise McpConnectorError(f"连接器已停用：{connector_name}")
    if connector["transport"] != "stdio":
        raise McpConnectorError("目前只支持 stdio 传输的连接器")
    params = StdioServerParameters(
        command=connector["command"],
        args=connector["args"],
        env={**os.environ, **_resolve_env(connector["env"])},
    )
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            match = next(
                (t for t in tools.tools if tool_keyword in t.name.lower()),
                None,
            )
            if match is None:
                available = ", ".join(t.name for t in tools.tools)
                raise McpConnectorError(
                    f"{connector_name} 里没找到包含 '{tool_keyword}' 的工具，"
                    f"可用工具：{available}"
                )
            result = await session.call_tool(match.name, arguments)
            if result.isError:
                raise McpConnectorError(str(result.content))
            return result.content


async def synthesize_english_speech(text: str, output_dir: Path) -> str | None:
    """Calls ElevenLabs text_to_speech and returns the produced file's path.

    The tool writes the audio file itself (via output_directory); since its
    exact generated filename isn't part of the documented contract, we
    diff the directory before/after the call to find it.
    """
    before = {p.name for p in output_dir.glob("*")}
    try:
        await call_tool(
            "elevenlabs",
            "text_to_speech",
            {
                "text": text,
                "language": "en",
                "output_directory": str(output_dir),
            },
        )
    except McpConnectorError:
        raise
    after = {p.name for p in output_dir.glob("*")}
    new_files = after - before
    if not new_files:
        return None
    newest = max((output_dir / name for name in new_files), key=lambda p: p.stat().st_mtime)
    return str(newest)
