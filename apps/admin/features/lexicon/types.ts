export interface LexiconMeaningSense {
  senseIndex: number;
  english: string[];
  vietnamese: string[];
  summary: string | null;
  explanation: string | null;
  partOfSpeech: string | null;
}

export interface LexiconItem {
  id: string;
  term: string;
  readings: string[];
  meanings: string[];
  meaningsVi: string[];
  meaningSenses: LexiconMeaningSense[];
  partOfSpeech: string;
  hanViet: string;
}
