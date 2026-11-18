import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors } from '../config/theme';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

export function AppButton({ label, onPress, secondary, disabled, loading, style }: AppButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={[styles.button, secondary && styles.secondary, (disabled || loading) && styles.disabled, style]}
    >
      {loading ? <ActivityIndicator color={secondary ? colors.green : colors.white} /> : (
        <Text style={[styles.label, secondary && styles.secondaryLabel]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 50, backgroundColor: colors.green, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  secondary: { backgroundColor: colors.greenLight },
  disabled: { opacity: 0.55 },
  label: { color: colors.white, fontWeight: '700', fontSize: 15 },
  secondaryLabel: { color: colors.greenDark },
});
