import { useEffect, useState } from 'react';
import { resolvePendingChangelog, PendingChangelog } from '../hooks/useChangelog';
import ChangelogSheet from './ChangelogSheet';

export function ChangelogManager() {
  const [pending, setPending] = useState<PendingChangelog | null>(null);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const result = await resolvePendingChangelog();
      if (result) setPending(result);
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  if (!pending) return null;

  return (
    <ChangelogSheet
      visible
      version={pending.currentVersion}
      items={pending.entries.flatMap((entry) => entry.items)}
      onClose={() => setPending(null)}
    />
  );
}
