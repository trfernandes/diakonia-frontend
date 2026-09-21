import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import FancyButton from '../../components/buttons/FancyButton';
import FancyText from '../../components/FancyText';
import DefaultIcons from '../../components/FancyIcons';
import QuizFlatLayout from '../../components/quiz/QuizFlatLayout';
import { usePallete } from '../../hooks/usePallete';
import { ColorUtils } from '../../utils/color_utils';

const META = [
  { value: '6', label: 'perguntas' },
  { value: '1 min', label: 'pra responder' },
  { value: '3', label: 'perfis possíveis' },
];

export default function QuizVendasIntroPage() {
  const Pallete = usePallete();

  return (
    <QuizFlatLayout
      onPressBack={() => router.back()}
      footer={
        <>
          <FancyButton
            label='Ver meu diagnóstico'
            onPress={() => router.push('/(auth)/quiz-vendas')}
            containerStyle={{ backgroundColor: Pallete.terciary }}
          />
          <View style={styles.secondaryLinks}>
            <FancyButton
              type='text'
              label='Já tenho conta'
              onPress={() => router.push('/(auth)/login')}
              labelStyle={{ color: Pallete.fonts.inactive }}
            />
            <FancyButton
              type='text'
              label='Sou voluntário, já tenho convite'
              onPress={() => router.push('/(auth)/create-voluntario-account')}
              labelStyle={{ color: Pallete.fonts.inactive }}
            />
          </View>
        </>
      }
    >
      <View style={styles.body}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: ColorUtils.withAlpha(Pallete.primary, 0.1) },
          ]}
        >
          <DefaultIcons.Custom
            library='MaterialCommunityIcons'
            name='clipboard-list-outline'
            size={28}
            color={Pallete.primary}
          />
        </View>

        <FancyText size='large' type='bold' color={Pallete.fonts.dark} style={styles.title}>
          Quanto tempo sua escala está te custando?
        </FancyText>
        <FancyText size='small' color={Pallete.fonts.inactive} style={styles.subtitle}>
          6 perguntas rápidas revelam seu perfil de organização e o que mais consome seu tempo hoje.
        </FancyText>

        <View style={styles.meta}>
          {META.map((item) => (
            <View key={item.label} style={styles.metaItem}>
              <FancyText size='small' type='bold' color={Pallete.fonts.dark}>
                {item.value}
              </FancyText>
              <FancyText size='extraSmall' color={Pallete.fonts.inactive}>
                {item.label}
              </FancyText>
            </View>
          ))}
        </View>
      </View>
    </QuizFlatLayout>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingVertical: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    lineHeight: 26,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 4,
  },
  metaItem: {
    alignItems: 'center',
    gap: 2,
  },
  secondaryLinks: {
    alignItems: 'center',
  },
});
