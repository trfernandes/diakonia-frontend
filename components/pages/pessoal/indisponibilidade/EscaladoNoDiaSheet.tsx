import { StyleSheet, View } from 'react-native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FancyBottomSheetModal from '../../../modal/FancyBottomSheetModal';
import FancyText from '../../../FancyText';
import FancyButton from '../../../buttons/FancyButton';
import DefaultIcons from '../../../FancyIcons';
import { usePallete } from '../../../../hooks/usePallete';
import { ColorUtils } from '../../../../utils/color_utils';
import { ItemEscalaAfetado } from '../../../../domain/utils/escala_bloqueio_utils';

type Props = {
  visible: boolean;
  date?: Date;
  itens: ItemEscalaAfetado[];
  onPedirSubstituicao: () => void;
  onEscolherOutroDia: () => void;
};

// E2E 2.3 (protótipo aprovado, opção 2): voluntário já escalado em escala publicada
// não pode marcar o dia como indisponível — explica o motivo e aponta a saída certa.
export default function EscaladoNoDiaSheet({
  visible,
  date,
  itens,
  onPedirSubstituicao,
  onEscolherOutroDia,
}: Props) {
  const palette = usePallete();

  return (
    <FancyBottomSheetModal
      visible={visible}
      onClose={onEscolherOutroDia}
      footer={
        <View style={styles.footer}>
          <FancyButton
            type='outlined'
            label='Escolher outro dia'
            onPress={onEscolherOutroDia}
            containerStyle={styles.footerButton}
          />
          <FancyButton
            type='contained'
            label='Pedir substituição'
            onPress={onPedirSubstituicao}
            containerStyle={styles.footerButton}
          />
        </View>
      }
    >
      <View style={styles.header}>
        {date ? (
          <FancyText
            type='semiBold'
            size='extraSmall'
            color={palette.warning}
            style={styles.eyebrow}
          >
            {format(date, "EEE, dd 'de' MMMM", { locale: ptBR })}
          </FancyText>
        ) : null}
        <FancyText type='bold' size='large' color={palette.fonts.dark}>
          Você já está escalado neste dia
        </FancyText>
        <FancyText type='medium' size='small' color={palette.fonts.inactive}>
          A escala já foi publicada, então o dia não pode ficar indisponível. Peça uma substituição:
          quando alguém assumir seu lugar, você fica livre.
        </FancyText>
      </View>

      <View style={styles.content}>
        {itens.map((item) => (
          <View key={item.escalaItemId} style={styles.item}>
            <View
              style={[
                styles.iconeCirculo,
                { backgroundColor: ColorUtils.withAlpha(palette.warning, 0.12) },
              ]}
            >
              <DefaultIcons.Custom
                library='MaterialCommunityIcons'
                name='calendar-account'
                size={20}
                color={palette.warning}
              />
            </View>
            <View style={styles.itemTexto}>
              <FancyText type='semiBold' size='small' color={palette.fonts.dark}>
                {item.nomeEvento ?? 'Evento'}
              </FancyText>
              <FancyText type='medium' size='extraSmall' color={palette.fonts.inactive}>
                {item.ministerio}
                {item.funcao ? ` · ${item.funcao}` : ''}
              </FancyText>
            </View>
          </View>
        ))}
      </View>
    </FancyBottomSheetModal>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4, marginBottom: 8 },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 0.4 },
  content: { gap: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconeCirculo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTexto: { flex: 1, gap: 2 },
  footer: { flexDirection: 'row', gap: 8, flex: 1 },
  footerButton: { flex: 1 },
});
