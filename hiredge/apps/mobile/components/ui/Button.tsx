import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../../lib/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

const VARIANTS: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary: { bg: colors.primary, text: '#FFFFFF' },
  secondary: { bg: '#00CEC9', text: '#FFFFFF' },
  outline: { bg: 'transparent', text: colors.primary, border: colors.primary },
  ghost: { bg: 'transparent', text: colors.primary },
  danger: { bg: '#FF7675', text: '#FFFFFF' },
};

const SIZES: Record<Size, { h: number; px: number; font: number; radius: number }> = {
  sm: { h: 36, px: 14, font: 13, radius: 10 },
  md: { h: 46, px: 20, font: 15, radius: 12 },
  lg: { h: 54, px: 24, font: 16, radius: 14 },
};

export default function Button({
  title, onPress, variant = 'primary', size = 'md',
  disabled = false, loading = false, fullWidth = false, style,
}: ButtonProps) {
  const v = VARIANTS[variant];
  const s = SIZES[size];

  const containerStyle: ViewStyle = {
    backgroundColor: v.bg,
    height: s.h,
    paddingHorizontal: s.px,
    borderRadius: s.radius,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    opacity: disabled || loading ? 0.5 : 1,
    ...(v.border ? { borderWidth: 1.5, borderColor: v.border } : {}),
    ...(fullWidth ? { width: '100%' } : { alignSelf: 'flex-start' }),
    ...style,
  };

  const textStyle: TextStyle = {
    color: v.text,
    fontSize: s.font,
    fontWeight: '700',
  };

  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} style={containerStyle} activeOpacity={0.7}>
      {loading ? (
        <ActivityIndicator color={v.text} size="small" style={{ marginRight: 8 }} />
      ) : null}
      <Text style={textStyle}>{title}</Text>
    </TouchableOpacity>
  );
}
