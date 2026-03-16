import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@vibetech/ui";
import { Button } from "@vibetech/ui";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import VoiceDoorControl from "./VoiceDoorControl";
import { DoorSchedule, DestinationDC, FreightType, TrailerStatus } from "@/types/shipping";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useUser } from "@/contexts/UserContext";
import DoorEntryRow from "./DoorEntryRow";
import ExportAll from "./export/ExportAll";
import QuickAddButton from "./shipping/QuickAddButton";
import KeyboardShortcuts from "./shipping/KeyboardShortcuts";
import SpeedKeypad from "./shipping/SpeedKeypad";

// --- IndexedDB Schema and Setup ---
// const DB_NAME = "ShippingDB"; // Currently unused
const STORE_NAME = "doorSchedulesStore";

// Use localStorage as a fallback for data persistence
const getAllSchedules = async (): Promise<DoorSchedule[]> => {
  try {
    const savedSchedules = window.electronAPI?.store.get(STORE_NAME);
    return savedSchedules ? JSON.parse(savedSchedules) : [];
  } catch (error) {
    console.error("Error loading schedules from localStorage:", error);
    return [];
  }
};

const addOrUpdateSchedule = async (schedule: DoorSchedule) => {
  try {
    const schedules = await getAllSchedules();
    const updatedSchedules = schedules.some(s => s.id === schedule.id)
      ? schedules.map(s => s.id === schedule.id ? schedule : s)
      : [...schedules, schedule];
    window.electronAPI?.store.set(STORE_NAME, JSON.stringify(updatedSchedules));
  } catch (error) {
    console.error("Error saving schedule to localStorage:", error);
  }
};

const deleteSchedule = async (id: string) => {
  try {
    const schedules = await getAllSchedules();
    const updatedSchedules = schedules.filter(s => s.id !== id);
    window.electronAPI?.store.set(STORE_NAME, JSON.stringify(updatedSchedules));
  } catch (error) {
    console.error("Error deleting schedule from localStorage:", error);
  }
};
// --- End localStorage Setup ---

// Helper hook (or could be utility function) - basic implementation
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const updateMatch = () => setMatches(media.matches);
    updateMatch(); // Initial check
    // Use addEventListener/removeEventListener for modern compatibility
    media.addEventListener('change', updateMatch);

    return () => {
        media.removeEventListener('change', updateMatch);
    };
  }, [query]);

  return matches;
};

// --- Type for Voice Params (Matches VoiceDoorControl) ---
type VoiceCommandParams = Partial<{
    doorNumber: string;
    destinationDC: DestinationDC;
    freightType: FreightType;
    trailerStatus: TrailerStatus;
}>;

const ShippingTable = () => {
  const [doorSchedules, setDoorSchedules] = useState<DoorSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [animateIndex, setAnimateIndex] = useState<string | null>(null);
  const { settings, updateLastUsedDC, updateLastUsedFreightType } =
    useUserSettings();
  const { currentUser } = useUser();
  const isMobileView = useMediaQuery("(max-width: 767px)");
  const [newDoorNumber, setNewDoorNumber] = useState<string>("");
  const [newPalletCount, setNewPalletCount] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Load stored door schedules from localStorage
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const savedSchedules = await getAllSchedules();
        setDoorSchedules(savedSchedules || []);
      } catch (error) {
        console.error("Error loading schedules from localStorage:", error);
        toast.error("Failed to load saved schedule data.");
        // Fallback or error handling - maybe try localStorage?
      } finally {
        setIsLoading(false);
      }
    };
    loadData().catch(err => {
        // Handle localStorage loading error separately if needed
        console.error("Failed to load schedules from localStorage:", err);
        toast.error("Failed to load saved schedule data.");
        setIsLoading(false);
    });
  }, []);

  const addEmptyDoor = useCallback(async () => {
    if (doorSchedules.length >= 10) {
      toast.error("Maximum door limit reached.");
      return;
    }
    const newDoor: DoorSchedule = {
      id: Math.random().toString(36).substring(7),
      doorNumber: 332,
      destinationDC: settings.lastUsedDC,
      freightType: settings.lastUsedFreightType,
      trailerStatus: "empty",
      palletCount: 0,
      timestamp: new Date().toISOString(),
      createdBy: currentUser.username,
      tcrPresent: false,
    };

    try {
      await addOrUpdateSchedule(newDoor);
      setDoorSchedules((prev) => [...prev, newDoor]);
      setAnimateIndex(newDoor.id);
      setTimeout(() => setAnimateIndex(null), 600);
      toast.success("Door added successfully");
    } catch (error) {
      console.error("Error adding door to localStorage:", error);
      toast.error("Failed to save new door.");
    }
  }, [doorSchedules, settings, currentUser]);

  const addDoorWithData = useCallback(async (doorData: DoorSchedule) => {
    try {
      await addOrUpdateSchedule(doorData);
      setDoorSchedules((prev) => [...prev, doorData]);
      setAnimateIndex(doorData.id);
      setTimeout(() => setAnimateIndex(null), 600);
    } catch (error) {
      console.error("Error adding door data to localStorage:", error);
      toast.error("Failed to save door data.");
    }
  }, []);

  // --- NEW: Handler for Voice Commands with Parameters ---
  const handleAddDoorWithVoiceParams = useCallback(async (params: VoiceCommandParams) => {
      if (doorSchedules.length >= 10) {
          toast.error("Maximum door limit reached.");
          return;
      }

      // Determine Door Number: Use param or find next available
      let doorNumber = params.doorNumber ? parseInt(params.doorNumber) : null;
      if (doorNumber !== null && (isNaN(doorNumber) || doorNumber < 332 || doorNumber > 454)) {
          toast.error(`Invalid door number from voice: ${params.doorNumber}. Must be 332-454.`);
          doorNumber = null; // Invalidate if out of range
      }
      if (doorNumber === null) {
         const usedDoorNumbers = new Set(doorSchedules.map((door) => door.doorNumber));
         let nextAvailable = 332;
         while (usedDoorNumbers.has(nextAvailable) && nextAvailable <= 454) {
             nextAvailable++;
         }
         if (nextAvailable > 454) {
             toast.error("No available door numbers left.");
             return;
         }
         doorNumber = nextAvailable;
         toast.info(`Assigning next available door: ${doorNumber}`);
      }

      // Validate other params (basic type check)
      const validDC = params.destinationDC && destinationDCOptions.includes(params.destinationDC);
      const validFreight = params.freightType && freightTypeOptions.includes(params.freightType);
      const validStatus = params.trailerStatus && trailerStatusOptions.map(o => o.value).includes(params.trailerStatus);

      const newDoor: DoorSchedule = {
          id: Math.random().toString(36).substring(7),
          doorNumber,
          destinationDC: (validDC && params.destinationDC) ? params.destinationDC : settings.lastUsedDC,
          freightType: (validFreight && params.freightType) ? params.freightType : settings.lastUsedFreightType,
          trailerStatus: (validStatus && params.trailerStatus) ? params.trailerStatus : "empty", // Default to empty if invalid/missing
          palletCount: 0,
          timestamp: new Date().toISOString(),
          createdBy: `${currentUser.username  } (voice)`, // Indicate source
          tcrPresent: false,
      };

      // Use existing function to add/save
      await addDoorWithData(newDoor);
      toast.success(`Door ${newDoor.doorNumber} added via voice command.`);

  }, [doorSchedules, settings, currentUser, addDoorWithData]);

  const handleSpeedDoorSelection = useCallback(async (doorNumber: number) => {
    if (doorSchedules.length >= 10) {
      toast.error("Maximum door limit reached.");
      return;
    }
    const newDoor: DoorSchedule = {
      id: Math.random().toString(36).substring(7),
      doorNumber,
      destinationDC: settings.lastUsedDC,
      freightType: settings.lastUsedFreightType,
      trailerStatus: "empty",
      palletCount: 0,
      timestamp: new Date().toISOString(),
      createdBy: currentUser.username,
      tcrPresent: false,
    };
    try {
      await addOrUpdateSchedule(newDoor);
      setDoorSchedules((prev) => [...prev, newDoor]);
      setAnimateIndex(newDoor.id);
      setTimeout(() => setAnimateIndex(null), 600);
      toast.success(`Door ${doorNumber} added with speed selection`, {
        description: `Using your preferred settings`,
      });
    } catch (error) {
      console.error("Error adding speed door to localStorage:", error);
      toast.error("Failed to save new door.");
    }
  }, [doorSchedules, settings, currentUser]);

  const handleQuickAddDoor = useCallback(async () => {
    const quickAddButton = document.querySelector(
      "button[aria-label='Quick add door']",
    );
    if (quickAddButton instanceof HTMLElement && typeof quickAddButton.click === 'function') {
      quickAddButton.click();
    } else {
      if (doorSchedules.length >= 10) {
        toast.error("Maximum door limit reached.");
        return;
      }
      const usedDoorNumbers = new Set(doorSchedules.map((door) => door.doorNumber));
      let doorNumber = 332;
      for (let i = 332; i <= 454; i++) {
        if (!usedDoorNumbers.has(i)) {
          doorNumber = i;
          break;
        }
      }
      const newDoor: DoorSchedule = {
        id: Math.random().toString(36).substring(7),
        doorNumber,
        destinationDC: settings.lastUsedDC,
        freightType: settings.lastUsedFreightType,
        trailerStatus: "empty",
        palletCount: 0,
        timestamp: new Date().toISOString(),
        createdBy: currentUser.username,
        tcrPresent: false,
      };
      try {
        await addOrUpdateSchedule(newDoor);
        setDoorSchedules((prev) => [...prev, newDoor]);
        toast.success("Door quickly added via keyboard shortcut", {
          description: `Door ${newDoor.doorNumber} added with your preferred settings`,
        });
      } catch (error) {
        console.error("Error adding quick door to localStorage:", error);
        toast.error("Failed to save new door.");
      }
    }
  }, [doorSchedules, settings, currentUser]);

  const updateDoorSchedule = useCallback(async (
    id: string,
    field: keyof DoorSchedule,
    value: unknown,
  ) => {
    let updatedDoor: DoorSchedule | null = null;

    setDoorSchedules((prev) => {
      const newState = prev.map((door) => {
        if (door.id === id) {
          if (field === "doorNumber") {
            const numValue = parseInt(value as string);
            if (isNaN(numValue) || numValue < 332 || numValue > 454) {
              toast.error("Door number must be between 332 and 454");
              return door;
            }
            updatedDoor = {
              ...door,
              [field]: numValue,
              updatedAt: new Date().toISOString(),
              updatedBy: currentUser.username,
            };
            return updatedDoor;
          }
          if (field === "destinationDC") {
            updateLastUsedDC(value as DestinationDC);
          } else if (field === "freightType") {
            updateLastUsedFreightType(value as FreightType);
          }
          updatedDoor = {
            ...door,
            [field]: value,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.username,
          };
          return updatedDoor;
        }
        return door;
      });
      return newState;
    });

    if (updatedDoor) {
      try {
        await addOrUpdateSchedule(updatedDoor);
      } catch (error) {
        console.error("Error updating schedule in localStorage:", error);
        toast.error("Failed to save changes.");
      }
    }
  }, [currentUser, updateLastUsedDC, updateLastUsedFreightType]);

  const removeDoor = useCallback(async (id: string) => {
    try {
      await deleteSchedule(id);
      setDoorSchedules((prev) => prev.filter((door) => door.id !== id));
      toast.success("Door removed successfully");
    } catch (error) {
      console.error("Error removing door from localStorage:", error);
      toast.error("Failed to remove door.");
    }
  }, []);

  const usedDoorNumbers = doorSchedules.map((door) => door.doorNumber);

  const _handleAddOrUpdateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoorNumber || !newPalletCount) return;

    const parsedDoorNumber = parseInt(newDoorNumber);
    if (isNaN(parsedDoorNumber) || parsedDoorNumber < 332 || parsedDoorNumber > 454) {
      toast.error("Door number must be between 332-454");
      return;
    }

    const parsedPalletCount = parseInt(newPalletCount);
    if (isNaN(parsedPalletCount) || parsedPalletCount < 0) {
      toast.error("Pallet count must be a positive number");
      return;
    }

    const newSchedule: DoorSchedule = {
      id: editingId ?? Math.random().toString(36).substring(7),
      doorNumber: parsedDoorNumber,
      destinationDC: settings.lastUsedDC,
      freightType: settings.lastUsedFreightType,
      trailerStatus: "empty",
      palletCount: parsedPalletCount,
      timestamp: new Date().toISOString(),
      createdBy: currentUser.username,
      tcrPresent: false,
    };

    try {
      if (editingId) {
        const updatedSchedules = doorSchedules.map((schedule) =>
          schedule.id === editingId ? newSchedule : schedule
        );
        setDoorSchedules(updatedSchedules);
        await addOrUpdateSchedule(newSchedule);
        setEditingId(null);
        toast.success("Door schedule updated successfully");
      } else {
        if (doorSchedules.some(door => door.doorNumber === parsedDoorNumber)) {
          toast.error(`Door ${parsedDoorNumber} already exists`);
          return;
        }
        setDoorSchedules([...doorSchedules, newSchedule]);
        await addOrUpdateSchedule(newSchedule);
        toast.success("Door schedule added successfully");
      }
      setNewDoorNumber("");
      setNewPalletCount("");
    } catch {
      toast.error("Failed to save schedule");
    }
  };

  const _handleEditSchedule = (id: string) => {
    const schedule = doorSchedules.find((s) => s.id === id);
    if (schedule) {
      setNewDoorNumber(schedule.doorNumber.toString());
      setNewPalletCount(schedule.palletCount.toString());
      setEditingId(id);
      toast.info(`Edit mode enabled for door ${  schedule.doorNumber}`);
    }
  };

  const _handleDeleteSchedule = async (id: string) => {
    try {
      const updatedSchedules = doorSchedules.filter((schedule) => schedule.id !== id);
      setDoorSchedules(updatedSchedules);
      await deleteSchedule(id);
    } catch (error) {
      console.error("Error deleting schedule:", error);
    }
  };

  const _handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const updatedSchedules = doorSchedules.map((schedule) =>
        schedule.id === id ? { ...schedule, status: newStatus } : schedule
      );
      setDoorSchedules(updatedSchedules);
      const updatedSchedule = updatedSchedules.find(s => s.id === id);
      if (updatedSchedule) {
        await addOrUpdateSchedule(updatedSchedule);
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  if (isLoading) {
    return (
      <Card className="container mx-auto p-6 text-center">
        <CardTitle>Loading Schedule...</CardTitle>
        <div className="mt-4 text-gray-500">Please wait...</div>
      </Card>
    );
  }

  return (
    <Card className="container mx-auto shadow-xl border-t-4 border-t-wal-yellow-500 transition-all duration-200 hover:shadow-2xl bg-gradient-to-br from-white to-blue-50">
      <CardHeader className="bg-gradient-to-r from-wal-blue-500 to-wal-blue-600 border-b text-white">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center">
            <CardTitle className="text-heading text-white mr-2 font-bold text-xl">
              🚪 Door Schedule
            </CardTitle>
            <KeyboardShortcuts
              onAddDoor={addEmptyDoor}
              onQuickAddDoor={handleQuickAddDoor}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={addEmptyDoor}
              size="sm"
              className="gap-2 bg-wal-yellow-500 text-wal-blue-800 hover:bg-wal-yellow-400 hover:text-wal-blue-900 transition-all duration-300 transform hover:scale-105 focus:scale-95 min-h-[44px] font-bold shadow-lg hover:shadow-xl"
            >
              <Plus className="h-4 w-4" />
              <span className="text-value">Add Door</span>
            </Button>
            <QuickAddButton
              onAddDoor={addDoorWithData}
              currentDoors={doorSchedules}
            />
            <SpeedKeypad
              onSelectDoor={handleSpeedDoorSelection}
              currentDoors={usedDoorNumbers}
            />
            <VoiceDoorControl
                onAddDoor={addEmptyDoor}
                onAddDoorWithParams={handleAddDoorWithVoiceParams}
            />
            <ExportAll doorEntries={doorSchedules} palletEntries={[]} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6">
        <div className="space-y-4">
          {doorSchedules.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-dashed border-wal-blue-300 shadow-inner">
              <div className="text-6xl mb-4">🚪</div>
              <p className="text-heading text-wal-blue-700 font-bold text-lg">
                No doors assigned yet
              </p>
              <p className="text-label mt-2 text-wal-blue-600">
                Click "Add Door" to get started with door scheduling.
              </p>
              <Button
                onClick={addEmptyDoor}
                className="mt-6 bg-wal-yellow-500 text-wal-blue-800 hover:bg-wal-yellow-400 hover:text-wal-blue-900 min-h-[44px] font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="text-value">Add Your First Door</span>
              </Button>
            </div>
          ) : (
            <div className={`mt-4 ${isMobileView ? 'space-y-3' : 'border-2 border-wal-blue-200 rounded-xl overflow-hidden bg-gradient-to-br from-white to-blue-50 shadow-lg'}`}>
              {!isMobileView ? (
                 <div className="overflow-x-auto">
                   <Table>
                     <TableHeader>
                       <TableRow className="bg-gradient-to-r from-wal-blue-100 to-wal-blue-200 hover:from-wal-blue-200 hover:to-wal-blue-300 transition-all duration-200">
                         <TableHead className="font-bold text-wal-blue-800">🚪 Door</TableHead>
                         <TableHead className="font-bold text-wal-blue-800">📍 Destination</TableHead>
                         <TableHead className="font-bold text-wal-blue-800">📦 Freight</TableHead>
                         <TableHead className="font-bold text-wal-blue-800">📊 Status</TableHead>
                         <TableHead className="text-center font-bold text-wal-blue-800">📋 Pallets</TableHead>
                         <TableHead className="text-center font-bold text-wal-blue-800">📋 TCR</TableHead>
                         <TableHead className="text-right font-bold text-wal-blue-800">
                           <span className="hidden sm:inline">⚙️ Actions</span>
                         </TableHead>
                       </TableRow>
                     </TableHeader>
                     <TableBody>
                       {doorSchedules.map((door) => (
                         <DoorEntryRow
                           key={door.id}
                           door={door}
                           updateDoorSchedule={updateDoorSchedule}
                           removeDoor={removeDoor}
                           isAnimated={animateIndex === door.id}
                           isMobileView={false}
                         />
                       ))}
                     </TableBody>
                   </Table>
                 </div>
              ) : (
                 <div className="space-y-3">
                   {doorSchedules.map((door) => (
                     <DoorEntryRow
                       key={door.id}
                       door={door}
                       updateDoorSchedule={updateDoorSchedule}
                       removeDoor={removeDoor}
                       isAnimated={animateIndex === door.id}
                       isMobileView={true}
                     />
                   ))}
                 </div>
               )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Constants needed for validation within handleAddDoorWithVoiceParams
const destinationDCOptions: DestinationDC[] = ["6024", "6070", "6039", "6040", "7045"];
const freightTypeOptions: FreightType[] = ["23/43", "28", "XD", "AIB"];
const trailerStatusOptions: { value: TrailerStatus; label: string }[] = [
    { value: "empty", label: "Empty" }, { value: "25%", label: "25%" }, { value: "50%", label: "50%" },
    { value: "75%", label: "75%" }, { value: "partial", label: "Partial" }, { value: "shipload", label: "Shipload" }
];

export default ShippingTable;
