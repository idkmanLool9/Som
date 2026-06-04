import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';

export default function AccountScreen() {
  const { signOut, session } = useAuth();

  const confirmSignOut = () => {
    Alert.alert('Uitloggen', 'Weet je zeker dat je wilt uitloggen?', [
      { text: 'Annuleren', style: 'cancel' },
      { text: 'Uitloggen', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Account</Text>

        <Card>
          <Text style={styles.label}>Verbonden met Somtoday</Text>
          <Text style={styles.value}>{session?.apiUrl ?? '—'}</Text>
        </Card>

        <Card>
          <Text style={styles.about}>
            Som is een onofficiële app en heeft geen banden met Topicus/Somtoday.
            Je gegevens worden alleen op dit toestel bewaard en rechtstreeks met
            Somtoday uitgewisseld.
          </Text>
        </Card>

        <View style={{ marginTop: spacing.lg }}>
          <Button title="Uitloggen" onPress={confirmSignOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: spacing.lg },
  label: { fontSize: 13, color: colors.textMuted },
  value: { fontSize: 16, color: colors.text, marginTop: spacing.xs },
  about: { fontSize: 14, color: colors.textMuted, lineHeight: 21 },
});
