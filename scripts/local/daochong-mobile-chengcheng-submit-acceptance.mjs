#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

const ACCEPTANCE_URL =
  process.env.DAOCHONG_MOBILE_ACCEPTANCE_URL ?? "http://127.0.0.1:3102/daochong-mobile";
const CHROME_PATH =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const CHROME_PORT_ENV = process.env.DAOCHONG_MOBILE_CHROME_PORT;
const SCREENSHOT_PATH =
  process.env.DAOCHONG_MOBILE_SUBMIT_SCREENSHOT ??
  "/tmp/daochong-recharge-local-test-submit-panel.png";

const acceptanceUrl = new URL(ACCEPTANCE_URL);
const baseUrl = `${acceptanceUrl.protocol}//${acceptanceUrl.host}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function responseHeaders(extra = {}) {
  return Object.entries({
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,HEAD,OPTIONS,PATCH",
    "access-control-allow-headers":
      "authorization,content-type,x-huigui-record-scope,x-huigui-test-batch-id,accept",
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
    ...extra,
  }).map(([name, value]) => ({ name, value }));
}

function base64Json(payload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

function assertAcceptance(condition, message, details = undefined) {
  if (!condition) {
    const error = new Error(message);
    error.details = details;
    throw error;
  }
}

function getAvailablePort() {
  if (CHROME_PORT_ENV) {
    return Promise.resolve(Number(CHROME_PORT_ENV));
  }

  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close(() => {
        if (!port) reject(new Error("Could not allocate a Chrome debugging port"));
        else resolve(port);
      });
    });
  });
}

async function waitForChrome(port) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch {
      // Keep polling until Chrome opens its debugging port.
    }
    await sleep(250);
  }
  throw new Error(`Chrome did not open debugging port ${port}`);
}

async function connectToTab(wsUrl, onEvent) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", () => reject(new Error("Chrome websocket failed")), { once: true });
  });

  let id = 1;
  const pending = new Map();
  ws.addEventListener("message", async (event) => {
    const text =
      typeof event.data === "string"
        ? event.data
        : Buffer.from(await event.data.arrayBuffer()).toString("utf8");
    const message = JSON.parse(text);
    if (message.id && pending.has(message.id)) {
      const waiter = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
      else waiter.resolve(message.result);
      return;
    }
    if (message.method && onEvent) {
      onEvent(message);
    }
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const callId = id++;
    pending.set(callId, { resolve, reject });
    ws.send(JSON.stringify({ id: callId, method, params }));
  });

  return { send, ws };
}

async function evaluateJson(send, body) {
  const result = await send("Runtime.evaluate", {
    awaitPromise: true,
    expression: `(async () => JSON.stringify(await (async () => { ${body} })()))()`,
  });
  if (result.exceptionDetails) {
    throw new Error(JSON.stringify(result.exceptionDetails));
  }
  return JSON.parse(result.result.value);
}

function makeRechargeFixture() {
  const now = new Date("2026-06-24T10:00:00.000Z");
  return [
    {
      id: "test-approve-1",
      amount: "88",
      balanceAppliedAt: null,
      cashAmount: null,
      cashCustodian: null,
      cashPhotoAssetIds: [],
      chengchengApprovedAt: null,
      chengchengApprover: null,
      createdAt: now.toISOString(),
      customer: { id: "test-customer", name: "TEST Chengcheng approval customer" },
      evidenceAssetIds: ["ev-approve"],
      financeSummaryMonth: null,
      limengReviewedAt: null,
      limengReviewer: null,
      paymentMethod: "WECHAT",
      rechargeStatus: "PENDING_CHENGCHENG_APPROVAL",
      returnReason: null,
      submittedBy: { id: "teacher-1", loginAccount: "teacher", name: "Test teacher" },
      updatedAt: now.toISOString(),
    },
    {
      id: "test-return-1",
      amount: "66",
      balanceAppliedAt: null,
      cashAmount: null,
      cashCustodian: null,
      cashPhotoAssetIds: [],
      chengchengApprovedAt: null,
      chengchengApprover: null,
      createdAt: now.toISOString(),
      customer: { id: "test-customer", name: "TEST return customer" },
      evidenceAssetIds: ["ev-return"],
      financeSummaryMonth: null,
      limengReviewedAt: null,
      limengReviewer: null,
      paymentMethod: "OTHER",
      rechargeStatus: "PENDING_CHENGCHENG_APPROVAL",
      returnReason: null,
      submittedBy: { id: "teacher-2", loginAccount: "teacher2", name: "Test teacher 2" },
      updatedAt: now.toISOString(),
    },
  ];
}

async function run() {
  assertAcceptance(existsSync(CHROME_PATH), `Chrome was not found at ${CHROME_PATH}`);
  mkdirSync(path.dirname(SCREENSHOT_PATH), { recursive: true });

  const fixtureDate = new Date("2026-06-24T10:00:00.000Z");
  const recharges = makeRechargeFixture();
  const apiLog = [];
  let send;
  const chromePort = await getAvailablePort();
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${chromePort}`,
    `--user-data-dir=${path.join(tmpdir(), `dao-mobile-acceptance-${Date.now()}`)}`,
    "--headless=new",
    "--disable-gpu",
    "--no-default-browser-check",
    "--no-first-run",
    "--window-size=390,900",
  ], { stdio: "ignore" });

  try {
    await waitForChrome(chromePort);
    const tabResponse = await fetch(
      `http://127.0.0.1:${chromePort}/json/new?${encodeURIComponent("about:blank")}`,
      { method: "PUT" },
    );
    const tab = await tabResponse.json();
    const connection = await connectToTab(tab.webSocketDebuggerUrl, async (message) => {
      if (message.method !== "Fetch.requestPaused") return;

      const { request, requestId } = message.params;
      const method = request.method.toUpperCase();
      const url = request.url;
      const postData = request.postData ?? null;
      const tracked = url.includes("/api/daochong/mobile/recharges");
      if (tracked && method !== "OPTIONS") {
        apiLog.push({ method, postData, url });
      }

      const fulfill = (status, payload) => send("Fetch.fulfillRequest", {
        body: payload === null ? "" : base64Json(payload),
        requestId,
        responseCode: status,
        responseHeaders: responseHeaders(),
      });

      try {
        if (method === "OPTIONS") {
          await send("Fetch.fulfillRequest", {
            body: "",
            requestId,
            responseCode: 204,
            responseHeaders: responseHeaders({ "content-type": "text/plain" }),
          });
          return;
        }

        if (method === "GET" && url.includes("/api/daochong/mobile/recharges")) {
          await fulfill(200, {
            diagnostics: [{ key: "local_test_stub", message: "local TEST stub" }],
            items: recharges,
          });
          return;
        }

        const approval = url.match(/\/api\/daochong\/mobile\/recharges\/([^/]+)\/chengcheng-approval/);
        if (method === "PATCH" && approval) {
          const id = decodeURIComponent(approval[1]);
          const item = recharges.find((record) => record.id === id);
          if (!item || item.rechargeStatus !== "PENDING_CHENGCHENG_APPROVAL") {
            await fulfill(409, { message: "not pending" });
            return;
          }
          item.rechargeStatus = "PENDING_LIMENG_REVIEW";
          item.chengchengApprover = { id: "chengcheng-user", name: "Chengcheng" };
          item.chengchengApprovedAt = fixtureDate.toISOString();
          item.updatedAt = new Date(fixtureDate.getTime() + 1000).toISOString();
          await fulfill(200, {
            action: "chengcheng_approved_pending_limeng_review",
            item,
            ok: true,
            safety: { balanceApplied: false, financeConfirmed: false, wecomSent: false },
          });
          return;
        }

        const returned = url.match(/\/api\/daochong\/mobile\/recharges\/([^/]+)\/chengcheng-return/);
        if (method === "PATCH" && returned) {
          const id = decodeURIComponent(returned[1]);
          const item = recharges.find((record) => record.id === id);
          const body = postData ? JSON.parse(postData) : {};
          if (!item || item.rechargeStatus !== "PENDING_CHENGCHENG_APPROVAL") {
            await fulfill(409, { message: "not pending" });
            return;
          }
          item.rechargeStatus = "RETURNED_BY_CHENGCHENG";
          item.returnReason = String(body.returnReason || "");
          item.updatedAt = new Date(fixtureDate.getTime() + 2000).toISOString();
          await fulfill(200, {
            action: "chengcheng_returned",
            item,
            ok: true,
            safety: { balanceApplied: false, financeConfirmed: false, wecomSent: false },
          });
          return;
        }

        if (method !== "GET") {
          await fulfill(405, { message: "local TEST stub rejected non-test write" });
          return;
        }

        if (url.includes("/api/products")) {
          await fulfill(200, []);
          return;
        }

        await fulfill(200, { items: [] });
      } catch (error) {
        await fulfill(500, { message: String(error?.message ?? error) });
      }
    });
    send = connection.send;

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Fetch.enable", {
      patterns: [
        { requestStage: "Request", urlPattern: "*://*/api/*" },
      ],
    });
    await send("Emulation.setDeviceMetricsOverride", {
      deviceScaleFactor: 2,
      height: 900,
      mobile: true,
      width: 390,
    });

    await send("Page.navigate", { url: baseUrl });
    await sleep(1000);

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 2);
    await evaluateJson(send, `
      localStorage.setItem('huigui_token', 'local-test-token');
      localStorage.setItem('huigui_user', ${JSON.stringify(JSON.stringify({
        displayName: "Chengcheng",
        id: "chengcheng-user",
        name: "Chengcheng",
        permissions: ["page.customers.detail"],
        roleCode: "SUPER_ADMIN",
        roleName: "Super Admin",
        username: "chengcheng",
      }))});
      localStorage.setItem('huigui_auth_last_login_at', ${JSON.stringify(now.toISOString())});
      localStorage.setItem('huigui_auth_expires_at', ${JSON.stringify(expiresAt.toISOString())});
      localStorage.setItem('huigui-record-scope', 'TEST');
      localStorage.setItem('huigui-test-batch-id', 'local-daochong-submit-acceptance');
      return true;
    `);

    await send("Page.navigate", { url: ACCEPTANCE_URL });
    await sleep(8500);
    await evaluateJson(send, `document.querySelector('[data-testid="daochong-role-chengcheng"]')?.click(); return true;`);
    await sleep(1000);
    await evaluateJson(send, `document.querySelector('[data-testid="daochong-create-button"]')?.click(); return true;`);
    await sleep(400);
    await evaluateJson(send, `document.querySelector('[data-testid="daochong-create-recharge"]')?.click(); return true;`);
    await sleep(2000);

    const before = await evaluateJson(send, `
      const items = Array.from(document.querySelectorAll('[data-testid="daochong-recharge-approval-item"]'));
      return {
        approveDisabled: document.querySelector('[data-testid="daochong-recharge-chengcheng-approve"]')?.disabled ?? null,
        first: items[0]?.textContent?.replace(/\\s+/g, ' ').trim() || null,
        itemCount: items.length,
        returnDisabled: document.querySelector('[data-testid="daochong-recharge-chengcheng-return"]')?.disabled ?? null,
        second: items[1]?.textContent?.replace(/\\s+/g, ' ').trim() || null,
      };
    `);
    assertAcceptance(before.itemCount === 2, "Expected two local TEST approval candidates", before);
    assertAcceptance(before.approveDisabled === false, "Approve should be enabled for Chengcheng", before);
    assertAcceptance(before.returnDisabled === true, "Return should be disabled until a reason is entered", before);

    await evaluateJson(send, `document.querySelector('[data-testid="daochong-recharge-chengcheng-approve"]')?.click(); return true;`);
    await sleep(2200);
    const afterApprove = await evaluateJson(send, `
      const items = Array.from(document.querySelectorAll('[data-testid="daochong-recharge-approval-item"]'));
      return {
        first: items[0]?.textContent?.replace(/\\s+/g, ' ').trim() || null,
        second: items[1]?.textContent?.replace(/\\s+/g, ' ').trim() || null,
        status: document.querySelector('[data-testid="daochong-recharge-approval-status"]')?.textContent?.replace(/\\s+/g, ' ').trim() || null,
      };
    `);
    assertAcceptance(
      recharges.find((item) => item.id === "test-approve-1")?.rechargeStatus === "PENDING_LIMENG_REVIEW",
      "Approve did not move the recharge to Limeng review",
      { afterApprove, records: recharges },
    );

    await evaluateJson(send, `
      const items = Array.from(document.querySelectorAll('[data-testid="daochong-recharge-approval-item"]'));
      items[1]?.click();
      return true;
    `);
    await sleep(500);
    await evaluateJson(send, `
      const textarea = document.querySelector('[data-testid="daochong-recharge-return-reason"]');
      textarea.focus();
      return true;
    `);
    await send("Input.insertText", { text: "TEST acceptance return reason: evidence amount needs reupload" });
    await sleep(700);
    const beforeReturn = await evaluateJson(send, `
      return {
        approveDisabled: document.querySelector('[data-testid="daochong-recharge-chengcheng-approve"]')?.disabled ?? null,
        reason: document.querySelector('[data-testid="daochong-recharge-return-reason"]')?.value || null,
        returnDisabled: document.querySelector('[data-testid="daochong-recharge-chengcheng-return"]')?.disabled ?? null,
      };
    `);
    assertAcceptance(beforeReturn.returnDisabled === false, "Return should be enabled after typing a reason", beforeReturn);

    await evaluateJson(send, `document.querySelector('[data-testid="daochong-recharge-chengcheng-return"]')?.click(); return true;`);
    await sleep(2200);
    const afterReturn = await evaluateJson(send, `
      const items = Array.from(document.querySelectorAll('[data-testid="daochong-recharge-approval-item"]'));
      const panel = document.querySelector('[data-testid="daochong-recharge-chengcheng-panel"]');
      panel?.scrollIntoView({ block: 'center' });
      const rect = panel?.getBoundingClientRect();
      return {
        approveDisabled: document.querySelector('[data-testid="daochong-recharge-chengcheng-approve"]')?.disabled ?? null,
        bodyWidth: document.body.scrollWidth,
        first: items[0]?.textContent?.replace(/\\s+/g, ' ').trim() || null,
        itemCount: items.length,
        panelRect: rect ? { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) } : null,
        returnDisabled: document.querySelector('[data-testid="daochong-recharge-chengcheng-return"]')?.disabled ?? null,
        second: items[1]?.textContent?.replace(/\\s+/g, ' ').trim() || null,
        status: document.querySelector('[data-testid="daochong-recharge-approval-status"]')?.textContent?.replace(/\\s+/g, ' ').trim() || null,
        viewportWidth: window.innerWidth,
      };
    `);

    assertAcceptance(
      recharges.find((item) => item.id === "test-return-1")?.rechargeStatus === "RETURNED_BY_CHENGCHENG",
      "Return did not move the recharge to returned state",
      { afterReturn, records: recharges },
    );
    assertAcceptance(afterReturn.bodyWidth <= afterReturn.viewportWidth, "Mobile viewport has horizontal overflow", afterReturn);

    const patchCalls = apiLog.filter((entry) => entry.method === "PATCH");
    assertAcceptance(patchCalls.length === 2, "Expected exactly two PATCH calls", patchCalls);
    assertAcceptance(
      patchCalls.every((entry) => /chengcheng-(approval|return)$/.test(entry.url)),
      "Unexpected PATCH endpoint was called",
      patchCalls,
    );

    const screenshot = await send("Page.captureScreenshot", {
      captureBeyondViewport: true,
      format: "png",
    });
    writeFileSync(SCREENSHOT_PATH, Buffer.from(screenshot.data, "base64"));

    connection.ws.close();
    return {
      afterApprove,
      afterReturn,
      apiLog,
      before,
      beforeReturn,
      records: recharges.map((item) => ({
        id: item.id,
        returnReason: item.returnReason,
        status: item.rechargeStatus,
      })),
      screenshot: SCREENSHOT_PATH,
    };
  } finally {
    chrome.kill("SIGTERM");
  }
}

run()
  .then((details) => {
    console.log(JSON.stringify({
      details,
      status: "pass",
      touchesDatabase: false,
      writesProduction: false,
    }, null, 2));
  })
  .catch((error) => {
    console.error(JSON.stringify({
      details: error.details ?? null,
      message: error.message,
      status: "fail",
      touchesDatabase: false,
      writesProduction: false,
    }, null, 2));
    process.exit(1);
  });
