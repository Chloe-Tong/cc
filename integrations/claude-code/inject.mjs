#!/usr/bin/env node

/**
 * Claude Code Remote injector for Galatea Garden wake bridge.
 *
 * Reads a Garden wake envelope from stdin and delivers the message into a
 * running Claude Code Remote session via the claude.ai API.
 *
 * Required environment variables:
 *   CLAUDE_CODE_SESSION_ID   Target session ID (e.g. session_abc123...)
 *   CLAUDE_CODE_API_KEY      claude.ai session token or API key
 *
 * Optional environment variables:
 *   CLAUDE_CODE_API_BASE_URL Base URL (default: https://code.claude.com)
 *   CLAUDE_CODE_TIMEOUT_MS   Per-request timeout in ms (default: 15000)
 *
 * Configure in wake bridge:
 *   GARDEN_INJECTOR_EXECUTABLE=node
 *   GARDEN_INJECTOR_ARGS_JSON='["/absolute/path/to/integrations/claude-code/inject.mjs"]'
 */

import process from "node:process";
import { pathToFileURL } from "node:url";

const MAX_INPUT_BYTES = 64 * 1024;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_BASE_URL = "https://code.claude.com";

class InjectorError extends Error {
  constructor(message) {
    super(message);
    this.name = "InjectorError";
  }
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new InjectorError(`${name} is required`);
  }
  return value;
}

function parseTimeout(value) {
  if (!value?.trim()) return DEFAULT_TIMEOUT_MS;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1_000 || parsed > 120_000) {
    throw new InjectorError(
      "CLAUDE_CODE_TIMEOUT_MS must be an integer from 1000 to 120000",
    );
  }
  return parsed;
}

function parseBaseUrl(value) {
  const raw = value?.trim() || DEFAULT_BASE_URL;
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new InjectorError("CLAUDE_CODE_API_BASE_URL must be a valid URL");
  }
  if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) {
    throw new InjectorError("CLAUDE_CODE_API_BASE_URL must use HTTPS (or http://localhost for testing)");
  }
  return url;
}

async function readEnvelope(input = process.stdin) {
  let body = "";
  input.setEncoding("utf8");
  for await (const chunk of input) {
    body += chunk;
    if (Buffer.byteLength(body, "utf8") > MAX_INPUT_BYTES) {
      throw new InjectorError(`stdin exceeds ${MAX_INPUT_BYTES} bytes`);
    }
  }

  let envelope;
  try {
    envelope = JSON.parse(body);
  } catch {
    throw new InjectorError("stdin must contain one JSON wake envelope");
  }

  if (
    envelope === null ||
    typeof envelope !== "object" ||
    envelope.version !== 1 ||
    envelope.type !== "garden_wake"
  ) {
    throw new InjectorError("unsupported wake envelope");
  }

  const reason = envelope.reason;
  const message = envelope.message;

  if (typeof reason !== "string" || reason.trim() === "") {
    throw new InjectorError("wake reason must be a non-empty string");
  }
  if (typeof message !== "string" || message.trim() === "") {
    throw new InjectorError("wake message must be a non-empty string");
  }

  return { reason, message };
}

/**
 * Send a message to a Claude Code Remote session.
 *
 * POST /api/sessions/{sessionId}/send_message
 * Authorization: Bearer <apiKey>
 * Content-Type: application/json
 *
 * Body: { "message": "<text>" }
 */
async function injectIntoClaudeCode({ baseUrl, sessionId, apiKey, message, timeoutMs }) {
  const url = new URL(`/api/sessions/${encodeURIComponent(sessionId)}/send_message`, baseUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: JSON.stringify({ message }),
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new InjectorError(`request to Claude Code timed out after ${timeoutMs}ms`);
    }
    throw new InjectorError(
      `Claude Code request failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.text();
      const parsed = JSON.parse(body);
      if (typeof parsed?.detail === "string") {
        detail = parsed.detail;
      } else if (typeof parsed?.error === "string") {
        detail = parsed.error;
      } else if (typeof parsed?.message === "string") {
        detail = parsed.message;
      }
    } catch {
      // Ignore parse failures; use status only.
    }
    throw new InjectorError(
      detail
        ? `Claude Code rejected message (HTTP ${response.status}): ${detail}`
        : `Claude Code rejected message with HTTP ${response.status}`,
    );
  }

  let result;
  try {
    result = await response.json();
  } catch {
    // A 2xx without a parseable JSON body is still an accepted delivery.
    return { accepted: true, sessionId };
  }

  return { accepted: true, sessionId, ...result };
}

async function main() {
  const envelope = await readEnvelope(process.stdin);

  const sessionId = requireEnv("CLAUDE_CODE_SESSION_ID");
  const apiKey = requireEnv("CLAUDE_CODE_API_KEY");
  const baseUrl = parseBaseUrl(process.env.CLAUDE_CODE_API_BASE_URL);
  const timeoutMs = parseTimeout(process.env.CLAUDE_CODE_TIMEOUT_MS);

  const result = await injectIntoClaudeCode({
    baseUrl,
    sessionId,
    apiKey,
    message: envelope.message,
    timeoutMs,
  });

  process.stdout.write(`${JSON.stringify(result)}\n`);
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Claude Code injector failed: ${message}\n`);
    process.exitCode = 1;
  });
}

export { InjectorError, injectIntoClaudeCode, parseBaseUrl, parseTimeout, readEnvelope };
