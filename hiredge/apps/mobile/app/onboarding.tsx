import { View, Text, TouchableOpacity, TextInput, ScrollView, Dimensions, Platform } from 'react-native';
import { useState, useRef } from 'react';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import api from '../lib/api';

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
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Progress Bar */}
      <View style={{ paddingTop: 56, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {STEPS.map((_, i) => (
            <View key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              backgroundColor: i <= step ? '#6C5CE7' : '#E9ECEF',
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
            width: 80, height: 80, borderRadius: 40, backgroundColor: '#6C5CE715',
            justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 24,
          }}>
            <Text style={{ fontSize: 36 }}>🧠</Text>
          </View>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#2D3436', textAlign: 'center' }}>
            Bienvenue sur{'\n'}HIREDGE
          </Text>
          <Text style={{ fontSize: 15, color: '#868E96', textAlign: 'center', marginTop: 12, lineHeight: 22 }}>
            Ton compagnon IA pour trouver le job idéal.{'\n'}
            EDGE va analyser ton profil, matcher les offres,{'\n'}
            et t'accompagner à chaque étape.
          </Text>
          <View style={{ marginTop: 32, gap: 12 }}>
            <FeatureRow icon="sparkles-outline" text="Matching intelligent des offres" />
            <FeatureRow icon="chatbubble-outline" text="Coach IA conversationnel" />
            <FeatureRow icon="people-outline" text="Escouades de motivation" />
            <FeatureRow icon="telescope-outline" text="Éclaireurs en entreprise" />
          </View>
        </View>

        {/* Step 1: Profile */}
        <View style={{ width, paddingHorizontal: 32, paddingTop: 40 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#2D3436' }}>Parle-nous de toi</Text>
          <Text style={{ fontSize: 13, color: '#868E96', marginTop: 4, marginBottom: 24 }}>
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
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#2D3436' }}>Tes compétences</Text>
          <Text style={{ fontSize: 13, color: '#868E96', marginTop: 4, marginBottom: 20 }}>
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
                    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                    backgroundColor: selected ? '#6C5CE7' : '#F8F9FA',
                    borderWidth: 1, borderColor: selected ? '#6C5CE7' : '#E9ECEF',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '500', color: selected ? '#fff' : '#495057' }}>{s}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 3: Preferences */}
        <View style={{ width, paddingHorizontal: 32, paddingTop: 40 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: '#2D3436' }}>Tes préférences</Text>
          <Text style={{ fontSize: 13, color: '#868E96', marginTop: 4, marginBottom: 20 }}>
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
                    backgroundColor: sel ? '#6C5CE7' : '#F8F9FA',
                    borderWidth: 1, borderColor: sel ? '#6C5CE7' : '#E9ECEF',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: sel ? '#fff' : '#495057' }}>{c}</Text>
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
              flexDirection: 'row', alignItems: 'center', gap: 10,
              backgroundColor: form.remote ? '#6C5CE710' : '#F8F9FA',
              padding: 14, borderRadius: 12, marginTop: 8,
              borderWidth: 1, borderColor: form.remote ? '#6C5CE7' : '#E9ECEF',
            }}
          >
            <Ionicons name={form.remote ? 'checkbox' : 'square-outline'} size={22} color={form.remote ? '#6C5CE7' : '#ADB5BD'} />
            <Text style={{ fontSize: 14, color: '#2D3436' }}>Remote uniquement</Text>
          </TouchableOpacity>
        </View>

        {/* Step 4: Ready */}
        <View style={{ width, paddingHorizontal: 32, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{
            width: 100, height: 100, borderRadius: 50, backgroundColor: '#00B89415',
            justifyContent: 'center', alignItems: 'center', marginBottom: 24,
          }}>
            <Ionicons name="checkmark-circle" size={56} color="#00B894" />
          </View>
          <Text style={{ fontSize: 26, fontWeight: '800', color: '#2D3436', textAlign: 'center' }}>
            Tu es prêt ! 🚀
          </Text>
          <Text style={{ fontSize: 14, color: '#868E96', textAlign: 'center', marginTop: 12, lineHeight: 22 }}>
            EDGE va commencer à chercher des offres{'\n'}
            correspondant à ton profil.{'\n\n'}
            Tu peux toujours modifier tes préférences plus tard.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Nav */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20, paddingTop: 12,
        borderTopWidth: 1, borderTopColor: '#F1F3F5',
      }}>
        {step > 0 ? (
          <TouchableOpacity onPress={goBack}>
            <Text style={{ color: '#868E96', fontSize: 15 }}>Retour</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
            <Text style={{ color: '#868E96', fontSize: 15 }}>Passer</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={goNext}
          disabled={saveMutation.isPending}
          style={{
            backgroundColor: '#6C5CE7', paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24,
            opacity: saveMutation.isPending ? 0.6 : 1,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
            {step === STEPS.length - 1 ? (saveMutation.isPending ? 'Enregistrement...' : "C'est parti !") : 'Suivant'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FeatureRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{
        width: 36, height: 36, borderRadius: 18, backgroundColor: '#6C5CE710',
        justifyContent: 'center', alignItems: 'center',
      }}>
        <Ionicons name={icon as any} size={18} color="#6C5CE7" />
      </View>
      <Text style={{ fontSize: 14, color: '#2D3436' }}>{text}</Text>
    </View>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={{ fontSize: 13, fontWeight: '600', color: '#495057', marginBottom: 6 }}>{text}</Text>;
}

function Input({ multiline, ...props }: any) {
  return (
    <TextInput
      {...props}
      multiline={multiline}
      style={{
        backgroundColor: '#F8F9FA', borderRadius: 12, paddingHorizontal: 14,
        paddingVertical: 12, fontSize: 14, color: '#2D3436', marginBottom: 16,
        borderWidth: 1, borderColor: '#E9ECEF',
        ...(multiline ? { minHeight: 80, textAlignVertical: 'top' } : {}),
      }}
      placeholderTextColor="#ADB5BD"
    />
  );
}
