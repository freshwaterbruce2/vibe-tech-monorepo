import { useState } from 'react';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { DoorSchedule } from '@/types/shipping';
import { Button } from "@vibetech/ui";
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface DataExportProps {
  doors: DoorSchedule[];
}

const DataExport = ({ doors }: DataExportProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const generateCSV = (data: DoorSchedule[]): string => {
    const headers = 'Door Number,Destination DC,Freight Type,Status,TCR Present,Pallet Count,Notes,Created By,Timestamp\n';
    const rows = data.map(door => {
      const fields = [
        door.doorNumber,
        door.destinationDC,
        door.freightType,
        door.trailerStatus,
        door.tcrPresent,
        door.palletCount,
        // Escape special characters in notes
        door.notes ? `"${door.notes.replace(/"/g, '""')}"` : '',
        door.createdBy,
        door.timestamp
      ];
      return fields.join(',');
    });
    return headers + rows.join('\n');
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setProgress(0);

      // Process data in chunks for large datasets
      const chunkSize = 100;
      let processedData = '';

      for (let i = 0; i < doors.length; i += chunkSize) {
        const chunk = doors.slice(i, i + chunkSize);
        processedData += (i === 0 ? '' : '\n') + generateCSV(chunk).split('\n').slice(i === 0 ? 0 : 1).join('\n');
        setProgress(Math.round((i + chunk.length) / doors.length * 100));
        // Allow UI to update
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      const blob = new Blob([processedData], { type: 'text/csv;charset=utf-8' });
      const filename = `door-schedule-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      saveAs(blob, filename);

      setProgress(100);
      toast({
        title: 'Export successful',
        description: `${doors.length} records exported to ${filename}`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handleExport}
        disabled={doors.length === 0}
        aria-disabled={doors.length === 0}
        aria-label={`Export ${doors.length} door records to CSV`}
      >
        {isExporting ? 'Exporting...' : 'Export'}
      </Button>

      {isExporting && (
        <Progress
          value={progress}
          className="w-full"
          aria-label="Export progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-busy={isExporting}
        />
      )}
    </div>
  );
};

export default DataExport;