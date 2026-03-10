import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@vibetech/ui";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useUserSettings } from "@/hooks/useUserSettings";
import { InteractionMode } from "@/types/shipping";

export const InteractionSettings = () => {
  const { settings, updateSetting } = useUserSettings();

  const handleInteractionModeChange = (value: InteractionMode) => {
    updateSetting("interactionMode", value);
  };

  const handleActionButtonChange = (checked: boolean) => {
    updateSetting("enableActionButton", checked);
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium">
          Interaction Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="interaction-mode" className="text-sm font-medium">
            Interaction Mode
          </Label>
          <RadioGroup
            id="interaction-mode"
            value={settings.interactionMode}
            onValueChange={handleInteractionModeChange}
            className="flex flex-col space-y-1"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="tap" id="tap" />
              <Label htmlFor="tap" className="font-normal">
                Tap (Standard button interactions)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="swipe" id="swipe" />
              <Label htmlFor="swipe" className="font-normal">
                Swipe (Swipe left/right to decrease/increase)
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="action-button" className="text-sm font-medium">
              Enable Action Button
            </Label>
            <p className="text-xs text-muted-foreground">
              Show floating action button for quick access
            </p>
          </div>
          <Switch
            id="action-button"
            checked={settings.enableActionButton}
            onCheckedChange={handleActionButtonChange}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default InteractionSettings;
