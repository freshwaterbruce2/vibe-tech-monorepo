import { ChevronRight, Database, Globe, Shield, Sparkles, Zap } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

interface QuickAction {
  icon: ReactNode;
  label: string;
  color: string;
}

const actions: QuickAction[] = [
  { icon: <Zap />, label: 'Deploy to Production', color: 'neonBlue' },
  { icon: <Database />, label: 'Backup Database', color: 'neonPurple' },
  { icon: <Shield />, label: 'Security Scan', color: 'neonPink' },
  { icon: <Globe />, label: 'Update DNS', color: 'neonGreen' },
];

const handleAction = (label: string) => {
  toast({
    title: 'Not implemented',
    description: `${label} is not yet available.`,
  });
};

export function QuickActionsPanel() {
  return (
    <Card className="border-aura-accent/30 bg-gradient-to-br from-aura-darkBg/90 via-aura-darkBgLight/80 to-aura-darkBg/90 backdrop-blur-xl hover:shadow-neon-green transition-all duration-300">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Quick Actions</h2>

        <div className="space-y-3">
          {actions.map((action, index) => (
            <Button
              key={action.label}
              variant="outline"
              className="w-full justify-start border-aura-accent/30 hover:border-aura-neonBlue/50 hover:bg-aura-neonBlue/10 hover:shadow-neon-blue-soft transition-all duration-300 group"
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => handleAction(action.label)}
            >
              <div className={`mr-3 text-aura-${action.color} group-hover:animate-pulse`}>
                {action.icon}
              </div>
              <span className="group-hover:text-aura-neonBlue transition-colors">
                {action.label}
              </span>
              <ChevronRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-aura-accent/20">
          <Button
            className="w-full bg-gradient-to-r from-aura-neonBlue via-aura-neonPurple to-aura-neonPink hover:shadow-neon-lg transition-all duration-300 border-0 group"
            onClick={() => handleAction('Generate Report')}
          >
            <Sparkles className="w-4 h-4 mr-2 group-hover:animate-spin" />
            Generate Report
          </Button>
        </div>
      </div>
    </Card>
  );
}
