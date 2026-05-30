import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function GroupFileManagerScreen() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('group_management.file_manager_title')}</Text>
      <Text style={styles.subtitle}>{t('group_management.file_manager_ready')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 8,
    opacity: 0.7,
  },
});
