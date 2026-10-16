'use client';

import React, { useState } from 'react';
import { AdminGuard } from '../../lib/ui-guard';
import { useAdminAuth } from '../../lib/auth-context';

export interface VocabEntry {
  id: string;
  word: string;
  reading: string;
  meaningVi: string;
  level: 'N1' | 'N2' | 'N3' | 'N4' | 'N5';
  partOfSpeech: string;
  exampleSentence?: string;
}

export default function VocabManagementPage(): React.JSX.Element {
  const { user: _user } = useAdminAuth();

  const [entries, setEntries] = useState<VocabEntry[]>([
    {
      id: 'voc-1',
      word: '怠る',
      reading: 'おこたる',
      meaningVi: 'Bỏ bê, lơ là, sao nhãng',
      level: 'N2',
      partOfSpeech: 'Động từ nhóm 1',
      exampleSentence: '試験の準備を怠ってはいけない。',
    },
    {
      id: 'voc-2',
      word: '契約',
      reading: 'けいやく',
      meaningVi: 'Hợp đồng, khế ước',
      level: 'N3',
      partOfSpeech: 'Danh từ',
      exampleSentence: '来週、新しいアパートの契約を結びます。',
    },
    {
      id: 'voc-3',
      word: '圧倒的',
      reading: 'あっとうてき',
      meaningVi: 'Áp đảo, vượt trội hoàn toàn',
      level: 'N1',
      partOfSpeech: 'Tính từ đuôi な',
      exampleSentence: '圧倒的な勝利を収める。',
    },
    {
      id: 'voc-4',
      word: '案内',
      reading: 'あんない',
      meaningVi: 'Hướng dẫn, dẫn đường',
      level: 'N4',
      partOfSpeech: 'Danh từ / Động từ nhóm 3',
      exampleSentence: '街をご案内します。',
    },
  ]);

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
      id: `voc-${Date.now().toString().slice(-4)}`,
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
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#111827' }}>
              Quản lý Từ vựng & Ngữ pháp (ADM-12)
            </h1>
            <p style={{ margin: 0, color: '#6b7280' }}>
              Từ điển tra cứu, từ vựng theo cấp độ JLPT N1 - N5 phục vụ học tập, SRS flashcards và bài thi.
            </p>
          </div>

          <button
            data-testid="btn-add-vocab"
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Thêm Từ Vựng Mới
          </button>
        </header>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            data-testid="input-vocab-search"
            type="text"
            placeholder="Tìm theo từ, cách đọc hoặc nghĩa tiếng Việt..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              minWidth: '280px',
              flex: 1,
            }}
          />

          <select
            data-testid="select-vocab-level"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: '#ffffff',
            }}
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
        <div style={{ background: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#4b5563', fontSize: '0.85rem' }}>Cấp độ</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#4b5563', fontSize: '0.85rem' }}>Từ / Chữ Hán</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#4b5563', fontSize: '0.85rem' }}>Cách đọc (Furigana)</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#4b5563', fontSize: '0.85rem' }}>Nghĩa Tiếng Việt</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#4b5563', fontSize: '0.85rem' }}>Từ loại</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#4b5563', fontSize: '0.85rem', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  data-testid={`vocab-row-${item.id}`}
                  style={{ borderBottom: '1px solid #f3f4f6' }}
                >
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        background: '#e0e7ff',
                        color: '#3730a3',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                      }}
                    >
                      {item.level}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, fontSize: '1.05rem', color: '#111827' }}>
                    {item.word}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: '#2563eb' }}>{item.reading}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#374151' }}>{item.meaningVi}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#6b7280', fontSize: '0.85rem' }}>{item.partOfSpeech}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <button
                      data-testid={`btn-delete-vocab-${item.id}`}
                      onClick={() => handleDelete(item.id)}
                      style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '4px',
                        border: '1px solid #fca5a5',
                        background: '#fef2f2',
                        color: '#b91c1c',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal Add Vocab */}
        {showAddModal && (
          <div
            data-testid="modal-add-vocab"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1rem',
            }}
          >
            <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '8px', maxWidth: '500px', width: '100%' }}>
              <h3 style={{ margin: '0 0 1rem' }}>Thêm Từ Vựng Mới</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Từ / Chữ Hán:</label>
                  <input
                    data-testid="input-vocab-word"
                    type="text"
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    placeholder="Ví dụ: 契約"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Cách đọc:</label>
                  <input
                    data-testid="input-vocab-reading"
                    type="text"
                    value={newReading}
                    onChange={(e) => setNewReading(e.target.value)}
                    placeholder="Ví dụ: けいやく"
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Nghĩa Tiếng Việt:</label>
                <input
                  data-testid="input-vocab-meaning"
                  type="text"
                  value={newMeaning}
                  onChange={(e) => setNewMeaning(e.target.value)}
                  placeholder="Ví dụ: Hợp đồng, khế ước"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Cấp độ:</label>
                  <select
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value as 'N1' | 'N2' | 'N3' | 'N4' | 'N5')}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                  >
                    <option value="N5">N5</option>
                    <option value="N4">N4</option>
                    <option value="N3">N3</option>
                    <option value="N2">N2</option>
                    <option value="N1">N1</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Từ loại:</label>
                  <input
                    type="text"
                    value={newPos}
                    onChange={(e) => setNewPos(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Câu ví dụ:</label>
                <input
                  type="text"
                  value={newExample}
                  onChange={(e) => setNewExample(e.target.value)}
                  placeholder="Ví dụ câu trong ngữ cảnh..."
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #d1d5db', background: '#ffffff', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  data-testid="btn-confirm-add-vocab"
                  onClick={handleAdd}
                  style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Lưu Từ Vựng
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
