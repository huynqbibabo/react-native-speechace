import { usePlayer } from '../../src/hooks';
import React, { useMemo } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

type Props = {
  filePath: string;
};
export const AudioPlayback = (props: Props) => {
  const { playing, play, pause, stop, release } = usePlayer(props.filePath);

  return useMemo(
    () => (
      <View style={styles.container}>
        <Text style={{ marginTop: 20 }}>{props.filePath}</Text>
        <Text>Player State: {playing ? 'playing' : 'stop'}</Text>
        <View style={styles.actions}>
          <Button title="Play" color="#5E92F3" onPress={play} />
          <Button title="Pause" color="#FFB04C" onPress={pause} />
          <Button title="Stop" color="#F05545" onPress={stop} />
          <Button title="Release" color="#F05545" onPress={release} />
        </View>
      </View>
    ),
    [pause, play, playing, props.filePath, release, stop]
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
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
    borderBottomColor: '#737373',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  result: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
