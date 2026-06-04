import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import {
  createAuthRequest,
  exchangeCode,
  parseCallbackUrl,
  type AuthRequest,
} from '../api/auth';
import { Button, ErrorView, Loading } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { colors, spacing } from '../theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [auth, setAuth] = useState<AuthRequest | null>(null);
  const [exchanging, setExchanging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startLogin = async () => {
    try {
      setError(null);
      setAuth(await createAuthRequest());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kon login niet starten');
    }
  };

  const handleUrl = async (url: string) => {
    if (!auth || exchanging) return;
    const callback = parseCallbackUrl(url);
    if (!callback) return;
    setExchanging(true);
    try {
      if (callback.state && callback.state !== auth.state) {
        throw new Error('Beveiligingscontrole mislukt (state komt niet overeen).');
      }
      const session = await exchangeCode(callback.code, auth.verifier, auth.tenantUuid);
      setAuth(null);
      await signIn(session);
    } catch (e) {
      setAuth(null);
      setError(e instanceof Error ? e.message : 'Inloggen mislukt');
    } finally {
      setExchanging(false);
    }
  };

  // Tijdens de WebView-login.
  if (auth) {
    return (
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.webHeader}>
          <TouchableOpacity onPress={() => setAuth(null)}>
            <Text style={styles.cancel}>Annuleren</Text>
          </TouchableOpacity>
          <Text style={styles.webTitle}>Inloggen bij Somtoday</Text>
          <View style={{ width: 80 }} />
        </View>
        {exchanging ? (
          <Loading label="Bezig met inloggen…" />
        ) : (
          <WebView
            source={{ uri: auth.authorizeUrl }}
            originWhitelist={['*']}
            setSupportMultipleWindows={false}
            onShouldStartLoadWithRequest={(req) => {
              // Onderschep de somtoday:// deeplink i.p.v. hem te laten laden.
              if (parseCallbackUrl(req.url)) {
                void handleUrl(req.url);
                return false;
              }
              return true;
            }}
            onNavigationStateChange={(nav: WebViewNavigation) => void handleUrl(nav.url)}
            onError={(e) => {
              // iOS kan een mislukte custom-scheme-load melden i.p.v. hem te
              // onderscheppen; vang de code dan alsnog uit de fout-URL.
              const url = e.nativeEvent.url;
              if (url && parseCallbackUrl(url)) void handleUrl(url);
            }}
            incognito
            startInLoadingState
            renderLoading={() => <Loading />}
          />
        )}
      </SafeAreaView>
    );
  }

  // Startscherm.
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
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    justifyContent: 'space-between',
  },
  hero: { flex: 1, justifyContent: 'center' },
  logo: { fontSize: 64, fontWeight: '800', color: colors.primary },
  subtitle: { fontSize: 18, color: colors.textMuted, marginTop: spacing.sm },
  bottom: { paddingBottom: spacing.xl },
  errorWrap: { minHeight: 160 },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 19,
  },
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  webTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  cancel: { color: colors.primary, fontSize: 16, width: 80 },
});
