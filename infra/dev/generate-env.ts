/**
 * CLI utility to generate .env files for workers
 * Task: F07
 * Usage: node --experimental-strip-types infra/dev/generate-env.ts [workerId] [--write]
 */
import fs from "node:fs";
import path from "node:path";
import {
  WORKER_IDS,
  formatEnvFile,
  validateWorkerConfigs,
} from "./worker-env.ts";

const args = process.argv.slice(2);
const shouldWrite = args.includes("--write");
const targetWorker = args.find((a) => !a.startsWith("--"));

const validation = validateWorkerConfigs();
if (!validation.ok) {
  console.error("Validation failed:");
  for (const err of validation.errors) {
    console.error(`- ${err}`);
  }
  process.exit(1);
}

const workers = targetWorker ? [targetWorker] : WORKER_IDS;

for (const wid of workers) {
  try {
    const content = formatEnvFile(wid);
    if (shouldWrite) {
      const outPath = path.resolve(process.cwd(), `.env.${wid.toLowerCase()}`);
      fs.writeFileSync(outPath, content, "utf8");
      console.log(`Generated: ${outPath}`);
    } else {
      console.log(`--- [${wid}] ---`);
      console.log(content);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Failed to generate env for ${wid}: ${msg}`);
    process.exit(1);
  }
}
