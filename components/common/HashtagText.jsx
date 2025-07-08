import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';

const HashtagText = ({ text, onHashtagPress, textStyle, hashtagStyle }) => {
  const regex = /#[a-zA-Z0-9_]+/g;
  const parts = text.split(regex);
  const matches = text.match(regex);

  let content = [];
  parts.forEach((part, index) => {
    content.push(
      <Text key={`text-${index}`} style={[textStyle]}>
        {part}
      </Text>
    );
    if (matches && matches[index]) {
      content.push(
        <TouchableOpacity key={`hashtag-${index}`} onPress={() => onHashtagPress(matches[index])}>
          <Text style={[hashtagStyle]}>
            {matches[index]}
          </Text>
        </TouchableOpacity>
      );
    }
  });

  return <Text style={textStyle}>{content}</Text>;
};


export default HashtagText;
