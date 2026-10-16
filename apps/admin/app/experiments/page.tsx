'use client';

import React, { useState } from 'react';
import { AdminGuard } from '../../lib/ui-guard';
import { useAdminAuth } from '../../lib/auth-context';

export interface ExperimentItem {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  totalAssignments: number;
  totalExposures: number;
  variants: Array<{
    key: string;
    name: string;
    weight: number;
    assignments: number;
    conversions: number;
    conversionRate: number;
  }>;
}

export default function ExperimentsAdminPage(): React.JSX.Element {
  const { user } = useAdminAuth();

  const [experiments, setExperiments] = useState<ExperimentItem[]>([
    {
      id: 'exp_checkout_layout_v1',
      name: 'Thử nghiệm giao diện thanh toán (1 bước vs 2 bước)',
      description: 'Đánh giá tỷ lệ hoàn tất đơn hàng gói Premium khi giảm bớt trường nhập liệu.',
      isActive: true,
      totalAssignments: 1420,
      totalExposures: 1210,
      variants: [
        {
          key: 'control',
          name: 'Gốc (2 bước)',
          weight: 50,
          assignments: 710,
          conversions: 84,
          conversionRate: 11.8,
        },
        {
          key: 'variant_b',
          name: 'Mới (1 chạm)',
          weight: 50,
          assignments: 710,
          conversions: 106,
          conversionRate: 14.9,
        },
      ],
    },
    {
      id: 'exp_reading_font_size',
      name: 'Thử nghiệm cỡ chữ đoạn văn Đọc hiểu',
      description: 'So sánh cỡ chữ 16px và 18px đối với tốc độ đọc hiểu và hoàn thành mondai.',
      isActive: false,
      totalAssignments: 580,
      totalExposures: 520,
      variants: [
        {
          key: 'control',
          name: 'Chuẩn 16px',
          weight: 50,
          assignments: 290,
          conversions: 210,
          conversionRate: 72.4,
        },
        {
          key: 'large_18px',
          name: 'Lớn 18px',
          weight: 50,
          assignments: 290,
          conversions: 228,
          conversionRate: 78.6,
        },
      ],
    },
  ]);

  const toggleActive = (id: string) => {
    setExperiments((prev) =>
      prev.map((e) => (e.id === id ? { ...e, isActive: !e.isActive } : e)),
    );
  };

  return (
    <AdminGuard pathname="/experiments">
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
              Quản trị Thử nghiệm A/B & Tối ưu Giao diện
            </h1>
            <p style={{ margin: 0, color: '#6b7280' }}>
              Cơ chế phân bổ cố định (Sticky Assignment) ẩn danh bảo vệ PII, theo dõi tỷ lệ chuyển đổi thời gian thực.
            </p>
          </div>
        </header>

        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {experiments.map((exp) => (
            <div
              key={exp.id}
              data-testid={`experiment-card-${exp.id}`}
              style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.35rem', color: '#111827' }}>
                    {exp.name}
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                    Mã thử nghiệm: <code>{exp.id}</code> | {exp.description}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span
                    data-testid={`experiment-status-${exp.id}`}
                    style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: '9999px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      background: exp.isActive ? '#d1fae5' : '#f3f4f6',
                      color: exp.isActive ? '#065f46' : '#6b7280',
                    }}
                  >
                    {exp.isActive ? 'ĐANG CHẠY (ACTIVE)' : 'TẠM DỪNG'}
                  </span>

                  <button
                    data-testid={`btn-toggle-experiment-${exp.id}`}
                    onClick={() => toggleActive(exp.id)}
                    style={{
                      padding: '0.4rem 0.85rem',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      background: '#ffffff',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {exp.isActive ? 'Tạm dừng' : 'Kích hoạt'}
                  </button>
                </div>
              </div>

              {/* Variant Comparison Table */}
              <div style={{ background: '#f9fafb', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#4b5563' }}>
                      <th style={{ padding: '0.65rem 1rem' }}>Biến thể (Variant)</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Tỷ lệ lưu lượng</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Lượt gán (Sticky)</th>
                      <th style={{ padding: '0.65rem 1rem' }}>Số chuyển đổi</th>
                      <th style={{ padding: '0.65rem 1rem', textAlign: 'right' }}>Tỷ lệ chuyển đổi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exp.variants.map((v) => (
                      <tr key={v.key} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '0.65rem 1rem', fontWeight: 600 }}>
                          <code>{v.key}</code> ({v.name})
                        </td>
                        <td style={{ padding: '0.65rem 1rem' }}>{v.weight}%</td>
                        <td style={{ padding: '0.65rem 1rem' }}>{v.assignments.toLocaleString()}</td>
                        <td style={{ padding: '0.65rem 1rem' }}>{v.conversions.toLocaleString()}</td>
                        <td style={{ padding: '0.65rem 1rem', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                          {v.conversionRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminGuard>
  );
}
