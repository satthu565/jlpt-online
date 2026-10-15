import * as fs from 'node:fs';
import * as path from 'node:path';
import { generateOpenApiYaml } from './openapi-builder.js';
import { generateApiClientCode } from './client-generator.js';
import {
  ApiErrorEnvelopeSchema,
  PublicExamSnapshotSchema,
  assertNoAnswerLeak,
  ExamAnswerKeySchema,
  EventEnvelopeSchema,
  ErrorCodeSchema,
} from '../index.js';

export function runCheck(rootDir: string): void {
  console.log('[contracts:check] Starting contract integrity checks...');

  // 1. Check OpenAPI YAML drift
  const openApiPath = path.resolve(rootDir, 'contracts/openapi.yaml');
  if (!fs.existsSync(openApiPath)) {
    throw new Error(`[contracts:check] Missing file: ${openApiPath}`);
  }
  const actualYaml = fs.readFileSync(openApiPath, 'utf-8');
  const expectedYaml = generateOpenApiYaml();
  if (actualYaml !== expectedYaml) {
    throw new Error(
      `[contracts:check] Drift detected in contracts/openapi.yaml. Run 'pnpm contracts:generate' to update.`,
    );
  }
  console.log('✓ contracts/openapi.yaml is up to date (0 drift)');

  // 2. Check API Client drift
  const clientPath = path.resolve(rootDir, 'packages/api-client/src/index.ts');
  if (!fs.existsSync(clientPath)) {
    throw new Error(`[contracts:check] Missing file: ${clientPath}`);
  }
  const actualClient = fs.readFileSync(clientPath, 'utf-8');
  const expectedClient = generateApiClientCode();
  if (actualClient !== expectedClient) {
    throw new Error(
      `[contracts:check] Drift detected in packages/api-client/src/index.ts. Run 'pnpm contracts:generate' to update.`,
    );
  }
  console.log('✓ packages/api-client/src/index.ts is up to date (0 drift)');

  // 3. Check events.schema.json
  const eventsSchemaPath = path.resolve(rootDir, 'contracts/events.schema.json');
  if (!fs.existsSync(eventsSchemaPath)) {
    throw new Error(`[contracts:check] Missing file: ${eventsSchemaPath}`);
  }
  const eventsSchema = JSON.parse(fs.readFileSync(eventsSchemaPath, 'utf-8')) as Record<string, unknown>;
  if (eventsSchema.$schema !== 'http://json-schema.org/draft-07/schema#') {
    throw new Error(`[contracts:check] Invalid $schema in contracts/events.schema.json`);
  }
  console.log('✓ contracts/events.schema.json parsed successfully');

  // 4. Validate Error Fixtures for all ErrorCodes
  const errorsFixturePath = path.resolve(rootDir, 'fixtures/contracts/errors.json');
  const errorsCatalog = JSON.parse(fs.readFileSync(errorsFixturePath, 'utf-8')) as Record<
    string,
    unknown
  >;
  const allCodes = ErrorCodeSchema.options;
  for (const code of allCodes) {
    const errorObj = errorsCatalog[code];
    if (!errorObj) {
      throw new Error(`[contracts:check] Missing fixture example for error code: ${code}`);
    }
    const parsed = ApiErrorEnvelopeSchema.safeParse(errorObj);
    if (!parsed.success) {
      throw new Error(
        `[contracts:check] Error fixture for ${code} failed schema validation: ${parsed.error.message}`,
      );
    }
  }
  console.log(`✓ All ${allCodes.length} error codes verified in fixtures/contracts/errors.json`);

  // 5. Validate Public Snapshot Fixture (Strict - no answers!)
  const validSnapshotPath = path.resolve(rootDir, 'fixtures/contracts/snapshot.valid.json');
  const validSnapshot = JSON.parse(fs.readFileSync(validSnapshotPath, 'utf-8'));
  PublicExamSnapshotSchema.parse(validSnapshot);
  assertNoAnswerLeak(validSnapshot);
  console.log('✓ fixtures/contracts/snapshot.valid.json passes strict schema and zero-answer assertion');

  // 6. Validate Negative Snapshot Fixture (must fail)
  const invalidSnapshotPath = path.resolve(
    rootDir,
    'fixtures/contracts/snapshot.invalid-with-answers.json',
  );
  const invalidSnapshot = JSON.parse(fs.readFileSync(invalidSnapshotPath, 'utf-8'));
  let caughtError = false;
  try {
    PublicExamSnapshotSchema.parse(invalidSnapshot);
  } catch {
    caughtError = true;
  }
  if (!caughtError) {
    throw new Error(
      `[contracts:check] Expected snapshot.invalid-with-answers.json to fail validation, but it passed!`,
    );
  }
  console.log('✓ fixtures/contracts/snapshot.invalid-with-answers.json correctly rejected');

  // 7. Validate Server Answer Key Fixture
  const validKeyPath = path.resolve(rootDir, 'fixtures/contracts/answer-key.valid.json');
  const validKey = JSON.parse(fs.readFileSync(validKeyPath, 'utf-8'));
  ExamAnswerKeySchema.parse(validKey);
  console.log('✓ fixtures/contracts/answer-key.valid.json conforms to ExamAnswerKeySchema');

  // 8. Validate Events Fixtures
  const validEventsPath = path.resolve(rootDir, 'fixtures/contracts/events.valid.json');
  const validEvents = JSON.parse(fs.readFileSync(validEventsPath, 'utf-8')) as unknown[];
  for (const ev of validEvents) {
    EventEnvelopeSchema.parse(ev);
  }
  console.log(`✓ fixtures/contracts/events.valid.json (${validEvents.length} events) validated`);

  const invalidEventsPath = path.resolve(rootDir, 'fixtures/contracts/events.invalid.json');
  const invalidEvents = JSON.parse(fs.readFileSync(invalidEventsPath, 'utf-8')) as unknown[];
  for (let i = 0; i < invalidEvents.length; i++) {
    const res = EventEnvelopeSchema.safeParse(invalidEvents[i]);
    if (res.success) {
      throw new Error(`[contracts:check] Expected invalid event #${i} to fail, but it passed!`);
    }
  }
  console.log(`✓ fixtures/contracts/events.invalid.json (${invalidEvents.length} events) correctly rejected`);

  console.log('[contracts:check] All contract and fixture checks PASSED! ✨');
}

// If executed directly
const isMain = process.argv[1] && process.argv[1].endsWith('check-all.ts');
if (isMain || process.argv.includes('--run')) {
  const repoRoot = path.resolve(process.cwd());
  runCheck(repoRoot);
}
