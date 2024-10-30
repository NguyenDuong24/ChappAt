import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Image, TextInput, TouchableOpacity } from 'react-native';
import { Avatar, Title, Paragraph, Divider, IconButton, Menu, Provider } from 'react-native-paper';
import { AntDesign } from '@expo/vector-icons';
import { db } from '@/firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import { Colors } from '@/constants/Colors';

const TopProfile = ({ onEditProfile, user, handleLogout }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bio, setBio] = useState(user?.bio || '');

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

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
    <Provider>
      <View>
        <View style={styles.coverPhotoContainer}>
          <Image
            source={{
              uri: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRSOpH_l_mimlUGRouXcGnFY_-54ddnpsU7Zw&s',
            }}
            style={styles.coverPhoto}
          />
          <Menu
            visible={menuVisible}
            onDismiss={closeMenu}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={30}
                style={styles.settingsButton}
                onPress={openMenu}
              />
            }
          >
            <Menu.Item
              icon="logout"
              onPress={() => {
                closeMenu();
                handleLogout();
              }}
              title="Log Out"
              titleStyle={{ color: Colors.light.text }}
            />
          </Menu>
        </View>

        {/* Profile Picture and Info */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Avatar.Image size={100} source={{ uri: user.profileUrl }} />
          </View>
          <Title style={styles.name}>{user.username}</Title>
          
          {/* Bio Section */}
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

        {/* Stats Section */}
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
    </Provider>
  );
};

const styles = StyleSheet.create({
  coverPhotoContainer: {
    height: 200,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  settingsButton: {
    position: 'absolute',
    top: 20,
    right: 10,
  },
  header: {
    padding: 16,
    alignItems: 'center',
    marginTop: -50,
  },
  avatarContainer: {},
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
