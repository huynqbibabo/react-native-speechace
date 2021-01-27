import React from 'react';
import type { SyllableScore, WordScore } from 'react-native-speechace';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  words: WordScore[];
};

const getColorByScore = (score: number): string => {
  return score < 70
    ? '#F44336'
    : score > 70 && score < 80
    ? '#F2994A'
    : '#009FE0';
};

const WordHighlight: React.FunctionComponent<Props> = (props) => {
  return (
    <View style={styles.container}>
      {props.words?.map((word) => {
        return (
          <Text style={styles.text} key={word.word}>
            {word.syllableScoreList?.map(
              (syllableScore: SyllableScore, index: number) => (
                <Text
                  key={syllableScore.letters + index}
                  style={[
                    styles.text,
                    { color: getColorByScore(syllableScore.qualityScore) },
                  ]}
                >
                  {syllableScore.letters}
                </Text>
              )
            )}{' '}
          </Text>
        );
      })}
    </View>
  );
};

export default WordHighlight;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  text: {
    fontWeight: 'bold',
    fontSize: 18,
    lineHeight: 21,
  },
});
