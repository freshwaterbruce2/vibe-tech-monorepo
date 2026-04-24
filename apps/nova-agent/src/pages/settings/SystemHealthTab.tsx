import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Cpu, Database, Shield } from 'lucide-react';

interface SystemHealthTabProps {
  isHealthy: boolean;
  lastCheck: Date | null;
  onVerifyRagConnection: () => void;
}

const SystemHealthTab = ({
  isHealthy,
  lastCheck,
  onVerifyRagConnection,
}: SystemHealthTabProps) => {
  return (
    <div className="space-y-4 mt-6">
      <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-green-400" />
            Database Status
          </CardTitle>
          <CardDescription>Local SQLite and Vector Store health</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="p-4 rounded-lg bg-white/5 border border-white/5 space-y-2">
            <div className="text-sm text-gray-500">Activity Database</div>
            <div className="flex items-center gap-2">
              <Badge
                variant={isHealthy ? 'default' : 'destructive'}
                className={
                  isHealthy ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : ''
                }
              >
                {isHealthy ? 'CONNECTED' : 'DISCONNECTED'}
              </Badge>
              <span className="text-xs text-gray-500">
                {lastCheck ? lastCheck.toLocaleTimeString() : 'Checking...'}
              </span>
            </div>
            <div className="text-xs text-gray-400 font-mono mt-2">
              D:\databases\nova_activity.db
            </div>
          </div>

          <div className="p-4 rounded-lg bg-white/5 border border-white/5 space-y-2">
            <div className="text-sm text-gray-500">Vector Store</div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-blue-400 border-blue-500/30 bg-blue-500/10"
              >
                READY
              </Badge>
              <span className="text-xs text-gray-500">ChromaDB v0.4.22</span>
            </div>
            <div className="text-xs text-gray-400 font-mono mt-2">localhost:8000</div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-orange-400" />
            System Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span>Backend Memory</span>
              <span className="text-gray-400">142 MB</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Frontend Memory</span>
              <span className="text-gray-400">85 MB</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Tauri Core</span>
              <span className="text-green-400">v2.0.0-beta</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            Debug Actions
          </CardTitle>
          <CardDescription>Verify internal system connections</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={onVerifyRagConnection}
            variant="outline"
            className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          >
            Verify React {'->'} Rust Connection (Console)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemHealthTab;
