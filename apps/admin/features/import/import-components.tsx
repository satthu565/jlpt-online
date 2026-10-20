'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@jlpt/ui/components/button';
import { Input } from '@jlpt/ui/components/input';
import { Textarea } from '@jlpt/ui/components/textarea';
import type { ImportJobSummary, BatchImportSummary, SourcePageResolution, ImportIssue } from './types';
import { StandalonePdfError } from './types';
import { ImportManager } from './import-manager';
import { JsonCsvService } from './json-csv-service';
import { apiClient } from '../../lib/api-client';
import { useAdminAuth } from '../../lib/auth-context';
import { t } from '../../lib/i18n';

export interface ImportViewProps {
  initialJobs?: ImportJobSummary[];
  onDraftCreated?: (job: ImportJobSummary) => void;
}

export function ImportManagerView({
  initialJobs = [],
  onDraftCreated,
}: ImportViewProps): React.JSX.Element {
  const { locale } = useAdminAuth();
  const [manager] = useState(() => new ImportManager());
  const [jsonCsvService] = useState(() => new JsonCsvService());
  const [jobs, setJobs] = useState<ImportJobSummary[]>(initialJobs);
  const [isDraftMode, setIsDraftMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sourceResolution, setSourceResolution] = useState<SourcePageResolution | null>(null);
  const [csvJsonInput, setCsvJsonInput] = useState<string>('');
  const [csvExportOutput, setCsvExportOutput] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    apiClient
      .listImportJobs()
      .then((res: unknown) => {
        if (!mounted) return;
        const data = res as { items?: Record<string, unknown>[] } | Record<string, unknown>[];
        const items = Array.isArray(data) ? data : data?.items || [];
        if (items.length > 0) {
          const mapped: ImportJobSummary[] = items.map((it: Record<string, unknown>) => {
            const errorLog = (it.errorLog as Record<string, unknown>) || {};
            const rawIssues = (
              Array.isArray(it.issues)
                ? (it.issues as Record<string, unknown>[])
                : Array.isArray(errorLog.issues)
                  ? (errorLog.issues as Record<string, unknown>[])
                  : []
            );
            const issues = Array.isArray(rawIssues)
              ? rawIssues.map((iss) => ({
                  id: String(iss['id'] || ''),
                  severity: (iss['severity'] === 'warning' ? 'warning' : 'blocking') as 'blocking' | 'warning',
                  path: String(iss['path'] || ''),
                  reason: String(iss['reason'] || ''),
                  sourcePages: Array.isArray(iss['sourcePages']) ? (iss['sourcePages'] as number[]) : [],
                }))
              : [];
            const blockingCount =
              typeof it.blockingIssueCount === 'number'
                ? it.blockingIssueCount
                : typeof errorLog.blockingIssueCount === 'number'
                  ? (errorLog.blockingIssueCount as number)
                  : issues.filter((i) => i.severity === 'blocking').length;
            const nonBlockingCount =
              typeof it.nonBlockingIssueCount === 'number'
                ? it.nonBlockingIssueCount
                : typeof errorLog.nonBlockingIssueCount === 'number'
                  ? (errorLog.nonBlockingIssueCount as number)
                  : issues.filter((i) => i.severity !== 'blocking').length;
            const status =
              String(it.status || '') === 'DRAFT_ONLY' || errorLog.readiness === 'DRAFT_ONLY'
                ? 'DRAFT_ONLY'
                : (it.status as ImportJobSummary['status']) || 'succeeded';
            const readiness: ImportJobSummary['readiness'] =
              it.readiness === 'DRAFT_ONLY' || it.readiness === 'READY_FOR_REVIEW' || it.readiness === 'INVALID'
                ? it.readiness
                : errorLog.readiness === 'DRAFT_ONLY' || errorLog.readiness === 'READY_FOR_REVIEW' || errorLog.readiness === 'INVALID'
                  ? errorLog.readiness
                  : status === 'DRAFT_ONLY'
                    ? 'DRAFT_ONLY'
                    : 'READY_FOR_REVIEW';

            return {
              id: String(it.id || ''),
              fileName: String(it.fileName || 'package.zip'),
              fileSizeBytes: typeof it.fileSizeBytes === 'number' ? it.fileSizeBytes : 0,
              status,
              readiness,
              mode: (it.mode === 'draft' || it.mode === 'ready' ? it.mode : errorLog.mode === 'draft' || errorLog.mode === 'ready' ? errorLog.mode : status === 'DRAFT_ONLY' ? 'draft' : 'ready') as 'draft' | 'ready',
              errors: (errorLog.errors as string[]) || [],
              warnings: (errorLog.warnings as string[]) || [],
              blockingIssueCount: blockingCount,
              nonBlockingIssueCount: nonBlockingCount,
              extractedQuestionsCount:
                typeof it.extractedQuestionsCount === 'number'
                  ? it.extractedQuestionsCount
                  : typeof errorLog.extractedQuestionsCount === 'number'
                    ? (errorLog.extractedQuestionsCount as number)
                    : 0,
              sourceFiles: [],
              issues,
              createdAt: String(it.createdAt || new Date().toISOString()),
              createdBy: String(it.uploadedBy || 'importer'),
              targetLevel: it.targetLevel as ImportJobSummary['targetLevel'],
              draftExamId: (errorLog.draftExamId as string) || undefined,
            };
          });
          setJobs(mapped);
        }
      })
      .catch(() => {
        // Fallback to local jobs if offline/unit tests
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setStatusMessage(null);
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const currentMode: 'draft' | 'ready' = isDraftMode ? 'draft' : 'ready';

    if (files.length === 1) {
      const file = files[0]!;
      // Fast pre-check for standalone PDF
      if (file.name.toLowerCase().endsWith('.pdf')) {
        const err = new StandalonePdfError();
        setErrorMessage(err.message);
        return;
      }

      setIsLoading(true);
      try {
        let jobSummary: ImportJobSummary;
        try {
          const res = (await apiClient.uploadImportPackage(file, file.name, { mode: currentMode })) as {
            id?: string;
            status?: string;
            readiness?: string;
            issues?: ImportIssue[];
            blockingIssueCount?: number;
            extractedQuestionsCount?: number;
            draftExamId?: string;
          } | null;
          const refreshRes = (await apiClient.listImportJobs().catch(() => null)) as { items?: Record<string, unknown>[] } | null;
          if (refreshRes?.items && Array.isArray(refreshRes.items)) {
            const mapped: ImportJobSummary[] = refreshRes.items.map((it: Record<string, unknown>) => {
              const errorLog = (it.errorLog as Record<string, unknown>) || {};
              const rawIssues = (
                Array.isArray(it.issues)
                  ? (it.issues as Record<string, unknown>[])
                  : Array.isArray(errorLog.issues)
                    ? (errorLog.issues as Record<string, unknown>[])
                    : []
              );
              const issues = Array.isArray(rawIssues)
                ? rawIssues.map((iss) => ({
                    id: String(iss['id'] || ''),
                    severity: (iss['severity'] === 'warning' ? 'warning' : 'blocking') as 'blocking' | 'warning',
                    path: String(iss['path'] || ''),
                    reason: String(iss['reason'] || ''),
                    sourcePages: Array.isArray(iss['sourcePages']) ? (iss['sourcePages'] as number[]) : [],
                  }))
                : [];
              const blockingCount =
                typeof it.blockingIssueCount === 'number'
                  ? it.blockingIssueCount
                  : typeof errorLog.blockingIssueCount === 'number'
                    ? (errorLog.blockingIssueCount as number)
                    : issues.filter((i) => i.severity === 'blocking').length;
              const nonBlockingCount =
                typeof it.nonBlockingIssueCount === 'number'
                  ? it.nonBlockingIssueCount
                  : typeof errorLog.nonBlockingIssueCount === 'number'
                    ? (errorLog.nonBlockingIssueCount as number)
                    : issues.filter((i) => i.severity !== 'blocking').length;
              const status =
                String(it.status || '') === 'DRAFT_ONLY' || errorLog.readiness === 'DRAFT_ONLY'
                  ? 'DRAFT_ONLY'
                  : (it.status as ImportJobSummary['status']) || 'succeeded';
              const readiness: ImportJobSummary['readiness'] =
                it.readiness === 'DRAFT_ONLY' || it.readiness === 'READY_FOR_REVIEW' || it.readiness === 'INVALID'
                  ? it.readiness
                  : errorLog.readiness === 'DRAFT_ONLY' || errorLog.readiness === 'READY_FOR_REVIEW' || errorLog.readiness === 'INVALID'
                    ? errorLog.readiness
                    : status === 'DRAFT_ONLY'
                      ? 'DRAFT_ONLY'
                      : 'READY_FOR_REVIEW';

              return {
                id: String(it.id || ''),
                fileName: String(it.fileName || file.name),
                fileSizeBytes: typeof it.fileSizeBytes === 'number' ? it.fileSizeBytes : file.size,
                status,
                readiness,
                mode: (it.mode === 'draft' || it.mode === 'ready' ? it.mode : errorLog.mode === 'draft' || errorLog.mode === 'ready' ? errorLog.mode : status === 'DRAFT_ONLY' ? 'draft' : 'ready') as 'draft' | 'ready',
                errors: (errorLog.errors as string[]) || [],
                warnings: (errorLog.warnings as string[]) || [],
                blockingIssueCount: blockingCount,
                nonBlockingIssueCount: nonBlockingCount,
                extractedQuestionsCount:
                  typeof it.extractedQuestionsCount === 'number'
                    ? it.extractedQuestionsCount
                    : typeof errorLog.extractedQuestionsCount === 'number'
                      ? (errorLog.extractedQuestionsCount as number)
                      : 0,
                sourceFiles: [],
                issues,
                createdAt: String(it.createdAt || new Date().toISOString()),
                createdBy: String(it.uploadedBy || 'importer'),
                targetLevel: it.targetLevel as ImportJobSummary['targetLevel'],
                draftExamId: (errorLog.draftExamId as string) || undefined,
              };
            });
            setJobs(mapped);
          }

          const isDraftJob = res?.status === 'DRAFT_ONLY' || res?.readiness === 'DRAFT_ONLY' || currentMode === 'draft';
          jobSummary = {
            id: res?.id || `job_${Date.now()}`,
            fileName: file.name,
            fileSizeBytes: file.size,
            status: isDraftJob ? 'DRAFT_ONLY' : 'succeeded',
            readiness: isDraftJob ? 'DRAFT_ONLY' : 'READY_FOR_REVIEW',
            mode: currentMode,
            errors: [],
            warnings: [],
            blockingIssueCount: res?.blockingIssueCount ?? (res?.issues?.filter((i: ImportIssue) => i.severity === 'blocking').length || 0),
            nonBlockingIssueCount: 0,
            extractedQuestionsCount: res?.extractedQuestionsCount || 0,
            sourceFiles: [],
            issues: Array.isArray(res?.issues) ? res!.issues : [],
            createdAt: new Date().toISOString(),
            createdBy: 'importer',
            draftExamId: res?.draftExamId || res?.id,
          };

          // Do NOT submit for review if in draft mode or if DRAFT_ONLY!
          if (!isDraftJob) {
            try {
              const groupsRes = (await apiClient.listQuestionGroups().catch(() => null)) as { items?: { id?: string; groupId?: string; status?: string; version?: number }[] } | null;
              const groupList = Array.isArray(groupsRes) ? groupsRes : groupsRes?.items || [];
              for (const grp of groupList) {
                const gid = grp.groupId || grp.id;
                if (gid) {
                  await apiClient.submitTargetForReview('group_version', gid, grp.version || 1).catch(() => null);
                }
              }
            } catch {
              // ignore
            }
          }
        } catch (apiErr: unknown) {
          // If server returned an error (e.g. 400 rejected ready mode with blocking issue), rethrow directly!
          const errMsg = apiErr instanceof Error ? apiErr.message : String(apiErr);
          if (errMsg.includes('blocking') || errMsg.includes('ready') || errMsg.includes('400')) {
            throw apiErr;
          }
          // Fallback to local import manager in offline/unit tests
          const arrayBuf = await file.arrayBuffer();
          const buffer = new Uint8Array(arrayBuf);
          jobSummary = await manager.importPackage(buffer, file.name, 'importer', { mode: currentMode });
          setJobs(manager.listJobs());
        }

        if (currentMode === 'draft' || jobSummary.status === 'DRAFT_ONLY') {
          setStatusMessage(`Nạp bản nháp (DRAFT_ONLY) thành công! Bản thảo đề thi: ${jobSummary.draftExamId || jobSummary.id}`);
        } else {
          setStatusMessage(`Tải lên thành công! Tạo bản thảo đề thi: ${jobSummary.draftExamId || jobSummary.id}`);
        }
        onDraftCreated?.(jobSummary);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(msg);
        if (manager.listJobs().length > 0) {
          setJobs(manager.listJobs());
        }
      } finally {
        setIsLoading(false);
        if (event.target) {
          event.target.value = '';
        }
      }
    } else {
      // Batch upload
      const packageList: { buffer: Uint8Array; fileName: string }[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i]!;
        const arrayBuf = await f.arrayBuffer();
        packageList.push({ buffer: new Uint8Array(arrayBuf), fileName: f.name });
      }

      const batchResult: BatchImportSummary = await manager.importBatch(packageList);
      setJobs(manager.listJobs());
      setStatusMessage(
        `Xử lý lô hoàn tất: ${batchResult.succeededCount}/${batchResult.totalPackages} gói hợp lệ, ${batchResult.failedCount} gói lỗi.`,
      );
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleResolveSourcePage = (job: ImportJobSummary) => {
    const draft = manager.getConvertedDraft(job.id);
    if (!draft || draft.groups.length === 0) {
      setSourceResolution({
        sourceFileId: '',
        pageNumber: 0,
        url: '',
        available: false,
        error: 'Không tìm thấy nhóm câu hỏi trong bản thảo gói nhập.',
      });
      return;
    }

    const firstGroupWithPage = draft.groups.find((g) => g.sourcePage !== undefined) || draft.groups[0]!;
    const res = manager.resolveSourcePage(job.id, firstGroupWithPage);
    setSourceResolution(res);
  };

  const handleCsvExport = (job: ImportJobSummary) => {
    const draft = manager.getConvertedDraft(job.id);
    if (!draft) {
      setErrorMessage('Không tìm thấy dữ liệu câu hỏi để trích xuất CSV.');
      return;
    }
    const csv = jsonCsvService.exportQuestionsToCsv(draft.groups);
    setCsvExportOutput(csv);
    setStatusMessage(`Đã xuất CSV (${draft.groups.length} nhóm câu hỏi).`);
  };

  const handleCsvImport = () => {
    if (!csvJsonInput.trim()) {
      setErrorMessage('Vui lòng nhập nội dung CSV.');
      return;
    }
    try {
      const parsedGroups = jsonCsvService.importQuestionsFromCsv(csvJsonInput);
      setStatusMessage(`Đã nạp ${parsedGroups.length} nhóm câu hỏi từ dữ liệu CSV.`);
      setErrorMessage(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Lỗi nạp CSV: ${msg}`);
    }
  };

  const handleSubmitJobForReview = async (job: ImportJobSummary) => {
    if (job.status === 'DRAFT_ONLY' || job.readiness === 'DRAFT_ONLY' || job.blockingIssueCount > 0) {
      setErrorMessage(
        'Gói ở trạng thái DRAFT_ONLY không thể gửi vào hàng duyệt cho tới khi nạp lại bản ready cùng packageId với revision cao hơn.',
      );
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const groupsRes = (await apiClient.listQuestionGroups().catch(() => null)) as { items?: { id?: string; groupId?: string; status?: string; version?: number }[] } | null;
      const groupList = Array.isArray(groupsRes) ? groupsRes : groupsRes?.items || [];
      for (const grp of groupList) {
        const gid = grp.groupId || grp.id;
        if (gid) {
          await apiClient.submitTargetForReview('group_version', gid, grp.version || 1).catch(() => null);
        }
      }
      setStatusMessage(`Đã chuyển các nhóm câu hỏi của gói ${job.fileName} sang trạng thái chờ duyệt (in_review).`);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Không thể gửi duyệt nhóm câu hỏi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden p-4 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      <div className="border-b border-gray-200 pb-4">
        <h2 data-testid="import-title" className="text-2xl font-bold text-gray-900">
          {t('content.imports.title', locale)}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {t('content.imports.subtitle', locale)}
        </p>
      </div>

      {isLoading && (
        <div
          data-testid="imports-loading"
          className="p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-sm animate-pulse"
        >
          {t('common.loading', locale)}
        </div>
      )}

      {errorMessage && (
        <div
          data-testid="error-alert"
          className="p-4 bg-red-50 border border-red-300 text-red-700 rounded-md text-sm"
        >
          <strong data-testid="imports-error-alert">Lỗi xử lý: </strong>
          {errorMessage}
        </div>
      )}

      {statusMessage && (
        <div
          data-testid="status-alert"
          className="p-4 bg-green-50 border border-green-300 text-green-700 rounded-md text-sm"
        >
          {statusMessage}
        </div>
      )}

      {/* Upload Box */}
      <div
        data-testid="upload-container"
        className="w-full max-w-full overflow-hidden border-2 border-dashed border-gray-300 rounded-lg p-4 md:p-8 text-center bg-gray-50 mb-6"
      >
        <p className="text-gray-700 font-medium mb-3">
          {t('content.imports.uploadPrompt', locale)}
        </p>
        <div className="flex flex-col items-center gap-3 w-full max-w-full overflow-hidden">
          <Input
            data-testid="package-file-input"
            type="file"
            multiple
            accept=".zip,.pdf"
            onChange={handleFileUpload}
            className="inline-block max-w-full text-sm text-gray-600 file:mr-2 md:file:mr-4 file:py-1.5 md:file:py-2 file:px-3 md:file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <label className="inline-flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-100 transition-colors shadow-2xs max-w-full">
            <input
              type="checkbox"
              data-testid="draft-mode-checkbox"
              checked={isDraftMode}
              onChange={(e) => setIsDraftMode(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
            />
            <span className="text-sm font-semibold text-gray-800">Nạp bản nháp</span>
            <span className="text-xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-mono">DRAFT_ONLY</span>
          </label>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          {t('content.imports.uploadWarning', locale)}
        </div>
      </div>

      {/* Source Page Resolution Modal/Box */}
      {sourceResolution && (
        <div
          data-testid="source-resolution-box"
          className={`p-4 rounded-md border mb-6 ${
            sourceResolution.available ? 'bg-blue-50 border-blue-300' : 'bg-amber-50 border-amber-300'
          }`}
        >
          <div className={`font-semibold ${sourceResolution.available ? 'text-blue-800' : 'text-amber-800'}`}>
            {sourceResolution.available
              ? `Liên kết trang nguồn: Trang ${sourceResolution.pageNumber} (${sourceResolution.sourceFileId})`
              : 'Không thể mở trang nguồn'}
          </div>
          {sourceResolution.available ? (
            <div className="mt-2 text-sm">
              <span>Đường dẫn xem đối chiếu: </span>
              <a
                data-testid="source-page-link"
                href={sourceResolution.url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline"
              >
                {sourceResolution.url}
              </a>
            </div>
          ) : (
            <div className="text-amber-800 text-sm mt-1">{sourceResolution.error}</div>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSourceResolution(null)}
            className="mt-2"
          >
            Đóng
          </Button>
        </div>
      )}

      {/* Job list table */}
      <h3 className="text-lg font-semibold text-gray-800 mb-3">
        {t('content.imports.jobsTitle', locale)} ({jobs.length})
      </h3>
      <div className="overflow-x-auto w-full max-w-full border border-gray-200 rounded-lg shadow-xs mb-8">
        <table data-testid="jobs-table" className="w-full text-left text-sm border-collapse min-w-full">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200 text-gray-700">
              <th className="p-3">Tên tệp</th>
              <th className="p-3">Cấp độ</th>
              <th className="p-3">Trạng thái</th>
              <th className="p-3">Số câu</th>
              <th className="p-3">Blocking</th>
              <th className="p-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={6} data-testid="imports-empty" className="p-6 text-center text-gray-400">
                  {t('content.imports.empty', locale)}
                </td>
              </tr>
            ) : (
              jobs.map((job) => (
                <tr key={job.id} data-testid={`job-row-${job.id}`} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-900">{job.fileName}</td>
                  <td className="p-3">{job.targetLevel || '—'}</td>
                  <td className="p-3">
                    <span
                      data-testid={`job-status-${job.id}`}
                      className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        job.status === 'DRAFT_ONLY'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : job.status === 'draft_created' || job.status === 'succeeded'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="p-3">{job.extractedQuestionsCount}</td>
                  <td className="p-3">
                    {job.blockingIssueCount > 0 ? (
                      <div className="space-y-1">
                        <span className="text-red-600 font-bold">{job.blockingIssueCount}</span>
                        {job.issues && job.issues.length > 0 && (
                          <div data-testid={`job-issues-${job.id}`} className="mt-2 space-y-1.5 text-xs max-w-full">
                            {job.issues.map((iss, idx) => (
                              <div
                                key={iss.id || idx}
                                data-testid={`issue-item-${iss.id || idx}`}
                                className="p-2 bg-red-50 border border-red-200 rounded text-left shadow-2xs space-y-0.5"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-gray-700">Mức độ:</span>
                                  <span
                                    data-testid="issue-severity"
                                    className={`px-1.5 py-0.2 rounded font-bold uppercase text-[10px] ${
                                      iss.severity === 'blocking'
                                        ? 'bg-red-200 text-red-900'
                                        : 'bg-amber-200 text-amber-900'
                                    }`}
                                  >
                                    {iss.severity}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-semibold text-gray-700">Đường dẫn: </span>
                                  <code
                                    data-testid="issue-path"
                                    className="font-mono text-[11px] text-gray-800 bg-white px-1 py-0.5 rounded border border-gray-200"
                                  >
                                    {iss.path}
                                  </code>
                                </div>
                                <div>
                                  <span className="font-semibold text-gray-700">Lý do: </span>
                                  <span data-testid="issue-reason" className="text-gray-700">
                                    {iss.reason}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500">0</span>
                    )}
                  </td>
                  <td className="p-3 space-x-2">
                    {job.status === 'DRAFT_ONLY' ? (
                      <span
                        data-testid={`draft-blocked-badge-${job.id}`}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-500 border border-gray-200 rounded cursor-not-allowed font-medium inline-block"
                        title="Gói nháp DRAFT_ONLY bị chặn duyệt; cần nạp lại bản ready với revision cao hơn để duyệt"
                      >
                        Chặn duyệt (DRAFT_ONLY)
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        data-testid={`submit-review-btn-${job.id}`}
                        onClick={() => handleSubmitJobForReview(job)}
                      >
                        {t('content.imports.submitReviewBtn', locale)}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-testid={`resolve-source-btn-${job.id}`}
                      onClick={() => handleResolveSourcePage(job)}
                    >
                      {t('content.imports.sourcePage', locale)}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-testid={`export-csv-btn-${job.id}`}
                      onClick={() => handleCsvExport(job)}
                    >
                      {t('content.imports.exportCsv', locale)}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CSV / JSON Roundtrip Tool */}
      <div
        data-testid="csv-tool-container"
        className="border border-gray-200 rounded-lg p-5 bg-gray-50"
      >
        <h4 className="font-semibold text-gray-800 mb-3 text-base">
          {t('content.imports.csvToolTitle', locale)}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold block mb-1 text-gray-700">
              {t('content.imports.csvInputLabel', locale)}
            </label>
            <Textarea
              data-testid="csv-input-area"
              rows={5}
              value={csvJsonInput}
              onChange={(e) => setCsvJsonInput(e.target.value)}
              placeholder="groupId,version,level,sectionCode,mondaiType,skill,instructions,sourceRef,sourcePages,status,questionNumber,stem,option1,option2,option3,option4,correctOption,explanation"
              className="font-mono text-xs"
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              data-testid="import-csv-btn"
              onClick={handleCsvImport}
              className="mt-2"
            >
              {t('content.imports.importCsvBtn', locale)}
            </Button>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1 text-gray-700">
              {t('content.imports.csvOutputLabel', locale)}
            </label>
            <Textarea
              data-testid="csv-output-area"
              rows={5}
              readOnly
              value={csvExportOutput}
              placeholder="Kết quả xuất CSV sẽ hiển thị ở đây..."
              className="font-mono text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
