import assert from 'node:assert/strict';
import { ExplanationDraftSchema } from '../../../packages/schema/dist/index.js';
function text(v){return Array.isArray(v)?v.map(text).join(''):v&&typeof v==='object'?(v.text??(v.children?text(v.children):v.content?text(v.content):'')):'';}
export function makeExplanation(existing,fix,contentVersion){
 const value=structuredClone(existing),blocks=fix.after.explanation.blocks;
 const translation=blocks.find(b=>text(b).startsWith('• Dịch nghĩa:'));
 const correct=blocks.find(b=>text(b).startsWith('• Đáp án đúng:'));
 assert(translation&&correct,'Structured rationale missing');
 value.translation=[{t:'text',text:text(translation).replace(/^• Dịch nghĩa:\s*/u,'')}];
 value.correctReason=structuredClone(correct.content);
 if(value.correctReason[0]?.t==='text')value.correctReason[0].text=value.correctReason[0].text.replace(/^• /u,'');
 for(const b of blocks.filter(b=>text(b).startsWith('• Ghi chú')))value.correctReason.push({t:'br'},...structuredClone(b.content));
 const wrong=blocks.filter(b=>text(b).startsWith('• Phân tích')||/^- \[[1-4]\]/u.test(text(b))).map(text).join(' ');
 value.wrongReasonsByOption={};
 for(const match of wrong.matchAll(/-\s*\[([1-4])\]\s*([\s\S]*?)(?=-\s*\[[1-4]\]|$)/gu))value.wrongReasonsByOption[match[1]]=[{t:'text',text:match[2].trim()}];
 assert.equal(Object.keys(value.wrongReasonsByOption).length,3,'Three distractor explanations required');
 assert(!value.wrongReasonsByOption[String(fix.after.correctOption)],'Correct choice has a wrong reason');
 value.questionId=fix.questionId;value.contentVersion=contentVersion;value.humanReviewed=true;
 return ExplanationDraftSchema.parse(value);
}
