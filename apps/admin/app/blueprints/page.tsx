'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@jlpt/ui/components/button';
import { AdminGuard } from '../../lib/ui-guard';
import { useAdminAuth } from '../../lib/auth-context';
import { apiClient } from '../../lib/api-client';
import { t } from '../../lib/i18n';
import type { Blueprint } from '@jlpt/schema';
import { BlueprintManager } from '../../features/content/blueprint-manager';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@jlpt/ui/components/table';

export default function BlueprintsPage(): React.JSX.Element {
  const { user, locale } = useAdminAuth();
  const [manager] = useState(() => new BlueprintManager([]));
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchBlueprints = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = (await apiClient.listBlueprints()) as { items?: Blueprint[] } | Blueprint[];
      const items = Array.isArray(res) ? res : res?.items || [];
      if (items.length > 0) {
        setBlueprints(items);
      } else {
        setBlueprints(manager.listBlueprints());
      }
    } catch {
      setBlueprints(manager.listBlueprints());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBlueprints();
  }, []);

  const handleCreateNewVersion = async (bp: Blueprint) => {
    if (!user) return;
    setErrorMsg(null);
    setMessage(null);
    try {
      try {
        await apiClient.createBlueprintVersion(bp.id || '', { note: 'Bản cập nhật mới' });
      } catch {
        manager.createNewVersion(bp.id || '', { note: 'Bản cập nhật mới' }, user);
      }
      await fetchBlueprints();
      setMessage(
        `Đã tạo phiên bản mới cho cấp độ ${bp.level} (phiên bản cũ v${bp.version} vẫn được bảo toàn bất biến).`,
      );
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    }
  };

  const handleActivate = async (bp: Blueprint) => {
    if (!user) return;
    setErrorMsg(null);
    setMessage(null);
    try {
      try {
        await apiClient.activateBlueprint(bp.id || '', bp.version);
      } catch {
        manager.activateBlueprint(bp.id || '', bp.version, user, { confirmedBy: user.id });
      }
      await fetchBlueprints();
      setMessage(`Đã kích hoạt Blueprint ${bp.level} v${bp.version} thành công!`);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    }
  };

  return (
    <AdminGuard pathname="/blueprints" requiredRoles={['editor', 'admin']}>
      <div className="overflow-x-hidden p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
        <div className="border-b border-gray-200 pb-4">
          <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900">
            {t('content.blueprints.title', locale)}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('content.blueprints.subtitle', locale)}
          </p>
        </div>

        {isLoading && (
          <div
            data-testid="blueprints-loading"
            className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-sm animate-pulse"
          >
            {t('common.loading', locale)}
          </div>
        )}

        {message && (
          <div
            data-testid="bp-success-message"
            className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-md text-sm"
          >
            {message}
          </div>
        )}

        {errorMsg && (
          <div
            data-testid="bp-error-message"
            className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm"
          >
            <strong data-testid="blueprints-error-alert" className="font-semibold">Lỗi: </strong>
            {errorMsg}
          </div>
        )}

        <div className="overflow-x-auto w-full">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-left font-semibold">Cấp độ</TableHead>
                <TableHead className="text-left font-semibold">Phiên bản</TableHead>
                <TableHead className="text-left font-semibold">Loại đề</TableHead>
                <TableHead className="text-left font-semibold">Trạng thái</TableHead>
                <TableHead className="text-left font-semibold">Nguồn tham chiếu</TableHead>
                <TableHead className="text-right font-semibold">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && blueprints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} data-testid="blueprints-empty" className="text-center">
                    {t('content.blueprints.empty', locale)}
                  </TableCell>
                </TableRow>
              ) : (
                blueprints.map((bp) => (
                  <TableRow key={`${bp.id}_${bp.version}`} data-testid={`bp-row-${bp.level}-v${bp.version}`}>
                    <TableCell className="font-bold">{bp.level}</TableCell>
                    <TableCell className="font-mono">v{bp.version}</TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">{bp.kind}</span>
                    </TableCell>
                    <TableCell>
                      <span
                        data-testid={`bp-status-${bp.level}-v${bp.version}`}
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          bp.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {bp.status}
                      </span>
                      {(bp as Blueprint & { isCurrent?: boolean }).isCurrent && (
                        <span
                          data-testid={`bp-current-${bp.level}`}
                          className="ml-2 px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800"
                        >
                          Đang áp dụng
                        </span>
                      )}
                      <div className="mt-1 text-xs text-gray-500">
                        Đề từ {bp.effectiveFrom}
                        {(bp as Blueprint & { effectiveTo?: string | null }).effectiveTo
                          ? ` đến ${(bp as Blueprint & { effectiveTo?: string | null }).effectiveTo}`
                          : ' trở đi'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {bp.sourceRef?.[0]?.url || 'Không có nguồn'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        data-testid={`btn-create-version-${bp.level}`}
                        onClick={() => handleCreateNewVersion(bp)}
                      >
                        {t('content.blueprints.createVersionBtn', locale)}
                      </Button>
                      {bp.status !== 'active' && user?.role === 'admin' && (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          data-testid={`btn-activate-${bp.level}`}
                          onClick={() => handleActivate(bp)}
                        >
                          {t('content.blueprints.activateBtn', locale)}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminGuard>
  );
}
