import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';

export default function EditProfileScreen() {
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/profile');
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
      await api.patch('/profile', {
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
      Alert.alert('Erreur', 'Impossible de mettre à jour le profil');
    },
  });

  const CONTRACT_OPTIONS = ['CDI', 'CDD', 'freelance', 'stage', 'alternance'];

  const toggleContract = (c: string) => {
    setContracts((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F8F9FA' }} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#6C5CE7', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20,
        flexDirection: 'row', alignItems: 'center', gap: 12,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', flex: 1 }}>Modifier le profil</Text>
        <TouchableOpacity onPress={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
          <Text style={{ color: '#00CEC9', fontWeight: '700', fontSize: 16 }}>
            {updateMutation.isPending ? '...' : 'Sauver'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ padding: 16, gap: 16 }}>
        <Field label="Titre professionnel" placeholder="ex: Développeur Full-Stack" value={title} onChange={setTitle} />
        <Field label="Bio" placeholder="Décris-toi en quelques lignes..." value={bio} onChange={setBio} multiline />
        <Field label="Localisations souhaitées" placeholder="Paris, Lyon, Remote..." value={locations} onChange={setLocations} hint="Sépare par des virgules" />
        <Field label="Salaire annuel souhaité (€)" placeholder="45000" value={salary} onChange={setSalary} keyboardType="numeric" />

        {/* Remote */}
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E9ECEF' }}>
          <TouchableOpacity
            onPress={() => setRemote(!remote)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#2D3436' }}>Ouvert au télétravail</Text>
            <View style={{
              width: 48, height: 28, borderRadius: 14, justifyContent: 'center',
              backgroundColor: remote ? '#6C5CE7' : '#DEE2E6',
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
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E9ECEF' }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#2D3436', marginBottom: 10 }}>
            Types de contrat recherchés
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CONTRACT_OPTIONS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => toggleContract(c)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                  backgroundColor: contracts.includes(c) ? '#6C5CE7' : '#F1F3F5',
                  borderWidth: 1, borderColor: contracts.includes(c) ? '#6C5CE7' : '#E9ECEF',
                }}
              >
                <Text style={{
                  fontWeight: '600', fontSize: 13,
                  color: contracts.includes(c) ? '#fff' : '#495057',
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
  label, placeholder, value, onChange, multiline, keyboardType, hint,
}: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void;
  multiline?: boolean; keyboardType?: 'numeric' | 'default'; hint?: string;
}) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E9ECEF' }}>
      <Text style={{ fontSize: 15, fontWeight: '600', color: '#2D3436', marginBottom: 8 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#ADB5BD"
        multiline={multiline}
        keyboardType={keyboardType}
        style={{
          borderWidth: 1, borderColor: '#E9ECEF', borderRadius: 8, padding: 12,
          fontSize: 15, color: '#2D3436',
          ...(multiline ? { height: 90, textAlignVertical: 'top' } : {}),
        }}
      />
      {hint && <Text style={{ fontSize: 11, color: '#ADB5BD', marginTop: 4 }}>{hint}</Text>}
    </View>
  );
}
