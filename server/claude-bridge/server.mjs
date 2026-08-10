/**
 * Claude Code Bridge Server
 *
 * 把 iOS App (Polaris) 发来的 Anthropic Messages API 格式请求
 * 转给本地 `claude` CLI，再把结果流式返回给 App。
 *
 * 用法：
 *   node server.mjs [--port 3456] [--allowed-origin https://your-app.com]
 *
 * 前置条件：
 *   - 服务器上已安装 claude CLI，且已用你的 Claude Pro 账号登录
 *   - node 18+
 */

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    port: { type: 'string', default: '3456' },
    'allowed-origin': { type: 'string', default: '*' },
  },
});

const PORT = parseInt(args['port'], 10);
const ALLOWED_ORIGIN = args['allowed-origin'];

function setCorsHeaders(res, origin) {
  const allow = ALLOWED_ORIGIN === '*' ? (origin ?? '*') : ALLOWED_ORIGIN;
  res.setHeader('Access-Control-Allow-Origin', allow);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-api-key, authorization, anthropic-version, anthropic-dangerous-direct-browser-access');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function extractText(messages) {
  const parts = [];
  for (const msg of messages) {
    const role = msg.role === 'user' ? 'User' : 'Assistant';
    const content = Array.isArray(msg.content)
      ? msg.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
      : (typeof msg.content === 'string' ? msg.content : '');
    if (content.trim()) parts.push(`${role}: ${content.trim()}`);
  }
  return parts.join('\n\n');
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function writeSSEEvent(res, event) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

async function handleMessages(req, res) {
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    res.writeHead(400).end(JSON.stringify({ error: 'invalid json' }));
    return;
  }

  const { messages = [], stream = false, system } = body;
  const prompt = [
    system ? `System: ${system}\n\n` : '',
    extractText(messages),
  ].join('').trim();

  if (!prompt) {
    res.writeHead(400).end(JSON.stringify({ error: 'no prompt' }));
    return;
  }

  if (stream) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    writeSSEEvent(res, { type: 'message_start', message: { id: `msg_${Date.now()}`, type: 'message', role: 'assistant', content: [], model: 'claude-code', stop_reason: null, usage: { input_tokens: 0, output_tokens: 0 } } });
    writeSSEEvent(res, { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } });
  }

  const child = spawn('claude', ['--print', '--output-format', 'text', prompt], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  let fullText = '';

  child.stdout.on('data', (chunk) => {
    const text = chunk.toString('utf8');
    fullText += text;
    if (stream) {
      writeSSEEvent(res, { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } });
    }
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(chunk);
  });

  child.on('close', (code) => {
    if (stream) {
      writeSSEEvent(res, { type: 'content_block_stop', index: 0 });
      writeSSEEvent(res, { type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: Math.ceil(fullText.length / 4) } });
      writeSSEEvent(res, { type: 'message_stop' });
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      if (code !== 0) {
        res.writeHead(500).end(JSON.stringify({ error: `claude exited with code ${code}` }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        id: `msg_${Date.now()}`,
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: fullText }],
        model: 'claude-code',
        stop_reason: 'end_turn',
        usage: { input_tokens: 0, output_tokens: Math.ceil(fullText.length / 4) },
      }));
    }
  });

  req.on('close', () => {
    if (!child.killed) child.kill();
  });
}

const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  setCorsHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'claude-bridge' }));
    return;
  }

  if (req.method === 'POST' && req.url === '/v1/messages') {
    await handleMessages(req, res);
    return;
  }

  res.writeHead(404).end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, () => {
  console.log(`Claude Code Bridge running on http://0.0.0.0:${PORT}`);
  console.log(`  POST /v1/messages  - Anthropic Messages API (forwarded to claude CLI)`);
  console.log(`  GET  /health       - health check`);
});
