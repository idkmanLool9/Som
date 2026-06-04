import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useLayoutEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card } from '../components/ui';
import { gradeNeeded } from '../logic/calculator';
import { formatGrade, parseDutchNumber, type Grade } from '../logic/grades';
import type { GradesStackParamList } from '../navigation/types';
import { colors, gradeColor, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<GradesStackParamList, 'SubjectDetail'>;

export default function SubjectDetailScreen({ route, navigation }: Props) {
  const { subject } = route.params;
  const [weightText, setWeightText] = useState('1');
  const [targetText, setTargetText] = useState('5,5');

  useLayoutEffect(() => {
    navigation.setOptions({ title: subject.subjectName });
  }, [navigation, subject.subjectName]);

  const upcomingWeight = parseDutchNumber(weightText) ?? 0;
  const target = parseDutchNumber(targetText) ?? 5.5;

  const calc = useMemo(() => {
    if (upcomingWeight <= 0) return null;
    try {
      return gradeNeeded({ grades: subject.grades, upcomingWeight, target });
    } catch {
      return null;
    }
  }, [subject.grades, upcomingWeight, target]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card>
        <Text style={styles.cardLabel}>Gemiddelde</Text>
        <Text style={[styles.bigGrade, { color: gradeColor(subject.average) }]}>
          {formatGrade(subject.average)}
        </Text>
      </Card>

      <Card>
        <Text style={styles.cardLabel}>Wat moet ik halen?</Text>
        <View style={styles.inputRow}>
          <View style={styles.inputCol}>
            <Text style={styles.inputLabel}>Weging volgende toets</Text>
            <TextInput
              style={styles.input}
              value={weightText}
              onChangeText={setWeightText}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.inputCol}>
            <Text style={styles.inputLabel}>Streefgemiddelde</Text>
            <TextInput
              style={styles.input}
              value={targetText}
              onChangeText={setTargetText}
              keyboardType="numeric"
              placeholder="5,5"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {calc ? (
          <View style={styles.resultBox}>
            {calc.alreadySecured ? (
              <Text style={styles.resultGood}>
                Je staat al binnen — zelfs met een 1 haal je je streefgemiddelde. 🎉
              </Text>
            ) : !calc.possible ? (
              <Text style={styles.resultBad}>
                Niet meer haalbaar met deze toets: je zou een{' '}
                {formatGrade(calc.needed)} nodig hebben.
              </Text>
            ) : (
              <Text style={styles.resultText}>
                Je hebt minimaal een{' '}
                <Text style={[styles.resultGrade, { color: gradeColor(calc.needed) }]}>
                  {formatGrade(calc.needed)}
                </Text>{' '}
                nodig om op {formatGrade(target)} uit te komen.
              </Text>
            )}
          </View>
        ) : (
          <Text style={styles.hint}>Vul een weging groter dan 0 in.</Text>
        )}
      </Card>

      <Text style={styles.sectionTitle}>Alle cijfers</Text>
      {subject.grades
        .slice()
        .reverse()
        .map((g) => (
          <GradeRow key={g.id} grade={g} />
        ))}
    </ScrollView>
  );
}

function GradeRow({ grade }: { grade: Grade }) {
  return (
    <View style={styles.gradeRow}>
      <View style={styles.gradeInfo}>
        <Text style={styles.gradeDesc} numberOfLines={1}>
          {grade.description || 'Toets'}
        </Text>
        <Text style={styles.gradeMeta}>
          Weging {formatGrade(grade.weight, grade.weight % 1 === 0 ? 0 : 1)}
          {grade.period !== null ? ` · Periode ${grade.period}` : ''}
        </Text>
      </View>
      <Text style={[styles.gradeValue, { color: gradeColor(grade.value) }]}>
        {grade.value !== null ? formatGrade(grade.value) : grade.rawValue}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  cardLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  bigGrade: { fontSize: 48, fontWeight: '800', marginTop: spacing.xs },
  inputRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
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
  resultText: { fontSize: 16, color: colors.text, lineHeight: 24 },
  resultGrade: { fontWeight: '800', fontSize: 20 },
  resultGood: { fontSize: 16, color: colors.good, fontWeight: '600', lineHeight: 24 },
  resultBad: { fontSize: 16, color: colors.bad, fontWeight: '600', lineHeight: 24 },
  hint: { color: colors.textMuted, marginTop: spacing.md },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  gradeInfo: { flex: 1, marginRight: spacing.md },
  gradeDesc: { fontSize: 15, fontWeight: '600', color: colors.text },
  gradeMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  gradeValue: { fontSize: 22, fontWeight: '800' },
});
