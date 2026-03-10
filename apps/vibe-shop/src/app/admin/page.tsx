import { StatsCards } from '@/components/admin/stats-cards';
import { SyncButton } from '@/components/admin/sync-button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';
import type { SyncLog } from '@/types';

export const dynamic = 'force-dynamic';

async function getRecentLogs(): Promise<SyncLog[]> {
  const logs = await prisma.syncLog.findMany({
    orderBy: { startedAt: 'desc' },
    take: 10,
  });
  return logs as unknown as SyncLog[];
}

export default async function AdminDashboard() {
  const logs = await getRecentLogs();

  return (
    <div className="space-y-8 container py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your affiliate store automation</p>
        </div>
        <SyncButton />
      </div>

      <StatsCards />

      <Card>
        <CardHeader>
          <CardTitle>Recent Sync Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {logs.length === 0 && <p className="text-muted-foreground">No logs yet.</p>}

            {logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      log.status === 'success'
                        ? 'bg-green-500'
                        : log.status === 'running'
                          ? 'bg-blue-500 animate-pulse'
                          : 'bg-red-500'
                    }`}
                  />
                  <div>
                    <div className="font-medium capitalize">{log.syncType} Sync</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(log.startedAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  {log.errorMessage ? (
                    <Badge variant="destructive">Error: {log.errorMessage}</Badge>
                  ) : (
                    <div className="flex gap-4 text-muted-foreground">
                      <span>+{log.productsAdded} Products</span>
                      <span>{log.status}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
