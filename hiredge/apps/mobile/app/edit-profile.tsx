import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { profileApi } from '../lib/api';
import { useThemeColors } from '../lib/theme';
import { useTranslation } from '../lib/i18n';

export default function EditProfileScreen() {
  const { colors } = useThemeColors();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await profileApi.get();
      return data.data;
    },
  });

  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [locations, setLocations] = useState('');
  const [salary, setSalary] = useState('');
  const [remote, setRemote] = useState(false);
  const [contracts, setContracts] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
      setTitle(profile.title ?? '');
      setBio(profile.bio ?? '');
      setLocations((profile.preferredLocations ?? []).join(', '));
      setSalary(profile.salaryExpectation?.toString() ?? '');
      setRemote(profile.remotePreference ?? false);
      setContracts(profile.contractPreferences ?? []);
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      await profileApi.update({
        title: title.trim() || undefined,
        bio: bio.trim() || undefined,
        preferredLocations: locations.split(',').map((l) => l.trim()).filter(Boolean),
        salaryExpectation: salary ? parseInt(salary, 10) : undefined,
        remotePreference: remote,
        contractPreferences: contracts.length > 0 ? contracts : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      router.back();
    },
    onError: () => {
      Alert.alert(t('profileError'), t('editProfileError'));
    },
  });

  const CONTRACT_OPTIONS = ['CDI', 'CDD', 'freelance', 'stage', 'alternance'];

  const toggleContract = (c: string) => {
    setContracts((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={{
        backgroundColor: colors.primary, paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20,
        flexDirection: 'row', alignItems: 'center', gap: 12,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', flex: 1 }}>{t('profileEditProfile')}</Text>
        <TouchableOpacity onPress={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
          <Text style={{ color: '#00CEC9', fontWeight: '700', fontSize: 16 }}>
            {updateMutation.isPending ? '...' : t('editProfileSave')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ padding: 16, gap: 16 }}>
        <Field label={t('editProfileTitle')} placeholder={t('editProfileTitlePlaceholder')} value={title} onChange={setTitle} colors={colors} />
        <Field label={t('editProfileBio')} placeholder={t('editProfileBioPlaceholder')} value={bio} onChange={setBio} multiline colors={colors} />
        <Field label={t('editProfileLocations')} placeholder={t('editProfileLocationsPlaceholder')} value={locations} onChange={setLocations} hint={t('editProfileLocationsHint')} colors={colors} />
        <Field label={t('editProfileSalary')} placeholder={t('editProfileSalaryPlaceholder')} value={salary} onChange={setSalary} keyboardType="numeric" colors={colors} />

        {/* Remote */}
        <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border }}>
          <TouchableOpacity
            onPress={() => setRemote(!remote)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground }}>{t('editProfileRemote')}</Text>
            <View style={{
              width: 48, height: 28, borderRadius: 14, justifyContent: 'center',
              backgroundColor: remote ? colors.primary : colors.border,
              paddingHorizontal: 2,
            }}>
              <View style={{
                width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff',
                alignSelf: remote ? 'flex-end' : 'flex-start',
              }} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Contract Preferences */}
        <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground, marginBottom: 10 }}>
            {t('editProfileContractTypes')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CONTRACT_OPTIONS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => toggleContract(c)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                  backgroundColor: contracts.includes(c) ? colors.primary : colors.muted,
                  borderWidth: 1, borderColor: contracts.includes(c) ? colors.primary : colors.border,
                }}
              >
                <Text style={{
                  fontWeight: '600', fontSize: 13,
                  color: contracts.includes(c) ? '#fff' : colors.mutedForeground,
                }}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function Field({
  label, placeholder, value, onChange, multiline, keyboardType, hint, colors,
}: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void;
  multiline?: boolean; keyboardType?: 'numeric' | 'default'; hint?: string;
  colors: any;
}) {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground, marginBottom: 8 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        multiline={multiline}
        keyboardType={keyboardType}
        style={{
          borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12,
          fontSize: 15, color: colors.foreground,
          ...(multiline ? { height: 90, textAlignVertical: 'top' } : {}),
        }}
      />
      {hint && <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 4 }}>{hint}</Text>}
    </View>
  );
}
