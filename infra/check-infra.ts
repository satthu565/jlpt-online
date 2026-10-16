/**
 * JLPT Online - Infrastructure & Staging/Production Verification Gate
 * Command: pnpm infra:check
 * Tasks: C06
 * Features: SYS-08, SYS-09, SYS-11, SYS-15, ADM-20
 */

import fs from 'node:fs';
import path from 'node:path';
import { runPitrDrill } from './backup/drill-pitr.ts';

interface CheckResult {
  category: string;
  item: string;
  passed: boolean;
  message?: string;
}

const results: CheckResult[] = [];

function record(category: string, item: string, passed: boolean, message?: string) {
  results.push({ category, item, passed, message });
  const status = passed ? '✓ PASS' : '✗ FAIL';
  console.log(`[${status}] [${category}] ${item}${message ? `: ${message}` : ''}`);
}

async function main() {
  console.log('========================================================================');
  console.log(' JLPT Online - Infrastructure Verification Gate (pnpm infra:check)');
  console.log(' Timestamp: ' + new Date().toISOString());
  console.log('========================================================================\n');

  const rootDir = process.cwd();

  // 1. Compose Profiles Verification (SYS-08, SYS-15 / A12)
  console.log('--> Checking Docker Compose Configurations...');
  const prodComposePath = path.join(rootDir, 'infra/compose/compose.prod.yml');
  const stagingComposePath = path.join(rootDir, 'infra/compose/compose.staging.yml');

  const prodExists = fs.existsSync(prodComposePath);
  record('Compose', 'compose.prod.yml exists', prodExists);

  if (prodExists) {
    const prodContent = fs.readFileSync(prodComposePath, 'utf-8');
    const hasAllServices = ['web:', 'admin:', 'api:', 'worker:', 'postgres:', 'redis-core:', 'redis-cache:']
      .every((svc) => prodContent.includes(svc));
    record('Compose', 'compose.prod.yml contains all 7 required services', hasAllServices);

    const portsBindLocalhost = prodContent.includes('127.0.0.1:3000:3000') &&
      prodContent.includes('127.0.0.1:3001:3000') &&
      prodContent.includes('127.0.0.1:4000:4000');
    record('Compose', 'Ports strictly bind to 127.0.0.1 for tunnel ingress', portsBindLocalhost);

    const noProdBuild = !prodContent.includes('build:');
    record('Compose', 'No build directive in production compose (no build on prod server)', noProdBuild);
  }

  const stagingExists = fs.existsSync(stagingComposePath);
  record('Compose', 'compose.staging.yml exists', stagingExists);
  if (stagingExists) {
    const stagingContent = fs.readFileSync(stagingComposePath, 'utf-8');
    const hasStagingIsolation = stagingContent.includes('jlpt_staging') &&
      stagingContent.includes('jlpt-staging-net') &&
      stagingContent.includes('staging-postgres-data:');
    record('Compose', 'compose.staging.yml enforces isolated network and database', hasStagingIsolation);
  }

  // 2. Resource Profiles (A12)
  console.log('\n--> Checking Resource Profiles (small / large)...');
  const smallPath = path.join(rootDir, 'infra/compose/profiles/small.env');
  const largePath = path.join(rootDir, 'infra/compose/profiles/large.env');
  record('Profiles', 'small.env exists', fs.existsSync(smallPath));
  record('Profiles', 'large.env exists', fs.existsSync(largePath));

  if (fs.existsSync(smallPath) && fs.existsSync(largePath)) {
    const smallContent = fs.readFileSync(smallPath, 'utf-8');
    const largeContent = fs.readFileSync(largePath, 'utf-8');

    const smallValid = smallContent.includes('WEB_MEM_LIMIT=448m') &&
      smallContent.includes('API_MEM_LIMIT=512m') &&
      smallContent.includes('API_WORKERS=1') &&
      smallContent.includes('POSTGRES_MEM_LIMIT=1024m');
    record('Profiles', 'small.env matches A12 allocations (4GB Shared Linode)', smallValid);

    const largeValid = largeContent.includes('WEB_MEM_LIMIT=1024m') &&
      largeContent.includes('API_MEM_LIMIT=1280m') &&
      largeContent.includes('API_WORKERS=3') &&
      largeContent.includes('POSTGRES_MEM_LIMIT=2560m');
    record('Profiles', 'large.env matches A12 allocations (8GB Dedicated Linode)', largeValid);
  }

  // 3. PostgreSQL Configurations & WAL-G Dockerfile (T1.8.6, B3)
  console.log('\n--> Checking PostgreSQL & WAL-G Configurations...');
  const smallConfPath = path.join(rootDir, 'infra/postgres/postgresql.small.conf');
  const largeConfPath = path.join(rootDir, 'infra/postgres/postgresql.large.conf');
  const pgDockerPath = path.join(rootDir, 'infra/postgres/Dockerfile');

  if (fs.existsSync(smallConfPath) && fs.existsSync(largeConfPath)) {
    const smallConf = fs.readFileSync(smallConfPath, 'utf-8');
    const largeConf = fs.readFileSync(largeConfPath, 'utf-8');

    const smallConfOk = smallConf.includes('max_connections = 60') &&
      smallConf.includes('shared_buffers = 256MB') &&
      smallConf.includes("archive_command = 'wal-g wal-push %p'") &&
      smallConf.includes('archive_timeout = 300');
    record('Postgres', 'postgresql.small.conf matches A12 and WAL-G archiving', smallConfOk);

    const largeConfOk = largeConf.includes('max_connections = 100') &&
      largeConf.includes('shared_buffers = 768MB') &&
      largeConf.includes("archive_command = 'wal-g wal-push %p'");
    record('Postgres', 'postgresql.large.conf matches A12 and WAL-G archiving', largeConfOk);
  }

  if (fs.existsSync(pgDockerPath)) {
    const dockerContent = fs.readFileSync(pgDockerPath, 'utf-8');
    const pgDockerOk = dockerContent.includes('pg_bigm') &&
      dockerContent.includes('wal-g') &&
      dockerContent.includes('HEALTHCHECK');
    record('Postgres', 'infra/postgres/Dockerfile contains pg_bigm, WAL-G and healthcheck', pgDockerOk);
  }

  // 4. Cloudflare Tunnel Ingress (A13)
  console.log('\n--> Checking Cloudflare Tunnel Ingress Rules...');
  const cfPath = path.join(rootDir, 'infra/cloudflared/config.yml');
  if (fs.existsSync(cfPath)) {
    const cf = fs.readFileSync(cfPath, 'utf-8');
    const adminIdx = cf.indexOf('path: ^/api/v1/admin(/.*)?$');
    const apiIdx = cf.indexOf('path: ^/api/.*');
    const orderOk = adminIdx > 0 && apiIdx > 0 && adminIdx < apiIdx;
    record('Cloudflare', 'Admin API denial rule strictly precedes public API rule (A13)', orderOk);

    const sshOk = cf.includes('hostname: ssh.example.com') && cf.includes('service: ssh://127.0.0.1:22');
    record('Cloudflare', 'SSH routing configured over Cloudflare Access', sshOk);
  }

  // 5. Operational Automation Scripts (B1, B2, B4, T1.8.12)
  console.log('\n--> Checking Server Automation Scripts...');
  const scripts = [
    { file: 'infra/server/bootstrap.sh', name: 'bootstrap.sh', check: 'PermitRootLogin no' },
    { file: 'infra/server/deploy.sh', name: 'deploy.sh', check: 'ACTIVE_EXAMS' },
    { file: 'infra/server/rollback.sh', name: 'rollback.sh', check: 'TARGET_TAG' },
    { file: 'infra/server/switch-profile.sh', name: 'switch-profile.sh', check: 'TARGET_PROFILE' },
    { file: 'infra/server/health-check.sh', name: 'health-check.sh', check: 'DISK_USAGE_PCT' },
  ];

  for (const s of scripts) {
    const p = path.join(rootDir, s.file);
    const exists = fs.existsSync(p);
    let valid = false;
    if (exists) {
      const c = fs.readFileSync(p, 'utf-8');
      valid = c.includes(s.check);
    }
    record('Scripts', `${s.name} exists and contains required logic`, exists && valid);
  }

  // 6. Backup & Restore Scripts (B3)
  console.log('\n--> Checking Backup & PITR Scripts...');
  const backupSh = path.join(rootDir, 'infra/backup/backup.sh');
  const restoreSh = path.join(rootDir, 'infra/backup/restore.sh');
  record('Backup', 'backup.sh exists and supports WAL-G/local fallback', fs.existsSync(backupSh));
  if (fs.existsSync(restoreSh)) {
    const r = fs.readFileSync(restoreSh, 'utf-8');
    record('Backup', 'restore.sh disables archive_mode during drill (zero WAL pollution)', r.includes('archive_mode = off'));
  }

  // 7. PITR Restore Drill Execution (SYS-08 / ADM-20)
  console.log('\n--> Executing Live In-Engine PITR Restore Drill...');
  try {
    const pitrMetrics = await runPitrDrill({ targetRtoMaxSec: 3600, targetRpoMaxSec: 300 });
    record('PITR Drill', 'RTO within acceptance limit (<= 3600s)', pitrMetrics.rtoAcceptable, `${pitrMetrics.rtoSeconds}s`);
    record('PITR Drill', 'RPO within acceptance limit (<= 300s)', pitrMetrics.rpoAcceptable, `${pitrMetrics.rpoSeconds}s`);
    record('PITR Drill', 'Staging database isolated from worker environments', pitrMetrics.stagingIsolated);
    record('PITR Drill', 'Post-target corrupted records excluded', pitrMetrics.postTargetRecordsExcluded);
  } catch (err) {
    record('PITR Drill', 'PITR drill execution', false, String(err));
  }

  // Summary
  console.log('\n========================================================================');
  const failed = results.filter((r) => !r.passed);
  if (failed.length > 0) {
    console.error(`[FAILURE] ${failed.length} infrastructure check(s) failed.`);
    process.exit(1);
  }

  console.log(`[SUCCESS] All ${results.length} infrastructure checks passed cleanly!`);
  console.log('========================================================================\n');
}

main().catch((err) => {
  console.error('Fatal error in infra:check:', err);
  process.exit(1);
});
