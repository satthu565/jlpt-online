'use client';

import React, { useState } from 'react';
import { AdminGuard } from '../../../lib/ui-guard';
import { useAdminAuth } from '../../../lib/auth-context';

export interface MixedExamItem {
  id: string;
  title: string;
  level: 'N1' | 'N2' | 'N3' | 'N4' | 'N5';
  mode: 'random' | 'weak_points' | 'by_mondai';
  questionCount: number;
  seed: string;
  createdAt: string;
  attemptCount: number;
  status: 'active' | 'archived';
}

export default function MixedExamsPage(): React.JSX.Element {
  const { user: _user } = useAdminAuth();

  const [mixedExams, setMixedExams] = useState<MixedExamItem[]>([
    {
      id: 'mix-01',
      title: 'Đề Trộn N3 Tổng Hợp #1042',
      level: 'N3',
      mode: 'random',
      questionCount: 35,
      seed: 'seed-9481-n3',
      createdAt: '2026-10-15 11:20',
      attemptCount: 128,
      status: 'active',
    },
    {
      id: 'mix-02',
      title: 'Đề Ôn Luyện Điểm Yếu N2: Từ Vựng & Đọc Hiểu',
      level: 'N2',
      mode: 'weak_points',
      questionCount: 40,
      seed: 'seed-7721-n2',
      createdAt: '2026-10-14 09:15',
      attemptCount: 95,
      status: 'active',
    },
    {
      id: 'mix-03',
      title: 'Đề Chuyên Đề N1: Nghe Hiểu Hội Thoại',
      level: 'N1',
      mode: 'by_mondai',
      questionCount: 30,
      seed: 'seed-3312-n1',
      createdAt: '2026-10-13 15:40',
      attemptCount: 64,
      status: 'active',
    },
  ]);

  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newLevel, setNewLevel] = useState<'N1' | 'N2' | 'N3' | 'N4' | 'N5'>('N3');
  const [newMode, setNewMode] = useState<'random' | 'weak_points' | 'by_mondai'>('random');
  const [newCount, setNewCount] = useState<number>(35);

  const filtered = mixedExams.filter(
    (e) => selectedLevel === 'all' || e.level === selectedLevel,
  );

  const handleCreate = () => {
    if (!newTitle.trim()) return;

    const newItem: MixedExamItem = {
      id: `mix-${Date.now().toString().slice(-4)}`,
      title: newTitle,
      level: newLevel,
      mode: newMode,
      questionCount: newCount,
      seed: `seed-${Math.floor(1000 + Math.random() * 9000)}-${newLevel.toLowerCase()}`,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      attemptCount: 0,
      status: 'active',
    };

    setMixedExams([newItem, ...mixedExams]);
    setShowCreateModal(false);
    setNewTitle('');
  };

  return (
    <AdminGuard pathname="/exams/mixed">
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
              Quản lý Đề thi Trộn Ngẫu nhiên (ADM-11)
            </h1>
            <p style={{ margin: 0, color: '#6b7280' }}>
              Theo dõi và khởi tạo các đề thi được thuật toán trộn tự động theo cấp độ và ma trận kiến thức.
            </p>
          </div>

          <button
            data-testid="btn-create-mixed-exam"
            onClick={() => setShowCreateModal(true)}
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
            + Khởi tạo Đề Trộn Mới
          </button>
        </header>

        {/* Filter bar */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Cấp độ:</span>
          {['all', 'N1', 'N2', 'N3', 'N4', 'N5'].map((lvl) => (
            <button
              key={lvl}
              data-testid={`filter-level-${lvl}`}
              onClick={() => setSelectedLevel(lvl)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                background: selectedLevel === lvl ? '#2563eb' : '#ffffff',
                color: selectedLevel === lvl ? '#ffffff' : '#374151',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              {lvl === 'all' ? 'Tất cả' : lvl}
            </button>
          ))}
        </div>

        {/* Exam Cards */}
        <div style={{ display: 'grid', gap: '1rem' }}>
          {filtered.map((exam) => (
            <div
              key={exam.id}
              data-testid={`mixed-exam-card-${exam.id}`}
              style={{
                background: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                padding: '1.25rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
                  <span
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      background: '#e0e7ff',
                      color: '#3730a3',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                    }}
                  >
                    {exam.level}
                  </span>
                  <strong style={{ fontSize: '1.05rem', color: '#111827' }}>{exam.title}</strong>
                  <span
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '9999px',
                      background: '#f3f4f6',
                      fontSize: '0.75rem',
                      color: '#4b5563',
                    }}
                  >
                    Chế độ: {exam.mode}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  Số câu hỏi: <strong>{exam.questionCount}</strong> | Mã seed: <code>{exam.seed}</code> | Tạo lúc: {exam.createdAt}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>{exam.attemptCount}</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>lượt làm bài</div>
                </div>
                <button
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Xem chi tiết
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Create Mixed Exam */}
        {showCreateModal && (
          <div
            data-testid="modal-create-mixed-exam"
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
              <h3 style={{ margin: '0 0 1rem' }}>Khởi tạo Đề thi Trộn Ngẫu nhiên mới</h3>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Tiêu đề đề thi:</label>
                <input
                  data-testid="input-mixed-title"
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Đề Trộn JLPT N3 Đột Phá Điểm Số"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Cấp độ:</label>
                  <select
                    data-testid="select-mixed-level"
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
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Số câu hỏi:</label>
                  <input
                    type="number"
                    value={newCount}
                    onChange={(e) => setNewCount(Number(e.target.value))}
                    min={10}
                    max={100}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Thuật toán trộn:</label>
                <select
                  value={newMode}
                  onChange={(e) => setNewMode(e.target.value as 'random' | 'weak_points' | 'by_mondai')}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                >
                  <option value="random">Ngẫu nhiên phân bổ đồng đều các mondai</option>
                  <option value="weak_points">Tập trung câu hỏi có tỷ lệ làm sai cao</option>
                  <option value="by_mondai">Trộn chuyên biệt theo từng phần thi</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #d1d5db', background: '#ffffff', cursor: 'pointer' }}
                >
                  Hủy
                </button>
                <button
                  data-testid="btn-confirm-create-mixed"
                  onClick={handleCreate}
                  style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Tạo Đề Trộn
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
