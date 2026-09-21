import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, View } from 'react-native';

import FancyBottomSheetModal from '../../modal/FancyBottomSheetModal';
import FancyButton from '../../buttons/FancyButton';
import FancyListEmpty from '../../list/FancyListEmpty';
import FancyTextInput from '../../fields/FancyTextInput';
import FancyText from '../../FancyText';
import DefaultIcons from '../../FancyIcons';
import { AxiosError } from 'axios';
import { useYoutubeVersionSearch } from '../../../hooks/useRepertorio';
import { ResponseYoutubeSearchItemDto } from '../../../domain/dtos/Repertorio/youtube-search-item.response';
import { usePallete } from '../../../hooks/usePallete';
import { ColorUtils } from '../../../utils/color_utils';

type Props = {
  visible: boolean;
  onClose: () => void;
  initialQuery?: string;
  onSelect: (item: ResponseYoutubeSearchItemDto) => void;
};

export default function YoutubeVersionSearchSheet({
  visible,
  onClose,
  initialQuery,
  onSelect,
}: Props) {
  const palette = usePallete();
  const [searchText, setSearchText] = useState(initialQuery?.trim() ?? '');
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery?.trim() ?? '');
  const hasSearchText = searchText.length > 0;

  useEffect(() => {
    if (!visible) return;
    const nextValue = initialQuery?.trim() ?? '';
    setSearchText(nextValue);
    setDebouncedQuery(nextValue);
  }, [initialQuery, visible]);

  useEffect(() => {
    if (!visible) return;
    const timeout = setTimeout(() => setDebouncedQuery(searchText.trim()), 400);
    return () => clearTimeout(timeout);
  }, [searchText, visible]);

  const {
    data = [],
    isFetching,
    isError,
    error,
  } = useYoutubeVersionSearch(debouncedQuery, visible, 6);
  const isRateLimited = (error as AxiosError)?.response?.status === 429;

  const searchUrl = useMemo(() => {
    const normalized = searchText.trim();
    if (!normalized) return null;
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(normalized)}`;
  }, [searchText]);

  const renderState = () => {
    const normalizedQuery = debouncedQuery.trim();

    if (normalizedQuery.length < 2) {
      return (
        <FancyListEmpty
          label='Busque pela música'
          labelColor={palette.fonts.dark}
          helperText='Use o nome da música e, se quiser, o intérprete para encontrar a versão certa no YouTube.'
          icon={{ library: 'Feather', name: 'search', size: 48, color: palette.primary }}
        />
      );
    }

    if (isFetching) {
      return (
        <View style={styles.feedbackBlock}>
          <ActivityIndicator color={palette.primary} size='large' />
          <FancyText size='small' color={palette.fonts.inactive}>
            Buscando versões...
          </FancyText>
        </View>
      );
    }

    if (isError) {
      return (
        <FancyListEmpty
          label={isRateLimited ? 'Muitas buscas agora' : 'Serviço indisponível'}
          helperText={
            isRateLimited
              ? 'Muita gente buscando no YouTube ao mesmo tempo. Tente novamente em alguns minutos, ou continue manualmente.'
              : 'Não foi possível buscar agora. Tente abrir no YouTube ou continue manualmente.'
          }
          icon={{
            library: 'MaterialCommunityIcons',
            name: isRateLimited ? 'clock-outline' : 'wifi-off',
            size: 48,
            color: palette.warning,
          }}
          labelColor={palette.warning}
        />
      );
    }

    if (data.length === 0) {
      return (
        <FancyListEmpty
          label='Nenhuma versão encontrada'
          labelColor={palette.fonts.dark}
          helperText='Tente ajustar o nome da música ou incluir o intérprete na busca.'
          icon={{ library: 'Feather', name: 'music', size: 48, color: palette.primary }}
        />
      );
    }

    return (
      <View style={styles.resultsBlock}>
        <View style={styles.resultsHeader}>
          <FancyText
            size='extraSmall'
            type='semiBold'
            color={palette.fonts.inactive}
            numberOfLines={1}
          >
            {data.length} resultado{data.length === 1 ? '' : 's'} encontrado
            {data.length === 1 ? '' : 's'}
          </FancyText>
          <FancyText size='extraSmall' color={palette.fonts.inactive2} numberOfLines={1}>
            YouTube
          </FancyText>
        </View>

        <View style={styles.resultsList}>
          {data.map((item) => (
            <Pressable
              key={item.videoId}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
              style={[
                styles.resultCard,
                {
                  backgroundColor: palette.backgroundColor4,
                  borderColor: ColorUtils.withAlpha(palette.primary, 0.1),
                },
              ]}
            >
              <Image
                source={{ uri: item.thumbnailUrl }}
                style={[styles.thumbnail, { backgroundColor: palette.backgroundColor2 }]}
              />
              <View style={styles.resultContent}>
                <FancyText type='semiBold' size='small' numberOfLines={2}>
                  {item.title}
                </FancyText>
                <FancyText size='extraSmall' color={palette.fonts.inactive} numberOfLines={1}>
                  {item.channelTitle}
                </FancyText>
              </View>
              <View
                style={[
                  styles.resultAction,
                  { backgroundColor: ColorUtils.withAlpha(palette.primary, 0.12) },
                ]}
              >
                <DefaultIcons.Custom
                  library='Feather'
                  name='chevron-right'
                  size={15}
                  color={palette.primary}
                />
              </View>
            </Pressable>
          ))}
        </View>
      </View>
    );
  };

  return (
    <FancyBottomSheetModal
      visible={visible}
      onClose={onClose}
      title='Buscar no YouTube'
      footer={
        <View style={styles.footerActions}>
          <FancyButton
            label='Abrir no YouTube'
            type='outlined'
            size={40}
            icon={{ library: 'MaterialCommunityIcons', name: 'youtube', size: 18 }}
            containerStyle={styles.footerPrimaryBtn}
            disabled={!searchUrl}
            onPress={() => {
              if (searchUrl) {
                void Linking.openURL(searchUrl);
              }
            }}
          />
          <FancyButton
            label='Continuar manualmente'
            type='text'
            size={36}
            containerStyle={styles.footerSecondaryBtn}
            onPress={onClose}
          />
        </View>
      }
    >
      <View style={styles.content}>
        <FancyText size='extraSmall' color={palette.fonts.inactive}>
          Selecione uma versão para preencher o link do repertório sem sair do app.
        </FancyText>

        <FancyTextInput
          label='Buscar música ou intérprete'
          value={searchText}
          inputProps={{
            onChangeText: setSearchText,
            autoCapitalize: 'none',
            autoCorrect: false,
            returnKeyType: 'search',
          }}
          rightContainer={[
            hasSearchText
              ? {
                  icon: {
                    library: 'Feather',
                    name: 'x-circle',
                    size: 18,
                    color: palette.icons.inactive,
                  },
                  onPress: () => {
                    setSearchText('');
                    setDebouncedQuery('');
                  },
                }
              : {
                  icon: { library: 'Feather', name: 'search', size: 18, color: palette.primary },
                },
          ]}
        />

        {renderState()}
      </View>
    </FancyBottomSheetModal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  feedbackBlock: {
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resultsBlock: {
    gap: 8,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 2,
  },
  resultsList: {
    gap: 8,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  thumbnail: {
    width: 74,
    height: 48,
    borderRadius: 6,
  },
  resultContent: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  resultAction: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  footerActions: {
    flexDirection: 'column',
    gap: 4,
  },
  footerPrimaryBtn: {
    width: '100%',
  },
  footerSecondaryBtn: {
    alignSelf: 'center',
  },
});
