import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Moon } from 'lucide-react';

const GeneralTab = () => {
  return (
    <div className="space-y-4 mt-6">
      <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="w-5 h-5 text-purple-400" />
            Appearance
          </CardTitle>
          <CardDescription>Customize the look and feel of the interface</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5">
            <div className="space-y-0.5">
              <Label>Dark Mode</Label>
              <p className="text-sm text-gray-500">Enable futuristic dark theme</p>
            </div>
            <Switch checked={true} disabled />
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5">
            <div className="space-y-0.5">
              <Label>Reduced Motion</Label>
              <p className="text-sm text-gray-500">Disable advanced UI animations</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GeneralTab;
