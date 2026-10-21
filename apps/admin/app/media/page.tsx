'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@jlpt/ui/components/button';
import { Input } from '@jlpt/ui/components/input';
import { AdminGuard } from '../../lib/ui-guard';
import { useAdminAuth } from '../../lib/auth-context';
import { apiClient } from '../../lib/api-client';
import { t } from '../../lib/i18n';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@jlpt/ui/components/table';

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
        <div className="overflow-x-auto w-full">
          <Table data-testid="media-table" className="text-left">
            <TableHeader>
              <TableRow>
                <TableHead>Khóa tệp (Key)</TableHead>
                <TableHead>Loại MIME</TableHead>
                <TableHead>Kích thước</TableHead>
                <TableHead>Thời lượng</TableHead>
                <TableHead>Mã SHA-256</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} data-testid="media-empty" className="text-center">
                    {t('content.media.empty', locale)}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item) => (
                  <TableRow key={item.id} data-testid={`media-row-${item.id}`}>
                    <TableCell className="font-medium font-mono">
                      {item.key || item.filename || item.id}
                    </TableCell>
                    <TableCell>{item.mime}</TableCell>
                    <TableCell>
                      {item.size ? `${(item.size / 1024).toFixed(1)} KB` : '—'}
                    </TableCell>
                    <TableCell>
                      {item.durationSec ? `${item.durationSec}s` : '—'}
                    </TableCell>
                    <TableCell className="font-mono">
                      {item.sha256 ? `${item.sha256.slice(0, 12)}...` : '—'}
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
