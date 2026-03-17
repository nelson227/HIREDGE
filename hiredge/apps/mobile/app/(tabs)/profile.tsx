import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../../stores/auth.store';
import { profileApi } from '../../lib/api';
import { colors } from '../../lib/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const { data: profile, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data } = await profileApi.get();
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
      style={{ flex: 1, backgroundColor: colors.background }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* ─── Hero Header ─── */}
      <View style={{ paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20, alignItems: 'center' }}>
        {/* Avatar — square rounded like reference w-24 h-24 rounded-2xl */}
        <View style={{
          width: 96, height: 96, borderRadius: 16,
          backgroundColor: colors.primary,
          justifyContent: 'center', alignItems: 'center', marginBottom: 14,
        }}>
          <Text style={{ fontSize: 36, fontWeight: '700', color: colors.primaryForeground }}>
            {(user?.fullName ?? '?')[0].toUpperCase()}
          </Text>
        </View>

        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground }}>
          {user?.fullName ?? 'Utilisateur'}
        </Text>
        <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 2 }}>{user?.email}</Text>

        {/* Completion badge */}
        <View style={{
          marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6,
          backgroundColor: completion >= 80 ? 'rgba(34,197,94,0.10)' : colors.primaryLight,
          paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
        }}>
          <Ionicons name={completion >= 80 ? 'checkmark-circle' : 'alert-circle'} size={14} color={completion >= 80 ? colors.success : colors.primary} />
          <Text style={{ fontSize: 12, fontWeight: '600', color: completion >= 80 ? colors.success : colors.primary }}>
            Profil {completion}% complété
          </Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        {/* ─── Stats Row ─── */}
        <View style={{
          flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12,
          borderWidth: 1, borderColor: colors.border, marginBottom: 16, overflow: 'hidden',
        }}>
          <MiniStat label="Candidatures" value={profile?.stats?.applications ?? 0} color={colors.primary} />
          <View style={{ width: 1, backgroundColor: colors.border }} />
          <MiniStat label="Entretiens" value={profile?.stats?.interviews ?? 0} color={colors.success} />
          <View style={{ width: 1, backgroundColor: colors.border }} />
          <MiniStat label="Simulations" value={profile?.stats?.simulations ?? 0} color={colors.chart5} />
        </View>

        {/* ─── Title + Bio ─── */}
        <SectionCard title="Titre professionnel" icon="briefcase-outline">
          <Text style={{ fontSize: 14, color: profile?.title ? colors.foreground : colors.mutedForeground, fontWeight: profile?.title ? '600' : '400' }}>
            {profile?.title || 'Non renseigné'}
          </Text>
          {profile?.bio && (
            <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 6, lineHeight: 19 }}>{profile.bio}</Text>
          )}
        </SectionCard>

        {/* ─── Skills ─── */}
        <SectionCard title="Compétences" icon="code-slash-outline">
          {profile?.skills?.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {profile.skills.map((skill: any) => (
                <View key={skill.id} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
                }}>
                  <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '700' }}>{skill.name}</Text>
                  {skill.level > 0 && (
                    <View style={{ flexDirection: 'row', gap: 1 }}>
                      {[1, 2, 3].map(n => (
                        <View key={n} style={{
                          width: 4, height: 4, borderRadius: 2,
                          backgroundColor: n <= skill.level ? colors.primary : colors.border,
                        }} />
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Ajoute tes compétences</Text>
          )}
        </SectionCard>

        {/* ─── Experiences ─── */}
        <SectionCard title="Expériences" icon="business-outline">
          {profile?.experiences?.length > 0 ? (
            <View>
              {profile.experiences.map((exp: any, i: number) => (
                <View key={exp.id} style={{
                  paddingBottom: i < profile.experiences.length - 1 ? 16 : 0,
                  marginBottom: i < profile.experiences.length - 1 ? 16 : 0,
                  borderBottomWidth: i < profile.experiences.length - 1 ? 1 : 0,
                  borderColor: colors.border,
                }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>{exp.title}</Text>
                  <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600', marginTop: 2 }}>{exp.company}</Text>
                  <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>
                    {formatPeriod(exp.startDate, exp.endDate)}
                  </Text>
                  {exp.description && (
                    <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 6, lineHeight: 17 }} numberOfLines={3}>
                      {exp.description}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Ajoute tes expériences</Text>
          )}
        </SectionCard>

        {/* ─── Education ─── */}
        <SectionCard title="Formation" icon="school-outline">
          {profile?.educations?.length > 0 ? (
            <View>
              {profile.educations.map((edu: any, i: number) => (
                <View key={edu.id} style={{
                  paddingBottom: i < profile.educations.length - 1 ? 14 : 0,
                  marginBottom: i < profile.educations.length - 1 ? 14 : 0,
                  borderBottomWidth: i < profile.educations.length - 1 ? 1 : 0,
                  borderColor: colors.border,
                }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>{edu.degree}</Text>
                  <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>{edu.school}</Text>
                  <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                    {edu.fieldOfStudy} · {new Date(edu.startDate).getFullYear()} - {edu.endDate ? new Date(edu.endDate).getFullYear() : 'En cours'}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Ajoute ta formation</Text>
          )}
        </SectionCard>

        {/* ─── Preferences ─── */}
        <SectionCard title="Préférences" icon="options-outline">
          <PrefRow label="Localisations" value={profile?.preferredLocations?.join(', ') || '—'} />
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />
          <PrefRow label="Contrat" value={profile?.contractPreferences?.join(', ') || '—'} />
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />
          <PrefRow label="Salaire" value={profile?.salaryExpectation ? `${profile.salaryExpectation.toLocaleString()} €/an` : '—'} />
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />
          <PrefRow label="Télétravail" value={profile?.remotePreference ? 'Oui' : '—'} />
        </SectionCard>

        {/* ─── Actions ─── */}
        <View style={{
          backgroundColor: colors.card, borderRadius: 12,
          borderWidth: 1, borderColor: colors.border, marginBottom: 12, overflow: 'hidden',
        }}>
          <ActionRow icon="settings-outline" label="Paramètres" onPress={() => router.push('/settings')} />
          <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16 }} />
          <ActionRow icon="notifications-outline" label="Notifications" onPress={() => router.push('/notifications')} />
          <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16 }} />
          <ActionRow icon="shield-checkmark-outline" label="Confidentialité" onPress={() => {}} />
          <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16 }} />
          <ActionRow icon="help-circle-outline" label="Aide & Support" onPress={() => {}} />
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          style={{
            backgroundColor: 'rgba(239,68,68,0.06)', borderRadius: 16, padding: 16,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
            borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)', marginBottom: 12,
          }}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.destructive} />
          <Text style={{ color: colors.destructive, fontWeight: '700', fontSize: 14 }}>Se déconnecter</Text>
        </TouchableOpacity>

        <Text style={{ textAlign: 'center', color: colors.border, fontSize: 11, marginTop: 4, marginBottom: 40 }}>
          HIREDGE v1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Sub-components ───

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <View style={{
      backgroundColor: colors.card, borderRadius: 12, padding: 16,
      borderWidth: 1, borderColor: colors.border, marginBottom: 12,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <View style={{
          width: 40, height: 40, borderRadius: 12,
          backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center',
        }}>
          <Ionicons name={icon as any} size={18} color={colors.primary} />
        </View>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground }}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 18 }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 3, fontWeight: '500' }}>{label}</Text>
    </View>
  );
}

function PrefRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ fontSize: 13, color: colors.mutedForeground }}>{label}</Text>
      <Text style={{ fontSize: 13, color: colors.foreground, fontWeight: '600', maxWidth: '60%', textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

function ActionRow({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress} activeOpacity={0.7}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 15 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Ionicons name={icon as any} size={19} color={colors.mutedForeground} />
        <Text style={{ color: colors.foreground, fontWeight: '500', fontSize: 14 }}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.border} />
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
