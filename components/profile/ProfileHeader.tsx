import React from 'react';
import { StyleSheet, View, Image, Dimensions } from 'react-native';
import { Avatar, Title, Paragraph, Card, Button, Divider, IconButton, Menu, Provider } from 'react-native-paper';


const ProfileHeader = ({ onEditProfile, user }) => (
  
  <View>
    {/* Ảnh bìa */}
    <View style={styles.coverPhotoContainer}>
      <Image
        source={{ uri: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRSOpH_l_mimlUGRouXcGnFY_-54ddnpsU7Zw&s' }} // Link ảnh bìa từ người dùng
        style={styles.coverPhoto}
      />
      <IconButton
        icon="dots-vertical"
        size={24}
        color="white"
        style={styles.settingsButton}
        onPress={() => console.log('Settings pressed')}
      />
    </View>

    {/* Ảnh đại diện và thông tin cá nhân */}
    <View style={styles.header}>
      <View style={styles.avatarContainer}>
        <Avatar.Image size={100} source={{ uri: user.profileUrl }} />
      </View>
      <Title style={styles.name}>{user.username}</Title>
      <Paragraph style={styles.bio}>Front-End Developer | Tech Enthusiast | Music Lover</Paragraph>
    </View>

    <Divider style={styles.divider} />

    <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Title style={styles.statValue}>120</Title>
          <Paragraph style={styles.statLabel}>Posts</Paragraph>
        </View>
        <View style={styles.stat}>
          <Title style={styles.statValue}>350</Title>
          <Paragraph style={styles.statLabel}>Followers</Paragraph>
        </View>
        <View style={styles.stat}>
          <Title style={styles.statValue}>180</Title>
          <Paragraph style={styles.statLabel}>Following</Paragraph>
        </View>
      </View>

    <Button mode="contained" style={styles.button} onPress={onEditProfile}>
      Edit Profile
    </Button>
    
    <Divider style={styles.divider} />
  </View>
);

const styles = StyleSheet.create({
  coverPhotoContainer: {
    height: 200, // Chiều cao của ảnh bìa
    overflow: 'hidden', // Đảm bảo ảnh không bị tràn ra ngoài container
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover', // Điều chỉnh ảnh bìa để bao phủ toàn bộ khu vực
  },
  settingsButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  header: {
    padding: 16,
    alignItems: 'center',
    marginTop: -50, // Đẩy ảnh đại diện lên trên ảnh bìa
  },
  avatarContainer: {
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
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  avatar: {},
  name: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: 'bold',
  },
  bio: {
    marginTop: 4,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  divider: {
    marginVertical: 16,
  },
  card: {
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
    alignSelf: 'center',
  },
});

export default ProfileHeader;
