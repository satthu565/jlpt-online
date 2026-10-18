'use client';

import React, { useState, useEffect } from 'react';
import { AdminGuard } from '../../lib/ui-guard';
import { useAdminAuth } from '../../lib/auth-context';
import { apiClient } from '../../lib/api-client';
import { t } from '../../lib/i18n';

export interface VocabEntry {
  id: string;
  word: string;
  reading: string;
  meaningVi: string;
  level: 'N1' | 'N2' | 'N3' | 'N4' | 'N5';
  partOfSpeech: string;
  exampleSentence?: string;
}

export interface VocabManagementProps {
  initialEntries?: VocabEntry[];
}

export default function VocabManagementPage({
  initialEntries = [],
}: VocabManagementProps = {}): React.JSX.Element {
  const { locale } = useAdminAuth();

  const [entries, setEntries] = useState<VocabEntry[]>(initialEntries);
  const [isLoading, setIsLoading] = useState<boolean>(initialEntries.length === 0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Form states
  const [newWord, setNewWord] = useState<string>('');
  const [newReading, setNewReading] = useState<string>('');
  const [newMeaning, setNewMeaning] = useState<string>('');
  const [newLevel, setNewLevel] = useState<'N1' | 'N2' | 'N3' | 'N4' | 'N5'>('N3');
  const [newPos, setNewPos] = useState<string>('Danh từ');
  const [newExample, setNewExample] = useState<string>('');

  const fetchVocab = async () => {
    if (initialEntries.length > 0 && levelFilter === 'all' && !searchTerm) {
      setEntries(initialEntries);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const query: Record<string, string> = {};
      if (levelFilter !== 'all') query.level = levelFilter;
      if (searchTerm) query.query = searchTerm;

      const res = (await apiClient.listVocab('official-corpus', query)) as { items?: Record<string, unknown>[]; vocabulary?: Record<string, unknown>[] } | Record<string, unknown>[];
      const raw = Array.isArray(res) ? res : (res?.items || res?.vocabulary || []);
      if (Array.isArray(raw)) {
        const mapped: VocabEntry[] = raw.map((it: Record<string, unknown>, idx: number) => ({
          id: String(it.id || `v_${idx}_${String(it.word || it.term || '')}`),
          word: String(it.word || it.term || ''),
          reading: String(it.reading || it.furigana || ''),
          meaningVi: String(it.meaningVi || it.meaning || it.gloss || ''),
          level: (it.level as VocabEntry['level']) || 'N3',
          partOfSpeech: String(it.partOfSpeech || it.pos || 'Danh từ'),
          exampleSentence: String(it.exampleSentence || it.example || ''),
        }));
        setEntries(mapped);
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Không thể tải danh sách từ vựng.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVocab();
  }, [levelFilter]);

  const filtered = entries.filter((item) => {
    const matchesLevel = levelFilter === 'all' || item.level === levelFilter;
    const matchesSearch =
      searchTerm === '' ||
      item.word.includes(searchTerm) ||
      item.reading.includes(searchTerm) ||
      item.meaningVi.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const handleAdd = () => {
    if (!newWord.trim() || !newReading.trim()) return;

    const newItem: VocabEntry = {
      id: `v_${Date.now()}`,
      word: newWord,
      reading: newReading,
      meaningVi: newMeaning,
      level: newLevel,
      partOfSpeech: newPos,
      exampleSentence: newExample,
    };

    setEntries([newItem, ...entries]);
    setShowAddModal(false);
    setNewWord('');
    setNewReading('');
    setNewMeaning('');
    setNewExample('');
  };

  const handleDelete = (id: string) => {
    setEntries((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <AdminGuard pathname="/vocab">
      <div className="overflow-x-hidden p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('content.vocab.title', locale)}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('content.vocab.subtitle', locale)}
            </p>
          </div>

          <button
            type="button"
            data-testid="btn-add-vocab"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 transition-colors shadow-xs self-start"
          >
            {t('content.vocab.addBtn', locale)}
          </button>
        </header>

        {isLoading && (
          <div
            data-testid="vocab-loading"
            className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-sm animate-pulse"
          >
            {t('common.loading', locale)}
          </div>
        )}

        {errorMessage && (
          <div
            data-testid="vocab-error-alert"
            className="p-4 bg-red-50 border border-red-300 text-red-700 rounded-md text-sm"
          >
            <strong className="font-semibold">Lỗi: </strong>
            {errorMessage}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            data-testid="input-vocab-search"
            type="text"
            placeholder={t('content.vocab.searchPlaceholder', locale)}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 p-2.5 border border-gray-300 rounded-md text-sm bg-white"
          />

          <select
            data-testid="select-vocab-level"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="p-2.5 border border-gray-300 rounded-md text-sm bg-white min-w-[140px]"
          >
            <option value="all">Tất cả cấp độ</option>
            <option value="N5">N5</option>
            <option value="N4">N4</option>
            <option value="N3">N3</option>
            <option value="N2">N2</option>
            <option value="N1">N1</option>
          </select>
        </div>

        {/* Vocab Table */}
        <div className="overflow-x-auto w-full border border-gray-200 rounded-lg shadow-xs bg-white">
          <table data-testid="vocab-table" className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-700">
                <th className="p-3">Từ vựng (Kanji)</th>
                <th className="p-3">Cách đọc (Kana)</th>
                <th className="p-3">Ý nghĩa tiếng Việt</th>
                <th className="p-3">Cấp độ</th>
                <th className="p-3">Từ loại</th>
                <th className="p-3">Ví dụ minh họa</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {!isLoading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} data-testid="vocab-empty" className="p-8 text-center text-gray-400">
                    {t('content.vocab.empty', locale)}
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} data-testid={`vocab-row-${item.id}`} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-bold text-gray-900 text-base">{item.word}</td>
                    <td className="p-3 text-gray-600">{item.reading}</td>
                    <td className="p-3 text-gray-800">{item.meaningVi}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-800">
                        {item.level}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-gray-500">{item.partOfSpeech}</td>
                    <td className="p-3 text-xs text-gray-600 italic">{item.exampleSentence || '—'}</td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        data-testid={`btn-delete-vocab-${item.id}`}
                        onClick={() => handleDelete(item.id)}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        {t('content.vocab.deleteBtn', locale)}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add Modal */}
        {showAddModal && (
          <div
            data-testid="modal-add-vocab"
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          >
            <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-lg space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Thêm Từ Vựng / Ngữ Pháp Mới</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Từ vựng (Kanji):
                  </label>
                  <input
                    data-testid="input-word"
                    type="text"
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    placeholder="Ví dụ: 契約"
                    className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Cách đọc (Furigana):
                  </label>
                  <input
                    data-testid="input-reading"
                    type="text"
                    value={newReading}
                    onChange={(e) => setNewReading(e.target.value)}
                    placeholder="Ví dụ: けいやく"
                    className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Ý nghĩa tiếng Việt:
                </label>
                <input
                  data-testid="input-meaning"
                  type="text"
                  value={newMeaning}
                  onChange={(e) => setNewMeaning(e.target.value)}
                  placeholder="Ví dụ: Hợp đồng, khế ước"
                  className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cấp độ:</label>
                  <select
                    data-testid="select-level"
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value as 'N1' | 'N2' | 'N3' | 'N4' | 'N5')}
                    className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
                  >
                    <option value="N1">N1</option>
                    <option value="N2">N2</option>
                    <option value="N3">N3</option>
                    <option value="N4">N4</option>
                    <option value="N5">N5</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Từ loại:</label>
                  <select
                    data-testid="select-pos"
                    value={newPos}
                    onChange={(e) => setNewPos(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
                  >
                    <option value="Danh từ">Danh từ</option>
                    <option value="Động từ nhóm 1">Động từ nhóm 1</option>
                    <option value="Động từ nhóm 2">Động từ nhóm 2</option>
                    <option value="Động từ nhóm 3">Động từ nhóm 3</option>
                    <option value="Tính từ đuôi い">Tính từ đuôi い</option>
                    <option value="Tính từ đuôi な">Tính từ đuôi な</option>
                    <option value="Phó từ">Phó từ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Câu ví dụ minh họa:
                </label>
                <input
                  data-testid="input-example"
                  type="text"
                  value={newExample}
                  onChange={(e) => setNewExample(e.target.value)}
                  placeholder="Ví dụ: 新しいアパートの契約を結びます。"
                  className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  data-testid="btn-cancel-vocab"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  data-testid="btn-submit-vocab"
                  onClick={handleAdd}
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700"
                >
                  Thêm từ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
