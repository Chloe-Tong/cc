"""
启动方式:
  cd /home/user/cc
  uvicorn main:app --reload --port 8000
"""
import logging
logging.basicConfig(level=logging.INFO)

from api.app import app
from scheduler import start_scheduler

start_scheduler()
