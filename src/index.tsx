import { NativeEventEmitter, NativeModules } from 'react-native';

const SpeechaceModule = NativeModules.Speechace;

const VoiceEmitter = new NativeEventEmitter(SpeechaceModule);

type SpeechEvent = keyof SpeechEvents;

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
  response: {
    [key: string]: any;
  };
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
    };
  }

  /**
   * Start speech recognize
   */
  async start(
    queryParams?: QueryParams,
    formData?: FormData
  ): Promise<SpeechaceModuleState> {
    if (!this._listeners) {
      this._listeners = (Object.keys(
        this._events
      ) as SpeechEvent[]).map((key) =>
        VoiceEmitter.addListener(key, this._events[key])
      );
    }
    return await SpeechaceModule.start(
      Object.assign({ dialect: 'en-us' }, queryParams),
      formData
    );
  }

  /**
   * Call this to stop recorder
   */
  async stop(): Promise<SpeechaceModuleState> {
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
    if (this._listeners) {
      this._listeners.map((listener) => listener.remove());
      this._listeners = null;
    }
    this._listeners = null;
  }

  /**
   * Cancel speech recording or api call
   */
  async cancel(): Promise<SpeechaceModuleState> {
    return await SpeechaceModule.cancel();
  }

  onVoiceStart(fn: () => void) {
    this._events.onVoiceStart = fn;
  }

  onVoice(fn: (data: VoiceEvent) => void) {
    this._events.onVoice = fn;
  }

  onVoiceEnd(fn: () => void) {
    this._events.onVoiceEnd = fn;
  }

  onSpeechError(fn: (error: SpeechErrorEvent) => void) {
    this._events.onError = fn;
  }

  onSpeechRecognized(fn: (event: SpeechRecognizeEvent) => void) {
    this._events.onSpeechRecognized = fn;
  }
}

export default new Speechace();
