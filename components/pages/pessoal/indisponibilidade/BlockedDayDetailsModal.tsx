import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import FancyBottomSheetModal from '../../../modal/FancyBottomSheetModal';
import FancyText from '../../../FancyText';
import { usePallete } from '../../../../hooks/usePallete';
import { useThemedStyles } from '../../../../hooks/useThemedStyles';
import { ThemePalette } from '../../../../constants/colors';
import { ColorUtils } from '../../../../utils/color_utils';
import DefaultIcons from '../../../FancyIcons';
import { ResponseRegraIndisponibilidadeVoluntarioDto } from '../../../../domain/dtos/RegraIndisponibilidadeVoluntario/regra-indisponibilidade-voluntario.response';
import { descreverRegra } from '../../../../domain/utils/regra_indisponibilidade_utils';
import { DateUtilsApi } from '../../../../utils/date_utils';
import { useMinisterioFuncoesCrud } from '../../../../hooks/useMinisterioFuncoesCrud';

type RegraComEscopo = ResponseRegraIndisponibilidadeVoluntarioDto & {
  aplicaAoDia: boolean;
  ehMaisRestritiva: boolean;
};

type GroupedRegras = {
  geral: RegraComEscopo[];
  porFuncao: RegraComEscopo[];
};

export default function BlockedDayDetailsModal({
  visible,
  onClose,
  selectedDate,
  regras,
  indisponibilidadesPontuais,
}: {
  visible: boolean;
  onClose: () => void;
  selectedDate?: Date;
  regras: ResponseRegraIndisponibilidadeVoluntarioDto[];
  indisponibilidadesPontuais: Array<{ data: string; motivo?: string | null }>;
}) {
  const palette = usePallete();
  const styles = useThemedStyles(createStyles);

  // Mapa de todas as funções por ID para lookup
  const { data: allFuncoes } = useMinisterioFuncoesCrud({
    autoFetch: true,
  });

  const funcaoNomeMap = useMemo(() => {
    const map = new Map<string, string>();
    if (allFuncoes) {
      allFuncoes.forEach((f: any) => {
        map.set(f.id, f.nome);
      });
    }
    return map;
  }, [allFuncoes]);

  // Helper para resolver nome de função
  const resolveFuncaoNome = (funcaoId: string): string => {
    return funcaoNomeMap.get(funcaoId) || 'Função desconhecida';
  };

  const groupedRegras = useMemo(() => {
    if (!selectedDate) return { geral: [], porFuncao: [] };

    // Verifica regras pontuais primeiro (têm prioridade)
    const regrasAplicaveis = regras
      .filter((regra) => {
        // Verifica se a regra aplica ao dia selecionado
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
          } else {
            return selectedDate >= inicio && selectedDate <= fim;
          }
        }
        return false;
      })
      .map((regra) => ({
        ...regra,
        aplicaAoDia: true,
        ehMaisRestritiva: false,
      }));

    if (regrasAplicaveis.length === 0) {
      return { geral: [], porFuncao: [] };
    }

    // Identifica qual regra é mais restritiva
    // Regra mais restritiva: bloqueia sem função > bloqueia com função
    let maisRestritiva: RegraComEscopo | null = null;
    for (const regra of regrasAplicaveis) {
      if (!maisRestritiva) {
        maisRestritiva = regra;
      } else {
        // Sem ministério é mais restritivo (vazio ou bloqueia tudo)
        const regraTemMinisterio =
          regra.ministeriosInteirosIds && regra.ministeriosInteirosIds.length > 0;
        const maisRestrivaTem =
          maisRestritiva.ministeriosInteirosIds && maisRestritiva.ministeriosInteirosIds.length > 0;

        if (!regraTemMinisterio && maisRestrivaTem) {
          maisRestritiva = regra;
        }
        // Ministério sem função é mais restritivo que com função
        if (
          regraTemMinisterio &&
          maisRestrivaTem &&
          !regra.funcoesIds?.length &&
          maisRestritiva.funcoesIds?.length
        ) {
          maisRestritiva = regra;
        }
      }
    }

    // Marca a mais restritiva
    const regrasComMarcacao = regrasAplicaveis.map((regra) => ({
      ...regra,
      ehMaisRestritiva: maisRestritiva?.id === regra.id,
    }));

    // Agrupa por tipo de escopo
    const geral = regrasComMarcacao.filter(
      (r) => !r.ministeriosInteirosIds || r.ministeriosInteirosIds.length === 0,
    );
    const porFuncao = regrasComMarcacao.filter(
      (r) => r.ministeriosInteirosIds && r.ministeriosInteirosIds.length > 0,
    );

    return { geral, porFuncao };
  }, [selectedDate, regras]);

  return (
    <FancyBottomSheetModal
      visible={visible}
      onClose={onClose}
      title={selectedDate ? `Bloqueio em ${selectedDate.toLocaleDateString('pt-BR')}` : 'Bloqueio'}
    >
      <View style={styles.content}>
        {/* Bloqueio geral */}
        {groupedRegras.geral.length > 0 && (
          <View style={styles.section}>
            <FancyText type='semiBold' size='small' color={palette.fonts.dark}>
              Bloqueio geral
            </FancyText>
            {groupedRegras.geral.map((regra) => (
              <RegraBloqueioItem
                key={regra.id}
                regra={regra}
                palette={palette}
                styles={styles}
                resolveFuncaoNome={resolveFuncaoNome}
              />
            ))}
          </View>
        )}

        {/* Por função */}
        {groupedRegras.porFuncao.length > 0 && (
          <View style={styles.section}>
            <FancyText type='semiBold' size='small' color={palette.fonts.dark}>
              Por função
            </FancyText>
            {groupedRegras.porFuncao.map((regra) => (
              <RegraBloqueioItem
                key={regra.id}
                regra={regra}
                palette={palette}
                styles={styles}
                resolveFuncaoNome={resolveFuncaoNome}
              />
            ))}
          </View>
        )}

        {groupedRegras.geral.length === 0 && groupedRegras.porFuncao.length === 0 && (
          <FancyText type='medium' size='small' color={palette.fonts.inactive}>
            Nenhuma regra aplicável a este dia.
          </FancyText>
        )}
      </View>
    </FancyBottomSheetModal>
  );
}

function RegraBloqueioItem({
  regra,
  palette,
  styles,
  resolveFuncaoNome,
}: {
  regra: RegraComEscopo;
  palette: ReturnType<typeof usePallete>;
  styles: ReturnType<typeof createStyles>;
  resolveFuncaoNome: (funcaoId: string) => string;
}) {
  const descricao = descreverRegra(regra);
  const nomeFuncao = regra.funcoesIds?.[0]
    ? `Função: ${resolveFuncaoNome(regra.funcoesIds[0])}`
    : undefined;

  return (
    <View style={styles.regraItem}>
      <View style={styles.regraHeader}>
        {/* Ponto colorido */}
        <View
          style={[
            styles.ponto,
            {
              backgroundColor: regra.ehMaisRestritiva ? palette.error : palette.secondary,
            },
          ]}
        />

        {/* Descrição */}
        <View style={styles.regraTexto}>
          <FancyText type='medium' size='extraSmall' color={palette.fonts.dark}>
            {descricao}
          </FancyText>
          {nomeFuncao && (
            <FancyText type='medium' size='extraSmall' color={palette.fonts.inactive}>
              {nomeFuncao}
            </FancyText>
          )}
        </View>

        {/* Selo */}
        {regra.ehMaisRestritiva ? (
          <View
            style={[styles.selo, { backgroundColor: ColorUtils.withAlpha(palette.error, 0.1) }]}
          >
            <FancyText type='semiBold' size='extraSmall' color={palette.error}>
              Vence
            </FancyText>
          </View>
        ) : (
          <View
            style={[
              styles.selo,
              { backgroundColor: ColorUtils.withAlpha(palette.secondary, 0.12) },
            ]}
          >
            <FancyText type='semiBold' size='extraSmall' color={palette.secondary}>
              Coberta
            </FancyText>
          </View>
        )}
      </View>
    </View>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    content: {
      gap: 16,
    },
    section: {
      gap: 12,
    },
    regraItem: {
      gap: 8,
    },
    regraHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    ponto: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginTop: 5,
      flexShrink: 0,
    },
    regraTexto: {
      flex: 1,
      gap: 2,
    },
    selo: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 8,
      flexShrink: 0,
    },
  });
}
