import { View, Text, Image, ViewStyle } from 'react-native';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  name?: string;
  imageUrl?: string;
  size?: AvatarSize;
  style?: ViewStyle;
}

const SIZES: Record<AvatarSize, number> = {
  xs: 28, sm: 36, md: 44, lg: 56, xl: 80,
};

const FONT_SIZES: Record<AvatarSize, number> = {
  xs: 11, sm: 13, md: 16, lg: 20, xl: 28,
};

const COLORS = ['#6C5CE7', '#00CEC9', '#FF7675', '#FDCB6E', '#00B894', '#E17055', '#0984E3', '#A29BFE'];

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function Avatar({ name, imageUrl, size = 'md', style }: AvatarProps) {
  const dim = SIZES[size];
  const fontSize = FONT_SIZES[size];

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[{
          width: dim, height: dim, borderRadius: dim / 2,
          backgroundColor: '#E9ECEF',
        }, style]}
      />
    );
  }

  const bg = name ? getColorFromName(name) : '#ADB5BD';
  const initials = name ? getInitials(name) : '?';

  return (
    <View style={[{
      width: dim, height: dim, borderRadius: dim / 2,
      backgroundColor: bg + '20',
      justifyContent: 'center', alignItems: 'center',
    }, style]}>
      <Text style={{ fontSize, fontWeight: '700', color: bg }}>{initials}</Text>
    </View>
  );
}
