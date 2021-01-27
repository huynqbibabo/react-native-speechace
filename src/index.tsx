import { NativeEventEmitter, NativeModules } from 'react-native';
import type {
  SpeechResponse,
  ChildPhone,
  PhoneScore,
  SyllableScore,
  TextScore,
  WordScore,
  SpeechaceModuleState,
  SpeechRecognizeEvent,
  FormData,
  QueryParams,
  SpeechErrorEvent,
  SpeechEvents,
  VoiceEvent,
  Configs,
  StateChangeEvent,
} from './types';

const SpeechaceModule = NativeModules.Speechace;

const VoiceEmitter = new NativeEventEmitter(SpeechaceModule);

type SpeechEvent = keyof SpeechEvents;

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
    if (this._listeners) {
      this._listeners.map((listener) => listener.remove());
      this._listeners = null;
    }
    this._listeners = null;
  }

  /**
   * Cancel speech recording or api call
   */
  async cancel(): Promise<void> {
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

  onModuleStateChange(fn: (e: StateChangeEvent) => void) {
    this._events.onModuleStateChange = fn;
  }
}

export default new Speechace();
export type {
  SpeechResponse,
  ChildPhone,
  PhoneScore,
  SyllableScore,
  TextScore,
  WordScore,
  SpeechaceModuleState,
  SpeechRecognizeEvent,
  FormData,
  QueryParams,
  SpeechErrorEvent,
  SpeechEvents,
  VoiceEvent,
  Configs,
  StateChangeEvent,
};
