import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpeechModuleState } from './index';
import Speechace, { SpeechEvent } from './index';
import type { EmitterSubscription } from 'react-native';
import type { PlayerEvent } from './types';
let nextKey = 0;
/**
 *   Get current module state and subsequent updates
 */
const useModuleState = () => {
  const [state, setState] = useState<SpeechModuleState>('NONE');

  useEffect(() => {
    async function updateState() {
      const moduleState = await Speechace.getState();
      setState(moduleState);
    }

    updateState();

    const sub = Speechace.onModuleStateChange((event) => {
      setState(event.state);
    });
    let handlerSubscription: EmitterSubscription;
    return () => {
      sub.remove();
      handlerSubscription?.remove();
    };
  }, []);

  return state;
};

/**
 * @description
 *   Attaches a handler to the given Speechace events and performs cleanup on unmount
 * @param {Array<string>} event - Speechace events to subscribe to
 * @param {(payload: any) => void} handler - callback invoked when the event fires
 */
const useSpeechEvent = (event: SpeechEvent, handler: (event: any) => void) => {
  const savedHandler = useRef();

  useEffect(() => {
    // @ts-ignore
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const sub = Speechace.addListener(event, (payload) =>
      // @ts-ignore
      savedHandler.current(payload)
    );

    return () => {
      sub.remove();
    };
  }, [event]);
};

const useModuleStateChanges = (handler: (event: SpeechModuleState) => void) => {
  useSpeechEvent('onModuleStateChange', ({ state }) => {
    handler(state);
  });
  useEffect(() => {
    let didCancel = false;
    const updateState = async () => {
      const moduleState = await Speechace.getState();
      if (!didCancel) {
        handler(moduleState);
      }
    };
    updateState();
    return () => {
      didCancel = true;
    };
  }, [handler]);
};

const usePlayer = (filePath: string) => {
  const _file = useRef(filePath);
  const _key = useRef(nextKey++);
  const [playing, setPlayerState] = useState(false);

  const release = useCallback(() => {
    Speechace.release(_key.current);
  }, [_key]);
  const prepare = useCallback(async () => {
    await Speechace.prepare(_file.current, _key.current);
  }, [_key]);

  useEffect(() => {
    let didCancel = false;
    const playerSubscription = Speechace.addListener(
      'onPlayerStateChange',
      ({ key, isPlaying }: PlayerEvent) => {
        console.log(key, _key.current, isPlaying);
        if (key === _key.current && !didCancel) {
          if (isPlaying) {
            setPlayerState(true);
          } else {
            setPlayerState(false);
          }
        }
      }
    );
    prepare();
    return () => {
      didCancel = true;
      release();
      playerSubscription.remove();
    };
  }, [filePath, prepare, release]);

  const play = async () => {
    await Speechace.play(_key.current);
  };

  const pause = async () => {
    await Speechace.pause(_key.current);
  };

  const stop = async () => {
    await Speechace.stopPlayer(_key.current);
  };

  const seek = async (time: number) => {
    await Speechace.seek(time, _key.current);
  };
  const setVolume = async (volume: number) => {
    return await Speechace.setVolume(volume, _key.current);
  };

  return {
    playing,
    file: _file.current,
    prepare,
    play,
    pause,
    stop,
    seek,
    setVolume,
    release,
  };
};

export { useModuleState, useSpeechEvent, useModuleStateChanges, usePlayer };
