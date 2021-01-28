import {
  EmitterSubscription,
  NativeEventEmitter,
  NativeModules,
} from 'react-native';
import type {
  SpeechConfigs,
  QueryParams,
  SpeechModuleState,
  ErrorEvent,
  SpeechEvents,
  SpeechRecognizedEvent,
  StateChangeEvent,
  VoiceEvent,
  SpeechResponse,
  FormData,
  SpeechEvent,
  WordScore,
  TextScore,
  SyllableScore,
  SegmentMetrics,
  PhoneScore,
  Fluency,
  ChildPhone,
  Metrics,
} from './types';

import { useModuleState, useModuleStateChanges, useSpeechEvent } from './hooks';

const SpeechaceModule = NativeModules.Speechace;
const VoiceEmitter = new NativeEventEmitter(SpeechaceModule);

class RNSpeechace {
  // private readonly _events: Required<SpeechEvents>;
  // private _listeners: any[] | null;
  //
  // constructor() {
  //   this._listeners = null;
  //   this._events = {
  //     onVoice: () => undefined,
  //     onVoiceEnd: () => undefined,
  //     onError: () => undefined,
  //     onVoiceStart: () => undefined,
  //     onSpeechRecognized: () => undefined,
  //     onModuleStateChange: () => undefined,
  //   };
  // }

  /**
   * Start speech recognize
   */
  async start(
    queryParams?: QueryParams,
    formData?: FormData,
    configs?: SpeechConfigs
  ): Promise<void> {
    // if (!this._listeners) {
    //   this._listeners = (Object.keys(
    //     this._events
    //   ) as SpeechEvent[]).map((key) =>
    //     VoiceEmitter.addListener(key, this._events[key])
    //   );
    // }
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
   * Cancel speech recording or api calling
   */
  async cancel(): Promise<void> {
    return await SpeechaceModule.cancel();
  }

  /**
   * get current speech module state
   */
  async getState(): Promise<SpeechModuleState> {
    return SpeechaceModule.getState();
  }

  /**
   * invoke when recorder capture voice in first time
   * @param fn
   */
  onVoiceStart = (fn: () => void): EmitterSubscription => {
    return VoiceEmitter.addListener('onVoiceStart', fn);
  };

  onVoice(fn: (data: VoiceEvent) => void) {
    return VoiceEmitter.addListener('onVoice', fn);
  }

  onVoiceEnd(fn: () => void) {
    return VoiceEmitter.addListener('onVoiceEnd', fn);
  }

  onError(fn: (error: ErrorEvent) => void) {
    return VoiceEmitter.addListener('onError', fn);
  }

  onSpeechRecognized(fn: (event: SpeechRecognizedEvent) => void) {
    return VoiceEmitter.addListener('onSpeechRecognized', fn);
  }

  onModuleStateChange(fn: (e: StateChangeEvent) => void) {
    return VoiceEmitter.addListener('onModuleStateChange', fn);
  }

  addListener(event: SpeechEvent, handler: (payload: any) => void) {
    return VoiceEmitter.addListener(event, handler);
  }
}

const Speechace = new RNSpeechace();
export default Speechace;
export { useModuleState, useModuleStateChanges, useSpeechEvent };
export type {
  SpeechConfigs,
  QueryParams,
  SpeechModuleState,
  ErrorEvent,
  SpeechEvents,
  SpeechRecognizedEvent,
  StateChangeEvent,
  VoiceEvent,
  SpeechResponse,
  FormData,
  SpeechEvent,
  WordScore,
  TextScore,
  SyllableScore,
  SegmentMetrics,
  PhoneScore,
  Fluency,
  ChildPhone,
  Metrics,
};
