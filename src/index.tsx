import { NativeModules } from 'react-native';

type SpeechaceType = {
  multiply(a: number, b: number): Promise<number>;
};

const { Speechace } = NativeModules;

export default Speechace as SpeechaceType;
