'use client';

import React, { useState } from 'react';
import { AdminGuard } from '../../lib/ui-guard';
import { useAdminAuth } from '../../lib/auth-context';
import type { Blueprint } from '@jlpt/schema';
import { BlueprintManager } from '../../features/content/blueprint-manager';

const SAMPLE_BLUEPRINT: Blueprint = {
  id: 'bp_N1_2026',
  level: 'N1',
  version: 1,
  kind: 'official',
  status: 'active',
  isOfficial: true,
  isConfirmed: true,
  effectiveFrom: '2026-01-01',
  sourceRef: [{ url: 'https://www.jlpt.jp/guideline.html', accessedAt: '2026-01-01T00:00:00Z' }],
  sections: [
    {
      code: 'language_knowledge',
      title: 'Kiến thức ngôn ngữ & Đọc hiểu',
      durationSec: 6600, // 110 mins
      mondai: [
        { type: 'kanji_reading', skill: 'kanji', questionCount: 6 },
        { type: 'contextual', skill: 'vocabulary', questionCount: 7 },
      ],
    },
    {
      code: 'listening',
      title: 'Nghe hiểu',
      durationSec: 3600, // 60 mins
      mondai: [
        { type: 'task_based', skill: 'listening', questionCount: 6 },
      ],
    },
  ],
  scoring: {
    method: 'linear_reference',
    rounding: 'round',
    scoringSections: [
      { code: 'language_knowledge', label: 'Kiến thức ngôn ngữ', skills: ['kanji', 'vocabulary', 'grammar'], maxScaled: 60, minPass: 19 },
      { code: 'reading', label: 'Đọc hiểu', skills: ['reading'], maxScaled: 60, minPass: 19 },
      { code: 'listening', label: 'Nghe hiểu', skills: ['listening'], maxScaled: 60, minPass: 19 },
    ],
    totalMax: 180,
    totalPass: 100,
  },
};

export default function BlueprintsPage(): React.JSX.Element {
  const { user } = useAdminAuth();
  const [manager] = useState(() => new BlueprintManager([SAMPLE_BLUEPRINT]));
  const [blueprints, setBlueprints] = useState<Blueprint[]>(() => manager.listBlueprints());
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreateNewVersion = (bp: Blueprint) => {
    if (!user) return;
    setErrorMsg(null);
    setMessage(null);
    try {
      const newV = manager.createNewVersion(bp.id || '', { note: 'Bản cập nhật mới' }, user);
      setBlueprints(manager.listBlueprints());
      setMessage(`Đã tạo phiên bản mới v${newV.version} cho cấp độ ${newV.level} (phiên bản cũ v${bp.version} vẫn được bảo toàn bất biến).`);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    }
  };

  const handleActivate = (bp: Blueprint) => {
    if (!user) return;
    setErrorMsg(null);
    setMessage(null);
    try {
      const activated = manager.activateBlueprint(bp.id || '', bp.version, user, { confirmedBy: user.id });
      setBlueprints(manager.listBlueprints());
      setMessage(`Đã kích hoạt Blueprint ${activated.level} v${activated.version} thành công!`);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    }
  };

  return (
    <AdminGuard pathname="/blueprints" requiredRoles={['editor', 'admin']}>
      <div style={{ padding: '2rem' }} className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900">
            Bản thiết kế đề thi (Exam Blueprints)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý cấu trúc thời gian và số câu từng phần thi N1–N5. Không thể sửa đè các phiên bản đã kích hoạt.
          </p>
        </div>

        {message && (
          <div data-testid="bp-success-message" className="p-3 bg-green-50 border border-green-200 text-green-800 rounded text-sm">
            {message}
          </div>
        )}

        {errorMsg && (
          <div data-testid="bp-error-message" className="p-3 bg-red-50 border border-red-200 text-red-800 rounded text-sm">
            {errorMsg}
          </div>
        )}

        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Cấp độ</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Phiên bản</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Loại đề</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Trạng thái</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Nguồn tham chiếu</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider text-xs">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {blueprints.map((bp) => (
                <tr key={`${bp.id}_${bp.version}`} data-testid={`bp-row-${bp.level}-v${bp.version}`}>
                  <td className="px-4 py-3 font-bold text-blue-700">{bp.level}</td>
                  <td className="px-4 py-3 font-mono">v{bp.version}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">{bp.kind}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      data-testid={`bp-status-${bp.level}-v${bp.version}`}
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        bp.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {bp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {bp.sourceRef?.[0]?.url || 'Không có nguồn'}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      type="button"
                      data-testid={`btn-create-version-${bp.level}`}
                      onClick={() => handleCreateNewVersion(bp)}
                      className="px-2.5 py-1 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 rounded font-medium"
                    >
                      Tạo version mới
                    </button>
                    {bp.status !== 'active' && user?.role === 'admin' && (
                      <button
                        type="button"
                        data-testid={`btn-activate-${bp.level}`}
                        onClick={() => handleActivate(bp)}
                        className="px-2.5 py-1 text-xs bg-green-50 text-green-700 hover:bg-green-100 rounded font-medium"
                      >
                        Kích hoạt
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminGuard>
  );
}
