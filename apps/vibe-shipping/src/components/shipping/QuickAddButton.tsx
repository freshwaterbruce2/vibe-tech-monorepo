import { Button } from "@vibetech/ui";
import { Zap } from "lucide-react";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useUser } from "@/contexts/UserContext";
import { toast } from "sonner";
import {
  DestinationDC,
  DoorSchedule,
  FreightType,
  TrailerStatus,
} from "@/types/shipping";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { findNextSequentialDoorNumber } from "@/utils/doorUtils";

interface QuickAddButtonProps {
  onAddDoor: (doorData: DoorSchedule) => void;
  currentDoors: DoorSchedule[];
}

const QuickAddButton = ({
  onAddDoor,
  currentDoors,
}: QuickAddButtonProps) => {
  const { settings } = useUserSettings();
  const { currentUser } = useUser();

  // Use the utility function to find the next sequential door number

  const handleQuickAdd = () => {
    if (currentDoors.length >= 10) {
      toast.error("Maximum door limit reached.");
      return;
    }

    // Find the next sequential door number
    const nextDoorNumber = findNextSequentialDoorNumber(currentDoors);

    // Create a new door with user's last used preferences
    const newDoor: DoorSchedule = {
      id: Math.random().toString(36).substring(7),
      doorNumber: nextDoorNumber,
      destinationDC: settings.lastUsedDC as DestinationDC,
      freightType: settings.lastUsedFreightType as FreightType,
      trailerStatus: "empty" as TrailerStatus,
      palletCount: 0,
      timestamp: new Date().toISOString(),
      createdBy: currentUser.username,
      tcrPresent: false,
    };

    // Call the parent function to add the door
    onAddDoor(newDoor);

    toast.success("Door quickly added!", {
      description: `Door ${newDoor.doorNumber} added with your preferred settings`,
    });
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleQuickAdd}
            size="sm"
            variant="outline"
            className="gap-1 border-2 border-secondary bg-secondary/80 text-secondary-foreground hover:bg-secondary/90 transition-all duration-300 transform hover:scale-105 focus:scale-95 min-h-[44px] font-medium shadow-md"
          >
            <Zap className="h-4 w-4" />
            <span className="text-value font-semibold">Quick Add</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Instantly add door using saved preferences</p>
          <p className="text-xs text-muted-foreground mt-1">
            DC: {settings.lastUsedDC} • Type: {settings.lastUsedFreightType}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default QuickAddButton;
