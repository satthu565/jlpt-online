import type { ImportPackageV2, IssueItem, IssueSummaryReport } from './types.js';

const OCR_KEYWORDS = [
  'ocr',
  'confidence',
  'tin cậy',
  '[khong_doc_ro]',
  'không đọc rõ',
  'chữ mờ',
  'mờ',
];

/**
 * Summarizes and formats all issues declared in an import package (Feature PDF-21).
 * Specifically categorizes OCR low confidence issues from manual/agent data preparation.
 */
export function formatPackageIssues(pkg: ImportPackageV2): IssueSummaryReport {
  const blockingCount = pkg.issues.filter((i) => i.severity === 'blocking').length;
  const warningCount = pkg.issues.filter((i) => i.severity === 'warning').length;

  const ocrLowConfidenceCount = pkg.issues.filter((i) => {
    const text = (i.id + ' ' + i.reason).toLowerCase();
    return OCR_KEYWORDS.some((kw) => text.includes(kw));
  }).length;

  return {
    totalIssues: pkg.issues.length,
    blockingCount,
    warningCount,
    ocrLowConfidenceCount,
    items: [...pkg.issues],
  };
}

/**
 * Retrieves all issues associated with a specific question by question ID or JSON pointer.
 */
export function getQuestionIssues(pkg: ImportPackageV2, questionIdOrPointer: string): IssueItem[] {
  let targetPointer = questionIdOrPointer;

  if (!targetPointer.startsWith('/')) {
    // Look up question by ID to find its pointer path
    for (let gi = 0; gi < pkg.groups.length; gi++) {
      const g = pkg.groups[gi]!;
      for (let qi = 0; qi < g.questions.length; qi++) {
        if (g.questions[qi]!.id === questionIdOrPointer) {
          targetPointer = `/groups/${gi}/questions/${qi}`;
          break;
        }
      }
      if (targetPointer.startsWith('/')) break;
    }
  }

  return pkg.issues.filter(
    (issue) => issue.path === targetPointer || issue.path.startsWith(targetPointer + '/'),
  );
}

/**
 * Scans the entire package for unverified OCR markers (such as [KHONG_DOC_RO])
 * and checks whether each marker is properly accompanied by a blocking issue.
 */
export function findUnresolvedOcrMarkers(
  pkg: ImportPackageV2,
): Array<{ path: string; marker: string; covered: boolean }> {
  const blockingIssues = pkg.issues.filter((i) => i.severity === 'blocking');
  const results: Array<{ path: string; marker: string; covered: boolean }> = [];

  function checkString(str: string, currentPath: string) {
    if (str.includes('[KHONG_DOC_RO]')) {
      const isCovered = blockingIssues.some(
        (issue) => currentPath === issue.path || currentPath.startsWith(issue.path + '/'),
      );
      results.push({
        path: currentPath,
        marker: '[KHONG_DOC_RO]',
        covered: isCovered,
      });
    }
  }

  function walk(node: unknown, currentPath: string) {
    if (typeof node === 'string') {
      checkString(node, currentPath);
    } else if (node && typeof node === 'object') {
      if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) {
          walk(node[i], `${currentPath}/${i}`);
        }
      } else {
        for (const [k, v] of Object.entries(node)) {
          walk(v, `${currentPath}/${k}`);
        }
      }
    }
  }

  walk(pkg.groups, '/groups');
  return results;
}
