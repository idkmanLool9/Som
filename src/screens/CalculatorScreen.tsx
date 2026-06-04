import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, ErrorView, Loading } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useGrades } from '../hooks/useGrades';
import { gradeNeeded, projectedAverage } from '../logic/calculator';
import { formatGrade, parseDutchNumber, type Grade } from '../logic/grades';
import { colors, gradeColor, radius, spacing } from '../theme';

export default function CalculatorScreen() {
  const { client } = useAuth();
  const { loading, error, subjects, reload } = useGrades(client);
  const [selected, setSelected] = useState<string | null>(null);
  const [weightText, setWeightText] = useState('1');
  const [targetText, setTargetText] = useState('5,5');
  const [previewText, setPreviewText] = useState('');

  const subject = useMemo(
    () => subjects.find((s) => s.subject === selected) ?? subjects[0],
    [subjects, selected]
  );

  if (loading) return <Loading label="Cijfers laden…" />;
  if (error) return <ErrorView message={error} onRetry={reload} />;

  const grades: Grade[] = subject?.grades ?? [];
  const upcomingWeight = parseDutchNumber(weightText) ?? 0;
  const target = parseDutchNumber(targetText) ?? 5.5;
  const previewGrade = parseDutchNumber(previewText);

  let calc = null as ReturnType<typeof gradeNeeded> | null;
  if (subject && upcomingWeight > 0) {
    try {
      calc = gradeNeeded({ grades, upcomingWeight, target });
    } catch {
      calc = null;
    }
  }

  const projected =
    subject && upcomingWeight > 0 && previewGrade !== null
      ? projectedAverage(grades, previewGrade, upcomingWeight)
      : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Cijfercalculator</Text>
        <Text style={styles.subtitle}>
          Kies een vak en zie wat je moet halen op je volgende toets.
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chips}
          contentContainerStyle={styles.chipsContent}
        >
          {subjects.map((s) => {
            const active = s.subject === subject?.subject;
            return (
              <TouchableOpacity
                key={s.subject}
                onPress={() => setSelected(s.subject)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {s.subject}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {subject ? (
          <>
            <Card>
              <View style={styles.statRow}>
                <View>
                  <Text style={styles.statLabel}>{subject.subjectName}</Text>
                  <Text style={styles.statSub}>Huidig gemiddelde</Text>
                </View>
                <Text style={[styles.statValue, { color: gradeColor(subject.average) }]}>
                  {formatGrade(subject.average)}
                </Text>
              </View>
            </Card>

            <Card>
              <View style={styles.inputRow}>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Weging toets</Text>
                  <TextInput
                    style={styles.input}
                    value={weightText}
                    onChangeText={setWeightText}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputCol}>
                  <Text style={styles.inputLabel}>Streefgemiddelde</Text>
                  <TextInput
                    style={styles.input}
                    value={targetText}
                    onChangeText={setTargetText}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {calc ? (
                <View style={styles.resultBox}>
                  {calc.alreadySecured ? (
                    <Text style={styles.resultGood}>
                      Al binnen! Zelfs een 1 is genoeg. 🎉
                    </Text>
                  ) : !calc.possible ? (
                    <Text style={styles.resultBad}>
                      Niet haalbaar: je zou een {formatGrade(calc.needed)} nodig hebben.
                    </Text>
                  ) : (
                    <Text style={styles.resultText}>
                      Nodig:{' '}
                      <Text style={[styles.resultGrade, { color: gradeColor(calc.needed) }]}>
                        {formatGrade(calc.needed)}
                      </Text>
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.hint}>Vul een weging groter dan 0 in.</Text>
              )}
            </Card>

            <Card>
              <Text style={styles.inputLabel}>
                Stel: ik haal dit cijfer op de volgende toets…
              </Text>
              <TextInput
                style={styles.input}
                value={previewText}
                onChangeText={setPreviewText}
                keyboardType="numeric"
                placeholder="bv. 7,0"
                placeholderTextColor={colors.textMuted}
              />
              {projected !== null ? (
                <Text style={styles.projected}>
                  Dan wordt je gemiddelde{' '}
                  <Text style={[styles.resultGrade, { color: gradeColor(projected) }]}>
                    {formatGrade(projected)}
                  </Text>
                </Text>
              ) : null}
            </Card>
          </>
        ) : (
          <Text style={styles.hint}>Nog geen vakken met cijfers gevonden.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
  chips: { marginBottom: spacing.lg, flexGrow: 0 },
  chipsContent: { gap: spacing.sm, paddingRight: spacing.lg },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statLabel: { fontSize: 16, fontWeight: '700', color: colors.text },
  statSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  statValue: { fontSize: 36, fontWeight: '800' },
  inputRow: { flexDirection: 'row', gap: spacing.md },
  inputCol: { flex: 1 },
  inputLabel: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 18,
    color: colors.text,
  },
  resultBox: { marginTop: spacing.lg },
  resultText: { fontSize: 18, color: colors.text },
  resultGrade: { fontWeight: '800', fontSize: 22 },
  resultGood: { fontSize: 16, color: colors.good, fontWeight: '600' },
  resultBad: { fontSize: 16, color: colors.bad, fontWeight: '600' },
  projected: { fontSize: 16, color: colors.text, marginTop: spacing.md },
  hint: { color: colors.textMuted, marginTop: spacing.sm },
});
