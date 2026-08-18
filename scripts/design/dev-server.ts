#!/usr/bin/env node
// scripts/design/dev-server.ts
//
// Shared "boot a Next.js dev server, capture with Playwright, tear it down"
// machinery — extracted out of parity-gallery.ts (Phase 4) so parity-gate.ts
// (Phase 5) can reuse it instead of duplicating it. Both scripts import from
// here; parity-gallery.ts additionally has its own git-ref/worktree
// resolution (resolveSide) layered on top, which stays local to it since
// parity-gate.ts doesn't need a before/after pair — it gates a single
// checkout (the current worktree's HEAD, or an already-running --url).

import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export interface AppInstance {
  url: string;
  label: string;
  cleanup(): Promise<void>;
}

export async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      if (addr && typeof addr === "object") {
        const port = addr.port;
        srv.close(() => resolve(port));
      } else {
        srv.close(() => reject(new Error("could not allocate a free port")));
      }
    });
    srv.on("error", reject);
  });
}

export async function waitForServer(
  url: string,
  timeoutMs = 90_000,
): Promise<void> {
  const start = Date.now();
  let lastErr: unknown;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch (err) {
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `Dev server at ${url} never became ready: ${String(lastErr)}`,
  );
}

export function killProcessTree(proc: ChildProcess): void {
  if (!proc.pid) return;
  try {
    process.kill(-proc.pid, "SIGTERM");
  } catch {
    try {
      proc.kill("SIGTERM");
    } catch {
      /* already dead */
    }
  }
}

export async function startNextDev(
  dir: string,
  port: number,
  label: string,
): Promise<AppInstance> {
  const logPath = path.join(os.tmpdir(), `parity-${label}-${port}.log`);
  const logFd = fs.openSync(logPath, "w");
  // Turbopack refuses to resolve through a symlinked node_modules that points
  // outside the temp worktree's own filesystem root ("Symlink node_modules is
  // invalid, it points out of the filesystem root") — the symlink resolveSide()
  // creates so temp worktrees can reuse this worktree's installed deps without
  // a fresh `npm install`. Fall back to the webpack dev server whenever
  // node_modules is a symlink.
  const nodeModulesPath = path.join(dir, "node_modules");
  const nodeModulesIsSymlink =
    fs.existsSync(nodeModulesPath) &&
    fs.lstatSync(nodeModulesPath).isSymbolicLink();
  const devArgs = nodeModulesIsSymlink
    ? ["next", "dev", "-p", String(port)]
    : ["next", "dev", "--turbopack", "-p", String(port)];
  const proc = spawn("npx", devArgs, {
    cwd: dir,
    env: { ...process.env, NEXT_PUBLIC_BALLOT_ENABLED: "" },
    stdio: ["ignore", logFd, logFd],
    detached: true,
  });
  // Next 16's dev-origin CORS check silently blocks hydration (not just
  // HMR) when the app is hit at 127.0.0.1 — the dev server logs "Blocked
  // cross-origin request ... from 127.0.0.1" and React never mounts, with
  // zero console/page errors to explain why. localhost isn't subject to
  // the same check.
  const url = `http://localhost:${port}`;
  try {
    await waitForServer(url);
  } catch (err) {
    killProcessTree(proc);
    console.error(`  ↳ server log: ${logPath}`);
    throw err;
  }
  return {
    url,
    label,
    async cleanup() {
      killProcessTree(proc);
      fs.closeSync(logFd);
    },
  };
}
