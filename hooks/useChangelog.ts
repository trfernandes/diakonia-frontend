import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { CHANGELOG, ChangelogEntry } from '../constants/changelog';

const STORAGE_KEY = 'artos_changelog_last_seen_version';

function getCurrentVersion(): string {
  return Application.nativeApplicationVersion || Constants.expoConfig?.version || '0.0.0';
}

function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const partsB = b.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < length; i++) {
    const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }

  return 0;
}

async function getLastSeenVersion(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

async function setLastSeenVersion(version: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, version);
  } catch {
    // ignore
  }
}

export type PendingChangelog = {
  currentVersion: string;
  entries: ChangelogEntry[];
};

/**
 * Resolve o changelog pendente (versões novas desde a última vista) e já marca
 * a versão atual como vista — chame uma única vez por sessão de app aberto.
 *
 * Instalação nova (sem versão anterior registrada) nunca mostra changelog: só
 * grava a versão atual como vista, pra não parecer uma tela de "boas-vindas"
 * incorreta pra quem está instalando o app pela primeira vez.
 */
export async function resolvePendingChangelog(): Promise<PendingChangelog | null> {
  const currentVersion = getCurrentVersion();
  const lastSeenVersion = await getLastSeenVersion();

  if (lastSeenVersion === null) {
    await setLastSeenVersion(currentVersion);
    return null;
  }

  if (compareVersions(currentVersion, lastSeenVersion) <= 0) {
    return null;
  }

  const entries = CHANGELOG.filter(
    (entry) =>
      compareVersions(entry.version, lastSeenVersion) > 0 &&
      compareVersions(entry.version, currentVersion) <= 0,
  ).sort((a, b) => compareVersions(b.version, a.version));

  await setLastSeenVersion(currentVersion);

  if (entries.length === 0) return null;

  return { currentVersion, entries };
}
