import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl, TextInput, Modal, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'react-native';
import { useAuthStore } from '../../stores/auth.store';
import { profileApi } from '../../lib/api';
import { colors } from '../../lib/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  // Upload states
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);

  // Add skill modal
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [addingSkill, setAddingSkill] = useState(false);

  // Add experience modal
  const [showAddExp, setShowAddExp] = useState(false);
  const [newExp, setNewExp] = useState({ title: '', company: '', description: '', startDate: '', endDate: '' });
  const [addingExp, setAddingExp] = useState(false);

  // Add education modal
  const [showAddEdu, setShowAddEdu] = useState(false);
  const [newEdu, setNewEdu] = useState({ degree: '', institution: '', field: '', startDate: '', endDate: '' });
  const [addingEdu, setAddingEdu] = useState(false);

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

  // ─── Avatar Upload ───
  const handleAvatarUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setUploadingAvatar(true);
      const formData = new FormData();
      formData.append('avatar', {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: 'avatar.jpg',
      } as any);
      await profileApi.uploadAvatar(formData);
      await refetch();
    } catch {
      Alert.alert('Erreur', "Impossible de mettre à jour l'avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ─── CV Upload ───
  const handleCvUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];
      if (file.size && file.size > 5 * 1024 * 1024) {
        Alert.alert('Erreur', 'Le fichier est trop volumineux (max 5 Mo)');
        return;
      }
      setUploadingCv(true);
      const formData = new FormData();
      formData.append('cv', {
        uri: file.uri,
        type: file.mimeType || 'application/pdf',
        name: file.name || 'cv.pdf',
      } as any);
      await profileApi.uploadCv(formData);
      await refetch();
      Alert.alert('CV importé', 'Ton CV a été analysé et ton profil mis à jour !');
    } catch {
      Alert.alert('Erreur', "Impossible d'importer le CV");
    } finally {
      setUploadingCv(false);
    }
  };

  // ─── Skills ───
  const handleAddSkill = async () => {
    if (!newSkillName.trim()) return;
    setAddingSkill(true);
    try {
      await profileApi.addSkill({ name: newSkillName.trim(), level: 'intermediate' });
      setNewSkillName('');
      setShowAddSkill(false);
      await refetch();
    } catch {
      Alert.alert('Erreur', "Impossible d'ajouter la compétence");
    } finally {
      setAddingSkill(false);
    }
  };

  const handleRemoveSkill = (skillId: string, name: string) => {
    Alert.alert('Supprimer', `Retirer "${name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          try { await profileApi.removeSkill(skillId); await refetch(); }
          catch { Alert.alert('Erreur', 'Impossible de supprimer'); }
        },
      },
    ]);
  };

  // ─── Experiences ───
  const handleAddExperience = async () => {
    if (!newExp.title || !newExp.company || !newExp.startDate) {
      Alert.alert('Champs requis', 'Titre, entreprise et date de début sont obligatoires');
      return;
    }
    setAddingExp(true);
    try {
      await profileApi.addExperience(newExp);
      setNewExp({ title: '', company: '', description: '', startDate: '', endDate: '' });
      setShowAddExp(false);
      await refetch();
    } catch {
      Alert.alert('Erreur', "Impossible d'ajouter l'expérience");
    } finally {
      setAddingExp(false);
    }
  };

  const handleRemoveExperience = (expId: string) => {
    Alert.alert('Supprimer', 'Retirer cette expérience ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          try { await profileApi.removeExperience(expId); await refetch(); }
          catch { Alert.alert('Erreur', 'Impossible de supprimer'); }
        },
      },
    ]);
  };

  // ─── Educations ───
  const handleAddEducation = async () => {
    if (!newEdu.degree || !newEdu.institution || !newEdu.startDate) {
      Alert.alert('Champs requis', 'Diplôme, établissement et date de début sont obligatoires');
      return;
    }
    setAddingEdu(true);
    try {
      await profileApi.addEducation(newEdu);
      setNewEdu({ degree: '', institution: '', field: '', startDate: '', endDate: '' });
      setShowAddEdu(false);
      await refetch();
    } catch {
      Alert.alert('Erreur', "Impossible d'ajouter la formation");
    } finally {
      setAddingEdu(false);
    }
  };

  const handleRemoveEducation = (eduId: string) => {
    Alert.alert('Supprimer', 'Retirer cette formation ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive', onPress: async () => {
          try { await profileApi.removeEducation(eduId); await refetch(); }
          catch { Alert.alert('Erreur', 'Impossible de supprimer'); }
        },
      },
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
        {/* Avatar with upload */}
        <TouchableOpacity onPress={handleAvatarUpload} disabled={uploadingAvatar} activeOpacity={0.7}>
          <View style={{
            width: 96, height: 96, borderRadius: 16, overflow: 'hidden',
            backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 14,
          }}>
            {uploadingAvatar ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={{ width: 96, height: 96 }} />
            ) : (
              <Text style={{ fontSize: 36, fontWeight: '700', color: colors.primaryForeground }}>
                {(user?.fullName ?? '?')[0].toUpperCase()}
              </Text>
            )}
          </View>
          <View style={{
            position: 'absolute', bottom: 10, right: -4, width: 30, height: 30, borderRadius: 15,
            backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
            borderWidth: 2, borderColor: colors.background,
          }}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </TouchableOpacity>

        <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground }}>
          {user?.fullName ?? 'Utilisateur'}
        </Text>
        <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 2 }}>{user?.email}</Text>

        {/* Completion score circular */}
        <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{
            width: 52, height: 52, borderRadius: 26,
            borderWidth: 4, borderColor: completion >= 80 ? '#00B89440' : '#6C5CE740',
            justifyContent: 'center', alignItems: 'center',
          }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: completion >= 80 ? colors.success : colors.primary }}>
              {completion}%
            </Text>
          </View>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>Profil {completion >= 80 ? 'complet' : 'à compléter'}</Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
              {completion < 80 ? 'Ajoute CV et compétences pour un meilleur matching' : 'Ton profil est bien optimisé !'}
            </Text>
          </View>
        </View>

        {/* Quick actions: Edit + Import CV */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <TouchableOpacity
            onPress={() => router.push('/edit-profile')}
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 12,
            }}
          >
            <Ionicons name="create-outline" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Modifier</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleCvUpload}
            disabled={uploadingCv}
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              backgroundColor: '#fff', paddingVertical: 12, borderRadius: 12,
              borderWidth: 1, borderColor: colors.border,
            }}
          >
            {uploadingCv ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="document-attach-outline" size={18} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>Importer CV</Text>
              </>
            )}
          </TouchableOpacity>
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

        {/* ─── Skills (with add/remove) ─── */}
        <SectionCard title="Compétences" icon="code-slash-outline" onAdd={() => setShowAddSkill(true)}>
          {profile?.skills?.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {profile.skills.map((skill: any) => (
                <TouchableOpacity
                  key={skill.id}
                  onLongPress={() => handleRemoveSkill(skill.id, skill.name)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 4,
                    backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
                  }}
                >
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
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Ajoute tes compétences</Text>
          )}
          <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 8 }}>Appui long pour supprimer</Text>
        </SectionCard>

        {/* ─── Experiences (with add/remove) ─── */}
        <SectionCard title="Expériences" icon="business-outline" onAdd={() => setShowAddExp(true)}>
          {profile?.experiences?.length > 0 ? (
            <View>
              {profile.experiences.map((exp: any, i: number) => (
                <View key={exp.id} style={{
                  paddingBottom: i < profile.experiences.length - 1 ? 16 : 0,
                  marginBottom: i < profile.experiences.length - 1 ? 16 : 0,
                  borderBottomWidth: i < profile.experiences.length - 1 ? 1 : 0,
                  borderColor: colors.border,
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>{exp.title}</Text>
                      <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600', marginTop: 2 }}>{exp.company}</Text>
                      <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>
                        {formatPeriod(exp.startDate, exp.endDate)}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveExperience(exp.id)} style={{ padding: 4 }}>
                      <Ionicons name="trash-outline" size={16} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
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

        {/* ─── Education (with add/remove) ─── */}
        <SectionCard title="Formation" icon="school-outline" onAdd={() => setShowAddEdu(true)}>
          {profile?.educations?.length > 0 ? (
            <View>
              {profile.educations.map((edu: any, i: number) => (
                <View key={edu.id} style={{
                  paddingBottom: i < profile.educations.length - 1 ? 14 : 0,
                  marginBottom: i < profile.educations.length - 1 ? 14 : 0,
                  borderBottomWidth: i < profile.educations.length - 1 ? 1 : 0,
                  borderColor: colors.border,
                }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.foreground }}>{edu.degree}</Text>
                      <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>{edu.school ?? edu.institution}</Text>
                      <Text style={{ fontSize: 11, color: colors.mutedForeground }}>
                        {edu.fieldOfStudy ?? edu.field} · {new Date(edu.startDate).getFullYear()} - {edu.endDate ? new Date(edu.endDate).getFullYear() : 'En cours'}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveEducation(edu.id)} style={{ padding: 4 }}>
                      <Ionicons name="trash-outline" size={16} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: colors.mutedForeground }}>Ajoute ta formation</Text>
          )}
        </SectionCard>

        {/* ─── CV Status ─── */}
        {profile?.cvUrl && (
          <View style={{
            backgroundColor: '#E6FAF5', borderRadius: 12, padding: 14, marginBottom: 12,
            flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#00B89430',
          }}>
            <Ionicons name="document-text" size={20} color="#00B894" />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#00B894' }}>CV importé</Text>
              <Text style={{ fontSize: 12, color: '#2D3436' }}>Ton CV a été analysé pour enrichir ton profil</Text>
            </View>
            <TouchableOpacity onPress={handleCvUpload}>
              <Ionicons name="refresh-outline" size={18} color="#00B894" />
            </TouchableOpacity>
          </View>
        )}

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

      {/* ═══ Modal: Add Skill ═══ */}
      <Modal visible={showAddSkill} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000050' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#2D3436', marginBottom: 16 }}>Ajouter une compétence</Text>
            <TextInput
              value={newSkillName}
              onChangeText={setNewSkillName}
              placeholder="Ex: React, Python, Figma..."
              placeholderTextColor="#ADB5BD"
              style={{
                borderWidth: 1, borderColor: '#E9ECEF', borderRadius: 12, padding: 14,
                fontSize: 15, color: '#2D3436', marginBottom: 16,
              }}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowAddSkill(false)} style={{ flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E9ECEF', alignItems: 'center' }}>
                <Text style={{ fontWeight: '600', color: '#868E96' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddSkill}
                disabled={addingSkill || !newSkillName.trim()}
                style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', opacity: addingSkill || !newSkillName.trim() ? 0.5 : 1 }}
              >
                {addingSkill ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ fontWeight: '600', color: '#fff' }}>Ajouter</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══ Modal: Add Experience ═══ */}
      <Modal visible={showAddExp} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000050' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#2D3436', marginBottom: 16 }}>Ajouter une expérience</Text>
            <View style={{ gap: 12 }}>
              <ModalInput label="Poste *" value={newExp.title} onChange={(v) => setNewExp({ ...newExp, title: v })} placeholder="Ex: Développeur Full-Stack" />
              <ModalInput label="Entreprise *" value={newExp.company} onChange={(v) => setNewExp({ ...newExp, company: v })} placeholder="Ex: Google" />
              <ModalInput label="Description" value={newExp.description} onChange={(v) => setNewExp({ ...newExp, description: v })} placeholder="Tes missions..." multiline />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <ModalInput label="Début * (YYYY-MM)" value={newExp.startDate} onChange={(v) => setNewExp({ ...newExp, startDate: v })} placeholder="2022-01" style={{ flex: 1 }} />
                <ModalInput label="Fin (YYYY-MM)" value={newExp.endDate} onChange={(v) => setNewExp({ ...newExp, endDate: v })} placeholder="2024-06" style={{ flex: 1 }} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity onPress={() => setShowAddExp(false)} style={{ flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E9ECEF', alignItems: 'center' }}>
                <Text style={{ fontWeight: '600', color: '#868E96' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddExperience}
                disabled={addingExp}
                style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', opacity: addingExp ? 0.5 : 1 }}
              >
                {addingExp ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ fontWeight: '600', color: '#fff' }}>Ajouter</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══ Modal: Add Education ═══ */}
      <Modal visible={showAddEdu} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000050' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#2D3436', marginBottom: 16 }}>Ajouter une formation</Text>
            <View style={{ gap: 12 }}>
              <ModalInput label="Diplôme *" value={newEdu.degree} onChange={(v) => setNewEdu({ ...newEdu, degree: v })} placeholder="Ex: Master Informatique" />
              <ModalInput label="Établissement *" value={newEdu.institution} onChange={(v) => setNewEdu({ ...newEdu, institution: v })} placeholder="Ex: Université Paris-Saclay" />
              <ModalInput label="Spécialité" value={newEdu.field} onChange={(v) => setNewEdu({ ...newEdu, field: v })} placeholder="Ex: Intelligence Artificielle" />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <ModalInput label="Début * (YYYY-MM)" value={newEdu.startDate} onChange={(v) => setNewEdu({ ...newEdu, startDate: v })} placeholder="2019-09" style={{ flex: 1 }} />
                <ModalInput label="Fin (YYYY-MM)" value={newEdu.endDate} onChange={(v) => setNewEdu({ ...newEdu, endDate: v })} placeholder="2022-06" style={{ flex: 1 }} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity onPress={() => setShowAddEdu(false)} style={{ flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E9ECEF', alignItems: 'center' }}>
                <Text style={{ fontWeight: '600', color: '#868E96' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddEducation}
                disabled={addingEdu}
                style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', opacity: addingEdu ? 0.5 : 1 }}
              >
                {addingEdu ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ fontWeight: '600', color: '#fff' }}>Ajouter</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ─── Sub-components ───

function SectionCard({ title, icon, children, onAdd }: { title: string; icon: string; children: React.ReactNode; onAdd?: () => void }) {
  return (
    <View style={{
      backgroundColor: colors.card, borderRadius: 12, padding: 16,
      borderWidth: 1, borderColor: colors.border, marginBottom: 12,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{
            width: 40, height: 40, borderRadius: 12,
            backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center',
          }}>
            <Ionicons name={icon as any} size={18} color={colors.primary} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground }}>{title}</Text>
        </View>
        {onAdd && (
          <TouchableOpacity onPress={onAdd} style={{
            width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryLight,
            justifyContent: 'center', alignItems: 'center',
          }}>
            <Ionicons name="add" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
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

function ModalInput({ label, value, onChange, placeholder, multiline, style }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string;
  multiline?: boolean; style?: any;
}) {
  return (
    <View style={style}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#2D3436', marginBottom: 4 }}>{label}</Text>
      <TextInput
        value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#ADB5BD"
        multiline={multiline}
        style={{
          borderWidth: 1, borderColor: '#E9ECEF', borderRadius: 10, padding: 12, fontSize: 14, color: '#2D3436',
          ...(multiline ? { height: 70, textAlignVertical: 'top' as const } : {}),
        }}
      />
    </View>
  );
}

function formatPeriod(start: string, end?: string): string {
  const s = new Date(start);
  const startStr = s.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
  if (!end) return `${startStr} - Présent`;
  const e = new Date(end);
  return `${startStr} - ${e.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}`;
}
