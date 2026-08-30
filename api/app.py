from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

from cc.event_log import GlobalEventLog
from cc.checkpoint import CheckpointStore
from companion.emotion_store import EmotionStore
from companion.pending_thoughts import PendingThoughtStore
from companion.inner_thoughts import InnerThoughtStore
from companion.observation_log import ObservationLog

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)
DB = str(DATA_DIR / "evermind.db")

event_log     = GlobalEventLog(DB)
cp_store      = CheckpointStore(DB)
emotion       = EmotionStore(DB)
thoughts      = PendingThoughtStore(DB)   # 待说的话（消息队列）
inner_thoughts = InnerThoughtStore(DB)    # 内心独白（自言自语）
observations  = ObservationLog(DB)

app = FastAPI(title="evermind")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi import Request
import logging, traceback

log = logging.getLogger("evermind")


@app.exception_handler(Exception)
async def unhandled_error(request: Request, exc: Exception):
    """把未捕获异常转成 JSON，前端才能显示真正的原因而不是'响应格式错误'。"""
    log.error("unhandled error on %s\n%s", request.url.path, traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"ok": False, "detail": f"{type(exc).__name__}: {exc}"},
    )


from api.routes import router
app.include_router(router)

FRONTEND_DIR = Path(__file__).parent.parent / "frontend"
app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="static")
