import React, { useState } from 'react';
import { StyleSheet, View, Image, TextInput, TouchableOpacity } from 'react-native';
import { Avatar, Title, Paragraph, Divider } from 'react-native-paper';
import { AntDesign } from '@expo/vector-icons';
import { db } from '@/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { Colors } from '@/constants/Colors';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import CustomImage from '../common/CustomImage'

const TopProfile = ({ onEditProfile, user, handleLogout }) => {
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bio, setBio] = useState(user?.bio || '');
  const router = useRouter();
  const handleSaveBio = async () => {
    try {
      if (user && user.uid) {
        const userDoc = doc(db, 'users', user.uid);
        await updateDoc(userDoc, { bio });
        setIsEditingBio(false);
      }
    } catch (error) {
      console.error('Error updating bio:', error);
    }
  };

  if (!user) {
    return null; 
  }

  return (
    <View>
      <View style={styles.coverPhotoContainer}>
        <CustomImage type={'cover'} source={user?.coverImage} style={styles.coverPhoto}></CustomImage>
          <TouchableOpacity onPress={ ()=>{
            router.push('/profile/settings')
          }} style={styles.settingsButton}>
            <Feather name="settings" size={24} color="white" />
          </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <CustomImage source={user.profileUrl} style={styles.avatar}></CustomImage>
        {/* <Avatar.Image size={100} source={{ uri: user.profileUrl }} /> */}
        <Title style={styles.name}>{user.username}</Title>
        
        <View style={styles.bioContainer}>
          {isEditingBio ? (
            <TextInput
              style={styles.bioInput}
              value={bio}
              onChangeText={setBio}
              autoFocus
            />
          ) : (
            <Paragraph style={styles.bio}>{bio || 'No bio available'}</Paragraph>
          )}
          <TouchableOpacity
            onPress={() => (isEditingBio ? handleSaveBio() : setIsEditingBio(true))}
            style={styles.editIcon}
          >
            <AntDesign name={isEditingBio ? 'check' : 'edit'} size={13} color={Colors.light.icon} />
          </TouchableOpacity>
        </View>
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
  settingsButton: {
    position: 'absolute',
    top: 25,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',  // Làm nút trong suốt để dễ nhìn trên hình
    padding: 8,
    borderRadius: 50,
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
  bioInput: {
    fontSize: 16,
    color: Colors.light.text,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.icon,
    width: '80%',
  },
  editIcon: {
    marginLeft: 8,
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

export default TopProfile;
