import SpeechAce, {
  ErrorEvent,
  SpeechModuleState,
  SpeechRecognizedEvent,
  SpeechResponse,
  StateChangeEvent,
  useModuleState,
  VoiceEvent,
} from 'react-native-speechace';
import React, { useEffect, useState } from 'react';
import {
  Button,
  PermissionsAndroid,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Sound from 'react-native-sound';
import WordHighlight from './WordHighlight';

const Separator = () => <View style={styles.separator} />;

const text = 'This is beta functionality';

const App = () => {
  useEffect(() => {
    PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
      title: 'Cool Photo App Camera Permission',
      message:
        'Cool Photo App needs access to your camera ' +
        'so you can take awesome pictures.',
      buttonNeutral: 'Ask Me Later',
      buttonNegative: 'Cancel',
      buttonPositive: 'OK',
    });
    PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      {
        title: 'Cool Photo App Camera Permission',
        message:
          'Cool Photo App needs access to your camera ' +
          'so you can take awesome pictures.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );

    PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: 'Cool Photo App Camera Permission',
        message:
          'Cool Photo App needs access to your camera ' +
          'so you can take awesome pictures.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
  }, []);

  const [file, setFile] = useState('');
  const [result, setResult] = useState<SpeechResponse | undefined>(undefined);
  const state = useModuleState();
  const [handleState, setState] = useState<SpeechModuleState>('NONE');

  useEffect(() => {
    SpeechAce.setApiKey('--APIKEY--');
    SpeechAce.onVoice(onVoice);
    SpeechAce.onVoiceStart(onVoiceStart);
    SpeechAce.onVoiceEnd(onVoiceEnd);
    SpeechAce.onError(onSpeechError);
    SpeechAce.onSpeechRecognized(onSpeechRecognized);
    SpeechAce.onModuleStateChange(onModuleStateChange);
    return () => {
      SpeechAce.removeListeners();
    };
  }, []);

  const onSpeechError = (_error: ErrorEvent) => {
    console.log('onSpeechError: ', _error);
  };

  const onVoiceStart = () => {
    console.log('onVoiceStart');
  };

  const onVoice = (_event: VoiceEvent) => {
    console.log('onVoice', _event);
  };

  const onVoiceEnd = () => {
    console.log('onVoiceEnd: ');
  };

  const onSpeechRecognized = (_e: SpeechRecognizedEvent) => {
    console.log('onSpeechRecognized', _e);
    setFile(_e.filePath);
    if (_e.response.status === 'success') {
      setResult(_e.response);
    }
  };

  const onModuleStateChange = (e: StateChangeEvent) => {
    console.log('onModuleStateChange', e);
    setState(e.state);
  };

  const start = async () => {
    setResult(undefined);
    await SpeechAce.start(
      {
        user_id: 'test-speechace-user-id',
        dialect: 'en-us',
      },
      {
        text,
        include_fluency: 1,
        include_intonation: 1,
      },
      {
        audioLengthInSeconds: 15,
        actionForDatatype: 'text',
      }
    );
  };

  const stop = async () => {
    await SpeechAce.stop();
  };

  const cancel = async () => {
    await SpeechAce.cancel();
  };

  const play = async () => {
    const audioPlayer = new Sound(file, undefined, (error) => {
      if (error) {
        console.log(error);
      } else {
        audioPlayer.play(() => {
          audioPlayer.release();
        });
      }
    });
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={{ width: '100%' }}>
        <Text style={styles.title}>Try me: {text}</Text>
        <Text style={styles.title}>State handle: {handleState}</Text>
        <Text style={styles.title}>useModuleState: {state}</Text>
        <Button title="Press me to Start" onPress={start} />
      </View>
      <Separator />
      <View>
        <View style={styles.result}>
          {result?.textScore?.wordScoreList && (
            <WordHighlight words={result?.textScore?.wordScoreList} />
          )}
        </View>
        <Button title="Press to stop" color="#f194ff" onPress={stop} />
      </View>
      <Separator />
      <Button title="Press to Cancel" color="#F2994A" onPress={cancel} />
      <Separator />
      <View>
        <Button title="Press to Play" color="#f194ff" onPress={play} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  title: {
    textAlign: 'center',
    marginVertical: 8,
  },
  fixToText: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  separator: {
    marginVertical: 8,
    borderBottomColor: '#737373',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  result: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default App;
