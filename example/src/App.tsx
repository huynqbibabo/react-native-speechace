import SpeechAce, { SpeechRecognizedEvent } from 'react-native-speechace';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  FlatList,
  PermissionsAndroid,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';
import { AudioPlayback } from './AudioPlayback';
import { Item } from './Item';

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

  const [files] = useState<any[]>([
    {
      text: 'Cool Photo App needs access to your camera',
    },
    {
      text: 'This is beta functionality',
    },
    {
      text: 'pictures',
    },
  ]);

  const [state, setState] = useState<any[]>([]);
  const onSpeechRecognized = useCallback(
    (_e: SpeechRecognizedEvent) => {
      console.log('onSpeechRecognized', _e);
      setState([...state, _e.filePath]);
    },
    [state]
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
    return () => {
      SpeechAce.clear();
    };
  }, []);

  const clear = async () => {
    await SpeechAce.clear();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View>
        <Button title="Clear all" onPress={clear} color={'#4F83CC'} />
      </View>
      <FlatList
        extraData={state.length}
        ListHeaderComponent={
          <AudioPlayback
            filePath={
              'https://cdn.bibabo.vn/audio/v2/3/3e/3e7t1cwpx8m78haaaaa.mp3'
            }
          />
        }
        style={{ flex: 1 }}
        data={files}
        keyExtractor={(_item, index) => index + ''}
        renderItem={({ item }) => <Item text={item.text} />}
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
});

export default App;
