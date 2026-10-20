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
import type { Blueprint, Skill } from '@jlpt/schema';

export interface ScoreConversionSection {
  code: string;
  label: string;
  skills: Skill[];
  maxScaled: number;
  minPass: number;
}

export function resolveScoringSectionSkills(code: string, explicitSkills?: Skill[], origSkills?: Skill[]): Skill[] {
  if (Array.isArray(explicitSkills) && explicitSkills.length > 0) {
    return [...explicitSkills];
  }
  if (Array.isArray(origSkills) && origSkills.length > 0) {
    return [...origSkills];
  }
  if (code === 'listening') return ['listening'];
  if (code === 'reading') return ['reading'];
  if (code === 'language' || code === 'language_knowledge') return ['kanji', 'vocabulary', 'grammar'];
  if (code === 'vocabulary') return ['vocabulary'];
  if (code === 'grammar') return ['grammar'];
  if (code === 'kanji') return ['kanji'];
  return ['kanji', 'vocabulary', 'grammar', 'reading'];
}

export default function ScoreConversionTablesPage(): React.JSX.Element {
  const { user, locale } = useAdminAuth();

  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Modal / Form state for creating a new version
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [targetBlueprint, setTargetBlueprint] = useState<Blueprint | null>(null);
  const [formTotalPass, setFormTotalPass] = useState<number>(80);
  const [formNote, setFormNote] = useState<string>('');
  const [formSections, setFormSections] = useState<ScoreConversionSection[]>([]);
  const [draftVersionKeys, setDraftVersionKeys] = useState<Set<string>>(new Set());

  const fetchBlueprints = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = (await apiClient.listBlueprints(selectedLevel === 'all' ? undefined : selectedLevel)) as
        | { items?: Blueprint[] }
        | Blueprint[];
      const items = Array.isArray(res) ? res : res?.items || [];
      setBlueprints(items);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setBlueprints([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLevel]);

  useEffect(() => {
    fetchBlueprints();
  }, [fetchBlueprints]);

  const handleOpenCreateVersion = (bp: Blueprint) => {
    setTargetBlueprint(bp);
    setFormTotalPass(bp.scoring?.totalPass || 80);
    setFormNote(`Phiên bản mới cho cấp độ ${bp.level} (tạo bởi ${user?.name || user?.email || 'admin'})`);
    const sections: ScoreConversionSection[] = (bp.scoring?.scoringSections || []).map((sec) => ({
      code: sec.code,
      label: sec.label || sec.code,
      skills: resolveScoringSectionSkills(sec.code, sec.skills, undefined),
      maxScaled: sec.maxScaled,
      minPass: sec.minPass,
    }));
    setFormSections(sections);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsCreateOpen(true);
  };

  const handleSectionMinPassChange = (idx: number, val: number) => {
    setFormSections((prev) => {
      const updated = [...prev];
      if (updated[idx]) {
        updated[idx] = { ...updated[idx], minPass: val };
      }
      return updated;
    });
  };

  const handleSaveNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBlueprint?.id) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const updatedScoring = {
      ...targetBlueprint.scoring,
      method: targetBlueprint.scoring?.method || 'linear_reference',
      rounding: targetBlueprint.scoring?.rounding || 'round',
      totalPass: Number(formTotalPass),
      scoringSections: formSections.map((s) => {
        const origSec = targetBlueprint.scoring?.scoringSections?.find((orig) => orig.code === s.code);
        return {
          code: s.code,
          label: s.label,
          maxScaled: s.maxScaled,
          minPass: s.minPass,
          skills: resolveScoringSectionSkills(s.code, s.skills, origSec?.skills),
        };
      }),
    };

    const newVersionPayload = {
      note: formNote.trim(),
      scoring: updatedScoring,
      sections: targetBlueprint.sections,
      effectiveFrom: targetBlueprint.effectiveFrom || '2026-10',
      sourceRef: targetBlueprint.sourceRef || [{ url: 'https://jlpt.vn', accessedAt: new Date().toISOString() }],
    };

    try {
      const res = await apiClient.createBlueprintVersion(targetBlueprint.id, newVersionPayload);
      const newVersionNum = res.version || targetBlueprint.version + 1;
      const rowKey = `${targetBlueprint.level}_v${newVersionNum}`;
      setDraftVersionKeys((prev) => new Set(prev).add(rowKey));
      setSuccessMsg(
        `${t('content.scoringTables.versionCreatedSuccess', locale)} (v${newVersionNum})`,
      );
      setIsCreateOpen(false);
      setTargetBlueprint(null);
      await fetchBlueprints();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivateVersion = async (bp: Blueprint) => {
    if (!bp.id) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiClient.activateBlueprint(bp.id, { confirmedBy: user?.id || 'admin' });
      const rowKey = `${bp.level}_v${bp.version}`;
      setDraftVersionKeys((prev) => {
        const next = new Set(prev);
        next.delete(rowKey);
        return next;
      });
      setSuccessMsg(
        `${t('content.scoringTables.versionActivatedSuccess', locale)} (${bp.level} v${bp.version})`,
      );
      await fetchBlueprints();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const levels: string[] = ['all', 'N1', 'N2', 'N3', 'N4', 'N5'];

  return (
    <AdminGuard pathname="/exams/scoring" requiredRoles={['editor', 'admin']}>
      <div className="overflow-x-hidden p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-4">
          <div>
            <h1 data-testid="page-title" className="text-2xl font-bold text-gray-900 tracking-tight">
              {t('content.scoringTables.title', locale)}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('content.scoringTables.subtitle', locale)}
            </p>
          </div>
        </div>

        {/* Immutability Banner Alert */}
        <Alert variant="info" data-testid="immutable-notice">
          <strong>Bảo toàn lịch sử: </strong>
          {t('content.scoringTables.immutableNotice', locale)}
        </Alert>

        {/* Notifications */}
        {successMsg && (
          <Alert variant="success" data-testid="scoring-success">
            {successMsg}
          </Alert>
        )}
        {errorMsg && (
          <Alert variant="error" data-testid="scoring-error">
            <strong className="font-semibold">Lỗi: </strong>
            {errorMsg}
          </Alert>
        )}

        {/* Create Version Modal / Inline Form */}
        {isCreateOpen && targetBlueprint && (
          <Card className="border-blue-200 shadow-md bg-blue-50/20" data-testid="create-scoring-version-form">
            <CardHeader className="border-b border-gray-200">
              <CardTitle as="h2" className="text-lg font-bold text-gray-900">
                {t('content.scoringTables.formTitle', locale)}: {targetBlueprint.level} (Từ v{targetBlueprint.version} → v{targetBlueprint.version + 1})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSaveNewVersion} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                      {t('content.scoringTables.inputTotalPass', locale)} (0–180) *
                    </label>
                    <Input
                      data-testid="input-scoring-total-pass"
                      type="number"
                      min={1}
                      max={180}
                      value={formTotalPass}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormTotalPass(Number(e.target.value))}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                      {t('content.scoringTables.inputNote', locale)}
                    </label>
                    <Input
                      data-testid="input-scoring-note"
                      value={formNote}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormNote(e.target.value)}
                      placeholder="Lý do cập nhật hoặc chuẩn áp dụng..."
                    />
                  </div>

                  {/* Section Breakdown Inputs */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-700 uppercase mb-2">
                      {t('content.scoringTables.colSections', locale)} (Điểm sàn từng phần)
                    </label>
                    <div className="space-y-3 bg-white p-4 rounded-md border border-gray-200">
                      {formSections.map((sec, idx) => (
                        <div key={sec.code} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 bg-gray-50 rounded">
                          <div>
                            <span className="font-semibold text-gray-900 text-sm">{sec.label}</span>
                            <span className="text-xs text-gray-500 block">Tối đa: {sec.maxScaled} điểm</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-gray-600 font-medium">Điểm sàn:</label>
                            <Input
                              data-testid={`input-section-min-pass-${sec.code}`}
                              type="number"
                              min={0}
                              max={sec.maxScaled}
                              className="w-24 text-sm"
                              value={sec.minPass}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                handleSectionMinPassChange(idx, Number(e.target.value))
                              }
                              required
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsCreateOpen(false);
                      setTargetBlueprint(null);
                    }}
                    data-testid="btn-cancel-scoring-version"
                  >
                    {t('content.scoringTables.cancelBtn', locale)}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isSubmitting}
                    data-testid="btn-submit-scoring-version"
                  >
                    {isSubmitting ? 'Đang tạo...' : t('content.scoringTables.saveVersionBtn', locale)}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Level Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {levels.map((lvl) => (
            <Button
              key={lvl}
              size="sm"
              variant={selectedLevel === lvl ? 'primary' : 'outline'}
              onClick={() => setSelectedLevel(lvl)}
              data-testid={`filter-level-${lvl.toLowerCase()}`}
            >
              {lvl === 'all' ? t('content.schedules.filterAll', locale) : lvl}
            </Button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div data-testid="scoring-loading" className="flex items-center justify-center p-12 bg-white border border-gray-200 rounded-lg">
            <Spinner size="lg" />
            <span className="ml-3 text-sm text-gray-500">{t('content.scoringTables.loading', locale)}</span>
          </div>
        )}

        {/* Score Conversion Tables List */}
        {!isLoading && (
          <div className="w-full bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                      {t('content.scoringTables.colLevel', locale)}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                      {t('content.scoringTables.colVersion', locale)}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                      {t('content.scoringTables.colStatus', locale)}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                      {t('content.scoringTables.colTotalPass', locale)}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                      {t('content.scoringTables.colTotalMax', locale)}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                      {t('content.scoringTables.colSections', locale)}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">
                      {t('content.scoringTables.colMethod', locale)}
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-xs uppercase tracking-wider">
                      {t('content.scoringTables.colActions', locale)}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {blueprints.length === 0 ? (
                    <tr>
                      <td colSpan={8} data-testid="scoring-empty" className="p-8 text-center text-gray-400">
                        {t('content.scoringTables.empty', locale)}
                      </td>
                    </tr>
                  ) : (
                    blueprints.map((bp) => {
                      const sections = bp.scoring?.scoringSections || [];
                      const rowKey = `${bp.level}_v${bp.version}`;
                      const isRowActive = !draftVersionKeys.has(rowKey) && bp.status === 'active';
                      return (
                        <tr
                          key={`${bp.id || bp.level}_v${bp.version}`}
                          data-testid={`scoring-row-${bp.level}-v${bp.version}`}
                          className="hover:bg-gray-50/70 transition-colors"
                        >
                          <td className="px-4 py-3 font-bold text-blue-700">
                            {bp.level}
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-900 font-semibold whitespace-nowrap">
                            v{bp.version}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span data-testid={`scoring-status-${bp.level}-v${bp.version}`}>
                              {isRowActive ? (
                                <Badge variant="success" size="sm">
                                  {t('content.scoringTables.activeBadge', locale)}
                                </Badge>
                              ) : (
                                <Badge variant="warning" size="sm">
                                  {t('content.scoringTables.draftBadge', locale)}
                                </Badge>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-900" data-testid={`scoring-total-pass-${bp.level}-v${bp.version}`}>
                            {bp.scoring?.totalPass ?? 80}
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-600">
                            {bp.scoring?.totalMax ?? 180}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <div className="space-y-1">
                              {sections.map((sec) => (
                                <div key={sec.code} className="text-gray-700 flex items-center gap-1.5">
                                  <span className="font-medium text-gray-900">{sec.label || sec.code}:</span>
                                  <span className="text-gray-500">sàn {sec.minPass}/{sec.maxScaled}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">
                            {bp.scoring?.method || 'linear_reference'}
                          </td>
                          <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                            {user?.role === 'admin' && (
                              <>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleOpenCreateVersion(bp)}
                                  disabled={isSubmitting}
                                  data-testid={`btn-open-create-version-${bp.level}`}
                                >
                                  {t('content.scoringTables.createVersionBtn', locale)}
                                </Button>
                                {!isRowActive && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleActivateVersion(bp)}
                                    disabled={isSubmitting}
                                    data-testid={`btn-activate-scoring-${bp.level}-v${bp.version}`}
                                  >
                                    {t('content.scoringTables.activateBtn', locale)}
                                  </Button>
                                )}
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
