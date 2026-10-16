import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { getApiBaseUrl, stopApiServer } from '../fixtures/test-server.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');

interface RequestMetric {
  endpoint: string;
  statusCode: number;
  durationMs: number;
  success: boolean;
}

interface EndpointSummary {
  endpoint: string;
  count: number;
  successCount: number;
  failCount: number;
  minMs: number;
  maxMs: number;
  meanMs: number;
  p50Ms: number;
  p90Ms: number;
  p95Ms: number;
  p99Ms: number;
}

interface BaselineReport {
  timestamp: string;
  environment: string;
  nodeVersion: string;
  platform: string;
  concurrency: number;
  totalRequests: number;
  totalDurationSec: number;
  throughputRps: number;
  overall: {
    minMs: number;
    maxMs: number;
    meanMs: number;
    p50Ms: number;
    p90Ms: number;
    p95Ms: number;
    p99Ms: number;
    successRate: number;
    errorRate: number;
  };
  endpoints: Record<string, EndpointSummary>;
  disclaimer: string;
}

function computePercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  const clampedIndex = Math.max(0, Math.min(sorted.length - 1, index));
  return Number(sorted[clampedIndex]!.toFixed(2));
}

function summarizeMetrics(metrics: RequestMetric[]): EndpointSummary {
  if (metrics.length === 0) {
    return {
      endpoint: '',
      count: 0,
      successCount: 0,
      failCount: 0,
      minMs: 0,
      maxMs: 0,
      meanMs: 0,
      p50Ms: 0,
      p90Ms: 0,
      p95Ms: 0,
      p99Ms: 0,
    };
  }

  const endpoint = metrics[0]!.endpoint;
  const count = metrics.length;
  const successCount = metrics.filter((m) => m.success).length;
  const failCount = count - successCount;

  const durations = metrics.map((m) => m.durationMs).sort((a, b) => a - b);
  const minMs = Number(durations[0]!.toFixed(2));
  const maxMs = Number(durations[durations.length - 1]!.toFixed(2));
  const sumMs = durations.reduce((acc, v) => acc + v, 0);
  const meanMs = Number((sumMs / count).toFixed(2));
  const p50Ms = computePercentile(durations, 50);
  const p90Ms = computePercentile(durations, 90);
  const p95Ms = computePercentile(durations, 95);
  const p99Ms = computePercentile(durations, 99);

  return {
    endpoint,
    count,
    successCount,
    failCount,
    minMs,
    maxMs,
    meanMs,
    p50Ms,
    p90Ms,
    p95Ms,
    p99Ms,
  };
}

async function runLoadBaseline() {
  console.log('================================================================');
  console.log(' Starting JLPT Core Load Baseline Runner (SYS-09 / N06)');
  console.log(' Acceptance: Ghi actual load metrics; không suy ra khi chưa đo');
  console.log('================================================================');

  let baseUrl = '';
  try {
    baseUrl = await getApiBaseUrl();
    console.log(`Connected to Target API: ${baseUrl}`);
  } catch (err) {
    console.error('Failed to connect to API target:', err);
    process.exit(1);
  }

  // Define realistic core workload
  // 100 requests to /health
  // 75 requests to /exams
  // 75 requests to /exams/demo-n5-1
  const targets: string[] = [
    ...Array(100).fill('/api/v1/health'),
    ...Array(75).fill('/api/v1/exams'),
    ...Array(75).fill('/api/v1/exams/demo-n5-1'),
  ];

  // Shuffle targets to simulate realistic mixed user traffic
  for (let i = targets.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = targets[i]!;
    targets[i] = targets[j]!;
    targets[j] = temp;
  }

  const concurrency = 10;
  const results: RequestMetric[] = [];
  let nextIndex = 0;

  console.log(`Executing ${targets.length} requests across ${concurrency} concurrent workers...`);
  const overallStart = performance.now();

  async function worker(workerId: number) {
    // Realistic client IP per concurrent worker to reflect distributed traffic and respect per-IP protection
    const clientIp = `198.51.100.${(workerId % 20) + 1}`;

    while (nextIndex < targets.length) {
      const idx = nextIndex++;
      const targetEndpoint = targets[idx]!;
      const url = `${baseUrl}${targetEndpoint}`;

      const t0 = performance.now();
      let statusCode = 0;
      let success = false;

      try {
        const res = await fetch(url, {
          headers: {
            'x-forwarded-for': clientIp,
            'cf-connecting-ip': clientIp,
            'user-agent': `JLPT-Load-Baseline-Worker/${workerId + 1}`,
          },
        });
        statusCode = res.status;
        success = res.ok;
        if (!res.ok) {
          const errorBody = await res.text();
          console.error(`[LoadRunner] Request failed (${res.status}) on ${targetEndpoint}: ${errorBody.slice(0, 150)}`);
        } else {
          // Consume body
          await res.text();
        }
      } catch (fetchErr) {
        statusCode = 500;
        success = false;
        console.error(`[LoadRunner] Network/Fetch error on ${targetEndpoint}:`, fetchErr);
      }

      const t1 = performance.now();
      results.push({
        endpoint: targetEndpoint,
        statusCode,
        durationMs: t1 - t0,
        success,
      });
    }
  }

  const workers = Array(concurrency)
    .fill(null)
    .map((_, i) => worker(i));
  await Promise.all(workers);

  const overallDurationSec = Number(((performance.now() - overallStart) / 1000).toFixed(3));
  const throughputRps = Number((results.length / overallDurationSec).toFixed(2));

  // Compute breakdown by endpoint
  const endpointKeys = ['/api/v1/health', '/api/v1/exams', '/api/v1/exams/demo-n5-1'];
  const endpointSummaries: Record<string, EndpointSummary> = {};

  for (const ep of endpointKeys) {
    const subset = results.filter((r) => r.endpoint === ep);
    endpointSummaries[ep] = summarizeMetrics(subset);
  }

  const allDurations = results.map((r) => r.durationMs).sort((a, b) => a - b);
  const totalSuccess = results.filter((r) => r.success).length;
  const totalFail = results.length - totalSuccess;
  const successRate = Number(((totalSuccess / results.length) * 100).toFixed(2));
  const errorRate = Number(((totalFail / results.length) * 100).toFixed(2));

  const overallSummary = {
    minMs: Number(allDurations[0]!.toFixed(2)),
    maxMs: Number(allDurations[allDurations.length - 1]!.toFixed(2)),
    meanMs: Number((allDurations.reduce((a, b) => a + b, 0) / results.length).toFixed(2)),
    p50Ms: computePercentile(allDurations, 50),
    p90Ms: computePercentile(allDurations, 90),
    p95Ms: computePercentile(allDurations, 95),
    p99Ms: computePercentile(allDurations, 99),
    successRate,
    errorRate,
  };

  const report: BaselineReport = {
    timestamp: new Date().toISOString(),
    environment: process.env.STAGING_API_URL ? 'github-actions-staging' : 'isolated-ci-runner',
    nodeVersion: process.version,
    platform: `${process.platform} (${process.arch})`,
    concurrency,
    totalRequests: results.length,
    totalDurationSec: overallDurationSec,
    throughputRps,
    overall: overallSummary,
    endpoints: endpointSummaries,
    disclaimer:
      'Actual measured load metrics; capacity is strictly derived from observed tests and NOT extrapolated without live high-concurrency measurement.',
  };

  // Ensure docs/release exists
  const outDir = path.join(REPO_ROOT, 'docs/release');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'load-baseline-metrics.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('\n================================================================');
  console.log(' ACTUAL LOAD BASELINE RESULTS:');
  console.log('================================================================');
  console.log(`Total Requests:    ${report.totalRequests}`);
  console.log(`Total Duration:    ${report.totalDurationSec}s`);
  console.log(`Actual Throughput: ${report.throughputRps} req/s`);
  console.log(`Success Rate:      ${report.overall.successRate}%`);
  console.log(`Latency p50:       ${report.overall.p50Ms} ms`);
  console.log(`Latency p90:       ${report.overall.p90Ms} ms`);
  console.log(`Latency p95:       ${report.overall.p95Ms} ms`);
  console.log(`Latency p99:       ${report.overall.p99Ms} ms`);
  console.log('----------------------------------------------------------------');
  console.log('Endpoint Breakdown:');
  for (const [ep, sum] of Object.entries(report.endpoints)) {
    console.log(
      `  ${ep.padEnd(25)} count=${sum.count} mean=${sum.meanMs}ms p50=${sum.p50Ms}ms p95=${sum.p95Ms}ms`,
    );
  }
  console.log('================================================================');
  console.log(`✓ Metrics written to: ${path.relative(REPO_ROOT, outPath)}`);

  stopApiServer();

  if (report.overall.errorRate > 5) {
    console.error(`Error rate ${report.overall.errorRate}% exceeded 5% limit!`);
    process.exit(1);
  }

  process.exit(0);
}

runLoadBaseline().catch((err) => {
  console.error('Fatal load runner error:', err);
  stopApiServer();
  process.exit(1);
});
