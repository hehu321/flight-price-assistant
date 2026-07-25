#!/usr/bin/env node
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const configPath = path.join(os.homedir(), "Library", "Application Support", "FlightPriceAssistant", "bridge.json");
const client = {
  id: process.env.FLIGHT_AGENT_CLIENT_ID || "codex-local",
  name: process.env.FLIGHT_AGENT_CLIENT_NAME || "Codex",
  version: process.env.FLIGHT_AGENT_CLIENT_VERSION || "1.0.0",
};
const tools = [
  tool("get_flight_agent_status", "读取机票插件、Native Host、授权和队列状态", { type: "object", properties: {} }),
  tool("search_flights", "创建一项机票比价任务；立即返回 runId，随后调用 get_flight_search_result 获取增量结果", searchSchema()),
  tool("get_flight_search_result", "读取指定 runId 的最新航班和进度；建议间隔两秒轮询", { type: "object", required: ["runId"], properties: { runId: { type: "string" }, sinceVersion: { type: "number" } } }),
  tool("retry_flight_platform", "重新提取失败的平台，保留其他平台已有结果", { type: "object", required: ["runId"], properties: { runId: { type: "string" }, platforms: { type: "array", items: { type: "string", enum: ["ctrip", "qunar", "fliggy", "tongcheng"] } } } }),
  tool("resume_flight_search", "用户完成登录或验证码后恢复原任务", { type: "object", required: ["runId"], properties: { runId: { type: "string" } } }),
  tool("cancel_flight_search", "取消排队或执行中的查询", { type: "object", required: ["runId"], properties: { runId: { type: "string" } } }),
];

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
  let newline;
  while ((newline = input.indexOf("\n")) >= 0) {
    const line = input.slice(0, newline);
    input = input.slice(newline + 1);
    if (line.trim()) void handleJsonRpc(line);
  }
});

async function handleJsonRpc(line) {
  let request;
  try { request = JSON.parse(line); } catch { return write({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }); }
  if (request.method === "initialize") return write({ jsonrpc: "2.0", id: request.id, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "flight-agent-mcp", version: "1.0.0" } } });
  if (request.method === "notifications/initialized") return;
  if (request.method === "tools/list") return write({ jsonrpc: "2.0", id: request.id, result: { tools } });
  if (request.method === "tools/call") {
    const name = request.params?.name;
    if (!tools.some((item) => item.name === name)) return write({ jsonrpc: "2.0", id: request.id, result: toolError("UNKNOWN_TOOL", `不支持工具：${name}`) });
    const response = await callBridge(name, request.params?.arguments || {});
    return write({ jsonrpc: "2.0", id: request.id, result: response.ok ? toolResult(response.result) : toolError(response.error?.code || "UNKNOWN_ERROR", response.error?.message || "请求失败", response.error?.details) });
  }
  write({ jsonrpc: "2.0", id: request.id, error: { code: -32601, message: "Method not found" } });
}

function callBridge(method, params) {
  return new Promise((resolve) => {
    let config;
    try { config = JSON.parse(fs.readFileSync(configPath, "utf8")); } catch { return resolve({ ok: false, error: { code: "BRIDGE_UNAVAILABLE", message: "Native Host 尚未运行。请打开机票比价插件并完成 bridge:install:mac。", retryable: true } }); }
    const socket = net.createConnection(config.socketPath);
    let buffer = "";
    const id = crypto.randomUUID();
    const timeout = setTimeout(() => { socket.destroy(); resolve({ ok: false, error: { code: "EXTENSION_DISCONNECTED", message: "插件未响应，请确认 Chrome 与扩展正在运行", retryable: true } }); }, 12_000);
    socket.setEncoding("utf8");
    socket.once("error", () => { clearTimeout(timeout); resolve({ ok: false, error: { code: "BRIDGE_UNAVAILABLE", message: "无法连接 Native Host，请打开插件或执行安装诊断", retryable: true } }); });
    socket.on("data", (chunk) => {
      buffer += chunk;
      const newline = buffer.indexOf("\n");
      if (newline < 0) return;
      clearTimeout(timeout);
      socket.end();
      try { resolve(JSON.parse(buffer.slice(0, newline))); } catch { resolve({ ok: false, error: { code: "BRIDGE_PROTOCOL_ERROR", message: "Native Host 返回了无效响应" } }); }
    });
    socket.on("connect", () => socket.write(`${JSON.stringify({ token: config.token, message: { protocolVersion: 1, id, type: "request", client, method, params } })}\n`));
  });
}

function tool(name, description, inputSchema) { return { name, description, inputSchema }; }
function toolResult(value) { return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] }; }
function toolError(code, message, details) { return { isError: true, content: [{ type: "text", text: JSON.stringify({ code, message, details }, null, 2) }] }; }
function write(message) { process.stdout.write(`${JSON.stringify(message)}\n`); }
function searchSchema() {
  return { type: "object", required: ["originCity", "destinationCity", "departureDate"], properties: {
    requestId: { type: "string" }, tripType: { type: "string", enum: ["oneway", "roundtrip"] }, originCity: { type: "string" }, originCityCode: { type: "string" }, originAirport: { type: "string" }, originAirportCode: { type: "string" }, destinationCity: { type: "string" }, destinationCityCode: { type: "string" }, destinationAirport: { type: "string" }, destinationAirportCode: { type: "string" }, departureDate: { type: "string", description: "YYYY-MM-DD" }, returnDate: { type: "string", description: "YYYY-MM-DD；往返必填" }, adultCount: { type: "number", minimum: 1 }, childCount: { type: "number", minimum: 0 }, cabinClass: { type: "string", enum: ["economy", "premium_economy", "business", "first"] }, directOnly: { type: "boolean" }, enabledPlatforms: { type: "array", items: { type: "string", enum: ["ctrip", "qunar", "fliggy", "tongcheng"] } }, timeoutSeconds: { type: "number", minimum: 60, maximum: 600 },
  } };
}
