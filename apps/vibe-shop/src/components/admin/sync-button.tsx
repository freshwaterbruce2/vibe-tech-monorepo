"use client";

import { Button } from "@/components/ui/button";
import { Play, RefreshCw } from "lucide-react";
import { useState } from "react";

export function SyncButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const triggerSync = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/cron/discovery");
      const data = await res.json();
      if (data.success) {
        setLastRun(new Date().toLocaleTimeString());
        alert("Sync triggered successfully!");
        window.location.reload(); // Quick way to refresh server stats
      } else {
        alert("Sync failed: " + data.message);
      }
    } catch (e) {
      alert("Error triggering sync");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      {lastRun && <span className="text-sm text-muted-foreground">Last run: {lastRun}</span>}
      <Button onClick={triggerSync} disabled={isLoading}>
        {isLoading ? (
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Play className="mr-2 h-4 w-4" />
        )}
        {isLoading ? "Running Discovery..." : "Trigger Discovery Now"}
      </Button>
    </div>
  );
}
