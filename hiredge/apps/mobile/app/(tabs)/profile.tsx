import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/auth.store';
import api from '../../lib/api';
import { colors, spacing, radius, fontSize, shadows } from '../../lib/theme';

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
      style={{ flex: 1, backgroundColor: colors.background }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={{
        backgroundColor: colors.card, paddingTop: 60, paddingBottom: spacing['3xl'],
        paddingHorizontal: spacing.xl, alignItems: 'center',
        borderBottomWidth: 1, borderColor: colors.border,
      }}>
        {/* Avatar */}
        <View style={{
          width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primaryLight,
          justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md,
          borderWidth: 3, borderColor: colors.primary,
        }}>
          <Text style={{ fontSize: 36, fontWeight: '700', color: colors.primary }}>
            {(user?.fullName ?? '?')[0].toUpperCase()}
          </Text>
        </View>
        <Text style={{ color: colors.foreground, fontSize: fontSize.xl, fontWeight: '700' }}>
          {user?.fullName ?? 'Utilisateur'}
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: fontSize.sm + 1, marginTop: 2 }}>{user?.email}</Text>

        {/* Completion Bar */}
        <View style={{ width: '100%', marginTop: spacing.xl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
            <Text style={{ color: colors.mutedForeground, fontSize: fontSize.xs + 1 }}>Profil complété</Text>
            <Text style={{ color: colors.foreground, fontSize: fontSize.xs + 1, fontWeight: '700' }}>{completion}%</Text>
          </View>
          <View style={{ height: 6, backgroundColor: colors.muted, borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${completion}%`, backgroundColor: colors.success, borderRadius: 3 }} />
          </View>
        </View>
      </View>

      {/* Sections */}
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        {/* Bio */}
        <ProfileSection title="Titre professionnel" icon="briefcase-outline">
          <Text style={{ color: colors.foreground, fontSize: fontSize.base }}>
            {profile?.title || 'Non renseigné'}
          </Text>
          {profile?.bio && (
            <Text style={{ color: colors.mutedForeground, fontSize: fontSize.sm, marginTop: spacing.xs }}>{profile.bio}</Text>
          )}
        </ProfileSection>

        {/* Skills */}
        <ProfileSection title="Compétences" icon="code-slash-outline">
          {profile?.skills?.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {profile.skills.map((skill: any) => (
                <View key={skill.id} style={{
                  flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
                  backgroundColor: colors.primaryLight, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full,
                }}>
                  <Text style={{ fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' }}>{skill.name}</Text>
                  <Text style={{ fontSize: 10, color: colors.primary, opacity: 0.6 }}>
                    {['', '⭐', '⭐⭐', '⭐⭐⭐'][skill.level] ?? ''}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: colors.mutedForeground, fontSize: fontSize.sm }}>Ajoute tes compétences</Text>
          )}
        </ProfileSection>

        {/* Experience */}
        <ProfileSection title="Expériences" icon="business-outline">
          {profile?.experiences?.length > 0 ? (
            profile.experiences.map((exp: any, idx: number) => (
              <View key={exp.id} style={{ marginBottom: idx < profile.experiences.length - 1 ? spacing.lg : 0 }}>
                <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: colors.foreground }}>{exp.title}</Text>
                <Text style={{ color: colors.primary, fontSize: fontSize.sm, marginTop: 1 }}>{exp.company}</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: fontSize.xs + 1, marginTop: 2 }}>
                  {formatPeriod(exp.startDate, exp.endDate)}
                </Text>
                {exp.description && (
                  <Text style={{ color: colors.mutedForeground, fontSize: fontSize.sm, marginTop: spacing.xs }} numberOfLines={3}>
                    {exp.description}
                  </Text>
                )}
              </View>
            ))
          ) : (
            <Text style={{ color: colors.mutedForeground, fontSize: fontSize.sm }}>Ajoute tes expériences</Text>
          )}
        </ProfileSection>

        {/* Education */}
        <ProfileSection title="Formation" icon="school-outline">
          {profile?.educations?.length > 0 ? (
            profile.educations.map((edu: any) => (
              <View key={edu.id} style={{ marginBottom: spacing.md }}>
                <Text style={{ fontSize: fontSize.base, fontWeight: '600', color: colors.foreground }}>{edu.degree}</Text>
                <Text style={{ color: colors.primary, fontSize: fontSize.sm }}>{edu.school}</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: fontSize.xs + 1 }}>
                  {edu.fieldOfStudy} • {new Date(edu.startDate).getFullYear()} - {edu.endDate ? new Date(edu.endDate).getFullYear() : "En cours"}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ color: colors.mutedForeground, fontSize: fontSize.sm }}>Ajoute ta formation</Text>
          )}
        </ProfileSection>

        {/* Preferences */}
        <ProfileSection title="Préférences de recherche" icon="options-outline">
          <View style={{ gap: spacing.sm }}>
            <PrefRow label="Localisations" value={profile?.preferredLocations?.join(', ') || 'Non défini'} />
            <PrefRow label="Type de contrat" value={profile?.contractPreferences?.join(', ') || 'Non défini'} />
            <PrefRow label="Salaire souhaité" value={profile?.salaryExpectation ? `${profile.salaryExpectation.toLocaleString()} €/an` : 'Non défini'} />
            <PrefRow label="Télétravail" value={profile?.remotePreference ? 'Oui' : 'Non défini'} />
          </View>
        </ProfileSection>

        {/* Stats */}
        <ProfileSection title="Statistiques" icon="stats-chart-outline">
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <MiniStat label="Candidatures" value={profile?.stats?.applications ?? 0} />
            <MiniStat label="Entretiens" value={profile?.stats?.interviews ?? 0} />
            <MiniStat label="Simulations" value={profile?.stats?.simulations ?? 0} />
          </View>
        </ProfileSection>

        {/* Actions */}
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <ActionRow icon="settings-outline" label="Paramètres" onPress={() => {}} />
          <ActionRow icon="notifications-outline" label="Préférences de notifications" onPress={() => {}} />
          <ActionRow icon="shield-checkmark-outline" label="Confidentialité" onPress={() => {}} />
          <ActionRow icon="help-circle-outline" label="Aide & Support" onPress={() => {}} />
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg,
              flexDirection: 'row', alignItems: 'center', gap: spacing.md,
              borderWidth: 1, borderColor: colors.destructiveLight,
            }}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
            <Text style={{ color: colors.destructive, fontWeight: '600', fontSize: fontSize.base }}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ textAlign: 'center', color: colors.border, fontSize: fontSize.xs + 1, marginTop: spacing.lg, marginBottom: spacing['3xl'] }}>
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
      backgroundColor: colors.card, borderRadius: radius.xl, padding: spacing.lg,
      borderWidth: 1, borderColor: colors.border, ...shadows.sm,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
        <View style={{
          width: 32, height: 32, borderRadius: radius.sm, backgroundColor: colors.primaryLight,
          justifyContent: 'center', alignItems: 'center',
        }}>
          <Ionicons name={icon as any} size={16} color={colors.primary} />
        </View>
        <Text style={{ fontSize: fontSize.base + 1, fontWeight: '700', color: colors.foreground }}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function PrefRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: colors.mutedForeground, fontSize: fontSize.sm }}>{label}</Text>
      <Text style={{ color: colors.foreground, fontSize: fontSize.sm, fontWeight: '500' }}>{value}</Text>
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', backgroundColor: colors.muted, borderRadius: radius.lg, padding: spacing.md }}>
      <Text style={{ fontSize: fontSize.xl, fontWeight: '700', color: colors.primary }}>{value}</Text>
      <Text style={{ fontSize: fontSize.xs, color: colors.mutedForeground, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function ActionRow({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.lg,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderWidth: 1, borderColor: colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Ionicons name={icon as any} size={20} color={colors.mutedForeground} />
        <Text style={{ color: colors.foreground, fontWeight: '500', fontSize: fontSize.base }}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.border} />
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
