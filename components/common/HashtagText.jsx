import React, { useMemo, memo } from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';

const HashtagText = ({ text, onHashtagPress, textStyle, hashtagStyle }) => {
  const content = useMemo(() => {
    if (!text) return null;
    const regex = /#[a-zA-Z0-9_]+/g;
    const parts = text.split(regex);
    const matches = text.match(regex);

    let result = [];
    parts.forEach((part, index) => {
      if (part) {
        result.push(
          <Text key={`text-${index}`} style={textStyle}>
            {part}
          </Text>
        );
      }
      if (matches && matches[index]) {
        result.push(
          <Text
            key={`hashtag-${index}`}
            onPress={() => onHashtagPress(matches[index])}
            style={hashtagStyle}
          >
            {matches[index]}
          </Text>
        );
      }
    });
    return result;
  }, [text, onHashtagPress, textStyle, hashtagStyle]);

  return <Text style={textStyle}>{content}</Text>;
};

export default memo(HashtagText);
