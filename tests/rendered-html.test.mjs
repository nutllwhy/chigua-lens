import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: server } = await import(workerUrl.href);
  const configuredBasePath = process.env.PAGES_BASE_PATH?.trim();
  const basePath = configuredBasePath
    ? `/${configuredBasePath.replace(/^\/+|\/+$/g, "")}`
    : "";
  const request = new Request(`http://localhost${basePath}/`, {
    headers: { accept: "text/html" },
  });

  if (typeof server === "function") {
    return server(request);
  }

  if (typeof server?.fetch === "function") {
    return server.fetch(
      request,
      {
        ASSETS: {
          fetch: async () => new Response("Not found", { status: 404 }),
        },
      },
      {
        waitUntil() {},
        passThroughOnException() {},
      },
    );
  }

  throw new TypeError("Unsupported vinext server entry");
}

async function readDossier() {
  return JSON.parse(
    await readFile(new URL("../examples/demo/dossier.json", import.meta.url), "utf8"),
  );
}

test("server-renders the Chigua Lens fixed concept demo", async () => {
  const [response, dossier] = await Promise.all([render(), readDossier()]);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>\s*吃瓜神器 Chigua Lens/);
  assert.match(html, /吃瓜神器/);
  assert.match(html, /固定虚构案例/);
  assert.ok(html.includes(dossier.topic));
  assert.match(html, /运行固定示例/);
  assert.doesNotMatch(html, /Your site is taking shape|Starter Project/);
});

test("does not pretend the public page accepts or analyzes arbitrary input", async () => {
  const response = await render();
  const html = await response.text();

  assert.doesNotMatch(html, /<input\b/i);
  assert.doesNotMatch(html, /粘贴微博链接|输入热搜词|把瓜丢进来/);
  assert.match(html, /网页不会抓取或分析你输入的真实热点/);
  assert.match(html, /不对应任何真实事件/);
  assert.doesNotMatch(html, /今天\s*12:40|86\s*条相关微博/);
});

test("keeps every demo claim traceable to the shared virtual-source ledger", async () => {
  const dossier = await readDossier();
  assert.equal(dossier.demo, true);
  assert.ok(dossier.sources.length > 0);

  const sourceIds = new Set(dossier.sources.map((source) => source.id));
  for (const source of dossier.sources) {
    assert.match(source.url, /^demo:\/\//);
    assert.match(source.type, /虚构/);
  }

  const sourcedItems = [
    ...dossier.facts,
    ...dossier.timeline,
    ...dossier.evidence,
    dossier.claims.sideA,
    dossier.claims.sideB,
  ];
  for (const item of sourcedItems) {
    assert.ok(item.sourceIds.length > 0);
    for (const sourceId of item.sourceIds) {
      assert.ok(sourceIds.has(sourceId), `unknown source id: ${sourceId}`);
    }
  }
});

test("exposes working source-detail controls instead of dead source buttons", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

  assert.match(page, /onClick=\{\(\) => showSources\(item\.sourceIds\)\}/);
  assert.match(page, /aria-haspopup="dialog"/);
  assert.match(page, /id="source-details"/);
  assert.match(page, /demo:\/\//);
});
