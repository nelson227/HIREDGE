import { View, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: number;
  style?: ViewStyle;
}

const VARIANTS: Record<string, ViewStyle> = {
  default: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  elevated: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#DEE2E6',
  },
};

export default function Card({ children, variant = 'default', padding = 16, style }: CardProps) {
  return (
    <View style={[VARIANTS[variant], { padding }, style]}>
      {children}
    </View>
  );
}
