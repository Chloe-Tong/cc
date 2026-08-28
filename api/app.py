from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

from cc.event_log import GlobalEventLog
from cc.checkpoint import CheckpointStore
from companion.emotion_store import EmotionStore
from companion.pending_thoughts import PendingThoughtStore
from companion.observation_log import ObservationLog

DATA_DIR = Path(__file__).parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)
DB = str(DATA_DIR / "lin.db")

event_log    = GlobalEventLog(DB)
cp_store     = CheckpointStore(DB)
emotion      = EmotionStore(DB)
thoughts     = PendingThoughtStore(DB)
observations = ObservationLog(DB)

app = FastAPI(title="林 Memory API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from api.routes import router
app.include_router(router)
