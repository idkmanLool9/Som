import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing } from '../theme';

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <Text style={styles.muted}>{label}</Text> : null}
    </View>
  );
}

export function ErrorView({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.center}>
      <Text style={styles.errorTitle}>Er ging iets mis</Text>
      <Text style={styles.muted}>{message}</Text>
      {onRetry ? (
        <Button title="Opnieuw proberen" onPress={onRetry} style={{ marginTop: spacing.lg }} />
      ) : null}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  style,
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  style?: ViewStyle;
  disabled?: boolean;
}) {
  const ghost = variant === 'ghost';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.button,
        ghost && styles.buttonGhost,
        disabled && styles.buttonDisabled,
        style,
      ]}
    >
      <Text style={[styles.buttonText, ghost && styles.buttonTextGhost]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  muted: { color: colors.textMuted, textAlign: 'center' },
  errorTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  buttonGhost: { backgroundColor: 'transparent' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  buttonTextGhost: { color: colors.primary },
});
