'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminGuard } from '../../../lib/ui-guard';
import { useAdminAuth } from '../../../lib/auth-context';
import { apiClient } from '../../../lib/api-client';
import { t } from '../../../lib/i18n';
import { Button } from '@jlpt/ui/components/button';
import { Input } from '@jlpt/ui/components/input';
import { Card, CardHeader, CardTitle, CardContent } from '@jlpt/ui/components/card';
import { Badge } from '@jlpt/ui/components/badge';
import { Alert } from '@jlpt/ui/components/alert';
import { Spinner } from '@jlpt/ui/components/spinner';
import type { Level } from '@jlpt/schema';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@jlpt/ui/components/table';
import { Checkbox } from '@jlpt/ui/components/checkbox';

export interface JlptScheduleLocation {
  city: string;
  name: string;
  address?: string;
}

export interface JlptSchedule {
  id: string;
  title: string;
  examDate: string;
  registrationDeadline: string;
  registrationOpensAt?: string | null;
  locations: JlptScheduleLocation[];
  officialUrl: string;
  levels: Level[];
  status: 'draft' | 'published' | 'archived';
  notes?: string | null;
  publishedAt?: string | null;
  publishedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_LOCATIONS: JlptScheduleLocation[] = [
  { city: 'Hà Nội', name: 'Trường ĐH Ngoại ngữ - ĐHQGHN', address: 'Số 2 Phạm Văn Đồng, Cầu Giấy' },
  { city: 'Đà Nẵng', name: 'Trường ĐH Ngoại ngữ - ĐH Đà Nẵng', address: '131 Lương Nhữ Hộc, Cẩm Lệ' },
  { city: 'TP. Hồ Chí Minh', name: 'Trường ĐH Khoa học Xã hội và Nhân văn - ĐHQG TP.HCM', address: '10-12 Đinh Tiên Hoàng, Q.1' },
];

const ALL_LEVELS: Level[] = ['N1', 'N2', 'N3', 'N4', 'N5'];

export default function JlptSchedulesPage(): React.JSX.Element {
  const { user, locale } = useAdminAuth();

  const [schedules, setSchedules] = useState<JlptSchedule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form state
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formExamDate, setFormExamDate] = useState<string>('');
  const [formDeadline, setFormDeadline] = useState<string>('');
  const [formOpensAt, setFormOpensAt] = useState<string>('');
  const [formOfficialUrl, setFormOfficialUrl] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formLevels, setFormLevels] = useState<Level[]>(['N1', 'N2', 'N3', 'N4', 'N5']);
  const [formLocations, setFormLocations] = useState<JlptScheduleLocation[]>(DEFAULT_LOCATIONS);

  const fetchSchedules = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.listJlptSchedules(statusFilter === 'all' ? undefined : statusFilter);
      const items = (res?.items || []) as JlptSchedule[];
      setSchedules(items);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setSchedules([]);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleOpenAddForm = () => {
    setEditingId(null);
    setFormTitle('');
    setFormExamDate('');
    setFormDeadline('');
    setFormOpensAt('');
    setFormOfficialUrl('');
    setFormNotes('');
    setFormLevels(['N1', 'N2', 'N3', 'N4', 'N5']);
    setFormLocations(DEFAULT_LOCATIONS);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (item: JlptSchedule) => {
    setEditingId(item.id);
    setFormTitle(item.title);
    setFormExamDate(item.examDate);
    setFormDeadline(item.registrationDeadline);
    setFormOpensAt(item.registrationOpensAt || '');
    setFormOfficialUrl(item.officialUrl);
    setFormNotes(item.notes || '');
    setFormLevels(item.levels || ['N1', 'N2', 'N3', 'N4', 'N5']);
    setFormLocations(item.locations || DEFAULT_LOCATIONS);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsFormOpen(true);
  };

  const handleToggleLevel = (lvl: Level) => {
    setFormLevels((prev) =>
      prev.includes(lvl) ? prev.filter((l) => l !== lvl) : [...prev, lvl],
    );
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formExamDate.trim() || !formDeadline.trim() || !formOfficialUrl.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ các trường bắt buộc (Tên kỳ thi, Ngày thi, Hạn đăng ký, Link chính thức).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload = {
      title: formTitle.trim(),
      examDate: formExamDate.trim(),
      registrationDeadline: formDeadline.trim(),
      registrationOpensAt: formOpensAt.trim() || undefined,
      officialUrl: formOfficialUrl.trim(),
      locations: formLocations,
      levels: formLevels,
      notes: formNotes.trim() || undefined,
    };

    try {
      if (editingId) {
        await apiClient.updateJlptSchedule(editingId, payload);
        setSuccessMsg(t('content.schedules.saveSuccess', locale));
      } else {
        await apiClient.createJlptSchedule(payload);
        setSuccessMsg(t('content.schedules.saveSuccess', locale));
      }
      setIsFormOpen(false);
      setEditingId(null);
      await fetchSchedules();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async (id: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      await apiClient.publishJlptSchedule(id);
      setSuccessMsg(t('content.schedules.publishSuccess', locale));
      await fetchSchedules();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnpublish = async (id: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      await apiClient.unpublishJlptSchedule(id);
      setSuccessMsg(t('content.schedules.unpublishSuccess', locale));
      await fetchSchedules();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa lịch thi này?')) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      await apiClient.deleteJlptSchedule(id);
      setSuccessMsg(t('content.schedules.deleteSuccess', locale));
      await fetchSchedules();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemind = async (id: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      await apiClient.remindJlptRegistration(id);
      setSuccessMsg(t('content.schedules.remindSuccess', locale));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTriggerAllReminders = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      await apiClient.triggerJlptReminders();
      setSuccessMsg('Đã kích hoạt quét và tạo thông báo nhắc hạn thành công!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatShortDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const localeMap: Record<string, string> = {
        vi: 'vi-VN',
        ja: 'ja-JP',
        en: 'en-US',
      };
      const intlLocale = localeMap[locale] || 'vi-VN';
      return isNaN(d.getTime()) ? isoStr : d.toLocaleDateString(intlLocale);
    } catch {
      return isoStr;
    }
  };

  return (
    <AdminGuard pathname="/exams/schedules" requiredRoles={['editor', 'admin']}>
      <div className="overflow-x-hidden p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-4">
          <div>
            <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900 tracking-tight">
              {t('content.schedules.title', locale)}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('content.schedules.subtitle', locale)}
            </p>
          </div>
          {user?.role === 'admin' && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTriggerAllReminders}
                disabled={isSubmitting}
                data-testid="btn-trigger-all-reminders"
              >
                {t('content.schedules.triggerAllRemindersBtn', locale)}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenAddForm}
                data-testid="btn-add-schedule"
              >
                {t('content.schedules.addNewBtn', locale)}
              </Button>
            </div>
          )}
        </div>

        {/* Notifications */}
        {successMsg && (
          <Alert variant="success" data-testid="schedules-success">
            {successMsg}
          </Alert>
        )}
        {errorMsg && (
          <Alert variant="error" data-testid="schedules-error">
            <strong className="font-semibold">Lỗi: </strong>
            {errorMsg}
          </Alert>
        )}

        {/* Form Modal / Inline Card */}
        {isFormOpen && (
          <Card className="border-blue-200 shadow-md bg-blue-50/20" data-testid="schedule-form">
            <CardHeader className="border-b border-gray-200">
              <CardTitle as="h2" className="text-lg font-bold text-gray-900">
                {editingId
                  ? t('content.schedules.formTitleEdit', locale)
                  : t('content.schedules.formTitleAdd', locale)}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSaveSchedule} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                      {t('content.schedules.inputTitle', locale)} *
                    </label>
                    <Input
                      data-testid="input-schedule-title"
                      value={formTitle}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormTitle(e.target.value)}
                      placeholder={t('content.schedules.inputTitlePlaceholder', locale)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                      {t('content.schedules.inputExamDate', locale)} (YYYY-MM-DD) *
                    </label>
                    <Input
                      data-testid="input-schedule-date"
                      type="date"
                      value={formExamDate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormExamDate(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                      {t('content.schedules.inputDeadline', locale)} (ISO/Date) *
                    </label>
                    <Input
                      data-testid="input-schedule-deadline"
                      value={formDeadline}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormDeadline(e.target.value)}
                      placeholder="2026-09-15T23:59:59.000Z"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                      {t('content.schedules.inputOpensAt', locale)}
                    </label>
                    <Input
                      data-testid="input-schedule-opens"
                      value={formOpensAt}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormOpensAt(e.target.value)}
                      placeholder="2026-08-01T00:00:00.000Z"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                      {t('content.schedules.inputOfficialUrl', locale)} *
                    </label>
                    <Input
                      data-testid="input-schedule-url"
                      type="url"
                      value={formOfficialUrl}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormOfficialUrl(e.target.value)}
                      placeholder="https://jlpt.vn"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                      {t('content.schedules.inputLevels', locale)}
                    </label>
                    <div className="flex flex-wrap gap-3 mt-1" data-testid="input-schedule-levels">
                      {ALL_LEVELS.map((lvl) => (
                        <label key={lvl} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-800 cursor-pointer">
                          <Checkbox
                            checked={formLevels.includes(lvl)}
                            onCheckedChange={() => handleToggleLevel(lvl)}
                          />
                          <span>{lvl}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                      {t('content.schedules.inputLocations', locale)}
                    </label>
                    <div className="surface surface--secondary rounded-2xl space-y-2 p-3" data-testid="input-schedule-locations">
                      {formLocations.map((loc, idx) => (
                        <div key={idx} className="text-xs text-gray-700 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-gray-900">{loc.city}:</span> {loc.name} {loc.address ? `(${loc.address})` : ''}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                      {t('content.schedules.inputNotes', locale)}
                    </label>
                    <Input
                      data-testid="input-schedule-notes"
                      value={formNotes}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormNotes(e.target.value)}
                      placeholder="Ghi chú thêm về kỳ thi, phòng thi hoặc đối tượng..."
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsFormOpen(false);
                      setEditingId(null);
                    }}
                    data-testid="btn-cancel-schedule"
                  >
                    {t('content.schedules.cancelBtn', locale)}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isSubmitting}
                    data-testid="btn-save-schedule"
                  >
                    {isSubmitting ? 'Đang lưu...' : t('content.schedules.saveBtn', locale)}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={statusFilter === 'all' ? 'primary' : 'outline'}
            onClick={() => setStatusFilter('all')}
            data-testid="filter-all"
          >
            {t('content.schedules.filterAll', locale)}
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'draft' ? 'primary' : 'outline'}
            onClick={() => setStatusFilter('draft')}
            data-testid="filter-draft"
          >
            {t('content.schedules.filterDraft', locale)}
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'published' ? 'primary' : 'outline'}
            onClick={() => setStatusFilter('published')}
            data-testid="filter-published"
          >
            {t('content.schedules.filterPublished', locale)}
          </Button>
          <Button
            size="sm"
            variant={statusFilter === 'archived' ? 'primary' : 'outline'}
            onClick={() => setStatusFilter('archived')}
            data-testid="filter-archived"
          >
            {t('content.schedules.filterArchived', locale)}
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div data-testid="schedules-loading" className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] flex items-center justify-center p-12">
            <Spinner size="lg" />
            <span className="ml-3 text-sm text-gray-500">{t('content.schedules.loading', locale)}</span>
          </div>
        )}

        {/* Data Table */}
        {!isLoading && (
          <div className="surface surface--default rounded-3xl shadow-[var(--surface-shadow)] w-full overflow-hidden">
            <div className="overflow-x-auto w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left font-semibold">
                      {t('content.schedules.colTitle', locale)}
                    </TableHead>
                    <TableHead className="text-left font-semibold">
                      {t('content.schedules.colExamDate', locale)}
                    </TableHead>
                    <TableHead className="text-left font-semibold">
                      {t('content.schedules.colDeadline', locale)}
                    </TableHead>
                    <TableHead className="text-left font-semibold">
                      {t('content.schedules.colLevels', locale)}
                    </TableHead>
                    <TableHead className="text-left font-semibold">
                      {t('content.schedules.colLocations', locale)}
                    </TableHead>
                    <TableHead className="text-left font-semibold">
                      {t('content.schedules.colStatus', locale)}
                    </TableHead>
                    <TableHead className="text-right font-semibold">
                      {t('content.schedules.colActions', locale)}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} data-testid="schedules-empty" className="text-center">
                        {t('content.schedules.empty', locale)}
                      </TableCell>
                    </TableRow>
                  ) : (
                    schedules.map((item) => (
                      <TableRow key={item.id} data-testid={`schedule-row-${item.id}`}>
                        <TableCell className="font-semibold">
                          <div data-testid={`schedule-title-${item.id}`} className="text-blue-900 font-medium">
                            {item.title}
                          </div>
                          {item.officialUrl && (
                            <a
                              href={item.officialUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 hover:underline block mt-0.5 truncate max-w-xs"
                            >
                              {item.officialUrl}
                            </a>
                          )}
                        </TableCell>
                        <TableCell className="font-mono whitespace-nowrap">
                          {formatShortDate(item.examDate)}
                        </TableCell>
                        <TableCell className="font-mono whitespace-nowrap">
                          {formatShortDate(item.registrationDeadline)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {item.levels?.map((lvl) => (
                              <Badge key={lvl} variant="neutral" size="sm">
                                {lvl}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.locations && item.locations.length > 0
                            ? item.locations.map((loc) => loc.city).join(', ')
                            : 'Toàn quốc'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span data-testid={`schedule-status-${item.id}`}>
                            {item.status === 'published' ? (
                              <Badge variant="success" size="sm">
                                {t('content.schedules.filterPublished', locale)}
                              </Badge>
                            ) : item.status === 'draft' ? (
                              <Badge variant="warning" size="sm">
                                {t('content.schedules.filterDraft', locale)}
                              </Badge>
                            ) : (
                              <Badge variant="neutral" size="sm">
                                {t('content.schedules.filterArchived', locale)}
                              </Badge>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-right space-x-1.5 whitespace-nowrap">
                          {user?.role === 'admin' && (
                            <>
                              {item.status === 'draft' && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handlePublish(item.id)}
                                  disabled={isSubmitting}
                                  data-testid={`btn-publish-${item.id}`}
                                >
                                  {t('content.schedules.publishBtn', locale)}
                                </Button>
                              )}
                              {item.status === 'published' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUnpublish(item.id)}
                                  disabled={isSubmitting}
                                  data-testid={`btn-unpublish-${item.id}`}
                                >
                                  {t('content.schedules.unpublishBtn', locale)}
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEditForm(item)}
                                disabled={isSubmitting}
                                data-testid={`btn-edit-${item.id}`}
                              >
                                {t('content.schedules.editBtn', locale)}
                              </Button>
                              {item.status === 'published' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRemind(item.id)}
                                  disabled={isSubmitting}
                                  data-testid={`btn-remind-${item.id}`}
                                >
                                  {t('content.schedules.remindBtn', locale)}
                                </Button>
                              )}
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleDelete(item.id)}
                                disabled={isSubmitting}
                                data-testid={`btn-delete-${item.id}`}
                              >
                                {t('content.schedules.deleteBtn', locale)}
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
