/** Eenvoudig kleur-/spacing-thema. Somtoday-achtig blauw als accent. */
export const colors = {
  primary: '#0a7cff',
  primaryDark: '#0257b8',
  background: '#f4f6fa',
  card: '#ffffff',
  text: '#1a1d22',
  textMuted: '#6b7280',
  border: '#e3e7ee',
  good: '#1f9d55',
  bad: '#e02424',
  warn: '#d97706',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
};

/** Kleur op basis van of een cijfer voldoende is. */
export function gradeColor(value: number | null): string {
  if (value === null) return colors.textMuted;
  if (value >= 5.5) return colors.good;
  if (value >= 4.5) return colors.warn;
  return colors.bad;
}
