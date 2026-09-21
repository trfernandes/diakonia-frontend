import { IconLibrary } from '../components/FancyIcons';

// Conteúdo do changelog in-app, versionado no código (sem CMS por ora).
// Ao lançar uma versão com novidades pro usuário, adicione uma entrada no topo
// da lista com o `version` exato de app.json.
export type ChangelogItem = {
  icon: { library: IconLibrary; name: string };
  title: string;
  description: string;
  // Cor de destaque do ícone — usa os tokens já existentes no tema. Padrão: 'primary'.
  accent?: 'primary' | 'secondary' | 'terciary' | 'confirm' | 'warning';
};

export type ChangelogEntry = {
  version: string;
  items: ChangelogItem[];
};

export const CHANGELOG: ChangelogEntry[] = [];
