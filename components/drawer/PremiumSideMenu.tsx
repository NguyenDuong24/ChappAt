import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';

type MenuAction = {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  onPress: () => void;
};

interface PremiumSideMenuProps {
  userName?: string;
  userAvatar?: string;
  isDarkMode?: boolean;
  onThemeToggle?: () => void;
  onClose: () => void;
  onSignOut: () => void;
  actions: MenuAction[];
}

const PremiumSideMenu = ({
  userName,
  userAvatar,
  isDarkMode = false,
  onThemeToggle,
  onClose,
  onSignOut,
  actions,
}: PremiumSideMenuProps) => {
  const initials = useMemo(() => {
    const name = (userName || '').trim();
    if (!name) return 'U';
    return name.charAt(0).toUpperCase();
  }, [userName]);

  return (
    <LinearGradient
      colors={['#0B6A52', '#0C5C47', '#0A4D3B']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <View style={styles.topRow}>
        <View style={styles.userWrap}>
          {userAvatar ? (
            <Image source={{ uri: userAvatar }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          <View>
            <Text style={styles.helloText}>Hello</Text>
            <Text style={styles.nameText} numberOfLines={1}>
              {userName || 'ChappAt User'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.85}>
          <BlurView intensity={30} tint="dark" style={styles.closeBlur}>
            <MaterialCommunityIcons name="close" size={20} color="#E8FFF7" />
          </BlurView>
        </TouchableOpacity>
      </View>

      <View style={styles.menuList}>
        {actions.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.menuItem}
            onPress={item.onPress}
            activeOpacity={0.84}
          >
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name={item.icon} size={20} color="#E7FFF6" />
            </View>
            <Text style={styles.itemLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.bottomWrap}>
        <View style={styles.themeRow}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="theme-light-dark" size={20} color="#E7FFF6" />
          </View>
          <Text style={styles.itemLabel}>Dark Mode</Text>
          <Switch
            value={isDarkMode}
            onValueChange={onThemeToggle}
            trackColor={{ false: 'rgba(255,255,255,0.28)', true: 'rgba(167,255,224,0.52)' }}
            thumbColor={isDarkMode ? '#E5FFF4' : '#FFFFFF'}
          />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={onSignOut} activeOpacity={0.9}>
          <MaterialCommunityIcons name="logout" size={20} color="#EDFFF8" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  userWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.44)',
  },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: {
    color: '#ECFFF9',
    fontSize: 16,
    fontWeight: '700',
  },
  helloText: {
    color: 'rgba(234,255,247,0.72)',
    fontSize: 12,
  },
  nameText: {
    color: '#EDFFF9',
    fontSize: 15,
    fontWeight: '700',
    maxWidth: 160,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  closeBlur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  menuList: {
    flex: 1,
    paddingTop: 10,
    gap: 5,
  },
  menuItem: {
    height: 45,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  iconWrap: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    color: '#ECFFF8',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
    flex: 1,
  },
  bottomWrap: {
    gap: 10,
    paddingTop: 8,
  },
  themeRow: {
    minHeight: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  logoutButton: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(5,34,28,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  logoutText: {
    color: '#EDFFF9',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default PremiumSideMenu;
