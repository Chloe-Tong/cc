import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import {
  InjectorError,
  injectIntoClaudeCode,
  parseBaseUrl,
  parseTimeout,
  readEnvelope,
} from "../integrations/claude-code/inject.mjs";
import { Readable } from "node:stream";

// ── readEnvelope ────────────────────────────────────────────────────────────

test("readEnvelope parses a valid garden_wake envelope", async () => {
  const input = Readable.from([
    JSON.stringify({ version: 1, type: "garden_wake", reason: "game_turn_required", message: "Your turn." }),
  ]);
  const result = await readEnvelope(input);
  assert.equal(result.reason, "game_turn_required");
  assert.equal(result.message, "Your turn.");
});

test("readEnvelope rejects wrong version", async () => {
  const input = Readable.from([
    JSON.stringify({ version: 2, type: "garden_wake", reason: "x", message: "m" }),
  ]);
  await assert.rejects(() => readEnvelope(input), InjectorError);
});

test("readEnvelope rejects wrong type", async () => {
  const input = Readable.from([
    JSON.stringify({ version: 1, type: "other", reason: "x", message: "m" }),
  ]);
  await assert.rejects(() => readEnvelope(input), InjectorError);
});

test("readEnvelope rejects blank message", async () => {
  const input = Readable.from([
    JSON.stringify({ version: 1, type: "garden_wake", reason: "x", message: "   " }),
  ]);
  await assert.rejects(() => readEnvelope(input), InjectorError);
});

test("readEnvelope rejects non-JSON stdin", async () => {
  const input = Readable.from(["not json"]);
  await assert.rejects(() => readEnvelope(input), InjectorError);
});

// ── parseBaseUrl ────────────────────────────────────────────────────────────

test("parseBaseUrl accepts https URL", () => {
  const url = parseBaseUrl("https://code.claude.com");
  assert.equal(url.protocol, "https:");
});

test("parseBaseUrl accepts http://localhost for testing", () => {
  const url = parseBaseUrl("http://localhost:9000");
  assert.equal(url.protocol, "http:");
});

test("parseBaseUrl rejects http non-localhost", () => {
  assert.throws(() => parseBaseUrl("http://example.com"), InjectorError);
});

test("parseBaseUrl uses default when undefined", () => {
  const url = parseBaseUrl(undefined);
  assert.equal(url.hostname, "code.claude.com");
});

// ── parseTimeout ────────────────────────────────────────────────────────────

test("parseTimeout returns default when undefined", () => {
  assert.equal(parseTimeout(undefined), 15_000);
});

test("parseTimeout parses valid ms", () => {
  assert.equal(parseTimeout("30000"), 30_000);
});

test("parseTimeout rejects out-of-range value", () => {
  assert.throws(() => parseTimeout("999"), InjectorError);
  assert.throws(() => parseTimeout("200000"), InjectorError);
});

// ── injectIntoClaudeCode ────────────────────────────────────────────────────

function startMockServer(handler) {
  return new Promise((resolve, reject) => {
    const server = createServer(handler);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, baseUrl: new URL(`http://localhost:${port}`) });
    });
    server.once("error", reject);
  });
}

test("injectIntoClaudeCode sends POST to correct endpoint and returns result", async () => {
  const { server, baseUrl } = await startMockServer((req, res) => {
    assert.equal(req.method, "POST");
    assert.equal(req.url, "/api/sessions/sess_abc/send_message");
    assert.equal(req.headers.authorization, "Bearer testkey");
    assert.equal(req.headers["content-type"], "application/json");

    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      const parsed = JSON.parse(body);
      assert.equal(parsed.message, "Hello from Garden.");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ id: "msg_1" }));
    });
  });

  try {
    const result = await injectIntoClaudeCode({
      baseUrl,
      sessionId: "sess_abc",
      apiKey: "testkey",
      message: "Hello from Garden.",
      timeoutMs: 5_000,
    });
    assert.equal(result.accepted, true);
    assert.equal(result.sessionId, "sess_abc");
  } finally {
    server.close();
  }
});

test("injectIntoClaudeCode throws InjectorError on 401", async () => {
  const { server, baseUrl } = await startMockServer((_req, res) => {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ detail: "invalid token" }));
  });

  try {
    await assert.rejects(
      () =>
        injectIntoClaudeCode({
          baseUrl,
          sessionId: "sess_abc",
          apiKey: "badkey",
          message: "test",
          timeoutMs: 5_000,
        }),
      InjectorError,
    );
  } finally {
    server.close();
  }
});

test("injectIntoClaudeCode throws InjectorError on 404", async () => {
  const { server, baseUrl } = await startMockServer((_req, res) => {
    res.writeHead(404).end();
  });

  try {
    await assert.rejects(
      () =>
        injectIntoClaudeCode({
          baseUrl,
          sessionId: "no-such-session",
          apiKey: "key",
          message: "test",
          timeoutMs: 5_000,
        }),
      InjectorError,
    );
  } finally {
    server.close();
  }
});

test("injectIntoClaudeCode accepts 2xx with no JSON body", async () => {
  const { server, baseUrl } = await startMockServer((_req, res) => {
    res.writeHead(204).end();
  });

  try {
    const result = await injectIntoClaudeCode({
      baseUrl,
      sessionId: "sess_ok",
      apiKey: "key",
      message: "ping",
      timeoutMs: 5_000,
    });
    assert.equal(result.accepted, true);
  } finally {
    server.close();
  }
});
