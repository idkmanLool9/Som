import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import {
  createAuthRequest,
  exchangeCode,
  fetchSchools,
  parseCallbackUrl,
  type AuthRequest,
} from '../api/auth';
import type { School } from '../api/types';
import { Button, ErrorView, Loading } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing } from '../theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [schools, setSchools] = useState<School[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [auth, setAuth] = useState<AuthRequest | null>(null);
  const [exchanging, setExchanging] = useState(false);

  const loadSchools = () => {
    setError(null);
    setSchools(null);
    fetchSchools()
      .then(setSchools)
      .catch((e) => setError(e instanceof Error ? e.message : 'Onbekende fout'));
  };

  useEffect(loadSchools, []);

  const filtered = useMemo(() => {
    if (!schools) return [];
    const q = query.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter(
      (s) =>
        s.naam.toLowerCase().includes(q) || s.plaats.toLowerCase().includes(q)
    );
  }, [schools, query]);

  const startLogin = async (school: School) => {
    try {
      setError(null);
      const req = await createAuthRequest(school.uuid);
      setAuth(req);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kon login niet starten');
    }
  };

  const onNavChange = async (nav: WebViewNavigation) => {
    if (!auth || exchanging) return;
    const callback = parseCallbackUrl(nav.url);
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

  // WebView opent zodra een school is gekozen.
  const renderWebView = () => (
    <Modal visible animationType="slide" onRequestClose={() => setAuth(null)}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.webHeader}>
          <TouchableOpacity onPress={() => setAuth(null)}>
            <Text style={styles.cancel}>Annuleren</Text>
          </TouchableOpacity>
          <Text style={styles.webTitle}>Inloggen bij Somtoday</Text>
          <View style={{ width: 70 }} />
        </View>
        {exchanging ? (
          <Loading label="Bezig met inloggen…" />
        ) : (
          <WebView
            source={{ uri: auth!.authorizeUrl }}
            onShouldStartLoadWithRequest={(req) => {
              // Onderschep de somtoday:// deeplink i.p.v. hem te laten laden.
              if (parseCallbackUrl(req.url)) {
                void onNavChange(req as unknown as WebViewNavigation);
                return false;
              }
              return true;
            }}
            onNavigationStateChange={onNavChange}
            incognito
            startInLoadingState
            renderLoading={() => <Loading />}
          />
        )}
      </SafeAreaView>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.logo}>Som</Text>
        <Text style={styles.subtitle}>
          Bekijk je cijfers, gemiddeldes en wat je nog moet halen.
        </Text>
      </View>

      {error ? (
        <ErrorView message={error} onRetry={loadSchools} />
      ) : !schools ? (
        <Loading label="Scholen laden…" />
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Text style={styles.label}>Kies je school</Text>
          <TextInput
            style={styles.input}
            placeholder="Zoek op naam of plaats…"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          <FlatList
            data={filtered}
            keyExtractor={(s) => s.uuid}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.schoolRow} onPress={() => startLogin(item)}>
                <Text style={styles.schoolName}>{item.naam}</Text>
                {item.plaats ? <Text style={styles.schoolPlace}>{item.plaats}</Text> : null}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>Geen scholen gevonden voor “{query}”.</Text>
            }
          />
        </KeyboardAvoidingView>
      )}

      {auth ? renderWebView() : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { paddingTop: spacing.xl, paddingBottom: spacing.lg },
  logo: { fontSize: 40, fontWeight: '800', color: colors.primary },
  subtitle: { fontSize: 15, color: colors.textMuted, marginTop: spacing.xs },
  label: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.md,
  },
  schoolRow: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  schoolName: { fontSize: 16, fontWeight: '600', color: colors.text },
  schoolPlace: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  webHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  webTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  cancel: { color: colors.primary, fontSize: 16, width: 70 },
});
