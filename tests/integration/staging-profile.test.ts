import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';

describe('Staging & Production Infrastructure Profiles (SYS-08, SYS-15, SYS-09)', () => {
  const rootDir = path.resolve(__dirname, '../../');

  describe('Compose Profiles (Contract A12)', () => {
    it('compose.prod.yml defines all required services with strictly local ports', () => {
      const prodPath = path.join(rootDir, 'infra/compose/compose.prod.yml');
      expect(fs.existsSync(prodPath)).toBe(true);
      const content = fs.readFileSync(prodPath, 'utf-8');

      // Check required services
      expect(content).toContain('web:');
      expect(content).toContain('admin:');
      expect(content).toContain('api:');
      expect(content).toContain('worker:');
      expect(content).toContain('postgres:');
      expect(content).toContain('redis-core:');
      expect(content).toContain('redis-cache:');

      // Check port bindings strictly on 127.0.0.1
      expect(content).toContain('127.0.0.1:3000:3000');
      expect(content).toContain('127.0.0.1:3001:3000');
      expect(content).toContain('127.0.0.1:4000:4000');

      // Database and cache must NOT expose published ports
      const postgresSection = content.split('postgres:')[1]?.split('redis-core:')[0] || '';
      expect(postgresSection).not.toContain('ports:');
      expect(postgresSection).not.toContain('- "5432:5432"');

      // Images pulled from registry, no build directive in prod compose
      expect(content).toContain('image: ${IMAGE_REGISTRY:-ghcr.io}/${IMAGE_REPO:-jlpt}/jlpt-web:');
      expect(content).not.toContain('build:');
    });

    it('compose.staging.yml enforces isolated network and staging database', () => {
      const stagingPath = path.join(rootDir, 'infra/compose/compose.staging.yml');
      expect(fs.existsSync(stagingPath)).toBe(true);
      const content = fs.readFileSync(stagingPath, 'utf-8');

      expect(content).toContain('container_name: jlpt-staging-web');
      expect(content).toContain('container_name: jlpt-staging-api');
      expect(content).toContain('container_name: jlpt-staging-postgres');
      expect(content).toContain('jlpt_staging');
      expect(content).toContain('staging-postgres-data:');
      expect(content).toContain('jlpt-staging-net');
    });

    it('small.env and large.env match contract A12 memory and worker allocations', () => {
      const smallPath = path.join(rootDir, 'infra/compose/profiles/small.env');
      const largePath = path.join(rootDir, 'infra/compose/profiles/large.env');
      expect(fs.existsSync(smallPath)).toBe(true);
      expect(fs.existsSync(largePath)).toBe(true);

      const small = fs.readFileSync(smallPath, 'utf-8');
      expect(small).toContain('WEB_MEM_LIMIT=448m');
      expect(small).toContain('WEB_MAX_OLD_SPACE=320');
      expect(small).toContain('ADMIN_MEM_LIMIT=320m');
      expect(small).toContain('ADMIN_MAX_OLD_SPACE=256');
      expect(small).toContain('API_MEM_LIMIT=512m');
      expect(small).toContain('API_WORKERS=1');
      expect(small).toContain('POSTGRES_MEM_LIMIT=1024m');

      const large = fs.readFileSync(largePath, 'utf-8');
      expect(large).toContain('WEB_MEM_LIMIT=1024m');
      expect(large).toContain('WEB_MAX_OLD_SPACE=768');
      expect(large).toContain('ADMIN_MEM_LIMIT=512m');
      expect(large).toContain('ADMIN_MAX_OLD_SPACE=384');
      expect(large).toContain('API_MEM_LIMIT=1280m');
      expect(large).toContain('API_WORKERS=3');
      expect(large).toContain('POSTGRES_MEM_LIMIT=2560m');
    });
  });

  describe('PostgreSQL Profile Configs & WAL-G Dockerfile', () => {
    it('postgresql.small.conf and postgresql.large.conf comply with contract A12', () => {
      const smallConf = fs.readFileSync(path.join(rootDir, 'infra/postgres/postgresql.small.conf'), 'utf-8');
      expect(smallConf).toContain('max_connections = 60');
      expect(smallConf).toContain('shared_buffers = 256MB');
      expect(smallConf).toContain('effective_cache_size = 768MB');
      expect(smallConf).toContain('work_mem = 4MB');
      expect(smallConf).toContain("archive_command = 'wal-g wal-push %p'");

      const largeConf = fs.readFileSync(path.join(rootDir, 'infra/postgres/postgresql.large.conf'), 'utf-8');
      expect(largeConf).toContain('max_connections = 100');
      expect(largeConf).toContain('shared_buffers = 768MB');
      expect(largeConf).toContain('effective_cache_size = 2GB');
      expect(largeConf).toContain('work_mem = 8MB');
      expect(largeConf).toContain("archive_command = 'wal-g wal-push %p'");
    });

    it('infra/postgres/Dockerfile contains pg_bigm and WAL-G', () => {
      const dockerfile = fs.readFileSync(path.join(rootDir, 'infra/postgres/Dockerfile'), 'utf-8');
      expect(dockerfile).toContain('pg_bigm');
      expect(dockerfile).toContain('wal-g');
      expect(dockerfile).toContain('HEALTHCHECK');
      expect(dockerfile).toContain('mv wal-g-pg-* /usr/local/bin/wal-g');
    });
  });

  describe('Cloudflare Tunnel Ingress (Contract A13)', () => {
    it('denies admin api route before generic api routing and configures ssh', () => {
      const cfConfig = fs.readFileSync(path.join(rootDir, 'infra/cloudflared/config.yml'), 'utf-8');

      // Find indices to ensure admin block rule precedes generic api rule
      const adminBlockIdx = cfConfig.indexOf('path: ^/api/v1/admin(/.*)?$');
      const publicApiIdx = cfConfig.indexOf('path: ^/api/.*');

      expect(adminBlockIdx).toBeGreaterThan(0);
      expect(publicApiIdx).toBeGreaterThan(0);
      expect(adminBlockIdx).toBeLessThan(publicApiIdx);

      expect(cfConfig).toContain('service: http_status:404');
      expect(cfConfig).toContain('hostname: ssh.example.com');
      expect(cfConfig).toContain('service: ssh://127.0.0.1:22');
    });
  });

  describe('Operational Automation Scripts', () => {
    it('deploy.sh checks active exams, logs releases, and executes auto-rollback on failure', () => {
      const deployScript = fs.readFileSync(path.join(rootDir, 'infra/server/deploy.sh'), 'utf-8');
      expect(deployScript).toContain('ACTIVE_EXAMS');
      expect(deployScript).toContain('--force');
      expect(deployScript).toContain('RELEASES');
      expect(deployScript).toContain('docker compose -f "$COMPOSE_FILE" pull');
      expect(deployScript).toContain('Initiating automatic rollback to previous tag');
    });

    it('health-check.sh monitors disk usage threshold (80%) and backup age (26h)', () => {
      const healthScript = fs.readFileSync(path.join(rootDir, 'infra/server/health-check.sh'), 'utf-8');
      expect(healthScript).toContain('80');
      expect(healthScript).toContain('26');
      expect(healthScript).toContain('/api/v1/health');
      expect(healthScript).toContain('/healthz');
    });

    it('restore.sh disables archive_mode during drill (B3.3 zero WAL pollution)', () => {
      const restoreScript = fs.readFileSync(path.join(rootDir, 'infra/backup/restore.sh'), 'utf-8');
      expect(restoreScript).toContain('archive_mode = off');
      expect(restoreScript).toContain('RTO');
    });
  });
});
