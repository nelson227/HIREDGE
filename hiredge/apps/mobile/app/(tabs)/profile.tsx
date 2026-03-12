import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/auth.store';
import api from '../../lib/api';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data: profile, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await api.get('/profile');
      return data.data;
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, []);

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Veux-tu vraiment te déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const completion = profile?.completionScore ?? 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F8F9FA' }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C5CE7" />}
    >
      {/* Header */}
      <View style={{
        backgroundColor: '#6C5CE7', paddingTop: 60, paddingBottom: 32, paddingHorizontal: 20,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24, alignItems: 'center',
      }}>
        <View style={{
          width: 80, height: 80, borderRadius: 40, backgroundColor: '#A29BFE',
          justifyContent: 'center', alignItems: 'center', marginBottom: 12,
        }}>
          <Text style={{ fontSize: 32, fontWeight: '700', color: '#fff' }}>
            {(user?.fullName ?? '?')[0].toUpperCase()}
          </Text>
        </View>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>
          {user?.fullName ?? 'Utilisateur'}
        </Text>
        <Text style={{ color: '#A29BFE', fontSize: 14, marginTop: 2 }}>{user?.email}</Text>

        {/* Completion Bar */}
        <View style={{ width: '100%', marginTop: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: '#A29BFE', fontSize: 12 }}>Profil complété</Text>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{completion}%</Text>
          </View>
          <View style={{ height: 6, backgroundColor: '#A29BFE40', borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${completion}%`, backgroundColor: '#00CEC9', borderRadius: 3 }} />
          </View>
        </View>
      </View>

      {/* Sections */}
      <View style={{ padding: 16, gap: 12 }}>
        {/* Bio */}
        <ProfileSection title="Titre professionnel" icon="briefcase-outline">
          <Text style={{ color: '#2D3436', fontSize: 15 }}>
            {profile?.title || 'Non renseigné'}
          </Text>
          {profile?.bio && (
            <Text style={{ color: '#868E96', fontSize: 13, marginTop: 4 }}>{profile.bio}</Text>
          )}
        </ProfileSection>

        {/* Skills */}
        <ProfileSection title="Compétences" icon="code-slash-outline">
          {profile?.skills?.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {profile.skills.map((skill: any) => (
                <View key={skill.id} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  backgroundColor: '#F0EEFF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
                }}>
                  <Text style={{ fontSize: 13, color: '#6C5CE7', fontWeight: '500' }}>{skill.name}</Text>
                  <Text style={{ fontSize: 10, color: '#A29BFE' }}>
                    {['', '⭐', '⭐⭐', '⭐⭐⭐'][skill.level] ?? ''}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: '#ADB5BD', fontSize: 13 }}>Ajoute tes compétences</Text>
          )}
        </ProfileSection>

        {/* Experience */}
        <ProfileSection title="Expériences" icon="business-outline">
          {profile?.experiences?.length > 0 ? (
            profile.experiences.map((exp: any) => (
              <View key={exp.id} style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#2D3436' }}>{exp.title}</Text>
                <Text style={{ color: '#6C5CE7', fontSize: 13, marginTop: 1 }}>{exp.company}</Text>
                <Text style={{ color: '#ADB5BD', fontSize: 12, marginTop: 2 }}>
                  {formatPeriod(exp.startDate, exp.endDate)}
                </Text>
                {exp.description && (
                  <Text style={{ color: '#868E96', fontSize: 13, marginTop: 4 }} numberOfLines={3}>
                    {exp.description}
                  </Text>
                )}
              </View>
            ))
          ) : (
            <Text style={{ color: '#ADB5BD', fontSize: 13 }}>Ajoute tes expériences</Text>
          )}
        </ProfileSection>

        {/* Education */}
        <ProfileSection title="Formation" icon="school-outline">
          {profile?.educations?.length > 0 ? (
            profile.educations.map((edu: any) => (
              <View key={edu.id} style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#2D3436' }}>{edu.degree}</Text>
                <Text style={{ color: '#6C5CE7', fontSize: 13 }}>{edu.school}</Text>
                <Text style={{ color: '#ADB5BD', fontSize: 12 }}>
                  {edu.fieldOfStudy} • {new Date(edu.startDate).getFullYear()} - {edu.endDate ? new Date(edu.endDate).getFullYear() : "En cours"}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ color: '#ADB5BD', fontSize: 13 }}>Ajoute ta formation</Text>
          )}
        </ProfileSection>

        {/* Preferences */}
        <ProfileSection title="Préférences de recherche" icon="options-outline">
          <View style={{ gap: 8 }}>
            <PrefRow label="Localisations" value={profile?.preferredLocations?.join(', ') || 'Non défini'} />
            <PrefRow label="Type de contrat" value={profile?.contractPreferences?.join(', ') || 'Non défini'} />
            <PrefRow label="Salaire souhaité" value={profile?.salaryExpectation ? `${profile.salaryExpectation.toLocaleString()} €/an` : 'Non défini'} />
            <PrefRow label="Télétravail" value={profile?.remotePreference ? 'Oui' : 'Non défini'} />
          </View>
        </ProfileSection>

        {/* Stats */}
        <ProfileSection title="Statistiques" icon="stats-chart-outline">
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <MiniStat label="Candidatures" value={profile?.stats?.applications ?? 0} />
            <MiniStat label="Entretiens" value={profile?.stats?.interviews ?? 0} />
            <MiniStat label="Simulations" value={profile?.stats?.simulations ?? 0} />
          </View>
        </ProfileSection>

        {/* Actions */}
        <View style={{ gap: 8, marginTop: 8 }}>
          <ActionRow icon="settings-outline" label="Paramètres" onPress={() => {}} />
          <ActionRow icon="notifications-outline" label="Préférences de notifications" onPress={() => {}} />
          <ActionRow icon="shield-checkmark-outline" label="Confidentialité" onPress={() => {}} />
          <ActionRow icon="help-circle-outline" label="Aide & Support" onPress={() => {}} />
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              backgroundColor: '#fff', borderRadius: 12, padding: 16,
              flexDirection: 'row', alignItems: 'center', gap: 12,
              borderWidth: 1, borderColor: '#FFE0E0',
            }}
          >
            <Ionicons name="log-out-outline" size={20} color="#FF7675" />
            <Text style={{ color: '#FF7675', fontWeight: '600', fontSize: 15 }}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ textAlign: 'center', color: '#CED4DA', fontSize: 12, marginTop: 16, marginBottom: 32 }}>
          HIREDGE v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Sub-components ───

function ProfileSection({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={{
      backgroundColor: '#fff', borderRadius: 12, padding: 16,
      borderWidth: 1, borderColor: '#E9ECEF',
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Ionicons name={icon as any} size={18} color="#6C5CE7" />
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#2D3436' }}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function PrefRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: '#868E96', fontSize: 13 }}>{label}</Text>
      <Text style={{ color: '#2D3436', fontSize: 13, fontWeight: '500' }}>{value}</Text>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: 10, padding: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#6C5CE7' }}>{value}</Text>
      <Text style={{ fontSize: 11, color: '#868E96', marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function ActionRow({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: '#fff', borderRadius: 12, padding: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderWidth: 1, borderColor: '#E9ECEF',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Ionicons name={icon as any} size={20} color="#495057" />
        <Text style={{ color: '#2D3436', fontWeight: '500', fontSize: 15 }}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#CED4DA" />
    </TouchableOpacity>
  );
}

function formatPeriod(start: string, end?: string): string {
  const s = new Date(start);
  const startStr = s.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  if (!end) return `${startStr} - Présent`;
  const e = new Date(end);
  return `${startStr} - ${e.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`;
}
