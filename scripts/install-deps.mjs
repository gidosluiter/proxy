import { spawnSync } from "node:child_process";
const result = spawnSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["ci"],
  {
    stdio: "inherit",
    env: { ...process.env, ONNXRUNTIME_NODE_INSTALL: "skip" },
    shell: process.platform === "win32",
  },
);
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
