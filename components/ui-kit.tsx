import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewProps, type ViewStyle } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function Screen({ children, style, ...props }: ViewProps) {
  const theme = useColorScheme() ?? 'light';

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: Colors[theme].background },
        style,
      ]}
      {...props}>
      {children}
    </View>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const theme = useColorScheme() ?? 'light';

  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: Colors[theme].text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.sectionSubtitle, { color: Colors[theme].icon }]}>{subtitle}</Text> : null}
    </View>
  );
}

export function Card({ children, style, ...props }: ViewProps) {
  const theme = useColorScheme() ?? 'light';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme === 'dark' ? '#1e2226' : '#F9FAFB',
          borderColor: theme === 'dark' ? '#2d3339' : '#E5E7EB',
        },
        style,
      ]}
      {...props}>
      {children}
    </View>
  );
}

export function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  const theme = useColorScheme() ?? 'light';

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        {
          backgroundColor: active ? '#4B5563' : theme === 'dark' ? '#1f2933' : '#F3F4F6',
        },
      ]}>
      <Text style={[styles.pillText, { color: active ? '#ffffff' : Colors[theme].text }]}>{label}</Text>
    </Pressable>
  );
}

export function AppButton({
  title,
  variant = 'primary',
  disabled,
  style,
  onPress,
}: {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const theme = useColorScheme() ?? 'light';

  const backgroundColor =
    variant === 'primary'
      ? '#4B5563'
      : variant === 'danger'
        ? '#DC2626'
        : theme === 'dark'
          ? '#2d3339'
          : '#F3F4F6';

  const color = variant === 'secondary' && theme !== 'dark' ? '#111827' : '#ffffff';

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, opacity: disabled ? 0.55 : pressed ? 0.9 : 1 },
        style,
      ]}>
      <Text style={[styles.buttonText, { color }]}>{title}</Text>
    </Pressable>
  );
}

export function AppInput(props: TextInputProps) {
  const theme = useColorScheme() ?? 'light';

  return <TextInput {...props} style={[styles.input, { color: Colors[theme].text, borderColor: theme === 'dark' ? '#2d3339' : '#E5E7EB', backgroundColor: theme === 'dark' ? '#1e2226' : '#FFFFFF' }, props.style]} placeholderTextColor={theme === 'dark' ? Colors[theme].icon : '#9CA3AF'} />;
}

export function HelperText({ children, tone = 'neutral' }: { children: string; tone?: 'neutral' | 'success' | 'error' | 'warning' }) {
  const theme = useColorScheme() ?? 'light';
  const palette = {
    neutral: Colors[theme].icon,
    success: '#0f9d58',
    error: '#b42318',
    warning: '#b54708',
  };

  return <Text style={[styles.helperText, { color: palette[tone] }]}>{children}</Text>;
}

export function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Card style={styles.stateCard}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateSubtitle}>{subtitle}</Text>
    </Card>
  );
}

export function ErrorState({ title, subtitle, onRetry }: { title: string; subtitle: string; onRetry?: () => void }) {
  return (
    <Card style={styles.stateCard}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateSubtitle}>{subtitle}</Text>
      {onRetry ? <AppButton title="Réessayer" variant="secondary" onPress={onRetry} /> : null}
    </Card>
  );
}

export function LoadingState({ label = 'Chargement...' }: { label?: string }) {
  return (
    <Card style={styles.stateCard}>
      <ActivityIndicator />
      <Text style={styles.stateSubtitle}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionHeader: {
    gap: 4,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 24,
    lineHeight: 28,
    fontFamily: Fonts.rounded,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  button: {
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: Fonts.sans,
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
  },
  stateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  stateTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  stateSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
