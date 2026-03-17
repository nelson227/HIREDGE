import { View, Text, TouchableOpacity, TextInput, ScrollView, Dimensions, Platform } from 'react-native';
import { useState, useRef } from 'react';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import api, { profileApi } from '../lib/api';
import { useThemeColors } from '../lib/theme';
import { useTranslation } from '../lib/i18n';

const { width } = Dimensions.get('window');

const STEPS_COUNT = 5;

const POPULAR_SKILLS = [
  'JavaScript', 'Python', 'React', 'Node.js', 'Java', 'SQL', 'TypeScript',
  'Management', 'Marketing Digital', 'Comptabilité', 'Design', 'Communication',
  'Excel', 'Vente', 'Gestion de projet', 'AWS', 'Docker', 'Agile',
];

export default function OnboardingScreen() {
  const { colors } = useThemeColors();
  const { t } = useTranslation();
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
    if (step < STEPS_COUNT - 1) {
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
          {Array.from({ length: STEPS_COUNT }).map((_, i) => (
            <View key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              backgroundColor: i <= step ? colors.primary : colors.border,
            }} />
          ))}
        </View>
        <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 8, textAlign: 'center' }}>
          {t('onboardingStepOf').replace('{current}', String(step + 1)).replace('{total}', String(STEPS_COUNT))}
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
            {t('onboardingWelcomeTitle')}
          </Text>
          <Text style={{ fontSize: 13, color: colors.mutedForeground, textAlign: 'center', marginTop: 10, lineHeight: 20 }}>
            {t('onboardingWelcomeSubtitle')}
          </Text>
          <View style={{
            marginTop: 32, backgroundColor: colors.card, borderRadius: 12,
            borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
          }}>
            <FeatureRow icon="sparkles-outline" text={t('onboardingFeature1')} border colors={colors} />
            <FeatureRow icon="chatbubble-outline" text={t('onboardingFeature2')} border colors={colors} />
            <FeatureRow icon="people-outline" text={t('onboardingFeature3')} border colors={colors} />
            <FeatureRow icon="telescope-outline" text={t('onboardingFeature4')} colors={colors} />
          </View>
        </View>

        {/* Step 1: Profile */}
        <View style={{ width, paddingHorizontal: 28, paddingTop: 32 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground }}>{t('onboardingProfileTitle')}</Text>
          <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4, marginBottom: 20 }}>
            {t('onboardingProfileSubtitle')}
          </Text>
          <Label text={t('onboardingJobTitle')} colors={colors} />
          <StyledInput
            placeholder={t('onboardingJobTitlePlaceholder')}
            value={form.title}
            onChangeText={(val: string) => setForm(p => ({ ...p, title: val }))}
            colors={colors}
          />
          <Label text={t('onboardingBio')} colors={colors} />
          <StyledInput
            placeholder={t('onboardingBioPlaceholder')}
            value={form.bio}
            onChangeText={(val: string) => setForm(p => ({ ...p, bio: val }))}
            multiline
            colors={colors}
          />
          <Label text={t('onboardingCities')} colors={colors} />
          <StyledInput
            placeholder={t('onboardingCitiesPlaceholder')}
            value={form.locations.join(', ')}
            onChangeText={(val: string) => setForm(p => ({ ...p, locations: val.split(',').map(s => s.trim()).filter(Boolean) }))}
            colors={colors}
          />
        </View>

        {/* Step 2: Skills */}
        <View style={{ width, paddingHorizontal: 28, paddingTop: 32 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground }}>{t('onboardingSkillsTitle')}</Text>
          <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4, marginBottom: 20 }}>
            {t('onboardingSkillsSubtitle')} ({t('onboardingSkillsSelected').replace('{n}', String(form.skills.length))})
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
          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.foreground }}>{t('onboardingPrefsTitle')}</Text>
          <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4, marginBottom: 20 }}>
            {t('onboardingPrefsSubtitle')}
          </Text>

          <Label text={t('onboardingContractType')} colors={colors} />
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

          <Label text={t('onboardingSalaryMin')} colors={colors} />
          <StyledInput
            placeholder={t('onboardingSalaryPlaceholder')}
            value={form.salaryMin}
            onChangeText={(val: string) => setForm(p => ({ ...p, salaryMin: val.replace(/\D/g, '') }))}
            keyboardType="numeric"
            colors={colors}
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
            <Text style={{ fontSize: 13, color: colors.foreground, fontWeight: '500' }}>{t('onboardingRemoteOnly')}</Text>
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
            {t('onboardingReadyTitle')}
          </Text>
          <Text style={{ fontSize: 13, color: colors.mutedForeground, textAlign: 'center', marginTop: 10, lineHeight: 20 }}>
            {t('onboardingReadySubtitle')}
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
            <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>{t('onboardingBack')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
            <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>{t('onboardingSkip')}</Text>
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
            {step === STEPS_COUNT - 1 ? (saveMutation.isPending ? t('onboardingSaving') : t('onboardingStart')) : t('onboardingNext')}
          </Text>
          {step < STEPS_COUNT - 1 && <Ionicons name="chevron-forward" size={16} color="#fff" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FeatureRow({ icon, text, border, colors }: { icon: string; text: string; border?: boolean; colors: any }) {
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

function Label({ text, colors }: { text: string; colors: any }) {
  return <Text style={{ fontSize: 12, fontWeight: '600', color: colors.foreground, marginBottom: 6 }}>{text}</Text>;
}

function StyledInput({ multiline, colors, ...props }: any) {
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
