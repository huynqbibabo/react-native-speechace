import React, { useMemo } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import WordHighlight from './WordHighlight';
import { AudioPlayback } from './AudioPlayback';
import { useSpeechRecognizer } from 'react-native-speechace';

type Props = {
  text: string;
};
const Separator = () => <View style={styles.separator} />;

export const Item = (props: Props) => {
  const {
    state,
    start,
    stop,
    cancel,
    response,
    audioFile,
  } = useSpeechRecognizer({
    queryParams: {
      user_id: 'test-speechace-user-id',
      dialect: 'en-us',
    },
    formData: {
      text: props.text,
      include_fluency: 1,
      include_intonation: 1,
    },
    configs: {
      audioLengthInSeconds: 15,
      actionForDatatype: 'text',
    },
  });

  return useMemo(() => {
    return (
      <View style={styles.container}>
        <View style={{ width: '100%' }}>
          <Text style={[styles.title, { fontWeight: '600' }]}>
            Try me: {props.text}
          </Text>
          <Text style={styles.title}>Recorder state: {state}</Text>
        </View>
        <View
          style={{
            flexDirection: 'row',
            flex: 1,
            justifyContent: 'space-evenly',
            alignItems: 'center',
          }}
        >
          <Button title="Start" onPress={start} color={'#4F83CC'} />
          <Button title="Stop recording" color="#FF5C8D" onPress={stop} />
          <Button title="Cancel" color="#FFA040" onPress={cancel} />
        </View>
        <View>
          <View style={styles.result}>
            {response?.textScore?.wordScoreList && (
              <WordHighlight words={response?.textScore?.wordScoreList} />
            )}
          </View>
        </View>

        {audioFile && <AudioPlayback filePath={audioFile} />}
        <Separator />
      </View>
    );
  }, [
    audioFile,
    cancel,
    props.text,
    response?.textScore?.wordScoreList,
    start,
    state,
    stop,
  ]);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
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
    height: 1,
    width: '100%',
    borderBottomColor: '#737373',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  result: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
