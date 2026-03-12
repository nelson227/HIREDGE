import { View, TextInput, Text, TextInputProps, ViewStyle } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  icon?: string;
  containerStyle?: ViewStyle;
}

export default function Input({ label, error, hint, icon, containerStyle, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = error ? '#FF7675' : focused ? '#6C5CE7' : '#E9ECEF';

  return (
    <View style={[{ marginBottom: 16 }, containerStyle]}>
      {label && (
        <Text style={{ fontSize: 13, fontWeight: '600', color: '#495057', marginBottom: 6 }}>{label}</Text>
      )}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F8F9FA', borderRadius: 12,
        borderWidth: 1.5, borderColor,
        paddingHorizontal: 14,
      }}>
        {icon && (
          <Ionicons name={icon as any} size={18} color={focused ? '#6C5CE7' : '#ADB5BD'} style={{ marginRight: 8 }} />
        )}
        <TextInput
          {...props}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          placeholderTextColor="#ADB5BD"
          style={[{
            flex: 1, paddingVertical: 12, fontSize: 14, color: '#2D3436',
          }, props.style]}
        />
      </View>
      {error && (
        <Text style={{ fontSize: 11, color: '#FF7675', marginTop: 4 }}>{error}</Text>
      )}
      {hint && !error && (
        <Text style={{ fontSize: 11, color: '#ADB5BD', marginTop: 4 }}>{hint}</Text>
      )}
    </View>
  );
}
