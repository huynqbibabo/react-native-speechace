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
  PLayerEvents,
  VoiceStartEvent,
  VoiceEndEvent,
} from './types';

import {
  useModuleState,
  useModuleStateChanges,
  useSpeechEvent,
  usePlayer,
  useSpeechRecognizer,
} from './hooks';

const SpeechaceModule = NativeModules.Speechace;
const SpeechaceModuleEmitter = new NativeEventEmitter(SpeechaceModule);

class RNSpeechace {
  /**
   * Start speech recognize
   */
  async start(
    channel?: number,
    queryParams?: QueryParams,
    formData?: FormData,
    configs?: SpeechConfigs
  ): Promise<void> {
    return await SpeechaceModule.start(
      channel || 0,
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
  async stop(channel?: number): Promise<void> {
    return await SpeechaceModule.stop(channel ?? 0);
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
   * clear cache folder
   * release resources
   */
  async clear() {
    (Object.keys({} as SpeechEvents) as SpeechEvent[]).map((key) =>
      SpeechaceModuleEmitter.removeAllListeners(key)
    );
    await SpeechaceModule.clear();
  }

  /**
   * Cancel speech recording or api calling
   */
  async cancel(channel?: number): Promise<void> {
    return await SpeechaceModule.cancel(channel ?? 0);
  }

  /**
   * get current speech module state
   */
  async getState(): Promise<SpeechModuleState> {
    return await SpeechaceModule.getState();
  }

  /**
   * invoke when recorder capture voice in first time
   * @param fn
   */
  onVoiceStart = (fn: (e: VoiceStartEvent) => void): EmitterSubscription => {
    return SpeechaceModuleEmitter.addListener('onVoiceStart', fn);
  };

  onVoice(fn: (data: VoiceEvent) => void): EmitterSubscription {
    return SpeechaceModuleEmitter.addListener('onVoice', fn);
  }

  onVoiceEnd(fn: (e: VoiceEndEvent) => void): EmitterSubscription {
    return SpeechaceModuleEmitter.addListener('onVoiceEnd', fn);
  }

  onError(fn: (error: ErrorEvent) => void): EmitterSubscription {
    return SpeechaceModuleEmitter.addListener('onError', fn);
  }

  onModuleStateChange(fn: (e: StateChangeEvent) => void): EmitterSubscription {
    return SpeechaceModuleEmitter.addListener('onModuleStateChange', fn);
  }

  onSpeechRecognized(
    fn: (event: SpeechRecognizedEvent) => void
  ): EmitterSubscription {
    return SpeechaceModuleEmitter.addListener('onSpeechRecognized', fn);
  }

  addListener(
    event: SpeechEvent,
    handler: (payload: any) => void
  ): EmitterSubscription {
    return SpeechaceModuleEmitter.addListener(event, handler);
  }

  async prepare(filePath: string, key: number) {
    return await SpeechaceModule.prepare(filePath, key);
  }

  async play(key: number) {
    return await SpeechaceModule.play(key);
  }

  async stopPlayer(key: number) {
    return await SpeechaceModule.stopPlayer(key);
  }

  async pause(key: number) {
    return await SpeechaceModule.pause(key);
  }

  async seek(time: number, key: number) {
    return await SpeechaceModule.seek(time, key);
  }

  async setVolume(volume: number, key: number) {
    return await SpeechaceModule.setVolume(volume, key);
  }

  release(key: number) {
    SpeechaceModule.release(key);
  }
}

const Speechace = new RNSpeechace();
export default Speechace;
export {
  useModuleState,
  useModuleStateChanges,
  useSpeechEvent,
  usePlayer,
  useSpeechRecognizer,
};
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
  PLayerEvents,
  VoiceStartEvent,
  VoiceEndEvent,
};
