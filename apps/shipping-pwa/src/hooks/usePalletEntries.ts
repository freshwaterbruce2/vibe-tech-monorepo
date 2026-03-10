import { useState, useEffect } from "react";
// cspell:ignore sonner
import { toast } from "sonner";
import { PalletEntry } from "@/types/shipping";
import { useUser } from "@/contexts/UserContext";
import { formatHHMMSS } from "./useTimer";

export const usePalletEntries = () => {
  const [palletEntries, setPalletEntries] = useState<PalletEntry[]>([]);
  const { currentUser } = useUser();

  // Load from localStorage on mount
  useEffect(() => {
    const savedEntries = window.electronAPI?.store.get("palletEntries");
    if (savedEntries) {
      try {
        const parsed = JSON.parse(savedEntries);
        // Handle migration for old entries without doorNumber
        const migratedEntries = parsed.map((entry: PalletEntry) => {
          // Convert old data structure if needed
          if (!entry.doorNumber && typeof entry.doorNumber !== "number") {
            return {
              ...entry,
              doorNumber: 0, // Set a default value
            };
          }
          return entry;
        });
        setPalletEntries(migratedEntries);
      } catch (e) {
        console.error("Error parsing saved pallet entries:", e);
        setPalletEntries([]);
      }
    }
  }, []);

  // Save to localStorage when entries change
  useEffect(() => {
    if (palletEntries.length > 0) {
      window.electronAPI?.store.set("palletEntries", JSON.stringify(palletEntries));
    }
  }, [palletEntries]);

  const addPalletEntry = () => {
    const newEntry: PalletEntry = {
      id: Math.random().toString(36).substring(7),
      count: 0,
      timestamp: new Date().toISOString(),
      createdBy: currentUser.username,
      isActive: false,
      startTime: null,
      endTime: null,
      elapsedTime: 0,
      doorNumber: 0,
    };
    setPalletEntries([...palletEntries, newEntry]);
    toast.success("New counter added");
  };

  const updateCount = (id: string, increment: boolean) => {
    setPalletEntries((entries) =>
      entries.map((entry) => {
        if (entry.id === id) {
          const newCount = increment
            ? entry.count + 1
            : Math.max(0, entry.count - 1);

          // Start the timer on the first increment if not already active
          let updatedEntry = { ...entry };

          if (
            increment &&
            newCount === 1 &&
            !entry.isActive &&
            !entry.startTime
          ) {
            updatedEntry = {
              ...updatedEntry,
              isActive: true,
              startTime: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              updatedBy: currentUser.username,
              count: newCount,
            };
            toast.success(`Started timer and increased to ${newCount}`);
          } else if (increment) {
            toast.success(`Increased to ${newCount}`);
            updatedEntry = {
              ...updatedEntry,
              count: newCount,
              updatedAt: new Date().toISOString(),
              updatedBy: currentUser.username,
            };
          } else if (entry.count > 0) {
            toast.info(`Decreased to ${newCount}`);
            updatedEntry = {
              ...updatedEntry,
              count: newCount,
              updatedAt: new Date().toISOString(),
              updatedBy: currentUser.username,
            };
          }

          return updatedEntry;
        }
        return entry;
      }),
    );
  };

  const toggleTimer = (id: string) => {
    setPalletEntries((entries) =>
      entries.map((entry) => {
        if (entry.id === id) {
          // If starting the timer
          if (!entry.isActive) {
            toast.success("Timer started");
            return {
              ...entry,
              isActive: true,
              startTime: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              updatedBy: currentUser.username,
            };
          }
          // If stopping the timer
          else {
            const endTime = new Date().toISOString();
            const start = entry.startTime
              ? new Date(entry.startTime).getTime()
              : 0;
            const end = new Date(endTime).getTime();
            const elapsedMs = start ? end - start : 0;
            const elapsedTime = Math.floor(elapsedMs / 1000); // Convert to seconds

            toast.success(
              `Timer stopped. Total time: ${formatElapsedTime(elapsedTime)}`,
            );

            return {
              ...entry,
              isActive: false,
              endTime,
              elapsedTime,
              updatedAt: new Date().toISOString(),
              updatedBy: currentUser.username,
            };
          }
        }
        return entry;
      }),
    );
  };

  const deletePalletEntry = (id: string) => {
    setPalletEntries((entries) => entries.filter((entry) => entry.id !== id));
    toast.success("Counter removed");
  };

  const updateDoorNumber = (id: string, doorNumber: number) => {
    setPalletEntries((entries) =>
      entries.map((entry) => {
        if (entry.id === id) {
          return {
            ...entry,
            doorNumber,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.username,
          };
        }
        return entry;
      }),
    );
  };

  // Format elapsed time as HH:MM:SS
  const formatElapsedTime = (seconds: number): string => {
    return formatHHMMSS(seconds);
  };

  return {
    palletEntries,
    addPalletEntry,
    updateCount,
    deletePalletEntry,
    updateDoorNumber,
    toggleTimer,
    formatElapsedTime,
  };
};
