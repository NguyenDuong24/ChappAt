import { View, StatusBar, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import React, { useEffect, useState, useContext } from 'react';
import EnhancedGroupList from '@/components/groups/EnhancedGroupList';
import EnhancedCreateGroupModal from '@/components/groups/EnhancedCreateGroupModal';
import { useAuth } from '@/context/authContext';
import { getDocs, query, where } from 'firebase/firestore';
import { groupsRef } from '@/firebaseConfig';
import { ThemeContext } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import Animated, { FadeIn } from 'react-native-reanimated';

export default function Groups() {
  const { user } = useAuth();
  const { theme } = useContext(ThemeContext);
  const currentThemeColors = theme === 'dark' ? Colors.dark : Colors.light;
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      getGroups();
    }
  }, [user]);

  const getGroups = async () => {
    try {
      setLoading(true);
      if (!user?.uid) {
        setGroups([]);
        return;
      }
      
      const q = query(
        groupsRef, 
        where('members', 'array-contains', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
      const sortedData = data.sort((a, b) => {
        const aTime = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
        const bTime = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
        return bTime - aTime;
      });
      
      setGroups(sortedData || []);
    } catch (error) {
      console.error("Error fetching groups: ", error);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = () => (
    <Animated.View 
      entering={FadeIn}
      style={[styles.header, { backgroundColor: currentThemeColors.backgroundHeader }]}
    >
      <View style={styles.headerContent}>
        <View style={styles.titleContainer}>
          <MaterialCommunityIcons 
            name="account-group" 
            size={28} 
            color="#667eea" 
          />
          <Text style={[styles.headerTitle, { color: currentThemeColors.text }]}>
            Nhóm Chat
          </Text>
        </View>
        
        <View style={styles.rightActions}>
          <View style={styles.groupCount}>
            <Text style={[styles.countText, { color: currentThemeColors.subtleText }]}>
              {groups.length} nhóm
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => {
              console.log('CreateGroup pressed -> opening modal');
              setShowCreateModal(true);
            }}
          >
            <MaterialCommunityIcons 
              name="plus" 
              size={24} 
              color="white" 
            />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: currentThemeColors.background }]}>
      <StatusBar
        backgroundColor={currentThemeColors.backgroundHeader}
        barStyle={theme === 'dark' ? 'light-content' : 'dark-content'}
      />
      
      <View style={styles.content}>
        <EnhancedGroupList
          currentUser={user}
          groups={groups}
          onRefresh={getGroups}
          listHeader={renderHeader()}
        />
      </View>
      
      <EnhancedCreateGroupModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onGroupCreated={(newGroup) => {
          setGroups(prev => [newGroup, ...prev]);
          setShowCreateModal(false);
        }}
        currentUser={user}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight || 20) + 10,
    paddingBottom: 12,
    paddingHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginLeft: 12,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupCount: {
    backgroundColor: '#f0f4ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#667eea',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  content: {
    flex: 1,
  },
});
