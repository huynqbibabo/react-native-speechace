# react-native-speechace

SpeechAce module for react native

## Installation

```sh
yarn add react-native-speechace
```

## Usage

### Methods
```typescript
import Speechace from "react-native-speechace";

// ...
/**
 * Set api key. this can change in runtime
 * call this before all event
 * @param apiKey
 */
setApiKey: (apiKey: string) => void;

/**
 * Start speech recognize
 */
start: (
  channel?: number,
  queryParams?: QueryParams,
  formData?: FormData,
  configs?: SpeechConfigs
) => Promise<void>;

/**
 * Call this to stop recorder
 */
stop: (channel?: number) => Promise<void>;

/**
 * Cancel speech recording or api calling
 */
cancel: (channel?: number) => Promise<void>;

/**
 * remove all module listeners
 * clear cache folder
 * release resources
 */
clear: () => Promise<void>;

/**
 * get current speech module state
 */
getState: () => Promise<SpeechModuleState>;

/**
 * load audio file return from SpeechRecognized event
 * with key for identity
 */
prepare: (filePath: string, key: number) => Promise<void>;

/**
 * play audio file by key from prepare
 */
play: (key: number) => Promise<void>;

/**
 * stop audio file by key from prepare
 */
stopPlayer: (key: number) => Promise<void>;

/**
 * pause audio file by key from prepare
 */
pause: (key: number) => Promise<void>;

/**
 * seek to time audio file by key from prepare
 */
seek: (time: number, key: number) => Promise<void>;

/**
 * set volume for audio file by key from prepare
 */
setVolume: (volume: number, key: number) => Promise<void>;

/**
 * free all prepared file
 */
release: () => void;
```

###Hooks
```typescript
/**
 *   Get current module state and subsequent updates
 *   'NONE' | 'RECORDING' | 'RECOGNIZING';
 */
const state = useModuleState()

/**
 * @description
 *   Attaches a handler to the given Speechace events and performs cleanup on unmount
 * @param {Array<string>} event - Speechace events to subscribe to
 * @param {(payload: any) => void} handler - callback invoked when the event fires
 */
useSpeechEvent(event: SpeechEvent, handler: (event: any) => void);
/**
 * Attaches a handler to the given module state events and performs cleanup on unmount
 * @param handler
 * 'NONE' | 'RECORDING' | 'RECOGNIZING';
 */
useModuleStateChanges = (handler: (event: SpeechModuleState) => void);

/**
 * hook for audio file with all state and actions prepare, play, pause...
 *
 */
const {
  playing,
  play,
  pause,
  stop,
  seek,
  setVolume,
  release,
} = usePlayer(filePath: string);

/**
 * Hook for recognize event
 * state: SpeechModuleState
 * audioFile: tring | null
 * response: SpeechResponse
 * start: () => Promise<void>
 * stop: () => Promise<void>
 * cancel: () => Promise<void>
 */
const {
  state,
  audioFile,
  response,
  start,
  stop,
  cancel,
} = useSpeechRecognizer = (options: {
  queryParams?: QueryParams;
  formData?: FormData;
  configs?: SpeechConfigs;
});

```
## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT
