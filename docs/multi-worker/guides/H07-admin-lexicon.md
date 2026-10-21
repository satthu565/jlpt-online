# H07: hướng dẫn từng bước, trang quản trị "Từ điển"

Làm **đúng theo các bước dưới đây**. Mọi thông tin cần thiết đã có trong file này: tên bảng, đường dẫn file, cách viết test và chuỗi giao diện. **Không cần đọc thêm code ngoài những file được nhắc tới.** Gặp điểm nào không khớp với code thật thì sửa ít nhất có thể để chạy được, rồi ghi lại trong mô tả PR.

## Kết quả cần có

1. **API:** `GET /api/v1/admin/lexicon/entries?q=&pos=&page=&pageSize=`, dành cho vai trò editor, reviewer, admin. API trả về:

   ```json
   {
     "total": 22647,
     "page": 1,
     "pageSize": 50,
     "items": [
       {
         "id": "…",
         "term": "予約",
         "readings": ["よやく"],
         "meanings": ["reservation; booking"],
         "partOfSpeech": "n,vs",
         "hanViet": "…",
         "provider": "Electronic Dictionary Research and Development Group (EDRDG) — JMdict, KANJIDIC2"
       }
     ]
   }
   ```

2. **Trang admin `/lexicon`:** có mục menu "Từ điển", ô tìm, bộ lọc từ loại, bảng và nút phân trang.

## Dữ liệu (đã có sẵn, không tạo bảng mới)

Các bảng nằm trong `apps/api/src/db/schema.ts`:

- `lexicalEntries` (`lexical_entries`): `id` (uuid), `licenseId`, `term` (mặt chữ), `level` (thường null), `partOfSpeech` (mã JMdict cách nhau bằng dấu phẩy, ví dụ `n,vs,vt`).
- `entryReadings` (`entry_readings`): `id`, `entryId`, `reading` (kana), `isPrimary`.
- `entryMeanings` (`entry_meanings`): `id`, `entryId`, `locale` (`en`), `meaning`.
- `lexiconLicenses` (`lexicon_licenses`): `id`, `provider`, `license`.

Trên preview có 22.647 mục. DB của unit test (PGlite) ban đầu rỗng, test phải tự chèn dữ liệu.

## Bước 1: hàm service (`apps/api/src/modules/vocab/vocab.service.ts`)

Bổ sung các import đang thiếu:

```ts
import { and, asc, count, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
```

File đã import sẵn `entryMeanings`, `entryReadings`, `lexicalEntries`, `lexiconLicenses` từ `../../db/schema.js` và `getHanVietForWord` từ `./nlp/index.js`.

Thêm kiểu kết quả ở cấp file (trên `@Injectable()` của `VocabService`, export để controller và test dùng):

```ts
export interface LexiconListResult {
  total: number;
  page: number;
  pageSize: number;
  items: Array<{
    id: string;
    term: string;
    readings: string[];
    meanings: string[];
    partOfSpeech: string;
    hanViet: string;
    provider: string;
  }>;
}
```

Thêm method vào class `VocabService`:

```ts
  /** H07: paginated list of every dictionary entry for the admin "Từ điển" page. */
  async listLexiconEntries(params: { q?: string; pos?: string; page?: number; pageSize?: number }): Promise<LexiconListResult> {
    const pageSize = Math.min(Math.max(Number(params.pageSize) || 50, 1), 200);
    const page = Math.max(Number(params.page) || 1, 1);
    const q = params.q?.trim();
    const pos = params.pos?.trim();

    const conditions: SQL[] = [];
    if (q) {
      const like = `%${q}%`;
      conditions.push(
        or(
          ilike(lexicalEntries.term, like),
          sql`exists (select 1 from entry_readings r where r.entry_id = ${lexicalEntries.id} and r.reading ilike ${like})`,
          sql`exists (select 1 from entry_meanings m where m.entry_id = ${lexicalEntries.id} and m.meaning ilike ${like})`,
        )!,
      );
    }
    if (pos) {
      // part_of_speech is "n,vs,vt"; match a whole code or a code family (v5 matches v5k, v5r...).
      conditions.push(sql`(',' || coalesce(${lexicalEntries.partOfSpeech}, '') || ',') like ${`%,${pos}%`}`);
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ value: total }] = await this.dbClient.db.select({ value: count() }).from(lexicalEntries).where(where);
    const rows: Array<{ id: string; term: string; partOfSpeech: string | null; provider: string | null }> = await this.dbClient.db
      .select({
        id: lexicalEntries.id,
        term: lexicalEntries.term,
        partOfSpeech: lexicalEntries.partOfSpeech,
        provider: lexiconLicenses.provider,
      })
      .from(lexicalEntries)
      .leftJoin(lexiconLicenses, eq(lexicalEntries.licenseId, lexiconLicenses.id))
      .where(where)
      .orderBy(asc(lexicalEntries.term))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const ids = rows.map((r) => r.id);
    const readings: Array<{ entryId: string; reading: string }> = ids.length
      ? await this.dbClient.db.select().from(entryReadings).where(inArray(entryReadings.entryId, ids))
      : [];
    const meanings: Array<{ entryId: string; meaning: string }> = ids.length
      ? await this.dbClient.db.select().from(entryMeanings).where(inArray(entryMeanings.entryId, ids))
      : [];

    return {
      total: Number(total),
      page,
      pageSize,
      items: rows.map((r) => ({
        id: r.id,
        term: r.term,
        readings: readings.filter((x) => x.entryId === r.id).map((x) => x.reading),
        meanings: meanings.filter((x) => x.entryId === r.id).slice(0, 3).map((x) => x.meaning),
        partOfSpeech: r.partOfSpeech ?? '',
        hanViet: getHanVietForWord(r.term) || '',
        provider: r.provider ?? '',
      })),
    };
  }
```

Lưu ý khi typecheck:

- Client DB trả kiểu lỏng, nên các biến `rows`, `readings`, `meanings` phải khai báo kiểu tường minh như trên. Nếu không, typecheck báo `implicitly has an 'any' type`.
- Nếu `or(...)` có thể trả `undefined`, dấu `!` ở trên đã xử lý.

## Bước 2: route (`apps/api/src/modules/vocab/vocab.controller.ts`)

Thêm import, và thêm `type LexiconListResult` vào import có sẵn từ `./vocab.service.js`:

```ts
import { Roles } from '../../common/decorators/roles.decorator.js';
import { VocabService, type LexiconListResult } from './vocab.service.js';
```

Thêm route vào class `VocabController`, đặt cạnh các route `@Get` khác:

```ts
  @Roles('admin', 'editor', 'reviewer')
  @Get('admin/lexicon/entries')
  async adminListLexicon(
    @Query('q') q?: string,
    @Query('pos') pos?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<LexiconListResult> {
    return this.vocabService.listLexiconEntries({ q, pos, page: Number(page) || 1, pageSize: Number(pageSize) || 50 });
  }
```

Route **không** có `@Public()`, nên phải đăng nhập. `@Roles` chặn các vai trò khác bằng 403 (guard toàn cục đã có sẵn).

## Bước 3: test API (`apps/api/src/modules/vocab/vocab.test.ts`)

File đã có sẵn `beforeEach` tạo `vocabService`, `vocabController` trên DB rỗng, và các import `lexiconLicenses`, `lexicalEntries`, `entryReadings`, `entryMeanings`, `generateUuidV7`. Thêm một `describe` mới:

```ts
  describe('H07: admin lexicon list', () => {
    async function seed(term: string, reading: string, meaning: string, pos: string) {
      const id = generateUuidV7();
      await dbClient.db.insert(lexicalEntries).values({ id, term, partOfSpeech: pos });
      await dbClient.db.insert(entryReadings).values({ id: generateUuidV7(), entryId: id, reading, isPrimary: true });
      await dbClient.db.insert(entryMeanings).values({ id: generateUuidV7(), entryId: id, locale: 'en', meaning });
    }

    it('lists, searches by headword, kana and English meaning, filters by part of speech and paginates', async () => {
      await seed('予約', 'よやく', 'reservation; booking', 'n,vs,vt');
      await seed('静か', 'しずか', 'quiet; silent', 'adj-na');
      await seed('食べる', 'たべる', 'to eat', 'v1,vt');

      const all = await vocabController.adminListLexicon();
      expect(all.total).toBe(3);
      expect(all.items.map((i) => i.term).sort()).toEqual(['予約', '静か', '食べる'].sort());

      for (const q of ['予約', 'よやく', 'reservation']) {
        const r = await vocabController.adminListLexicon(q);
        expect(r.items.map((i) => i.term)).toEqual(['予約']);
        expect(r.items[0]!.readings).toEqual(['よやく']);
      }

      const na = await vocabController.adminListLexicon(undefined, 'adj-na');
      expect(na.items.map((i) => i.term)).toEqual(['静か']);

      const page2 = await vocabController.adminListLexicon(undefined, undefined, '2', '2');
      expect(page2.total).toBe(3);
      expect(page2.items).toHaveLength(1);
    });

    it('returns an empty list when no dictionary is loaded', async () => {
      const r = await vocabController.adminListLexicon();
      expect(r).toMatchObject({ total: 0, items: [] });
    });
  });
```

Chạy: `pnpm test:vocab-data`.

## Bước 4: client admin (`apps/admin/lib/api-client.ts`)

Thêm method vào class `AdminApiClient`, đặt cạnh `listVocab`:

```ts
  public async listLexiconEntries(params: { q?: string; pos?: string; page?: number; pageSize?: number } = {}): Promise<{
    total: number;
    page: number;
    pageSize: number;
    items: Array<{ id: string; term: string; readings: string[]; meanings: string[]; partOfSpeech: string; hanViet: string; provider: string }>;
  }> {
    const qs = new URLSearchParams();
    if (params.q) qs.set('q', params.q);
    if (params.pos) qs.set('pos', params.pos);
    qs.set('page', String(params.page ?? 1));
    qs.set('pageSize', String(params.pageSize ?? 50));
    return this.request('GET', `/api/v1/admin/lexicon/entries?${qs.toString()}`, {
      requiredRoles: ['admin', 'editor', 'reviewer'],
    });
  }
```

## Bước 5: menu (`apps/admin/lib/navigation.ts`)

Trong section có `id: 'authoring'` (tiêu đề "Nội dung & Biên tập"), thêm item **ngay sau** item `id: 'vocab'`:

```ts
      {
        id: 'lexicon',
        labelKey: 'nav.lexicon',
        href: '/lexicon',
        requiredRoles: ['admin', 'editor', 'reviewer'],
      },
```

Nếu `apps/admin/tests/navigation.test.ts` có danh sách cứng các href của editor/reviewer và test hỏng vì thiếu `/lexicon`, thêm `/lexicon` vào danh sách mong đợi đó.

## Bước 6: chuỗi giao diện (`apps/admin/messages/vi.json`, `ja.json`, `en.json`)

Thêm vào **cả ba file**. Test i18n kiểm tra ba file có cùng bộ key.

- Trong object `"nav"`: `"lexicon": "Từ điển"`. Bản ja là `"辞書"`, bản en là `"Dictionary"`.
- Thêm object cấp cao nhất `"lexicon"`:

**vi:**

```json
"lexicon": {
  "title": "Từ điển (JMdict)",
  "subtitle": "Toàn bộ mục từ đang có trong cơ sở dữ liệu.",
  "total": "Tổng số mục",
  "searchPlaceholder": "Tìm theo chữ, cách đọc hoặc nghĩa tiếng Anh",
  "search": "Tìm",
  "pos": "Từ loại",
  "posAll": "Tất cả",
  "colTerm": "Từ",
  "colReading": "Cách đọc",
  "colHanViet": "Hán Việt",
  "colPos": "Từ loại",
  "colMeaning": "Nghĩa (tiếng Anh)",
  "empty": "Không có mục từ nào phù hợp.",
  "emptyDb": "Cơ sở dữ liệu chưa nạp từ điển.",
  "error": "Không tải được danh sách từ.",
  "retry": "Thử lại",
  "prev": "Trang trước",
  "next": "Trang sau",
  "page": "Trang",
  "attribution": "Nguồn: JMdict/KANJIDIC2 – EDRDG, giấy phép CC BY-SA 4.0"
}
```

**ja:** dùng cùng các key, phần text như sau:

| Key | Text |
|---|---|
| `title` | 辞書 (JMdict) |
| `subtitle` | データベースにある全見出し語 |
| `total` | 件数 |
| `searchPlaceholder` | 見出し・読み・英語の意味で検索 |
| `search` | 検索 |
| `pos` | 品詞 |
| `posAll` | すべて |
| `colTerm` | 見出し |
| `colReading` | 読み |
| `colHanViet` | 漢越音 |
| `colPos` | 品詞 |
| `colMeaning` | 意味（英語） |
| `empty` | 該当なし |
| `emptyDb` | 辞書が未登録です |
| `error` | 読み込みに失敗しました |
| `retry` | 再試行 |
| `prev` | 前へ |
| `next` | 次へ |
| `page` | ページ |
| `attribution` | 出典: JMdict/KANJIDIC2 – EDRDG, CC BY-SA 4.0 |

**en:** dùng cùng các key, phần text như sau:

| Key | Text |
|---|---|
| `title` | Dictionary (JMdict) |
| `subtitle` | Every entry in the database. |
| `total` | Entries |
| `searchPlaceholder` | Search by headword, reading or English meaning |
| `search` | Search |
| `pos` | Part of speech |
| `posAll` | All |
| `colTerm` | Headword |
| `colReading` | Reading |
| `colHanViet` | Sino-Vietnamese |
| `colPos` | Part of speech |
| `colMeaning` | Meaning (English) |
| `empty` | No matching entries. |
| `emptyDb` | No dictionary loaded yet. |
| `error` | Could not load entries. |
| `retry` | Retry |
| `prev` | Previous |
| `next` | Next |
| `page` | Page |
| `attribution` | Source: JMdict/KANJIDIC2 – EDRDG, CC BY-SA 4.0 |

## Bước 7: trang (`apps/admin/app/lexicon/page.tsx`, file mới)

Viết theo mẫu các trang admin hiện có, ví dụ `apps/admin/app/commercial/coupons/page.tsx`:

```tsx
'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from '@jlpt/ui/components/alert';
import { Button } from '@jlpt/ui/components/button';
import { Input } from '@jlpt/ui/components/input';
import { Select } from '@jlpt/ui/components/select';
import { Skeleton } from '@jlpt/ui/components/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@jlpt/ui/components/table';
import { AdminGuard } from '../../lib/ui-guard';
import { useAdminAuth } from '../../lib/auth-context';
import { apiClient } from '../../lib/api-client';
import { t } from '../../lib/i18n';

type LexiconItem = { id: string; term: string; readings: string[]; meanings: string[]; partOfSpeech: string; hanViet: string };
const PAGE_SIZE = 50;
const POS_OPTIONS = [
  { value: '', label: '' }, // label filled with t('lexicon.posAll') at render
  { value: 'n', label: 'Danh từ (n)' },
  { value: 'v1', label: 'Động từ nhóm 2 (v1)' },
  { value: 'v5', label: 'Động từ nhóm 1 (v5)' },
  { value: 'vs', label: 'Danh động từ (vs)' },
  { value: 'adj-i', label: 'Tính từ đuôi い (adj-i)' },
  { value: 'adj-na', label: 'Tính từ đuôi な (adj-na)' },
  { value: 'adv', label: 'Phó từ (adv)' },
];

export default function LexiconPage(): React.JSX.Element {
  const { locale } = useAdminAuth();
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [pos, setPos] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ total: number; items: LexiconItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.listLexiconEntries({ q: submitted, pos, page, pageSize: PAGE_SIZE });
      setData({ total: res.total, items: res.items });
    } catch (err: unknown) {
      setError((err as Error)?.message || t('lexicon.error', locale));
    } finally {
      setLoading(false);
    }
  }, [submitted, pos, page, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <AdminGuard pathname="/lexicon" requiredRoles={['admin', 'editor', 'reviewer']}>
      <div className="w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6 overflow-x-hidden font-sans">
        <div>
          <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('lexicon.title', locale)}
          </h1>
          <p className="text-sm text-gray-500 mt-1">{t('lexicon.subtitle', locale)}</p>
        </div>

        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSubmitted(query.trim());
          }}
        >
          <div className="min-w-0 flex-1">
            <Input
              data-testid="lexicon-search"
              placeholder={t('lexicon.searchPlaceholder', locale)}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Select
            data-testid="lexicon-pos"
            aria-label={t('lexicon.pos', locale)}
            value={pos}
            onChange={(e) => {
              setPage(1);
              setPos(e.target.value);
            }}
            options={POS_OPTIONS.map((o) => (o.value ? o : { ...o, label: t('lexicon.posAll', locale) }))}
          />
          <Button type="submit" data-testid="lexicon-search-btn">
            {t('lexicon.search', locale)}
          </Button>
        </form>

        {data && (
          <p className="text-sm text-gray-600" data-testid="lexicon-total">
            {t('lexicon.total', locale)}: {data.total.toLocaleString('vi-VN')}
          </p>
        )}

        {error ? (
          <Alert variant="error">
            {error}{' '}
            <Button size="sm" variant="secondary" onClick={() => void load()}>
              {t('lexicon.retry', locale)}
            </Button>
          </Alert>
        ) : loading ? (
          <div className="space-y-2" data-testid="lexicon-loading">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <p className="text-sm text-gray-500" data-testid="lexicon-empty">
            {data && data.total === 0 && !submitted && !pos ? t('lexicon.emptyDb', locale) : t('lexicon.empty', locale)}
          </p>
        ) : (
          <Table data-testid="lexicon-table">
            <TableHeader>
              <TableRow>
                <TableHead>{t('lexicon.colTerm', locale)}</TableHead>
                <TableHead>{t('lexicon.colReading', locale)}</TableHead>
                <TableHead>{t('lexicon.colHanViet', locale)}</TableHead>
                <TableHead>{t('lexicon.colPos', locale)}</TableHead>
                <TableHead>{t('lexicon.colMeaning', locale)}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((it) => (
                <TableRow key={it.id} data-testid="lexicon-row">
                  <TableCell className="font-japanese text-base font-semibold">{it.term}</TableCell>
                  <TableCell className="font-japanese">{it.readings.join('、')}</TableCell>
                  <TableCell>{it.hanViet}</TableCell>
                  <TableCell className="font-mono text-xs">{it.partOfSpeech}</TableCell>
                  <TableCell className="max-w-md">{it.meanings.join(' / ')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)} data-testid="lexicon-prev">
            {t('lexicon.prev', locale)}
          </Button>
          <span className="text-sm text-gray-600">
            {t('lexicon.page', locale)} {page} / {pages}
          </span>
          <Button variant="secondary" disabled={page >= pages || loading} onClick={() => setPage((p) => p + 1)} data-testid="lexicon-next">
            {t('lexicon.next', locale)}
          </Button>
        </div>

        <p className="text-xs text-gray-500">{t('lexicon.attribution', locale)}</p>
      </div>
    </AdminGuard>
  );
}
```

Có thể dịch `POS_OPTIONS` sang ja/en; nếu thời gian gấp thì giữ nhãn tiếng Việt như trên, vì đó là tên kỹ thuật kèm mã.

## Bước 8: kiểm tra trước khi push

```bash
pnpm --filter @jlpt/api typecheck && pnpm --filter @jlpt/admin typecheck
pnpm lint
pnpm test:vocab-data
pnpm test:admin
pnpm check:no-mock-ui
pnpm check:ui-primitives
```

Nếu `check:ui-primitives` báo thẻ thô: trang trên chỉ dùng component `@jlpt/ui` và thẻ `form`/`div`/`p`/`span`, nên không được có `<button>`, `<input>`, `<select>`, `<table>` hay `style={{}}`.

## Không làm

- Không sửa dữ liệu từ điển hay thêm bảng hoặc migration.
- Không làm chức năng sửa Hán Việt; việc đó thuộc H03.
- Không đổi API tra từ `/dictionary/lookup`.
