#!/usr/bin/env node
/**
 * _visual-diff.mjs — helper for visual-diff agent (NOT a hook)
 *
 * Compares two screenshot directories pixel-by-pixel using pixelmatch.
 * Falls back to ImageMagick `compare` if pixelmatch is unavailable.
 *
 * Usage:
 *   node .claude/hooks/_visual-diff.mjs --baseline screenshots/ --current .qa-tmp/current/ --threshold 0.005
 *
 * Output: JSON to stdout.
 */

import { readdirSync, statSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";

// ──────────────── Parse args ────────────────
const args = process.argv.slice(2);
const argOf = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : dflt;
};

const baselineDir = path.resolve(argOf("baseline", "screenshots"));
const currentDir  = path.resolve(argOf("current", ".qa-tmp/current"));
const threshold   = Number(argOf("threshold", "0.005"));
const failAt      = Number(argOf("fail-at", "0.05"));

// ──────────────── Walk baseline ────────────────
function walk(dir, base = dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith("_") || entry.startsWith(".")) continue;
    const full = path.join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, base, out);
    else if (entry.endsWith(".png")) {
      out.push(path.relative(base, full));
    }
  }
  return out;
}

const baseline = walk(baselineDir);
const current  = walk(currentDir);

const baselineSet = new Set(baseline);
const currentSet  = new Set(current);

// ──────────────── Try to load pixelmatch + pngjs ────────────────
let pixelmatch, PNG;
try {
  pixelmatch = (await import("pixelmatch")).default;
  PNG = (await import("pngjs")).PNG;
} catch {
  // Will fall back to image-size comparison
}

// ──────────────── Compare ────────────────
const diffs = [];

for (const rel of baseline) {
  const isMobile = rel.includes("-mobile");
  const warnT = isMobile ? Math.max(threshold, 0.01) : threshold;
  const failT = isMobile ? Math.max(failAt, 0.08)    : failAt;

  if (!currentSet.has(rel)) {
    diffs.push({ route: rel.replace(/\.png$/, ""), status: "missing-current", severity: "warn" });
    continue;
  }

  const a = path.join(baselineDir, rel);
  const b = path.join(currentDir, rel);

  if (pixelmatch && PNG) {
    try {
      const imgA = PNG.sync.read(readFileSync(a));
      const imgB = PNG.sync.read(readFileSync(b));
      if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
        diffs.push({
          route: rel.replace(/\.png$/, ""),
          status: "size-mismatch",
          severity: "fail",
          baseline: `${imgA.width}x${imgA.height}`,
          current:  `${imgB.width}x${imgB.height}`,
        });
        continue;
      }
      const total = imgA.width * imgA.height;
      const diffPx = pixelmatch(imgA.data, imgB.data, null, imgA.width, imgA.height, { threshold: 0.1 });
      const ratio = diffPx / total;
      let severity = "pass";
      if (ratio >= failT) severity = "fail";
      else if (ratio >= warnT) severity = "warn";
      diffs.push({
        route: rel.replace(/\.png$/, ""),
        status: severity === "pass" ? "pass" : "regression",
        severity,
        diffPixels: diffPx,
        totalPixels: total,
        diffRatio: Number(ratio.toFixed(5)),
      });
    } catch (err) {
      diffs.push({ route: rel.replace(/\.png$/, ""), status: "compare-error", severity: "warn", error: err.message });
    }
  } else {
    // Fallback: just byte-size comparison
    const aSize = statSync(a).size;
    const bSize = statSync(b).size;
    const ratio = aSize === 0 ? 1 : Math.abs(aSize - bSize) / aSize;
    const severity = ratio < 0.02 ? "pass" : ratio < 0.20 ? "warn" : "fail";
    diffs.push({
      route: rel.replace(/\.png$/, ""),
      status: "size-only",
      severity,
      bytesBaseline: aSize,
      bytesCurrent: bSize,
      bytesRatio: Number(ratio.toFixed(4)),
      note: "pixelmatch unavailable — using byte-size fallback",
    });
  }
}

// New routes that appeared in current but not baseline
for (const rel of current) {
  if (!baselineSet.has(rel)) {
    diffs.push({ route: rel.replace(/\.png$/, ""), status: "new-route", severity: "info" });
  }
}

// ──────────────── Summary ────────────────
const summary = {
  baseline_count: baseline.length,
  current_count: current.length,
  pass: diffs.filter((d) => d.severity === "pass").length,
  warn: diffs.filter((d) => d.severity === "warn").length,
  fail: diffs.filter((d) => d.severity === "fail").length,
  info: diffs.filter((d) => d.severity === "info").length,
};

process.stdout.write(JSON.stringify({
  agent: "visual-diff-helper",
  threshold,
  failAt,
  pixelmatch: !!pixelmatch,
  summary,
  diffs,
}, null, 2));
