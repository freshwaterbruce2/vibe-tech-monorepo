import React from "react";
import { Button } from "@vibetech/ui";
import { Input } from "@vibetech/ui";
import { Trash2, MinusCircle, PlusCircle, Play, Square } from "lucide-react";
import { useSwipeable } from "react-swipeable";
import { toast } from "sonner";
import { PalletEntry } from "@/types/shipping";
import { useUserSettings } from "@/hooks/useUserSettings";
import { formatHHMMSS } from "@/hooks/useTimer";

interface PalletRowProps {
  entry: PalletEntry;
  onIncrement: () => void;
  onDecrement: () => void;
  onDelete: () => void;
  onDoorNumberChange?: (doorNumber: number) => void;
  onToggleTimer?: () => void;
  formatElapsedTime?: (seconds: number) => string;
}

const PalletRow = ({
  entry,
  onIncrement,
  onDecrement,
  onDelete,
  onDoorNumberChange,
  onToggleTimer,
  formatElapsedTime,
}: PalletRowProps) => {
  const { settings } = useUserSettings();
  const [swipeDirection, setSwipeDirection] = React.useState<string | null>(
    null,
  );

  // Timer display state
  const [currentElapsed, setCurrentElapsed] = React.useState<number>(
    entry.elapsedTime ?? 0,
  );

  // Update elapsed time while timer is active
  React.useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (entry.isActive && entry.startTime) {
      interval = setInterval(() => {
        const start = new Date(entry.startTime!).getTime();
        const now = new Date().getTime();
        const elapsed = Math.floor((now - start) / 1000);
        setCurrentElapsed(elapsed);
      }, 1000);
    } else {
      setCurrentElapsed(entry.elapsedTime ?? 0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [entry.isActive, entry.startTime, entry.elapsedTime]);

  // Format time as HH:MM:SS
  const displayTime = React.useMemo(() => {
    if (formatElapsedTime) {
      return formatElapsedTime(currentElapsed);
    }
    return formatHHMMSS(currentElapsed);
  }, [currentElapsed, formatElapsedTime]);

  // Swipe handlers
  const swipeHandlers = useSwipeable({
    onSwiping: (event) => {
      if (settings.interactionMode !== "swipe") return;
      setSwipeDirection(event.dir);
    },
    onSwiped: (event) => {
      if (settings.interactionMode !== "swipe") return;
      if (event.dir === "Right") {
        onIncrement();
        toast.success(`Increased to ${entry.count + 1}`);
      } else if (event.dir === "Left") {
        onDecrement();
        toast.info(`Decreased to ${Math.max(0, entry.count - 1)}`);
      }
      setSwipeDirection(null);
    },
    delta: 10,
    trackTouch: true,
    trackMouse: false,
  });

  // Background color based on swipe direction
  const getSwipeBackground = () => {
    if (swipeDirection === "Right") return "bg-green-50";
    if (swipeDirection === "Left") return "bg-red-50";
    return "";
  };

  const rowClasses = `flex items-center justify-between p-3 rounded-lg border ${getSwipeBackground()} ${entry.isActive ? "bg-green-50" : ""} transition-colors duration-200`;

  // Format the timestamp for display
  const formatTime = (timestamp: string) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format the date for display
  const formatDate = (timestamp: string) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  };

  // Handle door number change
  const handleDoorNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const doorNumber = value === "" ? 0 : parseInt(value, 10);

    if (!isNaN(doorNumber) && onDoorNumberChange) {
      onDoorNumberChange(doorNumber);
    }
  };

  return (
    <div
      {...(settings.interactionMode === "swipe" ? swipeHandlers : {})}
      className={rowClasses}
    >
      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center justify-between">
          <Input
            type="number"
            placeholder="Door number"
            value={entry.doorNumber || ""}
            onChange={handleDoorNumberChange}
            className="w-32 border-gray-200 focus:border-walmart-blue focus:ring-1 focus:ring-walmart-blue"
            min={332}
            max={454}
            aria-label="Door number"
          />

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={onDecrement}
              className="h-8 w-8 rounded-full bg-white hover:bg-red-50"
              aria-label="Decrement pallet count"
            >
              <MinusCircle className="h-4 w-4 text-red-500" aria-hidden="true" />
            </Button>
            <span className="text-2xl font-bold w-12 text-center" role="status" aria-label="Current pallet count">
              {entry.count}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={onIncrement}
              className="h-8 w-8 rounded-full bg-white hover:bg-green-50"
              aria-label="Increment pallet count"
            >
              <PlusCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
            </Button>

            <Button
              variant={entry.isActive ? "outline" : "outline"}
              size="icon"
              onClick={onToggleTimer}
              className={`h-8 w-8 rounded-full ml-2 ${entry.isActive ? "bg-red-50 hover:bg-red-100" : "bg-green-50 hover:bg-green-100"}`}
              aria-label={entry.isActive ? "Stop timer" : "Start timer"}
              aria-pressed={entry.isActive}
            >
              {entry.isActive ? (
                <Square className="h-4 w-4 text-red-500" aria-hidden="true" />
              ) : (
                <Play className="h-4 w-4 text-green-600" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center">
            {entry.isActive ? (
              <span className="text-xs font-medium text-green-600 animate-pulse" role="timer" aria-live="polite">
                ● Active: {displayTime}
              </span>
            ) : entry.startTime ? (
              <span className="text-xs text-gray-600" role="timer" aria-live="polite">
                {entry.elapsedTime && entry.elapsedTime > 0
                  ? `Duration: ${displayTime}`
                  : ""}
              </span>
            ) : null}
          </div>

          <div className="flex items-center">
            {entry.timestamp && (
              <div className="flex flex-col items-end text-right">
                <p className="text-xs text-gray-500">
                  {formatDate(entry.timestamp)}
                </p>
                <p className="text-sm text-gray-600">
                  {formatTime(entry.timestamp)}
                </p>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 min-w-[44px] min-h-[44px] ml-1"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PalletRow;
