import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIDEStore } from '@/lib/store';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ open, onOpenChange }) => {
  const { apiKey, setApiKey } = useIDEStore();
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);

  // Sync keyInput when dialog opens via wrapping onOpenChange
  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (nextOpen) {
      setKeyInput(apiKey || '');
    }
    onOpenChange(nextOpen);
  }, [apiKey, onOpenChange]);

  const handleSave = () => {
    setApiKey(keyInput.trim() || null);
    toast.success("Settings saved successfully");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Configure your AI provider credentials.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="apiKey" className="text-zinc-200">DeepSeek API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showKey ? "text" : "password"}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="sk-..."
                className="bg-zinc-900 border-white/10 text-white pr-10 focus-visible:ring-electric-violet"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Stored locally on your device. Never synced.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent border-white/10 text-zinc-300 hover:bg-white/5 hover:text-white">
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-electric-violet hover:bg-electric-violet/90 text-white">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
