import * as fs from 'node:fs';
import * as path from 'node:path';
import { generateOpenApiYaml } from './openapi-builder.js';
import { generateApiClientCode } from './client-generator.js';

export function runGenerate(rootDir: string): void {
  const openApiPath = path.resolve(rootDir, 'contracts/openapi.yaml');
  const clientPath = path.resolve(rootDir, 'packages/api-client/src/index.ts');

  // 1. Generate OpenAPI YAML
  const yamlContent = generateOpenApiYaml();
  fs.mkdirSync(path.dirname(openApiPath), { recursive: true });
  fs.writeFileSync(openApiPath, yamlContent, 'utf-8');
  console.log(`[contracts:generate] Generated ${openApiPath}`);

  // 2. Generate API Client
  const clientContent = generateApiClientCode();
  fs.mkdirSync(path.dirname(clientPath), { recursive: true });
  fs.writeFileSync(clientPath, clientContent, 'utf-8');
  console.log(`[contracts:generate] Generated ${clientPath}`);
}

// If executed directly via node
const isMain = process.argv[1] && process.argv[1].endsWith('generate-all.ts');
if (isMain || process.argv.includes('--run')) {
  const repoRoot = path.resolve(process.cwd());
  runGenerate(repoRoot);
}
