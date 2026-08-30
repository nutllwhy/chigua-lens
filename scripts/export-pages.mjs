import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const clientDir = path.join(root, "dist", "client");
const serverEntry = path.join(root, "dist", "server", "index.js");
const outputDir = path.join(root, "pages-dist");

function inferBasePath() {
  const explicit = process.env.PAGES_BASE_PATH?.trim();
  if (explicit !== undefined && explicit !== "") {
    return explicit === "/" ? "" : `/${explicit.replace(/^\/+|\/+$/g, "")}`;
  }

  const repository = process.env.GITHUB_REPOSITORY?.split("/");
  if (!repository || repository.length !== 2) return "";

  const [owner, name] = repository;
  return name.toLowerCase() === `${owner.toLowerCase()}.github.io`
    ? ""
    : `/${name}`;
}

function prefixPublicPaths(html, basePath) {
  if (!basePath) return html;

  const publicPaths = [
    "/_next/",
    "/favicon.svg",
    "/og-preview.png",
    "/file.svg",
    "/globe.svg",
    "/window.svg",
  ];

  return publicPaths.reduce((value, publicPath, index) => {
    const prefixedPath = `${basePath}${publicPath}`;
    const sentinel = `__CHIGUA_PAGES_PATH_${index}__`;
    return value
      .replaceAll(prefixedPath, sentinel)
      .replaceAll(publicPath, prefixedPath)
      .replaceAll(sentinel, prefixedPath);
  }, html);
}

async function ensureBuildExists() {
  await Promise.all([fs.access(clientDir), fs.access(serverEntry)]);
}

async function normalizeClientBasePath(basePath) {
  if (!basePath) return;

  const nestedRoot = path.join(outputDir, basePath.replace(/^\/+/, ""));
  const nestedAssets = path.join(nestedRoot, "_next");
  try {
    await fs.access(nestedAssets);
  } catch {
    return;
  }

  await fs.rename(nestedAssets, path.join(outputDir, "_next"));
  await fs.rm(nestedRoot, { recursive: true, force: true });
}

async function renderHome(basePath) {
  const server = await import(`${pathToFileURL(serverEntry).href}?pages-export=${Date.now()}`);
  const response = await server.default.fetch(
    new Request(`https://pages.local${basePath || ""}/`),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      passThroughOnException() {},
      waitUntil() {},
    },
  );

  if (!response.ok) {
    throw new Error(`Static render failed with HTTP ${response.status}`);
  }

  return response.text();
}

async function main() {
  await ensureBuildExists();
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.cp(clientDir, outputDir, { recursive: true });

  const basePath = inferBasePath();
  await normalizeClientBasePath(basePath);
  const html = prefixPublicPaths(await renderHome(basePath), basePath);
  await Promise.all([
    fs.writeFile(path.join(outputDir, "index.html"), html),
    fs.writeFile(path.join(outputDir, "404.html"), html),
    fs.writeFile(path.join(outputDir, ".nojekyll"), ""),
  ]);

  console.log(
    `GitHub Pages bundle written to ${outputDir} (base path: ${basePath || "/"})`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
