import SpeechAce, {
  ErrorEvent,
  SpeechRecognizedEvent,
  useSpeechRecognizer,
  VoiceEvent,
} from 'react-native-speechace';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  FlatList,
  PermissionsAndroid,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import WordHighlight from './WordHighlight';
import { AudioPlayback } from './AudioPlayback';

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

  const [files, setFile] = useState<string[]>([
    'https://cdn.bibabo.vn/audio/v2/3/3e/3e7t1cwpx8m78haaaaa.mp3',
  ]);
  // const [result, setResult] = useState<SpeechResponse | undefined>(undefined);
  // const state = useModuleState();
  // const [handleState, setState] = useState<SpeechModuleState>('NONE');
  //
  const onSpeechRecognized = useCallback(
    (_e: SpeechRecognizedEvent) => {
      console.log('onSpeechRecognized', _e);
      setFile([...files, _e.filePath]);
    },
    [files]
  );

  useEffect(() => {
    const subscriber = SpeechAce.addListener(
      'onSpeechRecognized',
      onSpeechRecognized
    );
    return () => {
      subscriber.remove();
    };
  }, [onSpeechRecognized]);

  useEffect(() => {
    SpeechAce.setApiKey('--APIKEY--');
    SpeechAce.onVoice(onVoice);
    SpeechAce.onVoiceStart(onVoiceStart);
    SpeechAce.onVoiceEnd(onVoiceEnd);
    SpeechAce.onError(onSpeechError);
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

  // const start = async () => {
  //   setResult(undefined);
  //   await SpeechAce.start(
  //     0,
  //     {
  //       user_id: 'test-speechace-user-id',
  //       dialect: 'en-us',
  //     },
  //     {
  //       text,
  //       include_fluency: 1,
  //       include_intonation: 1,
  //     },
  //     {
  //       audioLengthInSeconds: 15,
  //       actionForDatatype: 'text',
  //     }
  //   );
  // };
  //
  // const stop = async () => {
  //   await SpeechAce.stop();
  // };
  //
  // const cancel = async () => {
  //   await SpeechAce.cancel();
  // };

  const { state, start, stop, cancel, response } = useSpeechRecognizer({
    queryParams: {
      user_id: 'test-speechace-user-id',
      dialect: 'en-us',
    },
    formData: {
      text,
      include_fluency: 1,
      include_intonation: 1,
    },
    configs: {
      audioLengthInSeconds: 15,
      actionForDatatype: 'text',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ width: '100%' }}>
        <Text style={[styles.title, { fontWeight: '600' }]}>
          Try me: {text}
        </Text>
        <Text style={styles.title}>State handle: {state}</Text>
        <Text style={styles.title}>useModuleState: {state}</Text>
        <Button title="Press me to Start" onPress={start} color={'#4F83CC'} />
      </View>
      <Separator />
      <View>
        <View style={styles.result}>
          {response?.textScore?.wordScoreList && (
            <WordHighlight words={response?.textScore?.wordScoreList} />
          )}
        </View>
        <Button title="Press to stop" color="#FF5C8D" onPress={stop} />
      </View>
      <Separator />
      <Button title="Press to Cancel" color="#FFA040" onPress={cancel} />
      <Separator />
      <FlatList
        style={{ flex: 1 }}
        data={files}
        keyExtractor={(item) => item}
        renderItem={({ item }) => <AudioPlayback filePath={item} />}
      />
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
