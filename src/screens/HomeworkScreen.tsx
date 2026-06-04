import React from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorView, Loading } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useHomework, type HomeworkItem } from '../hooks/useHomework';
import { colors, radius, spacing } from '../theme';

const WEEKDAYS = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

function formatDateHeader(iso: string | null): string {
  if (!iso) return 'Zonder datum';
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export default function HomeworkScreen() {
  const { client } = useAuth();
  const { loading, error, items, reload } = useHomework(client);

  if (loading) return <Loading label="Huiswerk laden…" />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  // Groepeer per datum voor de SectionList.
  const byDate = new Map<string | null, HomeworkItem[]>();
  for (const item of items) {
    const list = byDate.get(item.date) ?? [];
    list.push(item);
    byDate.set(item.date, list);
  }
  const sections = [...byDate.entries()].map(([date, data]) => ({
    title: formatDateHeader(date),
    data,
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        onRefresh={reload}
        refreshing={loading}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.itemHeader}>
              {item.subject ? <Text style={styles.subject}>{item.subject}</Text> : null}
              {item.type ? <Text style={styles.type}>{item.type}</Text> : null}
            </View>
            <Text style={styles.itemTitle}>{item.title}</Text>
            {item.description ? (
              <Text style={styles.itemDesc}>{item.description}</Text>
            ) : null}
          </View>
        )}
        ListHeaderComponent={<Text style={styles.title}>Huiswerk</Text>}
        ListEmptyComponent={
          <Text style={styles.empty}>Geen huiswerk voor de komende weken 🎉</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textTransform: 'capitalize',
  },
  item: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  itemHeader: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  subject: { fontSize: 12, fontWeight: '800', color: colors.primary },
  type: { fontSize: 12, color: colors.textMuted },
  itemTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  itemDesc: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});
