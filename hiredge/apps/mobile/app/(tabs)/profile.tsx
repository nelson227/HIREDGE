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
import { useThemeColors } from '../../lib/theme';
import { useTranslation } from '../../lib/i18n';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const { colors } = useThemeColors();
  const { t } = useTranslation();
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
    Alert.alert(t('profileLogout'), t('profileLogoutConfirm'), [
      { text: t('profileCancel'), style: 'cancel' },
      { text: t('profileLogoutButton'), style: 'destructive', onPress: () => logout() },
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
      Alert.alert(t('profileError'), t('profileAvatarError'));
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
        Alert.alert(t('profileError'), t('profileCvTooBig'));
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
      Alert.alert(t('profileCvImported'), t('profileCvImportedDesc'));
    } catch {
      Alert.alert(t('profileError'), t('profileCvError'));
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
      Alert.alert(t('profileError'), t('profileSkillError'));
    } finally {
      setAddingSkill(false);
    }
  };

  const handleRemoveSkill = (skillId: string, name: string) => {
    Alert.alert(t('profileDelete'), `${t('profileSkillRemove')} "${name}" ?`, [
      { text: t('profileCancel'), style: 'cancel' },
      {
        text: t('profileDelete'), style: 'destructive', onPress: async () => {
          try { await profileApi.removeSkill(skillId); await refetch(); }
          catch { Alert.alert(t('profileError'), t('profileSkillDeleteError')); }
        },
      },
    ]);
  };

  // ─── Experiences ───
  const handleAddExperience = async () => {
    if (!newExp.title || !newExp.company || !newExp.startDate) {
      Alert.alert(t('profileExpRequired'), t('profileExpRequiredDesc'));
      return;
    }
    setAddingExp(true);
    try {
      await profileApi.addExperience(newExp);
      setNewExp({ title: '', company: '', description: '', startDate: '', endDate: '' });
      setShowAddExp(false);
      await refetch();
    } catch {
      Alert.alert(t('profileError'), t('profileExpError'));
    } finally {
      setAddingExp(false);
    }
  };

  const handleRemoveExperience = (expId: string) => {
    Alert.alert(t('profileDelete'), t('profileExpRemove'), [
      { text: t('profileCancel'), style: 'cancel' },
      {
        text: t('profileDelete'), style: 'destructive', onPress: async () => {
          try { await profileApi.removeExperience(expId); await refetch(); }
          catch { Alert.alert(t('profileError'), t('profileExpDeleteError')); }
        },
      },
    ]);
  };

  // ─── Educations ───
  const handleAddEducation = async () => {
    if (!newEdu.degree || !newEdu.institution || !newEdu.startDate) {
      Alert.alert(t('profileEduRequired'), t('profileEduRequiredDesc'));
      return;
    }
    setAddingEdu(true);
    try {
      await profileApi.addEducation(newEdu);
      setNewEdu({ degree: '', institution: '', field: '', startDate: '', endDate: '' });
      setShowAddEdu(false);
      await refetch();
    } catch {
      Alert.alert(t('profileError'), t('profileEduError'));
    } finally {
      setAddingEdu(false);
    }
  };

  const handleRemoveEducation = (eduId: string) => {
    Alert.alert(t('profileDelete'), t('profileEduRemove'), [
      { text: t('profileCancel'), style: 'cancel' },
      {
        text: t('profileDelete'), style: 'destructive', onPress: async () => {
          try { await profileApi.removeEducation(eduId); await refetch(); }
          catch { Alert.alert(t('profileError'), t('profileEduDeleteError')); }
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
          {user?.fullName ?? t('profileNotSpecified')}
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
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.foreground }}>{t('profileTitle')} {completion >= 80 ? t('profileComplete') : t('profileToComplete')}</Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
              {completion < 80 ? t('profileOptimizeHint') : t('profileOptimized')}
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
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>{t('profileEdit')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleCvUpload}
            disabled={uploadingCv}
            style={{
              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
              backgroundColor: colors.card, paddingVertical: 12, borderRadius: 12,
              borderWidth: 1, borderColor: colors.border,
            }}
          >
            {uploadingCv ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="document-attach-outline" size={18} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>{t('profileImportCv')}</Text>
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
          <MiniStat label={t('profileApplications')} value={profile?.stats?.applications ?? 0} color={colors.primary} colors={colors} />
          <View style={{ width: 1, backgroundColor: colors.border }} />
          <MiniStat label={t('profileInterviews')} value={profile?.stats?.interviews ?? 0} color={colors.success} colors={colors} />
          <View style={{ width: 1, backgroundColor: colors.border }} />
          <MiniStat label={t('profileSimulations')} value={profile?.stats?.simulations ?? 0} color={colors.chart5} colors={colors} />
        </View>

        {/* ─── Title + Bio ─── */}
        <SectionCard title={t('profileJobTitleSection')} icon="briefcase-outline" colors={colors}>
          <Text style={{ fontSize: 14, color: profile?.title ? colors.foreground : colors.mutedForeground, fontWeight: profile?.title ? '600' : '400' }}>
            {profile?.title || t('profileNotSpecified')}
          </Text>
          {profile?.bio && (
            <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 6, lineHeight: 19 }}>{profile.bio}</Text>
          )}
        </SectionCard>

        {/* ─── Skills (with add/remove) ─── */}
        <SectionCard title={t('profileSkills')} icon="code-slash-outline" onAdd={() => setShowAddSkill(true)} colors={colors}>
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
            <Text style={{ fontSize: 13, color: colors.mutedForeground }}>{t('profileSkillEmpty')}</Text>
          )}
          <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 8 }}>{t('profileSkillLongPress')}</Text>
        </SectionCard>

        {/* ─── Experiences (with add/remove) ─── */}
        <SectionCard title={t('profileExperience')} icon="business-outline" onAdd={() => setShowAddExp(true)} colors={colors}>
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
                        {formatPeriod(exp.startDate, exp.endDate, t)}
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
            <Text style={{ fontSize: 13, color: colors.mutedForeground }}>{t('profileExpEmpty')}</Text>
          )}
        </SectionCard>

        {/* ─── Education (with add/remove) ─── */}
        <SectionCard title={t('profileEducation')} icon="school-outline" onAdd={() => setShowAddEdu(true)} colors={colors}>
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
                        {edu.fieldOfStudy ?? edu.field} · {new Date(edu.startDate).getFullYear()} - {edu.endDate ? new Date(edu.endDate).getFullYear() : t('profileEduOngoing')}
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
            <Text style={{ fontSize: 13, color: colors.mutedForeground }}>{t('profileEduEmpty')}</Text>
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
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#00B894' }}>{t('profileCvImported')}</Text>
              <Text style={{ fontSize: 12, color: colors.foreground }}>{t('profileCvAnalyzed')}</Text>
            </View>
            <TouchableOpacity onPress={handleCvUpload}>
              <Ionicons name="refresh-outline" size={18} color="#00B894" />
            </TouchableOpacity>
          </View>
        )}

        {/* ─── Preferences ─── */}
        <SectionCard title={t('profilePreferences')} icon="options-outline" colors={colors}>
          <PrefRow label={t('profileLocations')} value={profile?.preferredLocations?.join(', ') || '—'} colors={colors} />
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />
          <PrefRow label={t('profileContract')} value={profile?.contractPreferences?.join(', ') || '—'} colors={colors} />
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />
          <PrefRow label={t('profileSalary')} value={profile?.salaryExpectation ? `${profile.salaryExpectation.toLocaleString()} €/an` : '—'} colors={colors} />
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />
          <PrefRow label={t('profileRemoteWork')} value={profile?.remotePreference ? t('profileYes') : '—'} colors={colors} />
        </SectionCard>

        {/* ─── Actions ─── */}
        <View style={{
          backgroundColor: colors.card, borderRadius: 12,
          borderWidth: 1, borderColor: colors.border, marginBottom: 12, overflow: 'hidden',
        }}>
          <ActionRow icon="settings-outline" label={t('profileSettings')} onPress={() => router.push('/settings')} colors={colors} />
          <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16 }} />
          <ActionRow icon="notifications-outline" label={t('profileNotifications')} onPress={() => router.push('/notifications')} colors={colors} />
          <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16 }} />
          <ActionRow icon="shield-checkmark-outline" label={t('profilePrivacy')} onPress={() => {}} colors={colors} />
          <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16 }} />
          <ActionRow icon="help-circle-outline" label={t('profileHelp')} onPress={() => {}} colors={colors} />
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
          <Text style={{ color: colors.destructive, fontWeight: '700', fontSize: 14 }}>{t('profileLogout')}</Text>
        </TouchableOpacity>

        <Text style={{ textAlign: 'center', color: colors.border, fontSize: 11, marginTop: 4, marginBottom: 40 }}>
          HIREDGE v1.0.0
        </Text>
      </View>

      {/* ═══ Modal: Add Skill ═══ */}
      <Modal visible={showAddSkill} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000050' }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, marginBottom: 16 }}>{t('profileSkillAdd')}</Text>
            <TextInput
              value={newSkillName}
              onChangeText={setNewSkillName}
              placeholder={t('profileModalSkillPlaceholder')}
              placeholderTextColor={colors.mutedForeground}
              style={{
                borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14,
                fontSize: 15, color: colors.foreground, marginBottom: 16,
              }}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowAddSkill(false)} style={{ flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
                <Text style={{ fontWeight: '600', color: colors.mutedForeground }}>{t('profileCancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddSkill}
                disabled={addingSkill || !newSkillName.trim()}
                style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', opacity: addingSkill || !newSkillName.trim() ? 0.5 : 1 }}
              >
                {addingSkill ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ fontWeight: '600', color: '#fff' }}>{t('profileSkillAdd')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══ Modal: Add Experience ═══ */}
      <Modal visible={showAddExp} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000050' }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, marginBottom: 16 }}>{t('profileExperience')}</Text>
            <View style={{ gap: 12 }}>
              <ModalInput label={t('profileModalPosition')} value={newExp.title} onChange={(v) => setNewExp({ ...newExp, title: v })} placeholder={t('profileModalPositionPlaceholder')} colors={colors} />
              <ModalInput label={t('profileModalCompany')} value={newExp.company} onChange={(v) => setNewExp({ ...newExp, company: v })} placeholder={t('profileModalCompanyPlaceholder')} colors={colors} />
              <ModalInput label={t('profileModalDescription')} value={newExp.description} onChange={(v) => setNewExp({ ...newExp, description: v })} placeholder={t('profileModalMissions')} multiline colors={colors} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <ModalInput label={t('profileModalStartDate')} value={newExp.startDate} onChange={(v) => setNewExp({ ...newExp, startDate: v })} placeholder="2022-01" style={{ flex: 1 }} colors={colors} />
                <ModalInput label={t('profileModalEndDate')} value={newExp.endDate} onChange={(v) => setNewExp({ ...newExp, endDate: v })} placeholder="2024-06" style={{ flex: 1 }} colors={colors} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity onPress={() => setShowAddExp(false)} style={{ flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
                <Text style={{ fontWeight: '600', color: colors.mutedForeground }}>{t('profileCancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddExperience}
                disabled={addingExp}
                style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', opacity: addingExp ? 0.5 : 1 }}
              >
                {addingExp ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ fontWeight: '600', color: '#fff' }}>{t('profileSkillAdd')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ═══ Modal: Add Education ═══ */}
      <Modal visible={showAddEdu} transparent animationType="slide">
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000050' }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.foreground, marginBottom: 16 }}>{t('profileEducation')}</Text>
            <View style={{ gap: 12 }}>
              <ModalInput label={t('profileModalDegree')} value={newEdu.degree} onChange={(v) => setNewEdu({ ...newEdu, degree: v })} placeholder={t('profileModalDegreePlaceholder')} colors={colors} />
              <ModalInput label={t('profileModalInstitution')} value={newEdu.institution} onChange={(v) => setNewEdu({ ...newEdu, institution: v })} placeholder={t('profileModalInstitutionPlaceholder')} colors={colors} />
              <ModalInput label={t('profileModalField')} value={newEdu.field} onChange={(v) => setNewEdu({ ...newEdu, field: v })} placeholder={t('profileModalFieldPlaceholder')} colors={colors} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <ModalInput label={t('profileModalStartDate')} value={newEdu.startDate} onChange={(v) => setNewEdu({ ...newEdu, startDate: v })} placeholder="2019-09" style={{ flex: 1 }} colors={colors} />
                <ModalInput label={t('profileModalEndDate')} value={newEdu.endDate} onChange={(v) => setNewEdu({ ...newEdu, endDate: v })} placeholder="2022-06" style={{ flex: 1 }} colors={colors} />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity onPress={() => setShowAddEdu(false)} style={{ flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
                <Text style={{ fontWeight: '600', color: colors.mutedForeground }}>{t('profileCancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddEducation}
                disabled={addingEdu}
                style={{ flex: 1, padding: 14, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', opacity: addingEdu ? 0.5 : 1 }}
              >
                {addingEdu ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ fontWeight: '600', color: '#fff' }}>{t('profileSkillAdd')}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ─── Sub-components ───

function SectionCard({ title, icon, children, onAdd, colors }: { title: string; icon: string; children: React.ReactNode; onAdd?: () => void; colors: any }) {
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

function MiniStat({ label, value, color, colors }: { label: string; value: number; color: string; colors: any }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 18 }}>
      <Text style={{ fontSize: 22, fontWeight: '800', color }}>{value}</Text>
      <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 3, fontWeight: '500' }}>{label}</Text>
    </View>
  );
}

function PrefRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ fontSize: 13, color: colors.mutedForeground }}>{label}</Text>
      <Text style={{ fontSize: 13, color: colors.foreground, fontWeight: '600', maxWidth: '60%', textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

function ActionRow({ icon, label, onPress, colors }: { icon: string; label: string; onPress: () => void; colors: any }) {
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

function ModalInput({ label, value, onChange, placeholder, multiline, style, colors }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string;
  multiline?: boolean; style?: any; colors: any;
}) {
  return (
    <View style={style}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.foreground, marginBottom: 4 }}>{label}</Text>
      <TextInput
        value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.mutedForeground}
        multiline={multiline}
        style={{
          borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 14, color: colors.foreground,
          ...(multiline ? { height: 70, textAlignVertical: 'top' as const } : {}),
        }}
      />
    </View>
  );
}

function formatPeriod(start: string, end: string | undefined, t: (key: string) => string): string {
  const s = new Date(start);
  const startStr = s.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  if (!end) return `${startStr} - ${t('profilePresent')}`;
  const e = new Date(end);
  return `${startStr} - ${e.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`;
}
