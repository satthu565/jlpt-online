export interface HanVietOnyomiCoverageReport {
  success: boolean;
  missingKanji: string[];
  missingReadings: Array<{ kanji: string; onyomi: string }>;
}

export function checkHanVietOnyomiCoverage(): HanVietOnyomiCoverageReport;
