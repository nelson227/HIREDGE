import { View, Text, ViewStyle } from 'react-native';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
}

const COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  primary: { bg: '#6C5CE715', text: '#6C5CE7' },
  secondary: { bg: '#00CEC915', text: '#00CEC9' },
  success: { bg: '#00B89415', text: '#00B894' },
  warning: { bg: '#FDCB6E20', text: '#E17055' },
  danger: { bg: '#FF767515', text: '#FF7675' },
  info: { bg: '#74B9FF20', text: '#0984E3' },
  neutral: { bg: '#F1F3F5', text: '#868E96' },
};

export default function Badge({ label, variant = 'primary', size = 'sm', style }: BadgeProps) {
  const c = COLORS[variant];
  const isSm = size === 'sm';

  return (
    <View style={[{
      backgroundColor: c.bg,
      paddingHorizontal: isSm ? 8 : 12,
      paddingVertical: isSm ? 3 : 5,
      borderRadius: isSm ? 8 : 10,
      alignSelf: 'flex-start',
    }, style]}>
      <Text style={{
        color: c.text,
        fontSize: isSm ? 11 : 13,
        fontWeight: '600',
      }}>{label}</Text>
    </View>
  );
}
