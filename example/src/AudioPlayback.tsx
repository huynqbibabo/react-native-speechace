import { usePlayer } from '../../src/hooks';
import React, { useMemo } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

type Props = {
  filePath: string;
};
export const AudioPlayback = (props: Props) => {
  const { playing, play, pause, stop } = usePlayer(props.filePath);

  return useMemo(
    () => (
      <View style={styles.container}>
        <Text>{props.filePath}</Text>
        <Text>State: {playing ? 'playing' : 'stop'}</Text>
        <View style={styles.actions}>
          <Button title="Play" color="#5E92F3" onPress={play} />
          <Button title="Pause" color="#FFB04C" onPress={pause} />
          <Button title="Stop" color="#F05545" onPress={stop} />
        </View>
      </View>
    ),
    [pause, play, playing, props.filePath, stop]
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
});
