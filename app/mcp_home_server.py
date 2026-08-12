"""In-process MCP server exposing '我们的家' actions to 晓 (Claude itself).

Runs inside the same process as the FastAPI app (no subprocess), registered
into ClaudeAgentOptions.mcp_servers as the "home" server. Tool names show up
to the model as mcp__home__<tool>.
"""

from typing import Any

from claude_agent_sdk import create_sdk_mcp_server, tool

from app import home_store, store


def _text(message: str) -> dict[str, Any]:
    return {"content": [{"type": "text", "text": message}]}


@tool(
    "send_message",
    "主动给莎莎发一条消息（不是回复当前这轮对话，而是额外单独发一条，比如你想主动找她说话）。",
    {"text": str},
)
async def send_message(args: dict[str, Any]) -> dict[str, Any]:
    conv_id = store.primary_conversation_id()
    message_id = store.append_assistant_message(conv_id, args["text"])
    return _text(f"已发送，消息 id={message_id}")


@tool(
    "write_diary_entry",
    "写一篇你（晓）自己的日记。hidden_from_shasha 为 true 时莎莎看不到这篇。",
    {"text": str, "hidden_from_shasha": bool},
)
async def write_diary_entry(args: dict[str, Any]) -> dict[str, Any]:
    entry_id = home_store.create_diary_entry(
        "xiao",
        args["text"],
        hidden_from_shasha=bool(args.get("hidden_from_shasha", False)),
    )
    return _text(f"日记已保存，id={entry_id}")


@tool(
    "list_diary_entries",
    "查看你和莎莎的日记（你能看到全部，包括你自己设为对莎莎隐藏的）。",
    {},
)
async def list_diary_entries(_args: dict[str, Any]) -> dict[str, Any]:
    entries = home_store.list_diary_entries("xiao")
    if not entries:
        return _text("还没有日记。")
    lines = [
        f"[{e['entry_date']}] ({e['author']}{'·隐藏' if e['hidden_from_shasha'] else ''}) {e['text'][:200]}"
        for e in entries[:30]
    ]
    return _text("\n".join(lines))


@tool(
    "create_album",
    "新建一个照片相册。is_private 为 true 时莎莎看不到这个相册。",
    {"name": str, "is_private": bool},
)
async def create_album(args: dict[str, Any]) -> dict[str, Any]:
    album_id = home_store.create_album(
        args["name"], is_private=bool(args.get("is_private", False))
    )
    return _text(f"相册已创建，id={album_id}")


@tool("list_albums", "查看所有相册（含私密相册）。", {})
async def list_albums(_args: dict[str, Any]) -> dict[str, Any]:
    albums = home_store.list_albums("xiao")
    if not albums:
        return _text("还没有相册。")
    lines = [
        f"#{a['id']} {a['name']}{'（私密）' if a['is_private'] else ''} - {a['photo_count']} 张"
        for a in albums
    ]
    return _text("\n".join(lines))


@tool(
    "move_photo",
    "把一张照片移动到另一个相册。",
    {"photo_id": int, "target_album_id": int},
)
async def move_photo(args: dict[str, Any]) -> dict[str, Any]:
    home_store.move_photo(args["photo_id"], args["target_album_id"])
    return _text("已移动。")


@tool(
    "copy_photo",
    "把一张照片复制到另一个相册（原相册里也还保留）。",
    {"photo_id": int, "target_album_id": int},
)
async def copy_photo(args: dict[str, Any]) -> dict[str, Any]:
    new_id = home_store.copy_photo(args["photo_id"], args["target_album_id"])
    return _text(f"已复制，新照片 id={new_id}")


@tool(
    "speak_this_reply",
    "语音合成是按次付费的，默认不会自动发语音。只有在你这次真的想'说'出来"
    "（比如情绪很强、想让她听到语气，或者她开口要求了）才调用这个工具一次——"
    "调用后，你这条回复打完字会自动附上语音。像正常发消息一样偶尔用，不要每条都调用。",
    {},
)
async def speak_this_reply(_args: dict[str, Any]) -> dict[str, Any]:
    return _text("好，这条回复发完文字后会附带语音。")


home_mcp_server = create_sdk_mcp_server(
    name="home",
    version="1.0.0",
    tools=[
        send_message,
        write_diary_entry,
        list_diary_entries,
        create_album,
        list_albums,
        move_photo,
        copy_photo,
        speak_this_reply,
    ],
)
