'use client';

import React, { useState } from 'react';
import type { ImportJobSummary, BatchImportSummary, SourcePageResolution } from './types';
import { StandalonePdfError } from './types';
import { ImportManager } from './import-manager';
import { JsonCsvService } from './json-csv-service';

export interface ImportViewProps {
  initialJobs?: ImportJobSummary[];
  onDraftCreated?: (job: ImportJobSummary) => void;
}

export function ImportManagerView({
  initialJobs = [],
  onDraftCreated,
}: ImportViewProps): React.JSX.Element {
  const [manager] = useState(() => new ImportManager());
  const [jsonCsvService] = useState(() => new JsonCsvService());
  const [jobs, setJobs] = useState<ImportJobSummary[]>(initialJobs);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sourceResolution, setSourceResolution] = useState<SourcePageResolution | null>(null);
  const [csvJsonInput, setCsvJsonInput] = useState<string>('');
  const [csvExportOutput, setCsvExportOutput] = useState<string>('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setStatusMessage(null);
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (files.length === 1) {
      const file = files[0]!;
      // Fast pre-check for standalone PDF
      if (file.name.toLowerCase().endsWith('.pdf')) {
        const err = new StandalonePdfError();
        setErrorMessage(err.message);
        return;
      }

      try {
        const arrayBuf = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuf);
        const job = await manager.importPackage(buffer, file.name);
        setJobs(manager.listJobs());
        setStatusMessage(`Tải lên thành công! Tạo bản thảo đề thi: ${job.draftExamId || job.id}`);
        onDraftCreated?.(job);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(msg);
        setJobs(manager.listJobs());
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

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
        <h2 data-testid="import-title" style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1e293b' }}>
          Quản lý Gói Nhập Đề thi (Import v2)
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Tải lên các gói dữ liệu chuẩn định dạng (.zip) gồm import.json, media/ và sources/ đối chiếu.
        </p>
      </div>

      {errorMessage && (
        <div
          data-testid="error-alert"
          style={{
            padding: '1rem',
            backgroundColor: '#fee2e2',
            border: '1px solid #ef4444',
            borderRadius: '6px',
            color: '#b91c1c',
            marginBottom: '1rem',
            fontSize: '0.9rem',
          }}
        >
          <strong>Lỗi xử lý: </strong>
          {errorMessage}
        </div>
      )}

      {statusMessage && (
        <div
          data-testid="status-alert"
          style={{
            padding: '1rem',
            backgroundColor: '#dcfce7',
            border: '1px solid #22c55e',
            borderRadius: '6px',
            color: '#15803d',
            marginBottom: '1rem',
            fontSize: '0.9rem',
          }}
        >
          {statusMessage}
        </div>
      )}

      {/* Upload Box */}
      <div
        data-testid="upload-container"
        style={{
          border: '2px dashed #cbd5e1',
          borderRadius: '8px',
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: '#f8fafc',
          marginBottom: '2rem',
        }}
      >
        <p style={{ margin: '0 0 1rem', color: '#475569', fontWeight: 500 }}>
          Chọn một hoặc nhiều tệp ZIP gói nhập chuẩn (Hỗ trợ nạp theo lô):
        </p>
        <input
          data-testid="package-file-input"
          type="file"
          multiple
          accept=".zip,.pdf"
          onChange={handleFileUpload}
          style={{ display: 'inline-block' }}
        />
        <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
          Lưu ý: PDF đơn lẻ không khởi động đọc file hoặc OCR. Hãy chuẩn bị đầy đủ gói ZIP kèm import.json.
        </div>
      </div>

      {/* Source Page Resolution Modal/Box */}
      {sourceResolution && (
        <div
          data-testid="source-resolution-box"
          style={{
            padding: '1rem',
            backgroundColor: sourceResolution.available ? '#eff6ff' : '#fffbeb',
            border: `1px solid ${sourceResolution.available ? '#3b82f6' : '#f59e0b'}`,
            borderRadius: '6px',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ fontWeight: 600, color: sourceResolution.available ? '#1d4ed8' : '#b45309' }}>
            {sourceResolution.available
              ? `Liên kết trang nguồn: Trang ${sourceResolution.pageNumber} (${sourceResolution.sourceFileId})`
              : 'Không thể mở trang nguồn'}
          </div>
          {sourceResolution.available ? (
            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
              <span>Đường dẫn xem đối chiếu: </span>
              <a
                data-testid="source-page-link"
                href={sourceResolution.url}
                target="_blank"
                rel="noreferrer"
                style={{ color: '#2563eb', textDecoration: 'underline' }}
              >
                {sourceResolution.url}
              </a>
            </div>
          ) : (
            <div style={{ color: '#b45309', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              {sourceResolution.error}
            </div>
          )}
          <button
            onClick={() => setSourceResolution(null)}
            style={{ marginTop: '0.5rem', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
          >
            Đóng
          </button>
        </div>
      )}

      {/* Job list table */}
      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#334155', marginBottom: '0.75rem' }}>
        Danh sách Gói nhập gần đây ({jobs.length})
      </h3>
      <table
        data-testid="jobs-table"
        style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0', marginBottom: '2rem' }}
      >
        <thead>
          <tr style={{ backgroundColor: '#f1f5f9', textAlign: 'left', fontSize: '0.85rem' }}>
            <th style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>Tên tệp</th>
            <th style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>Cấp độ</th>
            <th style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>Trạng thái</th>
            <th style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>Số câu</th>
            <th style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>Blocking</th>
            <th style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {jobs.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                Chưa có gói nhập nào được xử lý.
              </td>
            </tr>
          ) : (
            jobs.map((job) => (
              <tr key={job.id} data-testid={`job-row-${job.id}`} style={{ fontSize: '0.85rem' }}>
                <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0', fontWeight: 500 }}>
                  {job.fileName}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>{job.targetLevel || '—'}</td>
                <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>
                  <span
                    data-testid={`job-status-${job.id}`}
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor:
                        job.status === 'draft_created' || job.status === 'succeeded' ? '#dcfce7' : '#fee2e2',
                      color:
                        job.status === 'draft_created' || job.status === 'succeeded' ? '#166534' : '#991b1b',
                    }}
                  >
                    {job.status}
                  </span>
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>
                  {job.extractedQuestionsCount}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>
                  {job.blockingIssueCount > 0 ? (
                    <span style={{ color: '#dc2626', fontWeight: 600 }}>{job.blockingIssueCount}</span>
                  ) : (
                    '0'
                  )}
                </td>
                <td style={{ padding: '0.75rem', border: '1px solid #e2e8f0' }}>
                  <button
                    data-testid={`resolve-source-btn-${job.id}`}
                    onClick={() => handleResolveSourcePage(job)}
                    style={{
                      marginRight: '0.5rem',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    Trang nguồn
                  </button>
                  <button
                    data-testid={`export-csv-btn-${job.id}`}
                    onClick={() => handleCsvExport(job)}
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', cursor: 'pointer' }}
                  >
                    Xuất CSV
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* CSV / JSON Roundtrip Tool */}
      <div
        data-testid="csv-tool-container"
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '1.25rem',
          backgroundColor: '#fafafa',
        }}
      >
        <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem', color: '#1e293b' }}>
          Ngân hàng câu hỏi: Công cụ Import / Export JSON & CSV (PDF-30)
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
              Dữ liệu CSV nhập:
            </label>
            <textarea
              data-testid="csv-input-area"
              rows={5}
              value={csvJsonInput}
              onChange={(e) => setCsvJsonInput(e.target.value)}
              placeholder="groupId,version,level,sectionCode,mondaiType,skill,instructions,sourceRef,sourcePages,status,questionNumber,stem,option1,option2,option3,option4,correctOption,explanation"
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.75rem', padding: '0.5rem' }}
            />
            <button
              data-testid="import-csv-btn"
              onClick={handleCsvImport}
              style={{ marginTop: '0.5rem', padding: '0.35rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              Nạp câu hỏi từ CSV
            </button>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
              Dữ liệu CSV xuất:
            </label>
            <textarea
              data-testid="csv-output-area"
              rows={5}
              readOnly
              value={csvExportOutput}
              placeholder="Kết quả xuất CSV sẽ hiển thị ở đây..."
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.75rem', padding: '0.5rem' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
