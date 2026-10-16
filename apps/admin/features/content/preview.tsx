'use client';

import React from 'react';
import { RichTextView } from '@jlpt/ui';
import type { RichBlock } from '@jlpt/schema';
import type { AdminQuestionGroup, ListeningTimelineItem } from './types';

export interface PreviewPassageProps {
  blocks: RichBlock[] | null | undefined;
  resolveMediaUrl?: (key: string) => string;
  className?: string;
}

/**
 * Renders passage reading blocks: paragraphs, tables, images.
 * Strict safety: No dangerouslySetInnerHTML is used. All text content is safely escaped.
 */
export function PassageBlockViewer({
  blocks,
  resolveMediaUrl = (key) => `/api/v1/media/${encodeURIComponent(key)}`,
  className,
}: PreviewPassageProps): React.JSX.Element {
  if (!blocks || blocks.length === 0) {
    return <div data-testid="passage-empty" className="text-gray-400 italic">Không có bài đọc</div>;
  }

  return (
    <div data-testid="passage-viewer" className={`passage-container space-y-4 ${className ?? ''}`}>
      {blocks.map((block, bIdx) => {
        if (block.type === 'paragraph') {
          return (
            <div key={bIdx} data-testid={`passage-paragraph-${bIdx}`} className="leading-relaxed text-gray-900">
              <RichTextView segments={block.content} />
            </div>
          );
        }

        if (block.type === 'image') {
          const src = resolveMediaUrl(block.mediaKey);
          return (
            <div key={bIdx} data-testid={`passage-image-${bIdx}`} className="my-3 text-center">
              <img
                src={src}
                alt={block.alt}
                width={block.width}
                height={block.height}
                className="inline-block max-w-full rounded border border-gray-200"
              />
              {block.alt && <p className="text-xs text-gray-500 mt-1">{block.alt}</p>}
            </div>
          );
        }

        if (block.type === 'table') {
          return (
            <div key={bIdx} data-testid={`passage-table-${bIdx}`} className="overflow-x-auto my-3">
              <table className="min-w-full border-collapse border border-gray-300 text-sm">
                <tbody>
                  {block.rows.map((row, rIdx) => (
                    <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="border border-gray-300 px-3 py-2 align-top">
                          <RichTextView segments={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

export interface ListeningPreviewProps {
  audioMediaKey?: string | null;
  audioSha256?: string | null;
  timeline?: ListeningTimelineItem[];
  resolveMediaUrl?: (key: string) => string;
}

/**
 * Audio / Listening timeline preview component.
 */
export function ListeningPreview({
  audioMediaKey,
  audioSha256,
  timeline,
  resolveMediaUrl = (key) => `/api/v1/media/${encodeURIComponent(key)}`,
}: ListeningPreviewProps): React.JSX.Element {
  if (!audioMediaKey && !audioSha256) {
    return <div data-testid="listening-none" className="text-xs text-gray-400 italic">Không có phần nghe</div>;
  }

  const audioSrc = audioMediaKey ? resolveMediaUrl(audioMediaKey) : undefined;

  return (
    <div data-testid="listening-preview" className="bg-amber-50 border border-amber-200 rounded p-3 mb-4">
      <div className="flex items-center space-x-2 text-amber-800 text-sm font-semibold mb-2">
        <span>🎧 File âm thanh phần nghe:</span>
        <code className="text-xs bg-amber-100 px-2 py-0.5 rounded">{audioMediaKey || audioSha256}</code>
      </div>
      {audioSrc && (
        <audio controls className="w-full h-8" data-testid="listening-audio-player">
          <source src={audioSrc} type="audio/mpeg" />
          Trình duyệt của bạn không hỗ trợ thẻ audio.
        </audio>
      )}
      {timeline && timeline.length > 0 && (
        <div className="mt-2 text-xs text-amber-900">
          <span className="font-medium">Mốc thời gian (Timeline):</span>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            {timeline.map((item, idx) => (
              <li key={idx} data-testid={`timeline-item-${idx}`}>
                Đoạn {idx + 1}: {Math.floor(item.startMs / 1000)}s - {Math.floor(item.endMs / 1000)}s (Nghỉ:{' '}
                {item.gapAfterMs}ms)
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export interface QuestionGroupPreviewProps {
  group: AdminQuestionGroup;
  showCorrectAnswers?: boolean;
  resolveMediaUrl?: (key: string) => string;
}

/**
 * Question group preview component for exam room visual parity.
 */
export function QuestionGroupPreview({
  group,
  showCorrectAnswers = true,
  resolveMediaUrl = (key) => `/api/v1/media/${encodeURIComponent(key)}`,
}: QuestionGroupPreviewProps): React.JSX.Element {
  return (
    <div data-testid="question-group-preview" className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm space-y-6">
      {/* Group header */}
      <div className="border-b border-gray-100 pb-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span className="font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
            {group.level} • {group.sectionCode} • {group.mondaiType}
          </span>
          <span>Phiên bản: v{group.version} ({group.status})</span>
        </div>
        {group.title && <h3 className="text-lg font-bold text-gray-800">{group.title}</h3>}
        {group.instructions && group.instructions.length > 0 && (
          <div data-testid="group-instructions" className="text-sm text-gray-700 mt-2 italic bg-gray-50 p-2 rounded">
            <RichTextView segments={group.instructions} />
          </div>
        )}
      </div>

      {/* Listening audio if present */}
      {(group.audioMediaKey || group.audioSha256) && (
        <ListeningPreview
          audioMediaKey={group.audioMediaKey}
          audioSha256={group.audioSha256}
          timeline={group.listeningTimeline}
          resolveMediaUrl={resolveMediaUrl}
        />
      )}

      {/* Reading passage if present */}
      {group.passage && group.passage.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Đoạn văn đọc hiểu</h4>
          <PassageBlockViewer blocks={group.passage} resolveMediaUrl={resolveMediaUrl} />
        </div>
      )}

      {/* Questions list */}
      <div className="space-y-6">
        {group.questions.map((q, qIdx) => (
          <div key={q.tempId || q.questionId || qIdx} data-testid={`question-item-${qIdx}`} className="border-t border-gray-100 pt-4">
            <div className="flex items-start space-x-2 font-medium text-gray-900 mb-3">
              <span className="text-blue-600 font-bold">{q.number || `Câu ${qIdx + 1}`}.</span>
              <div data-testid={`stem-${qIdx}`} className="flex-1">
                <RichTextView segments={q.stem} />
              </div>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-6">
              {q.options.map((opt, oIdx) => {
                const optNum = oIdx + 1;
                const isCorrect = showCorrectAnswers && q.correctOption === optNum;

                return (
                  <div
                    key={oIdx}
                    data-testid={`option-${qIdx}-${optNum}`}
                    className={`flex items-start space-x-2 p-2 rounded border text-sm transition-colors ${
                      isCorrect
                        ? 'bg-green-50 border-green-400 text-green-900 font-medium'
                        : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-800'
                    }`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                        isCorrect ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {opt.label || optNum}
                    </span>
                    <div className="flex-1">
                      <RichTextView segments={opt.content} />
                    </div>
                    {isCorrect && (
                      <span className="text-xs font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                        Đáp án đúng
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Staff Explanation if available and requested */}
            {showCorrectAnswers && q.explanation && q.explanation.length > 0 && (
              <div
                data-testid={`explanation-${qIdx}`}
                className="mt-3 ml-6 p-3 bg-amber-50/70 border-l-4 border-amber-400 text-xs text-amber-900 rounded-r"
              >
                <span className="font-bold block mb-1">Giải thích chi tiết:</span>
                <RichTextView segments={q.explanation} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
