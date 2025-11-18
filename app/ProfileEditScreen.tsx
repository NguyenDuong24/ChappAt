import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import interestsData from '../assets/data/interests.json';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { useAuth } from '@/context/authContext';
import { getInterestsArray, getIdForInterest, getLabelForInterest, normalizeInterestsArray } from '../utils/interests';

const { width } = Dimensions.get('window');

interface UserProfile {
  name: string;
  age: number;
  bio: string;
  images: string[];
  location: string;
  interests: string[];
  occupation: string;
  education: string;
  height: string;
  lookingFor: string;
}

const ProfileEditScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({
    name: 'Alex',
    age: 25,
    bio: 'Love adventures and good coffee ☕✈️',
    images: [
      'https://picsum.photos/400/600?random=10',
      'https://picsum.photos/400/600?random=11',
      'https://picsum.photos/400/600?random=12',
    ],
    location: 'Ho Chi Minh City',
    // Default interests (example) using ids/labels
    interests: [
      getIdForInterest('travel'),
      getIdForInterest('coffee'),
      getIdForInterest('photography'),
      getIdForInterest('music'),
    ],
    occupation: 'Software Developer',
    education: 'University of Technology',
    height: '175 cm',
    lookingFor: 'Long-term relationship',
  });

  const [editingBio, setEditingBio] = useState(false);
  const [tempBio, setTempBio] = useState(profile.bio);

  // Ensure we have an array for interests to use
  const interestItems = getInterestsArray();

  const saveBio = () => {
    setProfile({ ...profile, bio: tempBio });
    setEditingBio(false);
  };

  const addInterest = async () => {
    // Present a quick action sheet-style add modal — but here keep a simple prompt
    // For simplicity, toggle first non-selected interest
    const nextInterest = interestItems.map(i => i.id).find(i => !profile.interests.includes(i));
    if (!nextInterest) return;

    const newInterests = [...profile.interests, nextInterest];
    setProfile({ ...profile, interests: newInterests });

    // Persist to Firestore if user is logged in
    try {
      const uid = user?.uid || null;
      if (uid) {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, { interests: newInterests });
      }
    } catch (error) {
      console.warn('Failed to save user interests to Firestore', error);
    }
  };

  const removeInterest = async (interest: string) => {
    const newInterests = profile.interests.filter(i => i !== interest);
    setProfile({ ...profile, interests: newInterests });

    // Persist
    try {
      const uid = user?.uid || null;
      if (uid) {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, { interests: newInterests });
      }
    } catch (error) {
      console.warn('Failed to update user interests in Firestore', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#0F001A', '#2D0A4E']} style={StyleSheet.absoluteFill} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity>
          <MaterialIcons name="check" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Photo Section */}
        <View style={styles.photoSection}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {profile.images.map((image, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image source={{ uri: image }} style={styles.photo} />
                <TouchableOpacity style={styles.photoEditButton}>
                  <MaterialIcons name="edit" size={16} color="white" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addPhotoButton}>
              <MaterialIcons name="add" size={32} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Info</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <TextInput
              style={styles.infoInput}
              value={profile.name}
              onChangeText={(text) => setProfile({ ...profile, name: text })}
            />
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Age</Text>
            <TextInput
              style={styles.infoInput}
              value={profile.age.toString()}
              onChangeText={(text) => setProfile({ ...profile, age: parseInt(text) || 0 })}
              keyboardType="numeric"
            />
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Location</Text>
            <TextInput
              style={styles.infoInput}
              value={profile.location}
              onChangeText={(text) => setProfile({ ...profile, location: text })}
            />
          </View>
        </View>

        {/* Bio Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>About Me</Text>
            <TouchableOpacity
              onPress={() => editingBio ? saveBio() : setEditingBio(true)}
            >
              <MaterialIcons 
                name={editingBio ? "check" : "edit"} 
                size={20} 
                color="#8A4AF3" 
              />
            </TouchableOpacity>
          </View>
          
          {editingBio ? (
            <TextInput
              style={styles.bioInput}
              value={tempBio}
              onChangeText={setTempBio}
              multiline
              placeholder="Tell others about yourself..."
              placeholderTextColor="rgba(255,255,255,0.5)"
            />
          ) : (
            <Text style={styles.bioText}>{profile.bio}</Text>
          )}
        </View>

        {/* Interests */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Interests</Text>
            <TouchableOpacity onPress={addInterest}>
              <MaterialIcons name="add" size={20} color="#8A4AF3" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.interestsContainer}>
            {profile.interests.map((interest, index) => (
              <View key={index} style={styles.interestChip}>
                <Text style={styles.interestText}>{getLabelForInterest(interest)}</Text>
                <TouchableOpacity
                  onPress={() => removeInterest(interest)}
                  style={styles.removeInterestButton}
                >
                  <MaterialIcons name="close" size={16} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Additional Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Details</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Occupation</Text>
            <TextInput
              style={styles.infoInput}
              value={profile.occupation}
              onChangeText={(text) => setProfile({ ...profile, occupation: text })}
            />
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Education</Text>
            <TextInput
              style={styles.infoInput}
              value={profile.education}
              onChangeText={(text) => setProfile({ ...profile, education: text })}
            />
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Height</Text>
            <TextInput
              style={styles.infoInput}
              value={profile.height}
              onChangeText={(text) => setProfile({ ...profile, height: text })}
            />
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Looking For</Text>
            <TextInput
              style={styles.infoInput}
              value={profile.lookingFor}
              onChangeText={(text) => setProfile({ ...profile, lookingFor: text })}
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton}>
          <LinearGradient
            colors={['#8A4AF3', '#5D3FD3']}
            style={styles.saveButtonGradient}
          >
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F001A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  content: {
    flex: 1,
  },
  photoSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  photoContainer: {
    position: 'relative',
    marginLeft: 20,
  },
  photo: {
    width: 120,
    height: 150,
    borderRadius: 12,
  },
  photoEditButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  addPhotoButton: {
    width: 120,
    height: 150,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderStyle: 'dashed',
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
  },
  infoInput: {
    flex: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: 'white',
    fontSize: 16,
  },
  bioInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    color: 'white',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  bioText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 24,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(138,74,243,0.3)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  interestText: {
    color: 'white',
    fontSize: 14,
    marginRight: 6,
  },
  removeInterestButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    padding: 2,
  },
  saveButton: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomSpace: {
    height: 40,
  },
});

export default ProfileEditScreen;
