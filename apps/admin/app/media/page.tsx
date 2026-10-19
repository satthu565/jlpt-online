'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input } from '@jlpt/ui';
import { AdminGuard } from '../../lib/ui-guard';
import { useAdminAuth } from '../../lib/auth-context';
import { apiClient } from '../../lib/api-client';
import { t } from '../../lib/i18n';

export interface MediaAsset {
  id: string;
  key: string;
  filename?: string;
  mime: string;
  size: number;
  durationSec?: number | null;
  sha256?: string;
  createdAt?: string;
}

export default function MediaPage(): React.JSX.Element {
  const { locale } = useAdminAuth();
  const [mediaList, setMediaList] = useState<MediaAsset[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'audio' | 'image'>('all');

  const fetchMedia = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = (await apiClient.listMedia()) as { items?: MediaAsset[] } | MediaAsset[];
      const items = Array.isArray(res) ? res : res?.items || [];
      if (Array.isArray(items)) {
        setMediaList(items);
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Không thể tải danh sách phương tiện.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const file = files[0]!;

    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await apiClient.uploadMedia(file);
      setStatusMessage(`Đã tải lên tệp ${file.name} thành công!`);
      await fetchMedia();
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Tải lên phương tiện thất bại.');
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = mediaList.filter((m) => {
    if (filterType === 'audio') return m.mime?.startsWith('audio/');
    if (filterType === 'image') return m.mime?.startsWith('image/');
    return true;
  });

  return (
    <AdminGuard pathname="/media" requiredRoles={['editor', 'admin']}>
      <div className="overflow-x-hidden p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
        <header className="border-b border-gray-200 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900">
              {t('content.media.title', locale)}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('content.media.subtitle', locale)}
            </p>
          </div>

          <label className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 cursor-pointer self-start shadow-xs">
            {t('content.media.uploadBtn', locale)}
            <Input
              data-testid="input-upload-media"
              type="file"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </header>

        {isLoading && (
          <div
            data-testid="media-loading"
            className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-sm animate-pulse"
          >
            {t('common.loading', locale)}
          </div>
        )}

        {errorMessage && (
          <div
            data-testid="media-error-alert"
            className="p-4 bg-red-50 border border-red-300 text-red-700 rounded-md text-sm"
          >
            <strong className="font-semibold">Lỗi: </strong>
            {errorMessage}
          </div>
        )}

        {statusMessage && (
          <div
            data-testid="media-status-alert"
            className="p-4 bg-green-50 border border-green-300 text-green-700 rounded-md text-sm"
          >
            {statusMessage}
          </div>
        )}

        {/* Filter controls */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={filterType === 'all' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilterType('all')}
          >
            Tất cả ({mediaList.length})
          </Button>
          <Button
            type="button"
            variant={filterType === 'audio' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilterType('audio')}
          >
            {t('content.media.audioTitle', locale)} ({mediaList.filter((m) => m.mime?.startsWith('audio/')).length})
          </Button>
          <Button
            type="button"
            variant={filterType === 'image' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilterType('image')}
          >
            {t('content.media.imageTitle', locale)} ({mediaList.filter((m) => m.mime?.startsWith('image/')).length})
          </Button>
        </div>

        {/* Media Table */}
        <div className="overflow-x-auto w-full border border-gray-200 dark:border-slate-800 rounded-lg shadow-xs bg-white dark:bg-slate-900">
          <table data-testid="media-table" className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-800 text-gray-700 dark:text-slate-300">
                <th className="p-3">Khóa tệp (Key)</th>
                <th className="p-3">Loại MIME</th>
                <th className="p-3">Kích thước</th>
                <th className="p-3">Thời lượng</th>
                <th className="p-3">Mã SHA-256</th>
              </tr>
            </thead>
            <tbody>
              {!isLoading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} data-testid="media-empty" className="p-8 text-center text-gray-400">
                    {t('content.media.empty', locale)}
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} data-testid={`media-row-${item.id}`} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="p-3 font-medium text-gray-900 font-mono text-xs">
                      {item.key || item.filename || item.id}
                    </td>
                    <td className="p-3 text-xs text-gray-600">{item.mime}</td>
                    <td className="p-3 text-xs text-gray-600">
                      {item.size ? `${(item.size / 1024).toFixed(1)} KB` : '—'}
                    </td>
                    <td className="p-3 text-xs text-gray-600">
                      {item.durationSec ? `${item.durationSec}s` : '—'}
                    </td>
                    <td className="p-3 text-xs text-gray-400 font-mono">
                      {item.sha256 ? `${item.sha256.slice(0, 12)}...` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminGuard>
  );
}
