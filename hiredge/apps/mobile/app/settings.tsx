import { View, Text, TouchableOpacity, ScrollView, Switch, Alert, TextInput, Linking } from 'react-native';
import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/auth.store';
import { profileApi, authApi } from '../lib/api';
import { useTheme, type ThemeMode } from '../lib/theme';
import { useTranslation, LOCALE_LABELS, LOCALE_FLAGS, type Locale } from '../lib/i18n';

const LOCALES: Locale[] = ['fr', 'en', 'de', 'es'];
const THEME_OPTIONS: { id: ThemeMode; icon: string }[] = [
  { id: 'light', icon: 'sunny-outline' },
  { id: 'dark', icon: 'moon-outline' },
  { id: 'system', icon: 'phone-portrait-outline' },
];

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const { colors, mode, setMode, isDark } = useTheme();
  const { t, locale, setLocale } = useTranslation();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [jobAlerts, setJobAlerts] = useState(true);
  const [squadNotifs, setSquadNotifs] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const { data } = await profileApi.get();
      if (data.success && data.data) {
        const prefs = data.data.notificationPrefs as Record<string, boolean> | null;
        if (prefs) {
          setPushEnabled(prefs.new_matches ?? true);
          setEmailEnabled(prefs.application_updates ?? true);
          setJobAlerts(prefs.interview_reminders ?? true);
          setSquadNotifs(prefs.squad_activity ?? true);
        }
      }
    } catch { /* no-op */ }
  };

  const updateNotifPref = async (key: string, value: boolean) => {
    try {
      await profileApi.update({ notificationPrefs: { [key]: value } });
    } catch { /* no-op */ }
  };

  const togglePush = (v: boolean) => { setPushEnabled(v); updateNotifPref('new_matches', v); };
  const toggleEmail = (v: boolean) => { setEmailEnabled(v); updateNotifPref('application_updates', v); };
  const toggleJobAlerts = (v: boolean) => { setJobAlerts(v); updateNotifPref('interview_reminders', v); };
  const toggleSquadNotifs = (v: boolean) => { setSquadNotifs(v); updateNotifPref('squad_activity', v); };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('settingsDeleteAccount'),
      t('settingsDeleteConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await authApi.deleteAccount();
              logout();
              router.replace('/(auth)/login');
            } catch {
              Alert.alert(t('error'), t('settingsDeleteError'));
            }
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      const { data } = await profileApi.get();
      if (data.success) {
        Alert.alert(t('success'), t('settingsExportData'));
      }
    } catch {
      Alert.alert(t('error'), t('settingsSaveError'));
    }
  };

  const handleChangePassword = () => {
    Alert.prompt(
      t('settingsChangePassword'),
      t('settingsCurrentPassword'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('next'),
          onPress: (currentPw) => {
            if (!currentPw) return;
            Alert.prompt(
              t('settingsNewPassword'),
              t('settingsPasswordMinLength'),
              [
                { text: t('cancel'), style: 'cancel' },
                {
                  text: t('confirm'),
                  onPress: async (newPw) => {
                    if (!newPw || newPw.length < 8) {
                      Alert.alert(t('error'), t('settingsPasswordMinLength'));
                      return;
                    }
                    try {
                      await authApi.changePassword(currentPw, newPw);
                      Alert.alert(t('success'), t('settingsPasswordChanged'));
                    } catch (err: any) {
                      Alert.alert(t('error'), err.response?.data?.error?.message || t('settingsPasswordError'));
                    }
                  },
                },
              ],
              'secure-text'
            );
          },
        },
      ],
      'secure-text'
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{
        backgroundColor: colors.primary, paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>{t('settingsTitle')}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {/* Language */}
        <SectionTitle title={t('settingsLanguage')} color={colors.mutedForeground} />
        <SettingCard bg={colors.card} border={colors.border}>
          <View style={{ padding: 12 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {LOCALES.map((loc) => (
                <TouchableOpacity
                  key={loc}
                  onPress={() => setLocale(loc)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: locale === loc ? colors.primary : colors.border,
                    backgroundColor: locale === loc ? colors.primaryLight : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 16 }}>{LOCALE_FLAGS[loc]}</Text>
                  <Text style={{
                    fontSize: 13, fontWeight: locale === loc ? '700' : '500',
                    color: locale === loc ? colors.primary : colors.foreground,
                  }}>{LOCALE_LABELS[loc]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </SettingCard>

        {/* Theme */}
        <SectionTitle title={t('settingsAppearance')} color={colors.mutedForeground} />
        <SettingCard bg={colors.card} border={colors.border}>
          <View style={{ flexDirection: 'row', padding: 12, gap: 8 }}>
            {THEME_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setMode(opt.id)}
                style={{
                  flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: mode === opt.id ? colors.primary : colors.border,
                  backgroundColor: mode === opt.id ? colors.primaryLight : 'transparent',
                }}
              >
                <Ionicons name={opt.icon as any} size={22} color={mode === opt.id ? colors.primary : colors.mutedForeground} />
                <Text style={{
                  marginTop: 4, fontSize: 12, fontWeight: mode === opt.id ? '700' : '500',
                  color: mode === opt.id ? colors.primary : colors.foreground,
                }}>
                  {opt.id === 'light' ? t('settingsThemeLight') : opt.id === 'dark' ? t('settingsThemeDark') : t('settingsThemeSystem')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </SettingCard>

        {/* Notifications */}
        <SectionTitle title={t('settingsNotifications')} color={colors.mutedForeground} />
        <SettingCard bg={colors.card} border={colors.border}>
          <ToggleRow icon="notifications-outline" label={t('notifNewMatches')} value={pushEnabled} onToggle={togglePush} colors={colors} />
          <Divider color={colors.border} />
          <ToggleRow icon="mail-outline" label={t('notifApplicationUpdates')} value={emailEnabled} onToggle={toggleEmail} colors={colors} />
          <Divider color={colors.border} />
          <ToggleRow icon="briefcase-outline" label={t('notifInterviewReminders')} value={jobAlerts} onToggle={toggleJobAlerts} colors={colors} />
          <Divider color={colors.border} />
          <ToggleRow icon="people-outline" label={t('notifSquadActivity')} value={squadNotifs} onToggle={toggleSquadNotifs} colors={colors} />
        </SettingCard>

        {/* Compte */}
        <SectionTitle title={t('settingsAccount')} color={colors.mutedForeground} />
        <SettingCard bg={colors.card} border={colors.border}>
          <ActionRow icon="person-outline" label={t('email')} value={user?.email ?? ''} colors={colors} />
          <Divider color={colors.border} />
          <ActionRow icon="lock-closed-outline" label={t('settingsChangePassword')} onPress={handleChangePassword} chevron colors={colors} />
        </SettingCard>

        {/* Données & Confidentialité */}
        <SectionTitle title={t('settingsPrivacy')} color={colors.mutedForeground} />
        <SettingCard bg={colors.card} border={colors.border}>
          <ActionRow icon="download-outline" label={t('settingsExportData')} onPress={handleExportData} chevron colors={colors} />
          <Divider color={colors.border} />
          <ActionRow icon="document-text-outline" label={t('settingsPrivacyPolicy')} onPress={() => Linking.openURL('https://hiredge.app/privacy')} chevron colors={colors} />
          <Divider color={colors.border} />
          <ActionRow icon="shield-outline" label={t('settingsTerms')} onPress={() => Linking.openURL('https://hiredge.app/terms')} chevron colors={colors} />
        </SettingCard>

        {/* À propos */}
        <SectionTitle title={t('settingsAbout')} color={colors.mutedForeground} />
        <SettingCard bg={colors.card} border={colors.border}>
          <ActionRow icon="information-circle-outline" label={t('settingsVersion')} value="1.0.0 (build 1)" colors={colors} />
          <Divider color={colors.border} />
          <ActionRow icon="chatbubble-outline" label={t('settingsContact')} onPress={() => Linking.openURL('mailto:support@hiredge.app')} chevron colors={colors} />
        </SettingCard>

        {/* Danger Zone */}
        <TouchableOpacity
          onPress={handleDeleteAccount}
          style={{
            backgroundColor: colors.destructiveLight, borderRadius: 12, padding: 16,
            marginTop: 24, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
          }}
        >
          <Ionicons name="trash-outline" size={18} color={colors.destructive} />
          <Text style={{ color: colors.destructive, fontWeight: '600' }}>{t('settingsDeleteAccount')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function SectionTitle({ title, color }: { title: string; color: string }) {
  return <Text style={{ fontSize: 13, fontWeight: '700', color, marginTop: 20, marginBottom: 8, marginLeft: 4 }}>{title}</Text>;
}

function SettingCard({ children, bg, border }: { children: React.ReactNode; bg: string; border: string }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: border }}>
      {children}
    </View>
  );
}

function ToggleRow({ icon, label, value, onToggle, colors: c }: { icon: string; label: string; value: boolean; onToggle: (v: boolean) => void; colors: any }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
      <Ionicons name={icon as any} size={20} color={c.primary} />
      <Text style={{ flex: 1, marginLeft: 12, fontSize: 14, color: c.foreground }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: c.border, true: c.primaryMedium }}
        thumbColor={value ? c.primary : c.card}
      />
    </View>
  );
}

function ActionRow({ icon, label, value, onPress, chevron, colors: c }: {
  icon: string; label: string; value?: string; onPress?: () => void; chevron?: boolean; colors: any;
}) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 }}>
      <Ionicons name={icon as any} size={20} color={c.primary} />
      <Text style={{ flex: 1, marginLeft: 12, fontSize: 14, color: c.foreground }}>{label}</Text>
      {value && <Text style={{ fontSize: 13, color: c.mutedForeground, marginRight: 4 }}>{value}</Text>}
      {chevron && <Ionicons name="chevron-forward" size={16} color={c.mutedForeground} />}
    </Wrapper>
  );
}

function Divider({ color }: { color: string }) {
  return <View style={{ height: 1, backgroundColor: color, marginLeft: 48 }} />;
}
