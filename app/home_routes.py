"""API routes for '我们的家': diary, photo albums, MCP connector settings,
and the voice-message upload/transcribe step."""

import logging
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app import auth, home_store, mcp_client
from app.uploads import IMAGE_EXTENSIONS, _inside, _safe_name

logger = logging.getLogger(__name__)

ROOT = Path(os.environ.get("AGENT_APP_ROOT", Path(__file__).resolve().parent.parent)).expanduser().resolve()
PHOTOS_ROOT = ROOT / "photos"
VOICE_ROOT = ROOT / "voice"
PHOTOS_ROOT.mkdir(parents=True, exist_ok=True)
VOICE_ROOT.mkdir(parents=True, exist_ok=True)

router = APIRouter(prefix="/api/home")


def require_auth(authorization: str = Header(default="")) -> None:
    token = authorization.removeprefix("Bearer ").strip()
    if not token or not auth.verify_token(token):
        raise HTTPException(status_code=401, detail="unauthorized")


AUTH_DEP = Depends(require_auth)


# ------------------------------------------------------------------ diary --

class DiaryCreateBody(BaseModel):
    author: str = Field(pattern="^(shasha|xiao)$")
    text: str = Field(min_length=1, max_length=20_000)
    entry_date: str | None = Field(default=None, max_length=10)
    hidden_from_shasha: bool = False


class DiaryUpdateBody(BaseModel):
    text: str | None = Field(default=None, max_length=20_000)
    hidden_from_shasha: bool | None = None


@router.get("/diary", dependencies=[AUTH_DEP])
async def list_diary(viewer: str = "shasha") -> dict:
    if viewer not in ("shasha", "xiao"):
        viewer = "shasha"
    return {"entries": home_store.list_diary_entries(viewer)}


@router.post("/diary", dependencies=[AUTH_DEP])
async def create_diary(body: DiaryCreateBody) -> dict:
    entry_id = home_store.create_diary_entry(
        body.author, body.text, body.entry_date, body.hidden_from_shasha
    )
    return {"id": entry_id}


@router.patch("/diary/{entry_id}", dependencies=[AUTH_DEP])
async def update_diary(entry_id: int, body: DiaryUpdateBody) -> dict:
    try:
        home_store.update_diary_entry(entry_id, body.text, body.hidden_from_shasha)
    except LookupError:
        raise HTTPException(status_code=404, detail="entry not found")
    return {"updated": True}


@router.delete("/diary/{entry_id}", dependencies=[AUTH_DEP])
async def delete_diary(entry_id: int) -> dict:
    home_store.delete_diary_entry(entry_id)
    return {"deleted": True}


# ----------------------------------------------------------------- albums --

class AlbumCreateBody(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    is_private: bool = False


class AlbumUpdateBody(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    is_private: bool | None = None


@router.get("/albums", dependencies=[AUTH_DEP])
async def list_albums_route(viewer: str = "shasha") -> dict:
    if viewer not in ("shasha", "xiao"):
        viewer = "shasha"
    return {"albums": home_store.list_albums(viewer)}


@router.post("/albums", dependencies=[AUTH_DEP])
async def create_album_route(body: AlbumCreateBody) -> dict:
    album_id = home_store.create_album(body.name, body.is_private)
    return {"id": album_id}


@router.patch("/albums/{album_id}", dependencies=[AUTH_DEP])
async def update_album_route(album_id: int, body: AlbumUpdateBody) -> dict:
    if home_store.get_album(album_id) is None:
        raise HTTPException(status_code=404, detail="album not found")
    if body.name is not None:
        home_store.rename_album(album_id, body.name)
    if body.is_private is not None:
        home_store.set_album_private(album_id, body.is_private)
    return {"updated": True}


@router.delete("/albums/{album_id}", dependencies=[AUTH_DEP])
async def delete_album_route(album_id: int) -> dict:
    orphaned_paths = home_store.delete_album(album_id)
    for raw_path in orphaned_paths:
        path = Path(raw_path)
        if _inside(path, PHOTOS_ROOT):
            path.unlink(missing_ok=True)
    return {"deleted": True}


# ----------------------------------------------------------------- photos --

class PhotoMoveBody(BaseModel):
    target_album_id: int


@router.get("/albums/{album_id}/photos", dependencies=[AUTH_DEP])
async def list_photos_route(album_id: int) -> dict:
    if home_store.get_album(album_id) is None:
        raise HTTPException(status_code=404, detail="album not found")
    return {"photos": home_store.list_photos(album_id)}


@router.post("/albums/{album_id}/photos", dependencies=[AUTH_DEP])
async def upload_photo_route(
    album_id: int,
    file: UploadFile = File(...),
    uploaded_by: str = Form(...),
    caption: str = Form(default=""),
) -> dict:
    if home_store.get_album(album_id) is None:
        raise HTTPException(status_code=404, detail="album not found")
    if uploaded_by not in ("shasha", "xiao"):
        raise HTTPException(status_code=400, detail="invalid uploaded_by")
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in IMAGE_EXTENSIONS:
        raise HTTPException(status_code=415, detail=f"不支持的图片类型：{file.filename}")
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%f")
    filename = f"{timestamp}_{uuid.uuid4().hex[:8]}_{_safe_name(file.filename)}"
    target = (PHOTOS_ROOT / filename).resolve()
    if not _inside(target, PHOTOS_ROOT):
        raise HTTPException(status_code=400, detail="无效文件名")
    size = 0
    max_bytes = 30 * 1024 * 1024
    try:
        with target.open("wb") as output:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > max_bytes:
                    raise HTTPException(status_code=413, detail="图片超过 30MB")
                output.write(chunk)
    except Exception:
        target.unlink(missing_ok=True)
        raise
    finally:
        await file.close()
    photo_id = home_store.add_photo(album_id, filename, str(target), uploaded_by, caption)
    return {"id": photo_id, "filename": filename}


@router.post("/photos/{photo_id}/move", dependencies=[AUTH_DEP])
async def move_photo_route(photo_id: int, body: PhotoMoveBody) -> dict:
    if home_store.get_photo(photo_id) is None:
        raise HTTPException(status_code=404, detail="photo not found")
    home_store.move_photo(photo_id, body.target_album_id)
    return {"moved": True}


@router.post("/photos/{photo_id}/copy", dependencies=[AUTH_DEP])
async def copy_photo_route(photo_id: int, body: PhotoMoveBody) -> dict:
    if home_store.get_photo(photo_id) is None:
        raise HTTPException(status_code=404, detail="photo not found")
    new_id = home_store.copy_photo(photo_id, body.target_album_id)
    return {"id": new_id}


@router.delete("/photos/{photo_id}", dependencies=[AUTH_DEP])
async def delete_photo_route(photo_id: int) -> dict:
    path = home_store.delete_photo(photo_id)
    if path and _inside(Path(path), PHOTOS_ROOT):
        Path(path).unlink(missing_ok=True)
    return {"deleted": True}


@router.get("/photos/{photo_id}/file", dependencies=[AUTH_DEP])
async def photo_file_route(photo_id: int) -> FileResponse:
    photo = home_store.get_photo(photo_id)
    if photo is None:
        raise HTTPException(status_code=404, detail="photo not found")
    path = Path(photo["path"])
    if not _inside(path, PHOTOS_ROOT) or not path.is_file():
        raise HTTPException(status_code=404, detail="file missing")
    return FileResponse(path)


# ------------------------------------------------------------- connectors --

class ConnectorCreateBody(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    transport: str = Field(pattern="^(stdio|sse|http)$")
    command: str | None = Field(default=None, max_length=200)
    args: list[str] = Field(default_factory=list, max_length=20)
    env: dict[str, str] = Field(default_factory=dict)
    url: str | None = Field(default=None, max_length=500)
    enabled: bool = True


class ConnectorUpdateBody(BaseModel):
    name: str | None = Field(default=None, max_length=80)
    transport: str | None = Field(default=None, pattern="^(stdio|sse|http)$")
    command: str | None = Field(default=None, max_length=200)
    args: list[str] | None = Field(default=None, max_length=20)
    env: dict[str, str] | None = None
    url: str | None = Field(default=None, max_length=500)
    enabled: bool | None = None


_ENV_PLACEHOLDER_RE = re.compile(r"^\$\{[A-Za-z_][A-Za-z0-9_]*\}$")


@router.get("/connectors", dependencies=[AUTH_DEP])
async def list_connectors_route() -> dict:
    connectors = home_store.list_connectors()
    for connector in connectors:
        # ${VAR_NAME} placeholders aren't secrets (the real value lives in
        # .env, never the DB) — only mask literal values someone typed in.
        connector["env"] = {
            key: value if _ENV_PLACEHOLDER_RE.match(value or "") else ("••••••" if value else "")
            for key, value in connector["env"].items()
        }
    return {"connectors": connectors}


@router.post("/connectors", dependencies=[AUTH_DEP])
async def create_connector_route(body: ConnectorCreateBody) -> dict:
    from app.registry import get_registry

    connector_id = home_store.create_connector(
        body.name, body.transport, body.command, body.args, body.env, body.url, body.enabled
    )
    await get_registry().invalidate()
    return {"id": connector_id}


_MASKED_ENV_VALUE = "••••••"


@router.patch("/connectors/{connector_id}", dependencies=[AUTH_DEP])
async def update_connector_route(connector_id: int, body: ConnectorUpdateBody) -> dict:
    from app.registry import get_registry

    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    if "env" in fields:
        # Any value the client echoed back as the masked placeholder means
        # "left unchanged" — restore the real stored value for that key
        # instead of overwriting it with the literal mask string.
        current = next(
            (c for c in home_store.list_connectors() if c["id"] == connector_id),
            None,
        )
        previous_env = current["env"] if current else {}
        fields["env"] = {
            key: previous_env.get(key, "") if value == _MASKED_ENV_VALUE else value
            for key, value in fields["env"].items()
        }
    home_store.update_connector(connector_id, **fields)
    await get_registry().invalidate()
    return {"updated": True}


@router.delete("/connectors/{connector_id}", dependencies=[AUTH_DEP])
async def delete_connector_route(connector_id: int) -> dict:
    from app.registry import get_registry

    home_store.delete_connector(connector_id)
    await get_registry().invalidate()
    return {"deleted": True}


# ------------------------------------------------------------------ voice --

@router.post("/voice", dependencies=[AUTH_DEP])
async def voice_upload_route(file: UploadFile = File(...)) -> dict:
    """Upload 莎莎's Chinese voice message, transcribe it via the ElevenLabs
    MCP connector, and hand back {audio_path, text} for the client to send
    through the normal /api/chat turn (voice_audio_path/voice_lang fields)."""
    suffix = Path(file.filename or "voice.webm").suffix.lower() or ".webm"
    filename = f"{uuid.uuid4().hex}{suffix}"
    target = (VOICE_ROOT / filename).resolve()
    if not _inside(target, VOICE_ROOT):
        raise HTTPException(status_code=400, detail="无效文件名")
    with target.open("wb") as output:
        while chunk := await file.read(1024 * 1024):
            output.write(chunk)
    await file.close()

    try:
        content = await mcp_client.call_tool(
            "elevenlabs",
            "speech_to_text",
            {
                "input_file_path": str(target),
                "language_code": "zho",
                "save_transcript_to_file": False,
                "return_transcript_to_client_directly": True,
            },
        )
    except mcp_client.McpConnectorError as exc:
        raise HTTPException(status_code=502, detail=f"语音转写失败：{exc}") from exc

    text = "".join(
        block.text for block in content if getattr(block, "type", "") == "text"
    ).strip()
    return {"audio_path": str(target), "text": text}


@router.get("/voice-file", dependencies=[AUTH_DEP])
async def voice_file_route(path: str) -> FileResponse:
    candidate = Path(path).resolve()
    if not _inside(candidate, VOICE_ROOT) or not candidate.is_file():
        raise HTTPException(status_code=404, detail="file not found")
    return FileResponse(candidate)
