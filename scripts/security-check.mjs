#!/usr/bin/env node
/**
 * 安全檢查 — 公開 repo 前的必要把關
 * 零相依、純 Node，可在本機 pre-commit 與 CI 重複執行。
 *
 * 檢查項目：
 *  1. .env / .env.local 等密鑰檔不可被 git 追蹤
 *  2. 原始碼不可出現 service_role 金鑰（會解碼 JWT payload 確認 role）
 *  3. 不可有 PRIVATE KEY 區塊
 *  4. NEXT_PUBLIC_ 變數名不可含 SERVICE_ROLE / SECRET / PASSWORD（會打包進前端）
 *  5. 帶 'use client' 的檔案不可引用 service_role 金鑰
 *  6. .gitignore 必須忽略 .env 類檔案
 *
 * 用法：
 *   node scripts/security-check.mjs           # CRITICAL 才會 fail（pre-commit 用）
 *   node scripts/security-check.mjs --strict  # WARN 也會 fail（CI 用）
 */

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { extname, basename } from "node:path";

const STRICT = process.argv.includes("--strict");

// 不掃描的副檔名（二進位 / 鎖檔）與路徑
const SKIP_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg", ".pdf",
  ".woff", ".woff2", ".ttf", ".eot", ".zip", ".gz", ".xlsx", ".lock",
]);
const SKIP_PATH = [
  "node_modules/", ".next/", "dist/", "build/",
  "package-lock.json", "pnpm-lock.yaml", "yarn.lock",
  // 本腳本與範例檔本身含有偵測字樣，排除以免自我誤報
  "scripts/security-check.mjs",
  ".env.example",
];

const findings = []; // {sev, file, msg}
const add = (sev, file, msg) => findings.push({ sev, file, msg });

function repoRoot() {
  return execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
}
function trackedFiles() {
  return execSync("git ls-files", { encoding: "utf8" }).split("\n").filter(Boolean);
}

// 嘗試把 JWT payload 解出來，看 role 是什麼
function jwtRole(token) {
  try {
    const payload = token.split(".")[1];
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const obj = JSON.parse(json);
    return obj.role || null;
  } catch {
    return null;
  }
}

const JWT_RE = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{6,}/g;
const PRIVATE_KEY_RE = /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/;
const NEXT_PUBLIC_SECRET_RE = /NEXT_PUBLIC_[A-Z0-9_]*(SERVICE_ROLE|SECRET|PASSWORD|PRIVATE)/;
const SERVICE_ROLE_ASSIGN_RE = /SERVICE_ROLE[A-Z_]*\s*[:=]\s*['"`]?eyJ/;

function scanFile(rel, text) {
  // 2 & 3：JWT / 私鑰
  for (const m of text.matchAll(JWT_RE)) {
    const tok = m[0];
    const role = jwtRole(tok);
    if (role === "service_role") {
      add("CRITICAL", rel, "原始碼含 service_role 金鑰（JWT payload role=service_role）。公開前必須移除並輪替金鑰。");
    } else if (role === "anon") {
      add("WARN", rel, "硬編碼了 anon 金鑰。建議改從環境變數讀，不要寫死在原始碼。");
    } else {
      add("WARN", rel, "出現疑似 JWT 字串，請人工確認是否為金鑰。");
    }
  }
  if (PRIVATE_KEY_RE.test(text)) {
    add("CRITICAL", rel, "原始碼含 PRIVATE KEY 區塊。");
  }
  // 4：NEXT_PUBLIC_ 名稱卻含 secret 字樣
  for (const line of text.split("\n")) {
    if (NEXT_PUBLIC_SECRET_RE.test(line)) {
      add("CRITICAL", rel, `NEXT_PUBLIC_ 變數疑似裝了密鑰，會被打包進前端：${line.trim().slice(0, 80)}`);
    }
    if (SERVICE_ROLE_ASSIGN_RE.test(line)) {
      add("CRITICAL", rel, `疑似把 service_role 金鑰寫進檔案：${line.trim().slice(0, 80)}`);
    }
  }
  // 5：client 元件不可引用 service_role
  if (/^\s*['"]use client['"]/m.test(text) && /SERVICE_ROLE/.test(text)) {
    add("CRITICAL", rel, "'use client' 檔案引用了 SERVICE_ROLE —— service_role 絕不可出現在前端執行的程式。");
  }
}

function main() {
  const root = repoRoot();
  process.chdir(root);
  const files = trackedFiles();

  // 1：env 密鑰檔被追蹤
  for (const f of files) {
    const b = basename(f);
    if (/^\.env(\..*)?$/.test(b) && b !== ".env.example") {
      add("CRITICAL", f, "密鑰檔被 git 追蹤，公開後會外洩。請 `git rm --cached` 並加進 .gitignore，必要時輪替金鑰。");
    }
  }

  // 6：.gitignore 是否忽略 env
  if (existsSync(".gitignore")) {
    const gi = readFileSync(".gitignore", "utf8");
    if (!/(^|\n)\s*\.env(\*|\.local|\.\*\.local|\b)/.test(gi)) {
      add("WARN", ".gitignore", "未明確忽略 .env 類檔案，建議加入 `.env*` 並保留 `!.env.example`。");
    }
  } else {
    add("WARN", "(root)", "找不到 .gitignore。");
  }

  // 2~5：逐檔掃描
  for (const f of files) {
    if (SKIP_PATH.some((p) => f === p || f.startsWith(p))) continue;
    if (SKIP_EXT.has(extname(f).toLowerCase())) continue;
    let text;
    try { text = readFileSync(f, "utf8"); } catch { continue; }
    if (text.includes("\u0000")) continue; // 二進位
    scanFile(f, text);
  }

  // 輸出
  const crit = findings.filter((x) => x.sev === "CRITICAL");
  const warn = findings.filter((x) => x.sev === "WARN");
  const line = (x) => `  [${x.sev}] ${x.file}\n          ${x.msg}`;

  if (findings.length === 0) {
    console.log("✅ 安全檢查通過：未發現密鑰外洩或設定問題。");
    process.exit(0);
  }
  if (crit.length) { console.log("\n❌ CRITICAL（必須修正）："); crit.forEach((x) => console.log(line(x))); }
  if (warn.length) { console.log("\n⚠️  WARN（建議處理）："); warn.forEach((x) => console.log(line(x))); }
  console.log("");

  const fail = crit.length > 0 || (STRICT && warn.length > 0);
  process.exit(fail ? 1 : 0);
}

main();
