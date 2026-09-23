import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import FancyBottomSheetModal from '../../../modal/FancyBottomSheetModal';
import FancyText from '../../../FancyText';
import FancyButton from '../../../buttons/FancyButton';
import { usePallete } from '../../../../hooks/usePallete';
import { useThemedStyles } from '../../../../hooks/useThemedStyles';
import { ThemePalette } from '../../../../constants/colors';
import { ColorUtils } from '../../../../utils/color_utils';
import DefaultIcons from '../../../FancyIcons';
import { ResponseRegraIndisponibilidadeVoluntarioDto } from '../../../../domain/dtos/RegraIndisponibilidadeVoluntario/regra-indisponibilidade-voluntario.response';
import { descreverRegra, regraIcone } from '../../../../domain/utils/regra_indisponibilidade_utils';
import { DateUtilsApi } from '../../../../utils/date_utils';
import { useMinisterioFuncoesCrud } from '../../../../hooks/useMinisterioFuncoesCrud';
import { useMinisteriosCrud } from '../../../../hooks/useMinisteriosCrud';

type CausaAvulsa = {
  tipo: 'avulsa';
  id: string;
  motivo: string | null;
};

type CausaRegra = {
  tipo: 'regra';
  id: string;
  regra: ResponseRegraIndisponibilidadeVoluntarioDto;
};

type Causa = CausaAvulsa | CausaRegra;

export default function BlockedDayDetailsModal({
  visible,
  onClose,
  selectedDate,
  regras,
  indisponibilidadesPontuais,
  voluntarioNome,
}: {
  visible: boolean;
  onClose: () => void;
  selectedDate?: Date;
  regras: ResponseRegraIndisponibilidadeVoluntarioDto[];
  indisponibilidadesPontuais: Array<{ data: string; motivo?: string | null }>;
  voluntarioNome?: string;
}) {
  const palette = usePallete();
  const styles = useThemedStyles(createStyles);

  const { data: allFuncoes } = useMinisterioFuncoesCrud({ autoFetch: true });
  const { data: ministeriosData } = useMinisteriosCrud({ autoFetch: true });

  const funcaoNomeMap = useMemo(() => {
    const map = new Map<string, string>();
    allFuncoes?.forEach((f: any) => map.set(f.id, f.nome));
    return map;
  }, [allFuncoes]);

  const ministerioNomeMap = useMemo(() => {
    const map = new Map<string, string>();
    ministeriosData?.forEach((m: any) => map.set(m.id, m.nome));
    return map;
  }, [ministeriosData]);

  const resolveFuncaoNome = (funcaoId: string): string =>
    funcaoNomeMap.get(funcaoId) || 'Função desconhecida';

  const causas = useMemo<Causa[]>(() => {
    if (!selectedDate) return [];

    const avulsas: Causa[] = indisponibilidadesPontuais
      .filter((item) => DateUtilsApi.compareDateOnlyFromApi(item.data, selectedDate))
      .map((item) => ({ tipo: 'avulsa', id: item.data, motivo: item.motivo ?? null }));

    const regrasAplicaveis: Causa[] = regras
      .filter((regra) => {
        if (regra.tipo === 'DIAS_SEMANA' && regra.diasSemana?.length) {
          return regra.diasSemana.includes(selectedDate.getDay());
        }
        if (regra.tipo === 'PERIODO' && regra.dataInicio && regra.dataFim) {
          const inicio = new Date(regra.dataInicio + 'T00:00:00Z');
          const fim = new Date(regra.dataFim + 'T00:00:00Z');

          if (regra.recorrente) {
            const mmddSelecionado = DateUtilsApi.dateOnlyToApi(selectedDate).slice(5);
            const mmddInicio = regra.dataInicio.slice(5);
            const mmddFim = regra.dataFim.slice(5);
            const crossYear = mmddInicio > mmddFim;
            return crossYear
              ? mmddSelecionado >= mmddInicio || mmddSelecionado <= mmddFim
              : mmddSelecionado >= mmddInicio && mmddSelecionado <= mmddFim;
          }
          return selectedDate >= inicio && selectedDate <= fim;
        }
        return false;
      })
      .map((regra) => ({ tipo: 'regra', id: regra.id, regra }));

    return [...avulsas, ...regrasAplicaveis];
  }, [selectedDate, regras, indisponibilidadesPontuais]);

  return (
    <FancyBottomSheetModal
      visible={visible}
      onClose={onClose}
      footer={
        <FancyButton
          label='Fechar'
          type='outlined'
          onPress={onClose}
          containerStyle={styles.footerButton}
        />
      }
    >
      <View style={styles.header}>
        {selectedDate && (
          <FancyText
            type='semiBold'
            size='extraSmall'
            color={palette.secondary}
            style={styles.eyebrow}
          >
            {selectedDate
              .toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'long' })
              .replace('.', '')}
          </FancyText>
        )}
        <FancyText type='bold' size='large' color={palette.fonts.dark}>
          Por que está indisponível
        </FancyText>
      </View>

      <View style={styles.content}>
        {causas.length === 0 && (
          <FancyText type='medium' size='small' color={palette.fonts.inactive}>
            Nenhuma causa encontrada para este dia.
          </FancyText>
        )}

        {causas.map((causa, index) => (
          <View key={`${causa.tipo}-${causa.id}`}>
            {causa.tipo === 'avulsa' ? (
              <CausaItem
                icone={DefaultIcons.Custom({
                  library: 'MaterialCommunityIcons',
                  name: 'calendar-remove',
                  size: 20,
                  color: palette.secondary,
                })}
                cor={palette.secondary}
                label={
                  voluntarioNome
                    ? `Bloqueio pontual — registrado por ${voluntarioNome}`
                    : 'Bloqueio pontual'
                }
                corpo={causa.motivo?.trim() || 'Sem motivo informado.'}
                palette={palette}
                styles={styles}
              />
            ) : (
              <CausaItem
                icone={DefaultIcons.Custom({
                  library: 'MaterialCommunityIcons',
                  name: regraIcone(causa.regra),
                  size: 20,
                  color: palette.primary,
                })}
                cor={palette.primary}
                label={
                  causa.regra.ministerioId
                    ? `Regra do ministério — ${ministerioNomeMap.get(causa.regra.ministerioId) ?? 'Ministério'}`
                    : 'Regra geral'
                }
                corpo={descreverRegra(causa.regra)}
                subcorpo={
                  causa.regra.funcoes?.[0]
                    ? `Função: ${resolveFuncaoNome(causa.regra.funcoes[0])}`
                    : undefined
                }
                palette={palette}
                styles={styles}
              />
            )}
            {index < causas.length - 1 && <View style={styles.divider} />}
          </View>
        ))}
      </View>
    </FancyBottomSheetModal>
  );
}

function CausaItem({
  icone,
  cor,
  label,
  corpo,
  subcorpo,
  palette,
  styles,
}: {
  icone: React.ReactNode;
  cor: string;
  label: string;
  corpo: string;
  subcorpo?: string;
  palette: ReturnType<typeof usePallete>;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.causaItem}>
      <View style={[styles.iconeCirculo, { backgroundColor: ColorUtils.withAlpha(cor, 0.12) }]}>
        {icone}
      </View>
      <View style={styles.causaTexto}>
        <FancyText type='semiBold' size='extraSmall' color={cor}>
          {label}
        </FancyText>
        <FancyText type='medium' size='small' color={palette.fonts.dark}>
          {corpo}
        </FancyText>
        {subcorpo && (
          <FancyText type='medium' size='extraSmall' color={palette.fonts.inactive}>
            {subcorpo}
          </FancyText>
        )}
      </View>
    </View>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    header: {
      gap: 2,
      marginBottom: 4,
    },
    eyebrow: {
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    content: {
      gap: 16,
    },
    causaItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    iconeCirculo: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    causaTexto: {
      flex: 1,
      gap: 4,
      paddingTop: 2,
    },
    divider: {
      height: 1,
      backgroundColor: palette.border,
      marginTop: 16,
    },
    footerButton: {
      flex: 1,
    },
  });
}
