interface ChildPhone {
  soundMostLike: string;
  qualityScore: number;
  extent: number[];
}

interface PhoneScore {
  childPhones?: ChildPhone[];
  extent: number[];
  phone: string;
  qualityScore: number;
  soundMostLike: string | null;
  stressLevel: number | null;
  stressScore: number;
}

interface SyllableScore {
  extent: number;
  stressScore: number;
  qualityScore: number;
  letters: string;
  stressLevel: number;
  phoneCount: number;
}

interface WordScore {
  phoneScoreList?;
  qualityScore: number;
  syllableScoreList?: SyllableScore[];
  word: string;
}

interface TextScore {
  fidelityClass: 'CORRECT' | 'NO_SPEECH' | 'INCOMPLETE' | 'FREE_SPEAK';
  qualityScore: number;
  text?: string;
  wordScoreList?: WordScore[];
}

interface SpeechResponse {
  quotaRemaining?: number;
  status: string;
  detailMessage?: string;
  shortMessage?: string;
  version?: number;
  textScore?: TextScore;
}
