import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@renderer/lib/query-client';
import { Shell } from '@renderer/components/Shell';
import { AppsGrid } from '@renderer/panels/AppsGrid';
import { DbHealth } from '@renderer/panels/DbHealth';
import { BackupLog } from '@renderer/panels/BackupLog';
import { BuildStatus } from '@renderer/panels/BuildStatus';
import { RagSearch } from '@renderer/panels/RagSearch';
import { ClaudeLauncher } from '@renderer/panels/ClaudeLauncher';
import { AgentConsole } from '@renderer/panels/AgentConsole';
import { useUiStore } from '@renderer/stores';
import { useFileEventSubscription } from '@renderer/hooks';

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}

function AppInner() {
  useFileEventSubscription();
  const activePanel = useUiStore((s) => s.activePanel);

  return (
    <Shell>
      {activePanel === 'apps'      && <AppsGrid />}
      {activePanel === 'databases' && <DbHealth />}
      {activePanel === 'backups'   && <BackupLog />}
      {activePanel === 'builds'    && <BuildStatus />}
      {activePanel === 'rag'       && <RagSearch />}
      {activePanel === 'claude'    && <ClaudeLauncher />}
      {activePanel === 'agents'    && <AgentConsole />}
    </Shell>
  );
}
