import { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, ScrollView, Pressable } from 'react-native';
import FancyBottomSheetModal from '../../../modal/FancyBottomSheetModal';
import FancyText from '../../../FancyText';
import FancyButton from '../../../buttons/FancyButton';
import FancyErrorBanner from '../../../forms/FancyErrorBanner';
import FancyChips from '../../../FancyChips';
import DefaultIcons from '../../../FancyIcons';
import { usePallete } from '../../../../hooks/usePallete';
import { useThemedStyles } from '../../../../hooks/useThemedStyles';
import { ThemePalette } from '../../../../constants/colors';
import { ColorUtils } from '../../../../utils/color_utils';
import { agruparFuncoesPorMinisterio } from '../../../../domain/utils/escopo_indisponibilidade_utils';

type MinisterioInfo = {
  id: string;
  nome: string;
};

type FuncaoInfo = {
  id: string;
  nome: string;
  ministerioId: string;
};

export type EscopoIndisponibilidadeSheetProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (ministeriosInteirosIds: string[], funcoesIds: string[]) => void;
  ministeriosInteirosIds: string[] | null | undefined;
  funcoesIds: string[] | null | undefined;
  ministerios: MinisterioInfo[];
  funcoes: FuncaoInfo[];
  isLoading?: boolean;
};

export default function EscopoIndisponibilidadeSheet({
  visible,
  onClose,
  onConfirm,
  ministeriosInteirosIds: initialMinisteriosInteiros,
  funcoesIds: initialFuncoes,
  ministerios,
  funcoes,
  isLoading = false,
}: EscopoIndisponibilidadeSheetProps) {
  const palette = usePallete();
  const styles = useThemedStyles(createStyles);

  const [ministeriosInteiros, setMinisteriosInteiros] = useState<Set<string>>(
    new Set(initialMinisteriosInteiros?.filter((id) => id) ?? []),
  );
  const [funcoesSelecionadas, setFuncoesSelecionadas] = useState<Set<string>>(
    new Set(initialFuncoes?.filter((id) => id) ?? []),
  );
  const [expandedMinisterios, setExpandedMinisterios] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setMinisteriosInteiros(new Set(initialMinisteriosInteiros?.filter((id) => id) ?? []));
      setFuncoesSelecionadas(new Set(initialFuncoes?.filter((id) => id) ?? []));
      setExpandedMinisterios(new Set());
      setError(null);
    }
  }, [visible, initialMinisteriosInteiros, initialFuncoes]);

  const funcoesPorMinisterio = useMemo(() => {
    return agruparFuncoesPorMinisterio(funcoes, ministerios);
  }, [funcoes, ministerios]);

  const toggleMinisterioExpanded = (ministerioId: string) => {
    const newSet = new Set(expandedMinisterios);
    if (newSet.has(ministerioId)) {
      newSet.delete(ministerioId);
    } else {
      newSet.add(ministerioId);
    }
    setExpandedMinisterios(newSet);
  };

  const toggleMinisterioInteiro = (ministerioId: string) => {
    const newMinisterios = new Set(ministeriosInteiros);
    const newFuncoes = new Set(funcoesSelecionadas);

    if (newMinisterios.has(ministerioId)) {
      // Desmarcar ministério inteiro
      newMinisterios.delete(ministerioId);
    } else {
      // Marcar ministério inteiro: remove funções específicas dele
      newMinisterios.add(ministerioId);
      const funcoesDesse =
        funcoesPorMinisterio
          .find((g) => g.ministerioId === ministerioId)
          ?.funcoes.map((f) => f.id) ?? [];
      funcoesDesse.forEach((fId) => newFuncoes.delete(fId));
    }

    setMinisteriosInteiros(newMinisterios);
    setFuncoesSelecionadas(newFuncoes);
    setError(null);
  };

  const toggleFuncao = (funcaoId: string, ministerioId: string) => {
    const newFuncoes = new Set(funcoesSelecionadas);

    if (newFuncoes.has(funcaoId)) {
      newFuncoes.delete(funcaoId);
    } else {
      // Se marcar uma função, remove o ministério inteiro desse grupo
      const newMinisterios = new Set(ministeriosInteiros);
      newMinisterios.delete(ministerioId);
      setMinisteriosInteiros(newMinisterios);
      newFuncoes.add(funcaoId);
    }

    setFuncoesSelecionadas(newFuncoes);
    setError(null);
  };

  const getMinisterioCheckboxState = (ministerioId: string) => {
    const temFuncoesDoMinisterio =
      funcoesPorMinisterio.find((g) => g.ministerioId === ministerioId)?.funcoes.map((f) => f.id) ??
      [];
    const temFuncoesSelecionadas = temFuncoesDoMinisterio.some((fId) =>
      funcoesSelecionadas.has(fId),
    );
    const ministerioInteiro = ministeriosInteiros.has(ministerioId);

    if (ministerioInteiro) return 'checked';
    if (temFuncoesSelecionadas) return 'partial';
    return 'unchecked';
  };

  const handleConfirm = () => {
    if (ministeriosInteiros.size === 0 && funcoesSelecionadas.size === 0) {
      setError('Selecione ao menos um ministério ou uma função');
      return;
    }
    onConfirm(Array.from(ministeriosInteiros), Array.from(funcoesSelecionadas));
    onClose();
  };

  return (
    <FancyBottomSheetModal
      visible={visible}
      onClose={onClose}
      title='Onde vale esta indisponibilidade?'
      closeDisabled={isLoading}
      footer={
        <View style={styles.footerActions}>
          <FancyButton
            label='Cancelar'
            type='outlined'
            onPress={onClose}
            disabled={isLoading}
            containerStyle={styles.footerButton}
          />
          <FancyButton
            label='Confirmar'
            onPress={handleConfirm}
            isLoading={isLoading}
            containerStyle={styles.footerButton}
          />
        </View>
      }
    >
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {error && <FancyErrorBanner message={error} />}

        <View style={styles.descricao}>
          <FancyText size='small' type='medium' color={palette.fonts.inactive}>
            Selecione os ministérios ou funções para os quais esta indisponibilidade vale. Se marcar
            um ministério inteiro, o voluntário fica indisponível em todas as funções desse
            ministério.
          </FancyText>
        </View>

        {funcoesPorMinisterio.map((grupo) => {
          const isExpanded = expandedMinisterios.has(grupo.ministerioId);
          const checkboxState = getMinisterioCheckboxState(grupo.ministerioId);

          return (
            <View key={grupo.ministerioId} style={styles.ministerioBloco}>
              {/* Header com expand/collapse */}
              <Pressable
                onPress={() => toggleMinisterioExpanded(grupo.ministerioId)}
                disabled={isLoading}
              >
                <View style={styles.ministerioHeaderRow}>
                  {/* Checkbox do ministério */}
                  <Pressable
                    onPress={() => toggleMinisterioInteiro(grupo.ministerioId)}
                    disabled={isLoading}
                    style={styles.checkboxArea}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        checkboxState === 'checked' && {
                          backgroundColor: palette.primary,
                          borderColor: palette.primary,
                        },
                        checkboxState === 'partial' && {
                          backgroundColor: palette.primary,
                          borderColor: palette.primary,
                        },
                        checkboxState === 'unchecked' && {
                          backgroundColor: palette.backgroundColor,
                          borderColor: palette.border,
                        },
                      ]}
                    >
                      {checkboxState === 'checked' && (
                        <FancyText size='small' type='bold' color={palette.fonts.light}>
                          ✓
                        </FancyText>
                      )}
                      {checkboxState === 'partial' && (
                        <FancyText size='small' type='bold' color={palette.fonts.light}>
                          −
                        </FancyText>
                      )}
                    </View>
                  </Pressable>

                  {/* Nome do ministério */}
                  <FancyText size='medium' type='semiBold' color={palette.fonts.dark}>
                    {grupo.ministerioNome}
                  </FancyText>

                  {/* Seta de expand/collapse */}
                  <View style={{ marginLeft: 'auto' }}>
                    {DefaultIcons.Custom({
                      library: 'MaterialCommunityIcons',
                      name: isExpanded ? 'chevron-down' : 'chevron-right',
                      size: 24,
                      color: palette.fonts.dark,
                    })}
                  </View>
                </View>
              </Pressable>

              {/* Funções em chips (quando expandido e ministério NÃO inteiro) */}
              {isExpanded &&
                !ministeriosInteiros.has(grupo.ministerioId) &&
                grupo.funcoes.length > 0 && (
                  <View style={styles.funcoesContainer}>
                    <View style={styles.chipsRow}>
                      {grupo.funcoes.map((funcao) => {
                        const isSelected = funcoesSelecionadas.has(funcao.id);
                        return (
                          <FancyChips
                            key={funcao.id}
                            label={funcao.nome}
                            color={isSelected ? palette.fonts.light : palette.primary}
                            backgroundColor={
                              isSelected
                                ? palette.primary
                                : ColorUtils.withAlpha(palette.primary, 0.12)
                            }
                            onPress={() => toggleFuncao(funcao.id, grupo.ministerioId)}
                            size='small'
                            outlined={!isSelected}
                          />
                        );
                      })}
                    </View>
                  </View>
                )}
            </View>
          );
        })}
      </ScrollView>
    </FancyBottomSheetModal>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    content: {
      paddingBottom: 16,
    },
    descricao: {
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    ministerioBloco: {
      marginBottom: 12,
      borderRadius: 8,
      backgroundColor: ColorUtils.withAlpha(palette.primary, 0.03),
      borderWidth: 1,
      borderColor: palette.border,
      overflow: 'hidden',
    },
    ministerioHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      gap: 12,
    },
    checkboxArea: {
      padding: 4,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 4,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    funcoesContainer: {
      backgroundColor: ColorUtils.withAlpha(palette.primary, 0.02),
      borderTopWidth: 1,
      borderTopColor: palette.border,
      paddingVertical: 12,
      paddingHorizontal: 16,
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    footerActions: {
      flexDirection: 'row',
      gap: 10,
      paddingBottom: 2,
    },
    footerButton: {
      flex: 1,
    },
  });
}
