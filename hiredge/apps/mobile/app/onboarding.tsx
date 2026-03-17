import { View, Text, TouchableOpacity, TextInput, ScrollView, Dimensions, Platform } from 'react-native';
import { useState, useRef } from 'react';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import api, { profileApi } from '../lib/api';
import { colors } from '../lib/theme';

const { width } = Dimensions.get('window');

const STEPS = [
  { key: 'welcome', title: 'Bienvenue', subtitle: "L'IA qui booste ta recherche d'emploi" },
  { key: 'profile', title: 'Ton profil', subtitle: 'Parle-nous de toi' },
  { key: 'skills', title: 'Compétences', subtitle: 'Tes super-pouvoirs' },
  { key: 'preferences', title: 'Préférences', subtitle: 'Ce que tu recherches' },
  { key: 'ready', title: 'Prêt !', subtitle: 'EDGE est activé' },
];

const POPULAR_SKILLS = [
  'JavaScript', 'Python', 'React', 'Node.js', 'Java', 'SQL', 'TypeScript',
  'Management', 'Marketing Digital', 'Comptabilité', 'Design', 'Communication',
  'Excel', 'Vente', 'Gestion de projet', 'AWS', 'Docker', 'Agile',
];

export default function OnboardingScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    title: '', bio: '', skills: [] as string[],
    locations: [] as string[], contractTypes: [] as string[],
    salaryMin: '', remote: false,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await profileApi.update({
        title: form.title || undefined,
        bio: form.bio || undefined,
        preferredLocations: form.locations,
        preferredContractTypes: form.contractTypes,
        salaryExpectation: form.salaryMin ? parseInt(form.salaryMin) : undefined,
        remotePreference: form.remote ? 'REMOTE_ONLY' : 'ON_SITE',
      });
      if (form.skills.length) {
        for (const s of form.skills) {
          await profileApi.addSkill({ name: s, level: '3', yearsOfExperience: undefined });
        }
      }
    },
    onSuccess: () => {
      router.replace('/(tabs)');
    },
  });

  const goNext = () => {
    if (step < STEPS.length - 1) {
      const next = step + 1;
      setStep(next);
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
    } else {
      saveMutation.mutate();
    }
  };

  const goBack = () => {
    if (step > 0) {
      const prev = step - 1;
      setStep(prev);
      scrollRef.current?.scrollTo({ x: prev * width, animated: true });
    }
  };

  const toggleSkill = (s: string) => {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.includes(s) ? prev.skills.filter(x => x !== s) : [...prev.skills, s],
    }));
  };

  const toggleContract = (c: string) => {
    setForm(prev => ({
      ...prev,
      contractTypes: prev.contractTypes.includes(c)
        ? prev.contractTypes.filter(x => x !== c)
        : [...prev.contractTypes, c],
    }));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Progress Bar */}
      <View style={{ paddingTop: 56, paddingHorizontal: 24 }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {STEPS.map((_, i) => (
            <View key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              backgroundColor: i <= step ? colors.primary : colors.border,
            }} />
          ))}
        </View>
        <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 8, textAlign: 'center' }}>
          Étape {step + 1} sur {STEPS.length}
        </Text>
      </View>

      {/* Steps */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
      >
        {/* Step 0: Welcome */}
        <View style={{ width, paddingHorizontal: 28, justifyContent: 'center' }}>
          <View style={{
            width: 56, height: 56, borderRadius: 16, backgroundColor: colors.primary,
            justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 24,
          }}>
            <Ionicons name="sparkles" size={26} color={colors.primaryForeground} />
          </View>
          <Text style={{ fontSize: 26, fontWeight: '700', color: colors.foreground, textAlign: 'center' }}>
            Bienvenue sur{'\n'}HIREDGE
          </Text>
          <Text style={{ fontSize: 13, color: colors.mutedForeground, textAlign: 'center', marginTop: 10, lineHeight: 20 }}>
            Ton compagnon IA pour trouver le job idéal.{'\n'}
            EDGE va analyser ton profil, matcher les offres,{'\n'}
            et t'accompagner à chaque étape.
          </Text>
          <View style={{
            marginTop: 32, backgroundColor: colors.card, borderRadius: 12,
            borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
          }}>
            <FeatureRow icon="sparkles-outline" text="Matching intelligent des offres" border />
            <FeatureRow icon="chatbubble-outline" text="Coach IA conversationnel" border />
            <FeatureRow icon="people-outline" text="Escouades de motivation" border />
            <FeatureRow icon="telescope-outline" text="Éclaireurs en entreprise" />
          </View>
        </View>

        {/* Step 1: Profile */}
        <View style={{ width, paddingHorizontal: 28, paddingTop: 32 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground }}>Parle-nous de toi</Text>
          <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4, marginBottom: 20 }}>
            Ces infos aident EDGE à personnaliser tes recommandations
          </Text>
          <Label text="Titre professionnel" />
          <Input
            placeholder="ex: Développeur Full-Stack"
            value={form.title}
            onChangeText={(t: string) => setForm(p => ({ ...p, title: t }))}
          />
          <Label text="Bio courte" />
          <Input
            placeholder="Décris-toi en quelques mots..."
            value={form.bio}
            onChangeText={(t: string) => setForm(p => ({ ...p, bio: t }))}
            multiline
          />
          <Label text="Villes recherchées (séparées par des virgules)" />
          <Input
            placeholder="ex: Paris, Lyon, Remote"
            value={form.locations.join(', ')}
            onChangeText={(t: string) => setForm(p => ({ ...p, locations: t.split(',').map(s => s.trim()).filter(Boolean) }))}
          />
        </View>

        {/* Step 2: Skills */}
        <View style={{ width, paddingHorizontal: 28, paddingTop: 32 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground }}>Tes compétences</Text>
          <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4, marginBottom: 20 }}>
            Sélectionne celles qui te correspondent ({form.skills.length} sélectionnées)
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {POPULAR_SKILLS.map(s => {
              const selected = form.skills.includes(s);
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => toggleSkill(s)}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
                    backgroundColor: selected ? colors.primary : colors.card,
                    borderWidth: 1, borderColor: selected ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: selected ? '#fff' : colors.foreground }}>{s}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 3: Preferences */}
        <View style={{ width, paddingHorizontal: 28, paddingTop: 32 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground }}>Tes préférences</Text>
          <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4, marginBottom: 20 }}>
            Pour te proposer les meilleures offres
          </Text>

          <Label text="Type de contrat" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {['CDI', 'CDD', 'FREELANCE', 'STAGE', 'ALTERNANCE'].map(c => {
              const sel = form.contractTypes.includes(c);
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => toggleContract(c)}
                  style={{
                    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
                    backgroundColor: sel ? colors.primary : colors.card,
                    borderWidth: 1, borderColor: sel ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: sel ? '#fff' : colors.foreground }}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Label text="Salaire annuel minimum (€)" />
          <Input
            placeholder="ex: 35000"
            value={form.salaryMin}
            onChangeText={(t: string) => setForm(p => ({ ...p, salaryMin: t.replace(/\D/g, '') }))}
            keyboardType="numeric"
          />

          <TouchableOpacity
            onPress={() => setForm(p => ({ ...p, remote: !p.remote }))}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 10,
              backgroundColor: form.remote ? colors.primaryLight : colors.card,
              padding: 14, borderRadius: 12, marginTop: 4,
              borderWidth: 1, borderColor: form.remote ? colors.primary : colors.border,
            }}
          >
            <Ionicons name={form.remote ? 'checkbox' : 'square-outline'} size={20} color={form.remote ? colors.primary : colors.mutedForeground} />
            <Text style={{ fontSize: 13, color: colors.foreground, fontWeight: '500' }}>Remote uniquement</Text>
          </TouchableOpacity>
        </View>

        {/* Step 4: Ready */}
        <View style={{ width, paddingHorizontal: 28, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{
            width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(34,197,94,0.10)',
            justifyContent: 'center', alignItems: 'center', marginBottom: 20,
          }}>
            <Ionicons name="checkmark-circle" size={44} color={colors.success} />
          </View>
          <Text style={{ fontSize: 24, fontWeight: '700', color: colors.foreground, textAlign: 'center' }}>
            Tu es prêt !
          </Text>
          <Text style={{ fontSize: 13, color: colors.mutedForeground, textAlign: 'center', marginTop: 10, lineHeight: 20 }}>
            EDGE va commencer à chercher des offres{'\n'}
            correspondant à ton profil.{'\n\n'}
            Tu peux toujours modifier tes préférences plus tard.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Nav */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 36 : 24, paddingTop: 12,
        borderTopWidth: 1, borderTopColor: colors.border,
      }}>
        {step > 0 ? (
          <TouchableOpacity onPress={goBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="chevron-back" size={16} color={colors.mutedForeground} />
            <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Retour</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
            <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Passer</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={goNext}
          disabled={saveMutation.isPending}
          style={{
            backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8,
            opacity: saveMutation.isPending ? 0.6 : 1, flexDirection: 'row', alignItems: 'center', gap: 6,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
            {step === STEPS.length - 1 ? (saveMutation.isPending ? 'Enregistrement...' : "C'est parti !") : 'Suivant'}
          </Text>
          {step < STEPS.length - 1 && <Ionicons name="chevron-forward" size={16} color="#fff" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FeatureRow({ icon, text, border }: { icon: string; text: string; border?: boolean }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
      borderBottomWidth: border ? 1 : 0, borderColor: colors.border,
    }}>
      <View style={{
        width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary + '18',
        justifyContent: 'center', alignItems: 'center',
      }}>
        <Ionicons name={icon as any} size={18} color={colors.primary} />
      </View>
      <Text style={{ fontSize: 13, color: colors.foreground, fontWeight: '500' }}>{text}</Text>
    </View>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground, marginBottom: 6 }}>{text}</Text>;
}

function Input({ multiline, ...props }: any) {
  return (
    <TextInput
      {...props}
      multiline={multiline}
      style={{
        backgroundColor: colors.card, borderRadius: 8, paddingHorizontal: 14,
        paddingVertical: 12, fontSize: 14, color: colors.foreground, marginBottom: 16, height: 44,
        borderWidth: 1, borderColor: colors.border,
        ...(multiline ? { minHeight: 80, textAlignVertical: 'top' } : {}),
      }}
      placeholderTextColor={colors.mutedForeground}
    />
  );
}
