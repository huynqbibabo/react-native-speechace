import SpeechAce, {
  SpeechErrorEvent,
  SpeechRecognizeEvent,
  VoiceEvent,
} from 'react-native-speechace';
import React, { useEffect } from 'react';
import {
  StyleSheet,
  Button,
  View,
  SafeAreaView,
  Text,
  PermissionsAndroid,
} from 'react-native';

const Separator = () => <View style={styles.separator} />;

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

  useEffect(() => {
    SpeechAce.setApiKey('key_____');
    SpeechAce.onVoice(onVoice);
    SpeechAce.onVoiceStart(onVoiceStart);
    SpeechAce.onVoiceEnd(onVoiceEnd);
    SpeechAce.onSpeechError(onSpeechError);
    SpeechAce.onSpeechRecognized(onSpeechRecognized);
    return () => {
      SpeechAce.removeListeners();
    };
  }, []);

  const onSpeechError = (_error: SpeechErrorEvent) => {
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

  const onSpeechRecognized = (_e: SpeechRecognizeEvent) => {
    console.log('onSpeechRecognized', _e);
  };

  const start = async () => {
    await SpeechAce.start(
      {
        userId: 'test-speechace-user-id',
      },
      {
        text: 'organization',
        audioFile:
          '/var/mobile/Containers/Data/Application/358F4344-5D0B-4082-AB80-7DEAEBD25BA1/Documents/1611420490062.363037.wav',
        includeFluency: 1,
        // includeIntonation: 1,
      }
    );
  };

  const stop = async () => {
    await SpeechAce.stop();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View>
        <Text style={styles.title}>
          The title and onPress handler are required. It is recommended to set
          accessibilityLabel to help make your app usable by everyone.
        </Text>
        <Button title="Press me to Start" onPress={start} />
      </View>
      <Separator />
      <View>
        <Text style={styles.title}>
          Adjust the color in a way that looks standard on each platform. On
          iOS, the color prop controls the color of the text. On Android, the
          color adjusts the background color of the button.
        </Text>
        <Button title="Press to stop" color="#f194ff" onPress={stop} />
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
});

export default App;
