import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native';
import { IconButton } from 'react-native-paper';
import { Badge } from 'react-native-paper';
import { formatTime } from '@/utils/common';

const PostCard = ({ post, onLike, onComment, onShare, onPress }) => {
  return (
    <View style={styles.container}>
      
      <Text style={styles.time}>{formatTime(post.timestamp)}</Text>
      <Text style={styles.paragraph}>{post.content}</Text>
      
      <TouchableOpacity onPress={() => console.log(post.id)}  style={styles.imageContainer}>
        <Image
          source={{ uri: post.image }}
          style={styles.image}
          resizeMode="cover" // Giữ nguyên tỷ lệ của ảnh và đảm bảo ảnh nằm trong khung
        />
      </TouchableOpacity>
      <View style={styles.content}>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => onLike(post.id)} style={styles.actionButton}>
            <IconButton icon="thumb-up" size={20} />
            <Text style={styles.actionText}>3</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onComment(post.id)} style={styles.actionButton}>
            <IconButton icon="comment" size={20} />
            <Text style={styles.actionText}>5</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onShare(post.id)} style={styles.actionButton}>
            <IconButton icon="share" size={20} />
            <Text style={styles.actionText}>{post.shares}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  imageContainer: {
    width: '100%',
    height: 250,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',

    borderRadius: 10,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'flex-end'
  },
  paragraph: {
    fontSize: 20,
    lineHeight: 26,
    marginBottom: 12
  },
  time: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8
  },
  actions: {
    width: '50%',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    marginLeft: 4,
    fontSize: 16,
    color: '#333',
  },
});

export default PostCard;
