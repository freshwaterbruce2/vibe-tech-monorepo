import React, { useState } from "react";
import { Link } from "react-router-dom";
import ShippingTable from "../components/ShippingTable";
import PalletCounter from "../components/pallets/PalletCounter";
import SettingsPanel from "../components/settings/SettingsPanel";
import { useUserSettings } from "@/hooks/useUserSettings";
import { UserProvider, useUser } from "@/contexts/UserContext";
import { useWarehouseConfig } from "@/config/warehouse";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, FileText, Zap } from "lucide-react";
import { Button } from "@vibetech/ui";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AdvancedHybridInputBar } from "@/components/ui/AdvancedHybridInputBar";
import VoiceQuickReference from "@/components/voice/VoiceQuickReference";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

type ViewType = "doors" | "pallets" | "settings";

const Index = () => {
  const [currentView, setCurrentView] = useState<ViewType>("doors");
  useUserSettings();

  return (
    <UserProvider>
      <IndexContent currentView={currentView} setCurrentView={setCurrentView} />
    </UserProvider>
  );
};

const IndexContent = ({
  currentView,
  setCurrentView,
}: {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
}) => {
  const { currentUser } = useUser();
  const { config } = useWarehouseConfig();

  return (
    <div className="min-h-screen bg-gray-50">
      <header
        className="text-white py-4 shadow-md"
        style={{ backgroundColor: config.brandColors.primary }}
      >
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{config.appName}</h1>
            <p className="text-sm opacity-80">
              {config.appDescription}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Voice Command Quick Reference */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="text-white hover:bg-walmart-blue/20 gap-2"
                  title="Voice Commands Quick Reference"
                >
                  <Zap className="h-4 w-4" />
                  <span className="hidden sm:inline">Voice Commands</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <VoiceQuickReference />
              </DialogContent>
            </Dialog>

            <div className="flex items-center bg-walmart-blue/30 px-3 py-1 rounded-full">
              <Avatar className="h-7 w-7 border border-white/30">
                <AvatarFallback className="bg-walmart-blue/50 text-white">
                  {currentUser.displayName
                    .split(" ")
                    .map((name) => name[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <span className="ml-2 text-sm font-medium">
                {currentUser.displayName}
              </span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="text-white hover:bg-walmart-blue/20"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setCurrentView("doors")}>
                  Door Schedule
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrentView("pallets")}>
                  Pallet Counter
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCurrentView("settings")}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/notes" className="flex w-full">
                    <FileText className="mr-2 h-4 w-4" />
                    Notes
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="py-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <AdvancedHybridInputBar
              onSubmit={(cmd) => {
                // For now, just log the command. Replace with real logic as needed.
              }}
            />
          </div>
          {currentView === "doors" && <ShippingTable />}
          {currentView === "pallets" && <PalletCounter />}
          {currentView === "settings" && <SettingsPanel />}
        </div>
      </div>
    </div>
  );
};

export default Index;
