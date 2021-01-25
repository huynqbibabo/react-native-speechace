export interface ChildPhone {
  soundMostLike: string;
  qualityScore: number;
  extent: number[];
}

export interface PhoneScore {
  childPhones?: ChildPhone[];
  extent: number[];
  phone: string;
  qualityScore: number;
  soundMostLike: string | null;
  stressLevel?: number | null;
  stressScore?: number | null;
}

export interface SyllableScore {
  extent: number;
  stressScore: number;
  qualityScore: number;
  letters: string;
  stressLevel: number;
  phoneCount: number;
}

export interface WordScore {
  phoneScoreList?: PhoneScore[];
  qualityScore: number;
  syllableScoreList?: SyllableScore[];
  word: string;
}

export interface TextScore {
  fidelityClass: 'CORRECT' | 'NO_SPEECH' | 'INCOMPLETE' | 'FREE_SPEAK';
  qualityScore: number;
  text?: string;
  wordScoreList?: WordScore[];
}

export interface SpeechResponse {
  quotaRemaining?: number;
  status: string;
  detailMessage?: string;
  shortMessage?: string;
  version?: number;
  textScore?: TextScore;
}
