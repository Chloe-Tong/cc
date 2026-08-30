"""
两层压缩调度器：
  - Session 级：对话停止 30min 后自动触发
  - Day 级：每天 02:00 触发全量压缩
"""
import time
import logging
from pathlib import Path

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from cc.event_log import GlobalEventLog
from cc.checkpoint import CheckpointStore
from companion.runner import make_summarize_fn

log = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
DB = str(DATA_DIR / "evermind.db")

_last_activity: float = time.time()
SESSION_IDLE_SECONDS = 30 * 60   # 30 分钟无消息视为 session 结束


def record_activity():
    """每次有对话时调用，重置空闲计时器。"""
    global _last_activity
    _last_activity = time.time()


def _get_worker():
    from cc.checkpoint import CheckpointWorker
    event_log = GlobalEventLog(DB)
    cp_store  = CheckpointStore(DB)
    return CheckpointWorker(
        event_log, cp_store,
        summarize_fn=make_summarize_fn(),
        every_n_events=9999,   # 调度器控制触发，不靠计数
        every_seconds=9999,
    )


def _session_check():
    """每 5 分钟轮询一次：若空闲超过 30min，触发 session 级压缩。"""
    idle = time.time() - _last_activity
    if idle >= SESSION_IDLE_SECONDS:
        log.info("Session idle %.0f min — triggering session compression", idle / 60)
        try:
            cp = _get_worker().run_once()
            if cp:
                log.info("Session checkpoint created: seq=%d", cp.covered_through_seq)
        except Exception as e:
            log.error("Session compression failed: %s", e)


def _daily_compression():
    """每天 02:00 全量压缩。"""
    log.info("Daily compression triggered")
    try:
        cp = _get_worker().run_once()
        if cp:
            log.info("Daily checkpoint created: seq=%d", cp.covered_through_seq)
        else:
            log.info("Daily compression: nothing new to compress")
    except Exception as e:
        log.error("Daily compression failed: %s", e)


def start_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler()

    # Session 级：每 5 分钟检查空闲
    scheduler.add_job(_session_check, "interval", minutes=5, id="session_check")

    # Day 级：每天 02:00
    scheduler.add_job(_daily_compression, CronTrigger(hour=2, minute=0), id="daily_compress")

    scheduler.start()
    log.info("Scheduler started (session idle=30min, daily=02:00)")
    return scheduler
