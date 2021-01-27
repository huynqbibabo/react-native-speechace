import {
  EmitterSubscription,
  NativeEventEmitter,
  NativeModules,
} from 'react-native';

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

export interface SegmentMetrics extends Metrics {}

export interface Metrics {
  allPauseCount: number;
  allPauseDuration: number;
  allPauseList: number[][];
  articulationLength: number;
  articulationRate: number;
  correctSyllableCount: number;
  correctWordCount: number;
  duration: number;
  ieltsEstimate: number;
  maxLengthRun: number;
  meanLengthRun: number;
  pteEstimate: number;
  segment: number[];
  speechRate: number;
  syllableCorrectPerMinute: number;
  syllableCount: number;
  wordCorrectPerMinute: number;
  wordCount: number;
}

export interface Fluency {
  segmentMetricsList: SegmentMetrics[];
  overallMetrics?: Metrics;
  fluencyVersion: string | null;
}

export interface TextScore {
  fidelityClass: 'CORRECT' | 'NO_SPEECH' | 'INCOMPLETE' | 'FREE_SPEAK';
  qualityScore: number;
  text?: string;
  wordScoreList?: WordScore[];
  fluency?: Fluency;
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
  onModuleStateChange?: (e: StateChangeEvent) => void;
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

export interface StateChangeEvent {
  state: SpeechaceModuleState;
}

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
  user_id?: string;
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
  user_audio_file?: string;
  /**
   * A unique identifier for the activity or question this user audio is answering.
   * Structure this field to include as much info as possible to aid in reporting and analytics.
   * Ensure no personally identifiable information is passed in this field.
   */
  question_info?: string;
  /**
   * includes fluency scoring for this request.
   * To use this field you must have a Speechace API PRO key.
   */
  include_fluency?: 1;
  /**
   * Include intonation score (beta)
   */
  include_intonation?: 1;
  /**
   * Include lexical stress (beta)
   */
  stress_version?: 0.8;
  /**
   * A phoneme list to score.
   */
  phone_list?: string;
}

/**
 * audio configs
 */
export interface Configs {
  /**
   * max audio length to record. Default value is 40s
   * if user start module and not do anything
   * module will auto release resource and cancel progress.
   */
  audioLengthInSeconds?: number;
  /**
   * action of api call
   * default value is 'scoring'
   */
  callForAction?: 'scoring' | 'validating';
  /**
   * type of api action
   * default value is 'text'
   */
  actionForDatatype?: 'text' | 'speech' | 'phone_list';
}

const SpeechaceModule = NativeModules.Speechace;

export type SpeechEvent = keyof SpeechEvents;

const VoiceEmitter = new NativeEventEmitter(SpeechaceModule);

class Speechace {
  private readonly _events: Required<SpeechEvents>;
  private _listeners: any[] | null;

  constructor() {
    this._listeners = null;
    this._events = {
      onVoice: () => undefined,
      onVoiceEnd: () => undefined,
      onError: () => undefined,
      onVoiceStart: () => undefined,
      onSpeechRecognized: () => undefined,
      onModuleStateChange: () => undefined,
    };
  }

  /**
   * Start speech recognize
   */
  async start(
    queryParams?: QueryParams,
    formData?: FormData,
    configs?: Configs
  ): Promise<void> {
    if (!this._listeners) {
      this._listeners = (Object.keys(
        this._events
      ) as SpeechEvent[]).map((key) =>
        VoiceEmitter.addListener(key, this._events[key])
      );
    }
    return await SpeechaceModule.start(
      Object.assign({ dialect: 'en-us' }, queryParams),
      formData,
      Object.assign(
        { callForAction: 'scoring', actionForDatatype: 'text' },
        configs
      )
    );
  }

  /**
   * Call this to stop recorder
   */
  async stop(): Promise<void> {
    return await SpeechaceModule.stop();
  }

  /**
   * Set api key. this can change in runtime
   * call this before all event
   * @param apiKey
   */
  setApiKey(apiKey: string): void {
    SpeechaceModule.setApiKey(apiKey);
  }

  /**
   * remove all module listeners
   */
  removeListeners() {
    (Object.keys({} as SpeechEvents) as SpeechEvent[]).map((key) =>
      VoiceEmitter.removeAllListeners(key)
    );
  }

  /**
   * Cancel speech recording or api call
   */
  async cancel(): Promise<void> {
    return await SpeechaceModule.cancel();
  }

  onVoiceStart = (fn: () => void): EmitterSubscription => {
    return VoiceEmitter.addListener('onVoiceStart', fn);
  };

  onVoice(fn: (data: VoiceEvent) => void) {
    return VoiceEmitter.addListener('onVoice', fn);
  }

  onVoiceEnd(fn: () => void) {
    return VoiceEmitter.addListener('onVoiceEnd', fn);
  }

  onError(fn: (error: SpeechErrorEvent) => void) {
    return VoiceEmitter.addListener('onError', fn);
  }

  onSpeechRecognized(fn: (event: SpeechRecognizeEvent) => void) {
    return VoiceEmitter.addListener('onSpeechRecognized', fn);
  }

  onModuleStateChange(fn: (e: StateChangeEvent) => void) {
    return VoiceEmitter.addListener('onModuleStateChange', fn);
  }
}

export default new Speechace();
