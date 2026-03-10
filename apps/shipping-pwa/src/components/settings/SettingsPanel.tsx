import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@vibetech/ui";
import { Settings } from "lucide-react";
import { Button } from "@vibetech/ui";
import { useUserSettings } from "@/hooks/useUserSettings";
import ProfileSettings from "./ProfileSettings";
import { toast } from "sonner";
import InteractionSettings from "./InteractionSettings";
import VoiceSettings from "./VoiceSettings";

const SettingsPanel = () => {
  const { settings, updateSetting } = useUserSettings();

  const resetAllSettings = () => {
    updateSetting("interactionMode", "tap");
    updateSetting("enableActionButton", false);
    updateSetting("autoExportOnShiftEnd", false);
    updateSetting("voiceRecognitionEnabled", true);
    updateSetting("voiceEngine", "browser");
    updateSetting("noiseSuppression", true);
    updateSetting("confidenceThreshold", 0.75);
    updateSetting("commandTimeout", 3000);
    updateSetting("useGrammar", true);
    updateSetting("autoStop", true);
    updateSetting("speakBackCommands", true);
    updateSetting("voiceVolume", 0.8);
    updateSetting("voiceAcceptPartialResults", false);
    updateSetting("voiceActivationMode", "button");

    toast.success("Settings reset to defaults", {
      description: "Your preferences have been reset",
    });
  };

  return (
    <div className="space-y-8">
      <ProfileSettings />

      <Card className="container mx-auto mb-8 border-walmart-blue">
        <CardHeader className="border-b bg-walmart-blue bg-opacity-5">
          <CardTitle className="flex items-center text-walmart-blue">
            <Settings className="mr-2 h-5 w-5" />
            <span>Interaction Preferences</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 space-y-6">
          <div className="space-y-2">
            <InteractionSettings />

            <VoiceSettings />
          </div>

          <div>
            <Button
              variant="outline"
              onClick={resetAllSettings}
              className="text-sm"
              aria-label="Reset settings to defaults"
            >
              Reset to Defaults
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPanel;
