import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { FeatureDrawerKey } from './AppDrawer';

type FeatureDrawerButtonsProps = {
  onOpenFeatureDrawer: (key: FeatureDrawerKey) => void;
  compact?: boolean;
};

const actions: Array<{
  key: FeatureDrawerKey;
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}> = [
  { key: 'notification', label: 'Notify', icon: 'bell-badge-outline' },
  { key: 'chatSearch', label: 'Chat', icon: 'message-text-outline' },
  { key: 'groupSearch', label: 'Group', icon: 'account-group-outline' },
  { key: 'addFriend', label: 'Friend', icon: 'account-plus-outline' },
];

const FeatureDrawerButtons = ({ onOpenFeatureDrawer, compact = false }: FeatureDrawerButtonsProps) => {
  const cardStyle = useMemo(() => [styles.container, compact && styles.containerCompact], [compact]);

  return (
    <View style={cardStyle}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {actions.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => onOpenFeatureDrawer(item.key)}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
          >
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name={item.icon} size={16} color="#EDFFF8" />
            </View>
            <Text style={styles.label}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(233,255,247,0.3)',
    backgroundColor: 'rgba(8,78,60,0.56)',
    overflow: 'hidden',
  },
  containerCompact: {
    marginHorizontal: 14,
    marginTop: 2,
  },
  row: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
  },
  item: {
    minWidth: 74,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(233,255,247,0.24)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  itemPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }],
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  label: {
    color: '#EDFFF8',
    fontSize: 11,
    fontWeight: '700',
  },
});

export default React.memo(FeatureDrawerButtons);
