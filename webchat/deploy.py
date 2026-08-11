#!/usr/bin/env python3
"""
把 webchat/index.html 注入到 push.py 的 WEB_CHAT_HTML 常量里。
在服务器的 ~/CcCompanion/apns-server/ 目录下运行:
  python3 deploy.py
"""
import re
import sys
from pathlib import Path

PUSH_PY = Path(__file__).parent.parent / "apns-server" / "push.py"
HTML_FILE = Path(__file__).parent / "index.html"

if not PUSH_PY.exists():
    sys.exit(f"找不到 push.py: {PUSH_PY}")
if not HTML_FILE.exists():
    sys.exit(f"找不到 index.html: {HTML_FILE}")

html = HTML_FILE.read_text(encoding="utf-8")
push = PUSH_PY.read_text(encoding="utf-8")

# Replace WEB_CHAT_HTML constant
new_const = f'WEB_CHAT_HTML = r"""{html}"""\n'
new_push = re.sub(
    r'WEB_CHAT_HTML\s*=\s*r""".*?"""\n',
    new_const,
    push,
    flags=re.DOTALL,
)

if new_push == push:
    sys.exit("替换失败: 没找到 WEB_CHAT_HTML 常量，请检查 push.py")

PUSH_PY.write_text(new_push, encoding="utf-8")
print(f"✅ 已更新 {PUSH_PY}")
print("重启 push.py 生效: tmux kill-session -t ccc-server && tmux new-session -d -s ccc-server \"cd ~/CcCompanion/apns-server && source .venv/bin/activate && python3 push.py --config config.toml\"")
