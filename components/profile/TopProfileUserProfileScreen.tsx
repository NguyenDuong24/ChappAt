import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Title, Paragraph, Divider } from 'react-native-paper';
import { Colors } from '@/constants/Colors';
import CustomImage from '../common/CustomImage';

const TopProfileUserProfileScreen = ({ user }) => {
  if (!user) {
    return null; 
  }

  return (
    <View>
      <View style={styles.coverPhotoContainer}>
        <CustomImage type={'cover'} source={user?.coverImage} style={styles.coverPhoto}></CustomImage>
      </View>

      <View style={styles.header}>
        <CustomImage source={user.profileUrl} style={styles.avatar}></CustomImage>
        <Title style={styles.name}>{user.username}</Title>
        
        <View style={styles.bioContainer}>
          <Paragraph style={styles.bio}>{user.bio || 'Chưa có mô tả nào'}</Paragraph>
        </View>
      </View>

      <Divider style={styles.divider} />

      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Title style={styles.statValue}>120</Title>
          <Paragraph style={styles.statLabel}>Bài viết</Paragraph>
        </View>
        <View style={styles.stat}>
          <Title style={styles.statValue}>350</Title>
          <Paragraph style={styles.statLabel}>Người theo dõi</Paragraph>
        </View>
        <View style={styles.stat}>
          <Title style={styles.statValue}>180</Title>
          <Paragraph style={styles.statLabel}>Đang theo dõi</Paragraph>
        </View>
      </View>
      <Divider style={styles.divider} />
    </View>
  );
};

const styles = StyleSheet.create({
  coverPhotoContainer: {
    height: 200,
    overflow: 'hidden',
    position: 'relative',
    marginTop: -20,
  },
  avatar: {
    height: 100,
    width: 100,
    borderRadius: 50,
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  header: {
    padding: 16,
    alignItems: 'center',
    marginTop: -65,
  },
  bioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  bio: {
    fontSize: 16,
    color: Colors.light.text,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    padding: 16,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.light.icon,
  },
  name: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  divider: {
    marginVertical: 16,
    backgroundColor: Colors.light.icon,
  },
});

export default TopProfileUserProfileScreen;
