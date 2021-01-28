/**
 *   Get current module state and subsequent updates
 */
import { useEffect, useRef, useState } from 'react';
import type { SpeechModuleState } from './index';
import Speechace, { SpeechEvent } from './index';
import type { EmitterSubscription } from 'react-native';

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

export { useModuleState, useSpeechEvent, useModuleStateChanges };
