import { useState } from "react";
import { Button } from "@vibetech/ui";
import { FileArchive } from "lucide-react";
import { toast } from "sonner";
import { DoorSchedule, PalletEntry } from "@/types/shipping";
import { exportAllAsZip } from "@/services/exportService";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface ExportAllProps {
  doorEntries: DoorSchedule[];
  palletEntries: PalletEntry[];
}

const ExportAll = ({ doorEntries, palletEntries }: ExportAllProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (doorEntries.length === 0 && palletEntries.length === 0) {
      toast.error("No data to export");
      return;
    }

    setIsExporting(true);

    try {
      await exportAllAsZip(doorEntries, palletEntries);

      toast.success("Export successful!", {
        description: "All data exported as ZIP file",
      });
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data", {
        description: "Please try again or contact support",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button
          onClick={handleExport}
          disabled={
            isExporting ||
            (doorEntries.length === 0 && palletEntries.length === 0)
          }
          className={`bg-walmart-yellow text-black hover:bg-walmart-yellow/80 transition-all hover:scale-105 focus:scale-95 ${
            isExporting ? "animate-pulse" : ""
          }`}
        >
          <FileArchive className="mr-2 h-4 w-4" />
          {isExporting ? "Exporting..." : "Export All Data"}
        </Button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-4">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Export All Data</h4>
          <p className="text-sm text-muted-foreground">
            Exports three CSV files in a ZIP package:
          </p>
          <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
            <li>doors.csv - All door assignments</li>
            <li>pallets.csv - All pallet counts</li>
            <li>notes.csv - All door notes</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-2">
            Each file includes timestamps and user information.
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};

export default ExportAll;
