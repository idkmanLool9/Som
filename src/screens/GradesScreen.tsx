import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { diagnose, getStudentId } from '../api/somtoday';
import { Button, ErrorView, Loading } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useGrades } from '../hooks/useGrades';
import { formatGrade, type SubjectGrades } from '../logic/grades';
import type { GradesStackParamList } from '../navigation/types';
import { colors, gradeColor, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<GradesStackParamList, 'GradesList'>;

export default function GradesScreen({ navigation }: Props) {
  const { client } = useAuth();
  const { loading, error, subjects, overall, student, reload } = useGrades(client);
  const [report, setReport] = useState<string | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);

  const runDiagnose = async () => {
    if (!client || !student) return;
    const id = getStudentId(student);
    if (!id) return;
    setDiagnosing(true);
    try {
      setReport(await diagnose(client, id));
    } catch (e) {
      setReport(e instanceof Error ? e.message : 'Diagnose mislukt');
    } finally {
      setDiagnosing(false);
    }
  };

  if (loading) return <Loading label="Cijfers laden…" />;
  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.errorScroll}>
          <ErrorView message={error} onRetry={reload} />
          <View style={styles.diagWrap}>
            <Button
              title={diagnosing ? 'Bezig…' : 'Diagnose verbinding'}
              variant="ghost"
              onPress={runDiagnose}
              disabled={diagnosing || !student}
            />
            {report ? (
              <View style={styles.reportBox}>
                <Text style={styles.reportHint}>
                  Houd ingedrukt om te kopiëren en stuur dit naar de ontwikkelaar:
                </Text>
                <Text selectable style={styles.reportText}>
                  {report}
                </Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        contentContainerStyle={styles.list}
        data={subjects}
        keyExtractor={(s) => s.subject}
        onRefresh={reload}
        refreshing={loading}
        ListHeaderComponent={
          <View style={styles.headerCard}>
            <Text style={styles.hi}>
              Hoi{student?.roepnaam ? ` ${student.roepnaam}` : ''} 👋
            </Text>
            <Text style={styles.overallLabel}>Gemiddelde over alle vakken</Text>
            <Text style={[styles.overall, { color: gradeColor(overall) }]}>
              {formatGrade(overall, 2)}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <SubjectRow
            subject={item}
            onPress={() => navigation.navigate('SubjectDetail', { subject: item })}
          />
        )}
        ListEmptyComponent={
          <View>
            <Text style={styles.empty}>Nog geen cijfers gevonden.</Text>
            <View style={styles.diagWrap}>
              <Button
                title={diagnosing ? 'Bezig…' : 'Diagnose verbinding'}
                variant="ghost"
                onPress={runDiagnose}
                disabled={diagnosing || !student}
              />
              {report ? (
                <View style={styles.reportBox}>
                  <Text style={styles.reportHint}>
                    Houd ingedrukt om te kopiëren en plak dit in de chat:
                  </Text>
                  <Text selectable style={styles.reportText}>
                    {report}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function SubjectRow({
  subject,
  onPress,
}: {
  subject: SubjectGrades;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowLeft}>
        <Text style={styles.subjectName} numberOfLines={1}>
          {subject.subjectName}
        </Text>
        <Text style={styles.count}>
          {subject.grades.length} {subject.grades.length === 1 ? 'cijfer' : 'cijfers'}
        </Text>
      </View>
      <View style={[styles.badge, { backgroundColor: gradeColor(subject.average) }]}>
        <Text style={styles.badgeText}>{formatGrade(subject.average)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  errorScroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  diagWrap: { marginTop: spacing.xl },
  reportBox: {
    marginTop: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  reportHint: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.sm },
  reportText: { fontSize: 12, color: colors.text, fontFamily: 'Courier' },
  list: { padding: spacing.lg },
  headerCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  hi: { color: '#fff', fontSize: 18, fontWeight: '700' },
  overallLabel: { color: '#dbeafe', marginTop: spacing.md, fontSize: 13 },
  overall: { fontSize: 44, fontWeight: '800', backgroundColor: '#fff', alignSelf: 'flex-start', paddingHorizontal: spacing.md, borderRadius: radius.sm, overflow: 'hidden', marginTop: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  rowLeft: { flex: 1, marginRight: spacing.md },
  subjectName: { fontSize: 16, fontWeight: '600', color: colors.text },
  count: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  badge: {
    minWidth: 52,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
});
