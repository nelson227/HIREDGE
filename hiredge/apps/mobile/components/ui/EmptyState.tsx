import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export default function EmptyState({ icon, title, description, actionLabel, onAction, style }: EmptyStateProps) {
  return (
    <View style={[{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 }, style]}>
      <View style={{
        width: 72, height: 72, borderRadius: 36, backgroundColor: '#6C5CE708',
        justifyContent: 'center', alignItems: 'center', marginBottom: 16,
      }}>
        <Ionicons name={icon as any} size={32} color="#DEE2E6" />
      </View>
      <Text style={{ fontSize: 16, fontWeight: '600', color: '#495057', textAlign: 'center' }}>{title}</Text>
      {description && (
        <Text style={{ fontSize: 13, color: '#ADB5BD', textAlign: 'center', marginTop: 6, lineHeight: 20 }}>
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          style={{
            marginTop: 16, backgroundColor: '#6C5CE7', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
