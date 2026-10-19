'use client';

import React, { useState } from 'react';
import type { RichBlock, RichText } from '@jlpt/schema';
import { RichTextView, Button, Input } from '@jlpt/ui';
import {
  createBlankSegment,
  createImageBlock,
  createLineBreakSegment,
  createParagraphBlock,
  createRubySegment,
  createStarSegment,
  createTableBlock,
  createTextSegment,
  createUnderlineSegment,
} from './types';
import { PassageBlockViewer } from './preview';

export interface RichTextSegmentEditorProps {
  value: RichText;
  onChange: (newValue: RichText) => void;
  label?: string;
  allowMultiline?: boolean;
}

/**
 * Visual Segment Editor for RichText: Text, Ruby, Star (★), Underline, Blank, Br, Image.
 */
export function RichTextSegmentEditor({
  value,
  onChange,
  label,
}: RichTextSegmentEditorProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [rubyText, setRubyText] = useState('');
  const [rubyRt, setRubyRt] = useState('');
  const [plainText, setPlainText] = useState('');
  const [underlineText, setUnderlineText] = useState('');
  const [blankLabel, setBlankLabel] = useState('');

  // Add new segments
  const addText = () => {
    if (!plainText) return;
    onChange([...value, createTextSegment(plainText)]);
    setPlainText('');
  };

  const addRuby = () => {
    if (!rubyText || !rubyRt) return;
    onChange([...value, createRubySegment(rubyText, rubyRt)]);
    setRubyText('');
    setRubyRt('');
  };

  const addStar = () => {
    onChange([...value, createStarSegment()]);
  };

  const addUnderline = () => {
    if (!underlineText) return;
    onChange([...value, createUnderlineSegment(underlineText)]);
    setUnderlineText('');
  };

  const addBlank = () => {
    onChange([...value, createBlankSegment(blankLabel || undefined)]);
    setBlankLabel('');
  };

  const addBr = () => {
    onChange([...value, createLineBreakSegment()]);
  };

  const removeSegment = (index: number) => {
    const updated = value.filter((_, idx) => idx !== index);
    onChange(updated);
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div data-testid="richtext-segment-editor" className="border border-gray-300 rounded-md p-3 bg-white space-y-3">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 pb-2">
        <label className="text-sm font-semibold text-gray-700 dark:text-slate-300">{label || 'Soạn thảo đoạn (RichText)'}</label>
        <div className="flex space-x-2">
          <Button
            type="button"
            variant={activeTab === 'edit' ? 'primary' : 'secondary'}
            size="sm"
            data-testid="tab-edit"
            onClick={() => setActiveTab('edit')}
          >
            Chỉnh sửa
          </Button>
          <Button
            type="button"
            variant={activeTab === 'preview' ? 'primary' : 'secondary'}
            size="sm"
            data-testid="tab-preview"
            onClick={() => setActiveTab('preview')}
          >
            Xem trước
          </Button>
        </div>
      </div>

      {activeTab === 'preview' ? (
        <div data-testid="segment-preview" className="p-3 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-800 rounded min-h-[4rem] text-sm">
          {value.length === 0 ? (
            <span className="text-gray-400 italic">Chưa có nội dung.</span>
          ) : (
            <RichTextView segments={value} />
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* List of current segments */}
          <div data-testid="segments-list" className="flex flex-wrap gap-1.5 p-2 bg-gray-50 dark:bg-slate-800/50 rounded border border-gray-200 dark:border-slate-800 min-h-[3rem] items-center">
            {value.length === 0 ? (
              <span className="text-xs text-gray-400 italic">Thêm các đoạn chữ, ruby, hoặc dấu sao bên dưới...</span>
            ) : (
              value.map((seg, idx) => (
                <span
                  key={idx}
                  data-testid={`segment-badge-${idx}`}
                  className="inline-flex items-center text-xs px-2 py-1 rounded bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 shadow-xs"
                >
                  {seg.t === 'text' && <span className="text-gray-800 dark:text-slate-200">{seg.text}</span>}
                  {seg.t === 'ruby' && (
                    <span className="text-purple-700 dark:text-purple-400 font-medium">
                      <ruby>
                        {seg.text}
                        <rt>{seg.rt}</rt>
                      </ruby>
                    </span>
                  )}
                  {seg.t === 'star' && <span className="text-amber-500 font-bold">★</span>}
                  {seg.t === 'underline' && <u className="text-blue-700 dark:text-blue-400">{seg.text}</u>}
                  {seg.t === 'blank' && <span className="text-gray-600 dark:text-slate-400">({seg.label || ' '})</span>}
                  {seg.t === 'br' && <span className="text-gray-400">↵</span>}
                  {seg.t === 'image' && <span className="text-green-700 dark:text-green-400">[Ảnh]</span>}

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-testid={`remove-segment-${idx}`}
                    onClick={() => removeSegment(idx)}
                    className="ml-1.5 h-4 w-4 p-0 min-h-0 text-gray-400 hover:text-red-600 font-bold"
                    title="Xóa đoạn này"
                  >
                    ×
                  </Button>
                </span>
              ))
            )}
          </div>

          {/* Action buttons & quick inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            {/* Plain Text Input */}
            <div className="flex space-x-1">
              <Input
                type="text"
                data-testid="input-plain-text"
                value={plainText}
                onChange={(e) => setPlainText(e.target.value)}
                placeholder="Nhập chữ thông thường"
                className="flex-1 min-h-[36px] py-1 text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addText();
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                data-testid="btn-add-text"
                onClick={addText}
              >
                + Chữ
              </Button>
            </div>

            {/* Ruby Furigana Input */}
            <div className="flex space-x-1">
              <Input
                type="text"
                data-testid="input-ruby-kanji"
                value={rubyText}
                onChange={(e) => setRubyText(e.target.value)}
                placeholder="Kanji (vd: 漢字)"
                className="w-1/2 min-h-[36px] py-1 text-xs"
              />
              <Input
                type="text"
                data-testid="input-ruby-rt"
                value={rubyRt}
                onChange={(e) => setRubyRt(e.target.value)}
                placeholder="Furigana (vd: かんじ)"
                className="w-1/2 min-h-[36px] py-1 text-xs"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                data-testid="btn-add-ruby"
                onClick={addRuby}
              >
                + Ruby
              </Button>
            </div>

            {/* Underline Input */}
            <div className="flex space-x-1">
              <Input
                type="text"
                data-testid="input-underline-text"
                value={underlineText}
                onChange={(e) => setUnderlineText(e.target.value)}
                placeholder="Từ gạch chân"
                className="flex-1 min-h-[36px] py-1 text-xs"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                data-testid="btn-add-underline"
                onClick={addUnderline}
              >
                + Gạch chân
              </Button>
            </div>

            {/* Star, Blank, Linebreak tools */}
            <div className="flex space-x-1 items-center">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                data-testid="btn-add-star"
                onClick={addStar}
                title="Chèn ô sao JLPT ★"
              >
                + ★ Sao
              </Button>

              <Input
                type="text"
                data-testid="input-blank-label"
                value={blankLabel}
                onChange={(e) => setBlankLabel(e.target.value)}
                placeholder="Số ô trống"
                className="w-16 min-h-[36px] py-1 text-xs text-center"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                data-testid="btn-add-blank"
                onClick={addBlank}
              >
                + Ô trống
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                data-testid="btn-add-br"
                onClick={addBr}
                title="Xuống dòng"
              >
                ↵ Xuống dòng
              </Button>

              {value.length > 0 && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  data-testid="btn-clear-all"
                  onClick={clearAll}
                  className="ml-auto"
                >
                  Xóa hết
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export interface PassageBlocksEditorProps {
  blocks: RichBlock[];
  onChange: (newBlocks: RichBlock[]) => void;
}

/**
 * Visual Passage Editor for Reading Comprehension (paragraphs, tables, images).
 */
export function PassageBlocksEditor({ blocks, onChange }: PassageBlocksEditorProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  const addParagraph = () => {
    onChange([...blocks, createParagraphBlock([createTextSegment('Đoạn văn mới...')])]);
  };

  const addTable = () => {
    const defaultTable = createTableBlock([
      [[createTextSegment('Tiêu đề cột 1')], [createTextSegment('Tiêu đề cột 2')]],
      [[createTextSegment('Dữ liệu hàng 1')], [createTextSegment('Dữ liệu hàng 2')]],
    ]);
    onChange([...blocks, defaultTable]);
  };

  const addImage = () => {
    const defaultImage = createImageBlock('media_passage_illustration', 'Hình ảnh minh họa bài đọc', 500, 300);
    onChange([...blocks, defaultImage]);
  };

  const removeBlock = (index: number) => {
    onChange(blocks.filter((_, idx) => idx !== index));
  };

  const updateParagraphContent = (index: number, content: RichText) => {
    const updated = [...blocks];
    updated[index] = { type: 'paragraph', content };
    onChange(updated);
  };

  const updateTableCell = (blockIndex: number, rowIndex: number, colIndex: number, content: RichText) => {
    const block = blocks[blockIndex];
    if (block?.type !== 'table') return;

    const newRows = block.rows.map((row, r) =>
      row.map((cell, c) => (r === rowIndex && c === colIndex ? content : cell)),
    );

    const updated = [...blocks];
    updated[blockIndex] = { type: 'table', rows: newRows };
    onChange(updated);
  };

  return (
    <div data-testid="passage-blocks-editor" className="border border-slate-300 rounded-lg p-4 bg-white space-y-4">
      <div className="flex items-center justify-between border-b pb-2">
        <h4 className="text-sm font-bold text-gray-800">Biên tập bài đọc hiểu (Reading Passage)</h4>
        <div className="flex space-x-2">
          <Button
            type="button"
            variant={activeTab === 'edit' ? 'primary' : 'secondary'}
            size="sm"
            data-testid="passage-tab-edit"
            onClick={() => setActiveTab('edit')}
          >
            Chỉnh sửa ({blocks.length} khối)
          </Button>
          <Button
            type="button"
            variant={activeTab === 'preview' ? 'primary' : 'secondary'}
            size="sm"
            data-testid="passage-tab-preview"
            onClick={() => setActiveTab('preview')}
          >
            Xem trước
          </Button>
        </div>
      </div>

      {activeTab === 'preview' ? (
        <div className="p-4 bg-slate-50 border rounded-md">
          <PassageBlockViewer blocks={blocks} />
        </div>
      ) : (
        <div className="space-y-4">
          {blocks.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 text-sm">
              Chưa có đoạn văn bài đọc nào. Nhấn các nút bên dưới để thêm đoạn văn, bảng hoặc hình ảnh.
            </div>
          ) : (
            blocks.map((block, bIdx) => (
              <div
                key={bIdx}
                data-testid={`block-item-${bIdx}`}
                className="border border-gray-200 rounded p-3 bg-gray-50 space-y-2"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
                  <span>
                    Khối {bIdx + 1}: {block.type === 'paragraph' ? 'Đoạn văn (Paragraph)' : block.type === 'table' ? 'Bảng biểu (Table)' : 'Hình ảnh (Image)'}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-testid={`btn-remove-block-${bIdx}`}
                    onClick={() => removeBlock(bIdx)}
                    className="text-red-500 hover:text-red-700 min-h-0 py-0"
                  >
                    Xóa khối
                  </Button>
                </div>

                {block.type === 'paragraph' && (
                  <RichTextSegmentEditor
                    value={block.content}
                    onChange={(newVal) => updateParagraphContent(bIdx, newVal)}
                    label="Nội dung đoạn văn"
                  />
                )}

                {block.type === 'table' && (
                  <div className="space-y-2 text-xs">
                    <p className="font-medium text-gray-700">Các ô trong bảng:</p>
                    <div className="overflow-x-auto">
                      <table className="border-collapse border border-gray-300 w-full text-xs">
                        <tbody>
                          {block.rows.map((row, rIdx) => (
                            <tr key={rIdx}>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="border border-gray-300 p-2">
                                  <div className="mb-1 text-[10px] text-gray-400 font-mono">
                                    Ô [{rIdx + 1},{cIdx + 1}]
                                  </div>
                                  <RichTextSegmentEditor
                                    value={cell}
                                    onChange={(newCell) => updateTableCell(bIdx, rIdx, cIdx, newCell)}
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {block.type === 'image' && (
                  <div className="text-xs space-y-1">
                    <p>Khóa ảnh: <code className="bg-gray-200 px-1 rounded">{block.mediaKey}</code></p>
                    <p>Chú thích: {block.alt}</p>
                    <p>Kích thước: {block.width}x{block.height} px</p>
                  </div>
                )}
              </div>
            ))
          )}

          {/* Add block buttons */}
          <div className="flex flex-wrap gap-2 pt-2 border-t text-xs">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              data-testid="btn-add-paragraph"
              onClick={addParagraph}
            >
              + Thêm đoạn văn
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              data-testid="btn-add-table"
              onClick={addTable}
            >
              + Thêm bảng biểu
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              data-testid="btn-add-image"
              onClick={addImage}
            >
              + Thêm hình ảnh
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
