import { describe, it, expect } from 'vitest';
import { rowsFromDataset } from './import-kanji-dataset.mjs';

describe('import-kanji-dataset', () => {
  it('maps each kanji record to a row with the searchable columns', () => {
    const rows = rowsFromDataset({
      phien_ban: '1.0.0',
      kanji: [{ han_tu: '日', han_viet: { chinh: 'NHẬT' }, nghia: 'Ngày, mặt trời', so_net: 4, cap_do: { chinh: 'N5' } }],
    });
    expect(rows).toEqual([
      {
        kanji: '日',
        data: expect.objectContaining({ han_tu: '日' }),
        jlpt_level: 'N5',
        stroke_count: 4,
        han_viet: 'NHẬT',
        meaning_vi: 'Ngày, mặt trời',
        dataset_version: '1.0.0',
      },
    ]);
  });

  it('rejects a file without a kanji array', () => {
    expect(() => rowsFromDataset({ phien_ban: '1.0.0' })).toThrow(/kanji/);
  });
});
