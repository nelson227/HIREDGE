import { View, Text, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/auth.store';

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [jobAlerts, setJobAlerts] = useState(true);
  const [squadNotifs, setSquadNotifs] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer mon compte',
      'Cette action est irréversible. Toutes vos données seront supprimées conformément au RGPD.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            // TODO: call DELETE /api/v1/auth/account
            logout();
          },
        },
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert('Export demandé', 'Vous recevrez un email avec vos données dans les 24h.');
    // TODO: call POST /api/v1/profile/export
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#6C5CE7', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20,
        borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>Paramètres</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {/* Notifications */}
        <SectionTitle title="Notifications" />
        <SettingCard>
          <ToggleRow icon="notifications-outline" label="Notifications push" value={pushEnabled} onToggle={setPushEnabled} />
          <Divider />
          <ToggleRow icon="mail-outline" label="Notifications email" value={emailEnabled} onToggle={setEmailEnabled} />
          <Divider />
          <ToggleRow icon="briefcase-outline" label="Alertes offres d'emploi" value={jobAlerts} onToggle={setJobAlerts} />
          <Divider />
          <ToggleRow icon="people-outline" label="Messages escouade" value={squadNotifs} onToggle={setSquadNotifs} />
        </SettingCard>

        {/* Apparence */}
        <SectionTitle title="Apparence" />
        <SettingCard>
          <ToggleRow icon="moon-outline" label="Mode sombre" value={darkMode} onToggle={setDarkMode} />
        </SettingCard>

        {/* Compte */}
        <SectionTitle title="Compte" />
        <SettingCard>
          <ActionRow icon="person-outline" label="Email" value={user?.email ?? ''} />
          <Divider />
          <ActionRow icon="lock-closed-outline" label="Changer le mot de passe" onPress={() => {}} chevron />
          <Divider />
          <ActionRow icon="language-outline" label="Langue" value="Français" />
        </SettingCard>

        {/* Données & Confidentialité */}
        <SectionTitle title="Données & confidentialité" />
        <SettingCard>
          <ActionRow icon="download-outline" label="Exporter mes données" onPress={handleExportData} chevron />
          <Divider />
          <ActionRow icon="document-text-outline" label="Politique de confidentialité" onPress={() => {}} chevron />
          <Divider />
          <ActionRow icon="shield-outline" label="Conditions d'utilisation" onPress={() => {}} chevron />
        </SettingCard>

        {/* À propos */}
        <SectionTitle title="À propos" />
        <SettingCard>
          <ActionRow icon="information-circle-outline" label="Version" value="1.0.0 (build 1)" />
          <Divider />
          <ActionRow icon="heart-outline" label="Noter l'application" onPress={() => {}} chevron />
          <Divider />
          <ActionRow icon="chatbubble-outline" label="Nous contacter" onPress={() => {}} chevron />
        </SettingCard>

        {/* Danger Zone */}
        <TouchableOpacity
          onPress={handleDeleteAccount}
          style={{
            backgroundColor: '#FF767510', borderRadius: 12, padding: 16,
            marginTop: 24, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
          }}
        >
          <Ionicons name="trash-outline" size={18} color="#FF7675" />
          <Text style={{ color: '#FF7675', fontWeight: '600' }}>Supprimer mon compte</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={{ fontSize: 13, fontWeight: '700', color: '#868E96', marginTop: 20, marginBottom: 8, marginLeft: 4 }}>{title}</Text>;
}

function SettingCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E9ECEF' }}>
      {children}
    </View>
  );
}

function ToggleRow({ icon, label, value, onToggle }: { icon: string; label: string; value: boolean; onToggle: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
      <Ionicons name={icon as any} size={20} color="#6C5CE7" />
      <Text style={{ flex: 1, marginLeft: 12, fontSize: 14, color: '#2D3436' }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#DEE2E6', true: '#6C5CE760' }}
        thumbColor={value ? '#6C5CE7' : '#fff'}
      />
    </View>
  );
}

function ActionRow({ icon, label, value, onPress, chevron }: {
  icon: string; label: string; value?: string; onPress?: () => void; chevron?: boolean;
}) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 }}>
      <Ionicons name={icon as any} size={20} color="#6C5CE7" />
      <Text style={{ flex: 1, marginLeft: 12, fontSize: 14, color: '#2D3436' }}>{label}</Text>
      {value && <Text style={{ fontSize: 13, color: '#ADB5BD', marginRight: 4 }}>{value}</Text>}
      {chevron && <Ionicons name="chevron-forward" size={16} color="#CED4DA" />}
    </Wrapper>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: '#F1F3F5', marginLeft: 48 }} />;
}
