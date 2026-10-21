#!/usr/bin/env node
// Sinh docs/agents/PROJECT_MAP.generated.md và docs/agents/DATABASE.generated.md từ code.
// Chạy: pnpm docs:map. CI chạy lại và báo lỗi nếu file trong repo lệch với kết quả.
// Chỉ dùng thư viện chuẩn của Node; đọc code bằng regex nên giữ định dạng code như hiện tại.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT_DIR = path.join(ROOT, 'docs/agents');
const HEADER = '<!-- File tự sinh bởi tools/agents/gen-project-map.mjs. Không sửa tay: chạy `pnpm docs:map`. -->\n';

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const posix = (p) => p.split(path.sep).join('/');
const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function walk(dir, predicate, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, predicate, acc);
    else if (predicate(entry.name)) acc.push(full);
  }
  return acc;
}

/** Cắt chuỗi `body` tại các dấu phẩy ở mức ngoài cùng (bỏ qua ngoặc và chuỗi). */
function splitTopLevel(body) {
  const parts = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch;
    else if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch)) depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(body.slice(start));
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** Trả về nội dung giữa cặp ngoặc bắt đầu ở `open` (vị trí của ký tự mở). */
function matchBracket(text, open) {
  const pairs = { '(': ')', '{': '}', '[': ']' };
  const close = pairs[text[open]];
  let depth = 0;
  let quote = null;
  for (let i = open; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch;
    else if (ch === text[open]) depth++;
    else if (ch === close && --depth === 0) return text.slice(open + 1, i);
  }
  throw new Error(`Không tìm thấy ngoặc đóng ở vị trí ${open}`);
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

function parseSchema() {
  const text = read('apps/api/src/db/schema.ts');
  const tables = [];
  const re = /export const (\w+) = pgTable\(\s*'([a-z0-9_]+)'\s*,\s*/g;
  let m;
  while ((m = re.exec(text))) {
    const [, varName, tableName] = m;
    const braceAt = text.indexOf('{', m.index + m[0].length - 1);
    const body = matchBracket(text, braceAt);
    const columns = [];
    for (const entry of splitTopLevel(body)) {
      const col = /^(\w+)\s*:\s*(\w+)\(\s*'([a-z0-9_]+)'/.exec(entry.replace(/\/\/.*$/gm, '').trim());
      if (!col) continue;
      const ref = /references\(\s*\(\)\s*(?::\s*\w+\s*)?=>\s*(\w+)\.(\w+)/.exec(entry);
      columns.push({
        name: col[3],
        type: col[2],
        pk: /\.primaryKey\(\)/.test(entry),
        notNull: /\.notNull\(\)/.test(entry),
        ref: ref ? { varName: ref[1], column: ref[2] } : null,
      });
    }
    tables.push({ varName, name: tableName, columns });
  }
  const byVar = new Map(tables.map((t) => [t.varName, t]));
  for (const table of tables) {
    for (const col of table.columns) {
      if (col.ref) col.ref.table = byVar.get(col.ref.varName)?.name ?? col.ref.varName;
    }
  }
  return tables.sort((a, b) => byText(a.name, b.name));
}

function renderDatabase(tables) {
  const migrations = fs
    .readdirSync(path.join(ROOT, 'apps/api/src/db/migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const lines = [HEADER, '# Database (tự sinh)', ''];
  lines.push(`Nguồn: \`apps/api/src/db/schema.ts\`. ${tables.length} bảng, ${migrations.length} migration.`);
  lines.push('Quy ước và cách thêm bảng: [DATABASE.md](DATABASE.md).', '');
  lines.push('## Migration', '');
  for (const f of migrations) lines.push(`- \`${f}\``);
  lines.push('', '## Bảng', '');
  for (const t of tables) lines.push(`- [\`${t.name}\`](#${t.name})`);
  for (const t of tables) {
    lines.push('', `### ${t.name}`, '', '| Cột | Kiểu | Ràng buộc | Tham chiếu |', '|---|---|---|---|');
    for (const c of t.columns) {
      const flags = [c.pk ? 'PK' : '', c.notNull && !c.pk ? 'not null' : ''].filter(Boolean).join(', ');
      const ref = c.ref ? `\`${c.ref.table}\`` : '';
      lines.push(`| \`${c.name}\` | ${c.type} | ${flags} | ${ref} |`);
    }
  }
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

const HTTP = ['Get', 'Post', 'Put', 'Patch', 'Delete'];

function decoratorArgs(block, name) {
  const at = block.search(new RegExp(`@${name}\\(`));
  if (at < 0) return null;
  return matchBracket(block, block.indexOf('(', at));
}

function rolesOf(block) {
  const args = decoratorArgs(block, 'Roles');
  return args === null ? null : [...args.matchAll(/'([a-z_]+)'/g)].map((x) => x[1]);
}

/** Gom các dòng decorator liền nhau (kể cả decorator nhiều dòng) cùng tên hàm đứng ngay sau. */
function methodBlocks(classBody) {
  const lines = classBody.split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    if (!lines[i].trim().startsWith('@')) {
      i++;
      continue;
    }
    const block = [];
    while (i < lines.length && lines[i].trim().startsWith('@')) {
      let balance = 0;
      do {
        block.push(lines[i]);
        for (const ch of lines[i]) balance += ch === '(' ? 1 : ch === ')' ? -1 : 0;
        i++;
      } while (balance > 0 && i < lines.length);
    }
    const sig = /^\s*(?:public\s+|private\s+|protected\s+)?(?:async\s+)?(\w+)\s*\(/.exec(lines[i] ?? '');
    if (sig) blocks.push({ block: block.join('\n'), handler: sig[1] });
  }
  return blocks;
}

function joinRoute(prefix, sub) {
  const parts = ['api/v1', prefix.replace(/^\/?api\/v1\/?/, ''), sub]
    .map((p) => p.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean);
  return '/' + parts.join('/');
}

function parseControllers() {
  const files = walk(path.join(ROOT, 'apps/api/src/modules'), (n) => n.endsWith('.controller.ts'));
  const routes = [];
  for (const file of files.sort()) {
    const text = fs.readFileSync(file, 'utf8');
    const module = posix(path.relative(path.join(ROOT, 'apps/api/src/modules'), file)).split('/')[0];
    const classes = text.split(/^export class /m);
    for (let i = 1; i < classes.length; i++) {
      const head = classes[i - 1].slice(classes[i - 1].lastIndexOf('@Controller'));
      if (!head.startsWith('@Controller')) continue;
      const prefixArgs = matchBracket(head, head.indexOf('('));
      const prefix = /'([^']*)'/.exec(prefixArgs)?.[1] ?? '';
      const classRoles = rolesOf(head);
      const classPublic = /@Public\(\)/.test(head);
      for (const { block, handler } of methodBlocks(classes[i])) {
        const verb = HTTP.find((v) => new RegExp(`@${v}\\(`).test(block));
        if (!verb) continue;
        const sub = /'([^']*)'/.exec(decoratorArgs(block, verb) ?? '')?.[1] ?? '';
        const roles = rolesOf(block) ?? classRoles;
        const isPublic = /@Public\(\)/.test(block) || (classPublic && !rolesOf(block));
        const access = isPublic ? 'công khai' : roles?.length ? roles.join(', ') : 'đăng nhập';
        const extras = [
          /@RequireTotp\(\)/.test(block) ? 'TOTP' : '',
          /@RateLimit\(/.test(block) ? 'giới hạn tần suất' : '',
          /@AllowGuest\(\)/.test(block) ? 'khách' : '',
        ].filter(Boolean);
        routes.push({ module, method: verb.toUpperCase(), path: joinRoute(prefix, sub), access, extras, handler });
      }
    }
  }
  return routes.sort((a, b) => byText(a.module, b.module) || byText(a.path, b.path) || byText(a.method, b.method));
}

// ---------------------------------------------------------------------------
// Web, admin, cờ tính năng, phiên bản
// ---------------------------------------------------------------------------

function nextRoutes(appDir) {
  const base = path.join(ROOT, appDir);
  return walk(base, (n) => n === 'page.tsx')
    .map((f) => {
      const segs = posix(path.relative(base, path.dirname(f))).split('/').filter((s) => s && s !== '.');
      const group = segs.find((s) => /^\(.+\)$/.test(s))?.slice(1, -1) ?? '';
      const url = '/' + segs.filter((s) => !/^\(.+\)$/.test(s)).join('/');
      return { url, group, file: posix(path.relative(ROOT, f)) };
    })
    .sort((a, b) => byText(a.url, b.url));
}

function lookupKey(tree, key) {
  return key.split('.').reduce((node, k) => (node && typeof node === 'object' ? node[k] : undefined), tree);
}

function adminNav() {
  const text = read('apps/admin/lib/navigation.ts');
  const vi = JSON.parse(read('apps/admin/messages/vi.json'));
  const items = [];
  const re = /id:\s*'([^']+)',\s*labelKey:\s*'([^']+)',\s*href:\s*'([^']+)',[\s\S]*?requiredRoles:\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(text))) {
    const label = lookupKey(vi, m[2]);
    items.push({
      href: m[3],
      label: typeof label === 'string' ? label : m[2],
      roles: [...m[4].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]),
    });
  }
  return items;
}

function featureFlags() {
  const text = read('apps/web/lib/features.ts');
  return [...text.matchAll(/(\w+):\s*process\.env\.(NEXT_PUBLIC_FEATURE_\w+)\s*===\s*'1'/g)].map((m) => ({
    key: m[1],
    env: m[2],
  }));
}

function versions() {
  const pick = (rel, names) => {
    const pkg = JSON.parse(read(rel));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    return names.filter((n) => deps[n]).map((n) => [n, deps[n]]);
  };
  const rootPkg = JSON.parse(read('package.json'));
  return [
    ['pnpm', rootPkg.packageManager?.split('@')[1] ?? ''],
    ...pick('package.json', ['turbo', 'typescript', 'vitest', 'eslint']),
    ...pick('apps/web/package.json', ['next', 'react', 'tailwindcss', '@heroui/styles']),
    ...pick('apps/api/package.json', ['@nestjs/core', 'fastify', 'drizzle-orm']),
    ...pick('tests/package.json', ['@playwright/test']),
  ];
}

function renderProjectMap(routes) {
  const lines = [HEADER, '# Bản đồ dự án (tự sinh)', ''];
  lines.push('Sinh từ code: route web và admin, menu admin, API kèm quyền, cờ tính năng, phiên bản thư viện chính.', '');

  lines.push('## Phiên bản', '', '| Gói | Phiên bản |', '|---|---|');
  for (const [name, v] of versions()) lines.push(`| \`${name}\` | ${v} |`);

  lines.push('', '## Cờ tính năng (`apps/web/lib/features.ts`)', '', '| Cờ | Biến lúc build |', '|---|---|');
  for (const f of featureFlags()) lines.push(`| \`${f.key}\` | \`${f.env}=1\` |`);

  const web = nextRoutes('apps/web/app');
  lines.push('', `## Trang học viên (\`apps/web\`, ${web.length} trang)`, '', '| Đường dẫn | Nhóm | File |', '|---|---|---|');
  for (const r of web) lines.push(`| \`${r.url}\` | ${r.group} | \`${r.file}\` |`);

  const nav = new Map(adminNav().map((n) => [n.href, n]));
  const admin = nextRoutes('apps/admin/app');
  lines.push('', `## Trang quản trị (\`apps/admin\`, ${admin.length} trang)`, '');
  lines.push('Mục menu và vai trò lấy từ `apps/admin/lib/navigation.ts`.', '', '| Đường dẫn | Menu | Vai trò | File |', '|---|---|---|---|');
  for (const r of admin) {
    const n = nav.get(r.url);
    lines.push(`| \`${r.url}\` | ${n ? n.label : ''} | ${n ? n.roles.join(', ') : ''} | \`${r.file}\` |`);
  }

  const modules = [...new Set(routes.map((r) => r.module))];
  lines.push('', `## API (${routes.length} route, ${modules.length} module có controller)`, '');
  lines.push('Quyền: `công khai` = `@Public()`; `đăng nhập` = chỉ cần đăng nhập; còn lại là vai trò trong `@Roles`.');
  for (const mod of modules) {
    lines.push('', `### ${mod}`, '', '| Method | Đường dẫn | Quyền | Ghi chú | Hàm |', '|---|---|---|---|---|');
    for (const r of routes.filter((x) => x.module === mod)) {
      lines.push(`| ${r.method} | \`${r.path}\` | ${r.access} | ${r.extras.join(', ')} | \`${r.handler}\` |`);
    }
  }
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------------------

const outputs = {
  'PROJECT_MAP.generated.md': renderProjectMap(parseControllers()),
  'DATABASE.generated.md': renderDatabase(parseSchema()),
};
for (const [name, content] of Object.entries(outputs)) {
  fs.writeFileSync(path.join(OUT_DIR, name), content);
  console.log(`docs/agents/${name}: ${content.split('\n').length} dòng`);
}
