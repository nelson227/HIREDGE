import { View, Text, TouchableOpacity, TextInput, ScrollView, Dimensions, Platform } from 'react-native';
import { useState, useRef } from 'react';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';
import { colors, spacing, radius, fontSize, shadows } from '../lib/theme';

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
      await api.patch('/profile', {
        title: form.title || undefined,
        bio: form.bio || undefined,
        preferredLocations: form.locations,
        preferredContractTypes: form.contractTypes,
        salaryExpectation: form.salaryMin ? parseInt(form.salaryMin) : undefined,
        remotePreference: form.remote ? 'REMOTE_ONLY' : 'ON_SITE',
      });
      if (form.skills.length) {
        for (const s of form.skills) {
          await api.post('/profile/skills', { name: s, level: 3, category: 'TECHNICAL' });
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
    <View style={{ flex: 1, backgroundColor: colors.card }}>
      {/* Progress Bar */}
      <View style={{ paddingTop: 56, paddingHorizontal: spacing.xl }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {STEPS.map((_, i) => (
            <View key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              backgroundColor: i <= step ? colors.primary : colors.border,
            }} />
          ))}
        </View>
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
        <View style={{ width, paddingHorizontal: 32, justifyContent: 'center' }}>
          <View style={{
            width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryLight,
            justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: spacing['2xl'],
          }}>
            <Text style={{ fontSize: 36 }}>🧠</Text>
          </View>
          <Text style={{ fontSize: fontSize['3xl'], fontWeight: '800', color: colors.foreground, textAlign: 'center' }}>
            Bienvenue sur{'\n'}HIREDGE
          </Text>
          <Text style={{ fontSize: fontSize.base, color: colors.mutedForeground, textAlign: 'center', marginTop: spacing.md, lineHeight: 22 }}>
            Ton compagnon IA pour trouver le job idéal.{'\n'}
            EDGE va analyser ton profil, matcher les offres,{'\n'}
            et t'accompagner à chaque étape.
          </Text>
          <View style={{ marginTop: spacing['3xl'], gap: spacing.md }}>
            <FeatureRow icon="sparkles-outline" text="Matching intelligent des offres" />
            <FeatureRow icon="chatbubble-outline" text="Coach IA conversationnel" />
            <FeatureRow icon="people-outline" text="Escouades de motivation" />
            <FeatureRow icon="telescope-outline" text="Éclaireurs en entreprise" />
          </View>
        </View>

        {/* Step 1: Profile */}
        <View style={{ width, paddingHorizontal: 32, paddingTop: 40 }}>
          <Text style={{ fontSize: fontSize.xl + 2, fontWeight: '700', color: colors.foreground }}>Parle-nous de toi</Text>
          <Text style={{ fontSize: fontSize.sm, color: colors.mutedForeground, marginTop: 4, marginBottom: spacing['2xl'] }}>
            Ces infos aident EDGE à personnaliser tes recommandations
          </Text>
          <Label text="Titre professionnel" />
          <Input
            placeholder="ex: Développeur Full-Stack"
            value={form.title}
            onChangeText={(t) => setForm(p => ({ ...p, title: t }))}
          />
          <Label text="Bio courte" />
          <Input
            placeholder="Décris-toi en quelques mots..."
            value={form.bio}
            onChangeText={(t) => setForm(p => ({ ...p, bio: t }))}
            multiline
          />
          <Label text="Villes recherchées (séparées par des virgules)" />
          <Input
            placeholder="ex: Paris, Lyon, Remote"
            value={form.locations.join(', ')}
            onChangeText={(t) => setForm(p => ({ ...p, locations: t.split(',').map(s => s.trim()).filter(Boolean) }))}
          />
        </View>

        {/* Step 2: Skills */}
        <View style={{ width, paddingHorizontal: 32, paddingTop: 40 }}>
          <Text style={{ fontSize: fontSize.xl + 2, fontWeight: '700', color: colors.foreground }}>Tes compétences</Text>
          <Text style={{ fontSize: fontSize.sm, color: colors.mutedForeground, marginTop: 4, marginBottom: spacing.xl }}>
            Sélectionne celles qui te correspondent ({form.skills.length} sélectionnées)
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {POPULAR_SKILLS.map(s => {
              const selected = form.skills.includes(s);
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => toggleSkill(s)}
                  style={{
                    paddingHorizontal: spacing.lg - 2, paddingVertical: spacing.sm, borderRadius: radius.full,
                    backgroundColor: selected ? colors.primary : colors.muted,
                    borderWidth: 1, borderColor: selected ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{ fontSize: fontSize.sm, fontWeight: '500', color: selected ? colors.primaryForeground : colors.foreground }}>{s}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 3: Preferences */}
        <View style={{ width, paddingHorizontal: 32, paddingTop: 40 }}>
          <Text style={{ fontSize: fontSize.xl + 2, fontWeight: '700', color: colors.foreground }}>Tes préférences</Text>
          <Text style={{ fontSize: fontSize.sm, color: colors.mutedForeground, marginTop: 4, marginBottom: spacing.xl }}>
            Pour te proposer les meilleures offres
          </Text>

          <Label text="Type de contrat" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl }}>
            {['CDI', 'CDD', 'FREELANCE', 'STAGE', 'ALTERNANCE'].map(c => {
              const sel = form.contractTypes.includes(c);
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => toggleContract(c)}
                  style={{
                    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2, borderRadius: radius.lg,
                    backgroundColor: sel ? colors.primary : colors.muted,
                    borderWidth: 1, borderColor: sel ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: sel ? colors.primaryForeground : colors.foreground }}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Label text="Salaire annuel minimum (€)" />
          <Input
            placeholder="ex: 35000"
            value={form.salaryMin}
            onChangeText={(t) => setForm(p => ({ ...p, salaryMin: t.replace(/\D/g, '') }))}
            keyboardType="numeric"
          />

          <TouchableOpacity
            onPress={() => setForm(p => ({ ...p, remote: !p.remote }))}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2,
              backgroundColor: form.remote ? colors.primaryLight : colors.muted,
              padding: spacing.md + 2, borderRadius: radius.lg, marginTop: spacing.sm,
              borderWidth: 1, borderColor: form.remote ? colors.primary : colors.border,
            }}
          >
            <Ionicons name={form.remote ? 'checkbox' : 'square-outline'} size={22} color={form.remote ? colors.primary : colors.mutedForeground} />
            <Text style={{ fontSize: fontSize.sm + 1, color: colors.foreground }}>Remote uniquement</Text>
          </TouchableOpacity>
        </View>

        {/* Step 4: Ready */}
        <View style={{ width, paddingHorizontal: 32, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{
            width: 100, height: 100, borderRadius: 50, backgroundColor: colors.successLight,
            justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xl,
          }}>
            <Ionicons name="checkmark-circle" size={56} color={colors.success} />
          </View>
          <Text style={{ fontSize: fontSize['2xl'] + 2, fontWeight: '800', color: colors.foreground, textAlign: 'center' }}>
            Tu es prêt ! 🚀
          </Text>
          <Text style={{ fontSize: fontSize.sm + 1, color: colors.mutedForeground, textAlign: 'center', marginTop: spacing.md, lineHeight: 22 }}>
            EDGE va commencer à chercher des offres{'\n'}
            correspondant à ton profil.{'\n\n'}
            Tu peux toujours modifier tes préférences plus tard.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Nav */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.xl, paddingBottom: Platform.OS === 'ios' ? 36 : spacing.xl, paddingTop: spacing.md,
        borderTopWidth: 1, borderTopColor: colors.border,
      }}>
        {step > 0 ? (
          <TouchableOpacity onPress={goBack}>
            <Text style={{ color: colors.mutedForeground, fontSize: fontSize.md }}>Retour</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
            <Text style={{ color: colors.mutedForeground, fontSize: fontSize.md }}>Passer</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={goNext}
          disabled={saveMutation.isPending}
          style={{
            backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: radius.full,
            opacity: saveMutation.isPending ? 0.6 : 1, ...shadows.lg,
          }}
        >
          <Text style={{ color: colors.primaryForeground, fontWeight: '700', fontSize: fontSize.md }}>
            {step === STEPS.length - 1 ? (saveMutation.isPending ? 'Enregistrement...' : "C'est parti !") : 'Suivant'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FeatureRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View style={{
        width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight,
        justifyContent: 'center', alignItems: 'center',
      }}>
        <Ionicons name={icon as any} size={18} color={colors.primary} />
      </View>
      <Text style={{ fontSize: fontSize.sm + 1, color: colors.foreground }}>{text}</Text>
    </View>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: colors.foreground, marginBottom: spacing.xs + 2 }}>{text}</Text>;
}

function Input({ multiline, ...props }: any) {
  return (
    <TextInput
      {...props}
      multiline={multiline}
      style={{
        backgroundColor: colors.muted, borderRadius: radius.lg, paddingHorizontal: spacing.md + 2,
        paddingVertical: spacing.md, fontSize: fontSize.sm + 1, color: colors.foreground, marginBottom: spacing.lg,
        borderWidth: 1, borderColor: colors.border,
        ...(multiline ? { minHeight: 80, textAlignVertical: 'top' } : {}),
      }}
      placeholderTextColor={colors.mutedForeground}
    />
  );
}
