#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const playwrightBin = path.join(repoRoot, 'tests/node_modules/.bin/playwright');

// Filter out bare '--' passed by npm/pnpm so flags like '--list' are parsed by Playwright CLI
const rawArgs = process.argv.slice(2);
const filteredArgs = rawArgs.filter((arg) => arg !== '--');

const defaultArgs = ['test', '-c', 'tests/playwright.config.ts', 'integration.spec.ts'];
const args = [...defaultArgs, ...filteredArgs];

const child = spawn(playwrightBin, args, {
  cwd: repoRoot,
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});
