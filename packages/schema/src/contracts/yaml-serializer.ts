import { createRequire } from 'node:module';
import * as path from 'node:path';

let jsYamlCache: { dump: (val: unknown, opts?: Record<string, unknown>) => string; load: (str: string) => unknown } | null = null;

function getJsYaml() {
  if (jsYamlCache) return jsYamlCache;

  const candidatePaths = [
    path.resolve(process.cwd(), 'node_modules/.pnpm/js-yaml@4.3.2/node_modules/js-yaml'),
    './node_modules/.pnpm/js-yaml@4.3.2/node_modules/js-yaml',
    '../../../../../node_modules/.pnpm/js-yaml@4.3.2/node_modules/js-yaml',
  ];

  const req = createRequire(process.cwd() + '/package.json');
  for (const p of candidatePaths) {
    try {
      const resolved = req(p);
      if (resolved && typeof resolved.dump === 'function') {
        jsYamlCache = resolved;
        return resolved;
      }
    } catch {
      // try next candidate
    }
  }

  throw new Error('Unable to resolve js-yaml from node_modules');
}

export function toYaml(val: unknown): string {
  const yaml = getJsYaml();
  return yaml.dump(val, {
    noRefs: true,
    lineWidth: -1,
    sortKeys: true,
  });
}
