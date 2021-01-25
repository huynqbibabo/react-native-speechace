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

export interface SpeechEvents {
  onVoiceStart?: () => void;
  onVoice?: (e: VoiceEvent) => void;
  onVoiceEnd?: () => void;

  onError?: (e: SpeechErrorEvent) => void;
  onSpeechRecognized?: (e: SpeechRecognizeEvent) => void;
}

export interface VoiceEvent {
  size: number;
}

export interface SpeechErrorEvent {
  error?: {
    code?: string;
    message?: string;
  };
}

export type SpeechaceModuleState = 'NONE' | 'RECORDING' | 'RECOGNIZING';

export interface SpeechRecognizeEvent {
  /**
   * recorded file path if form data not set
   */
  filePath: string;
  /**
   * response from Speechace api
   */
  response: SpeechResponse;
}

export interface QueryParams {
  /**
   * API key issued by Speechace.
   * This will override setApiKey(*) for current request
   */
  key?: string;
  /**
   * dialect to use for scoring.
   * Supported values are "en-us" (US English) and "en-gb" (UK English)
   * en-gb requires setting v0.1 in url path. i.e. https://api.speechace.co/api/scoring/text/v0.1/json?
   * default is 'en-us'
   */
  dialect?: 'en-us' | 'en-gb';
  /**
   * A unique anonymized identifier for the end-user who spoke the audio.
   * Structure this field to include as much info as possible to aid in reporting and analytics.
   * For example: user_id=XYZ-ABC-99001 where:
   * XYZ is an id for your Product or App
   * ABC is an id for the customer/site/account
   * 99001 is an id for the end-user
   * Ensure user_id is unique and anonymized containing no personally identifiable information.
   */
  userId?: string;
}

export interface FormData {
  /**
   * A word, phrase, or sentence to score.
   */
  text?: string;

  /**
   * path to audio file(wav, mp3, m4a, webm, ogg, aiff)
   * module will call voice recorder if file path not set
   */
  audioFile?: string;
  /**
   * A unique identifier for the activity or question this user audio is answering.
   * Structure this field to include as much info as possible to aid in reporting and analytics.
   * Ensure no personally identifiable information is passed in this field.
   */
  questionInfo?: string;
  /**
   * includes fluency scoring for this request.
   * To use this field you must have a Speechace API PRO key.
   */
  includeFluency?: 1;
  /**
   * Include intonation score (beta)
   */
  includeIntonation?: 1;
  /**
   * Include lexical stress (beta)
   */
  stressVersion?: 0.8;
  /**
   * A phoneme list to score.
   */
  phoneList?: string;
}
