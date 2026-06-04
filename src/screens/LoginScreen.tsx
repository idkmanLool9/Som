import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createAuthRequest, exchangeCode, parseCallbackUrl } from '../api/auth';
import { REDIRECT_URI } from '../api/constants';
import { Button, ErrorView, Loading } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';

// Rondt een eventuele openstaande auth-sessie netjes af (web/redirect).
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startLogin = async () => {
    setBusy(true);
    setError(null);
    try {
      const req = await createAuthRequest();
      // Opent een veilig inlogvenster (ASWebAuthenticationSession op iOS) dat de
      // somtoday:// redirect zelf herkent en de URL teruggeeft.
      const result = await WebBrowser.openAuthSessionAsync(req.authorizeUrl, REDIRECT_URI);

      if (result.type !== 'success' || !result.url) {
        // 'cancel'/'dismiss' = gebruiker sloot het venster; geen foutmelding.
        setBusy(false);
        return;
      }

      const callback = parseCallbackUrl(result.url);
      if (!callback) throw new Error('Geen inlogcode ontvangen van Somtoday.');
      if (callback.state && callback.state !== req.state) {
        throw new Error('Beveiligingscontrole mislukt (state komt niet overeen).');
      }

      const session = await exchangeCode(callback.code, req.verifier, req.tenantUuid);
      await signIn(session);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Inloggen mislukt');
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.hero}>
        <Text style={styles.logo}>Som</Text>
        <Text style={styles.subtitle}>
          Bekijk je cijfers, gemiddeldes en wat je nog moet halen.
        </Text>
      </View>

      <View style={styles.bottom}>
        {error ? (
          <View style={styles.errorWrap}>
            <ErrorView message={error} onRetry={startLogin} />
          </View>
        ) : busy ? (
          <Loading label="Bezig met inloggen…" />
        ) : (
          <>
            <Button title="Inloggen bij Somtoday" onPress={startLogin} />
            <Text style={styles.hint}>
              Je kiest je school en logt in op de echte Somtoday-pagina
              (ook SSO werkt). Je wachtwoord komt nooit in deze app.
            </Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
  },
  hero: { flex: 1, justifyContent: 'center' },
  logo: { fontSize: 64, fontWeight: '800', color: colors.primary },
  subtitle: { fontSize: 18, color: colors.textMuted, marginTop: spacing.sm },
  bottom: { paddingBottom: spacing.xl, minHeight: 160, justifyContent: 'flex-end' },
  errorWrap: { minHeight: 160 },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 19,
  },
});
