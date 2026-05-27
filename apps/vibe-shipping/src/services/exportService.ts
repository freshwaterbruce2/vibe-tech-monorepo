import JSZip from "jszip";
import { DoorSchedule, PalletEntry } from "@/types/shipping";
import { formatHHMMSS } from "@/hooks/useTimer";
import { warehouseConfig } from "@/config/warehouse";

interface ExportOptions {
  includeNotes?: boolean;
  includeUserInfo?: boolean;
  includeTimestamps?: boolean;
}

// Helper function to escape CSV fields
const escapeCsvField = (field: unknown): string => {
    if (field === null || field === undefined) {
        return '' ;
    }
    const stringField = String(field);
    // Check if field contains comma, quote, or newline
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        // Enclose in double quotes and double up existing double quotes
        return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
};

// Helper function to create a CSV row from an array of values
const createCsvRow = (rowArray: unknown[]): string => {
    return rowArray.map(escapeCsvField).join(',');
};

export const createDoorsCSV = (
  doors: DoorSchedule[],
  options: ExportOptions = {},
): string => {
  const {
    includeNotes = true,
    includeUserInfo = true,
    includeTimestamps = true,
  } = options;

  const headers = [
    "Door ID",
    "Door Number",
    "Destination DC",
    "Freight Type",
    "Trailer Status",
    "Pallet Count",
  ];

  if (includeTimestamps) headers.push("Timestamp", "Date", "Time");
  if (includeNotes) headers.push("Notes");
  if (includeUserInfo) headers.push("User");

  const rows = doors.map((door) => {
    const row = [
      door.id,
      door.doorNumber,
      door.destinationDC,
      door.freightType,
      door.trailerStatus,
      door.palletCount || 0,
    ];

    if (includeTimestamps && door.timestamp) {
      const date = new Date(door.timestamp);
      row.push(
        door.timestamp,
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
      );
    } else if (includeTimestamps) {
      row.push("", "", "");
    }

    // Use escapeCsvField for potentially problematic fields
    if (includeNotes) row.push(door.notes ?? "");
    if (includeUserInfo) row.push(door.createdBy || "system");

    return createCsvRow(row); // Use helper for row creation
  });

  // Ensure header row is also properly handled (though less likely to need escaping)
  return [createCsvRow(headers), ...rows].join("\n");
};

export const createPalletsCSV = (
  pallets: PalletEntry[],
  options: ExportOptions = {},
): string => {
  const { includeUserInfo = true, includeTimestamps = true } = options;

  const headers = [
    "Pallet ID",
    "Door Number",
    "Pallet Count",
    "Started At",
    "Ended At",
    "Duration",
  ];

  if (includeTimestamps) headers.push("Timestamp", "Date", "Time");
  if (includeUserInfo) headers.push("User");

  const rows = pallets.map((pallet) => {
    const row = [
      pallet.id,
      pallet.doorNumber?.toString() || "0",
      pallet.count.toString(),
      pallet.startTime ?? "",
      pallet.endTime ?? "",
      pallet.elapsedTime ? formatHHMMSS(pallet.elapsedTime) : "",
    ];

    if (includeTimestamps && pallet.timestamp) {
      const date = new Date(pallet.timestamp);
      row.push(
        pallet.timestamp,
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
      );
    } else if (includeTimestamps) {
      row.push("", "", "");
    }

    if (includeUserInfo) row.push(pallet.createdBy || "system");

    return createCsvRow(row); // Use helper for row creation
  });

  return [createCsvRow(headers), ...rows].join("\n");
};

export const createNotesCSV = (
  doors: DoorSchedule[],
  options: ExportOptions = {},
): string => {
  const { includeUserInfo = true, includeTimestamps = true } = options;

  // Only include doors that have notes
  const doorsWithNotes = doors.filter((door) => door.notes && door.notes.trim() !== ""); // Ensure notes are not just whitespace

  if (doorsWithNotes.length === 0) {
      return ""; // Return empty string or just headers if no notes exist
  }

  const headers = ["Door ID", "Door Number", "Notes"];

  if (includeTimestamps) headers.push("Timestamp", "Date", "Time");
  if (includeUserInfo) headers.push("User");

  const rows = doorsWithNotes.map((door) => {
    const row = [door.id, door.doorNumber, door.notes ?? ""];

    if (includeTimestamps && door.timestamp) {
      const date = new Date(door.timestamp);
      row.push(
        door.timestamp,
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
      );
    } else if (includeTimestamps) {
      row.push("", "", "");
    }

    if (includeUserInfo) row.push(door.createdBy || "system");

    return createCsvRow(row); // Use helper for row creation
  });

  return [createCsvRow(headers), ...rows].join("\n");
};

export const exportAllAsZip = async (
  doors: DoorSchedule[],
  pallets: PalletEntry[],
  options: ExportOptions = {},
) => {
  const zip = new JSZip();

  // Generate CSVs
  const doorsCsvContent = createDoorsCSV(doors, options);
  const palletsCsvContent = createPalletsCSV(pallets, options);
  const notesCsvContent = createNotesCSV(doors, options);

  // Add files to zip only if they have content (beyond headers)
  if (doorsCsvContent && doorsCsvContent.split('\n').length > 1) {
      zip.file("doors.csv", doorsCsvContent);
  }
  if (palletsCsvContent && palletsCsvContent.split('\n').length > 1) {
       zip.file("pallets.csv", palletsCsvContent);
  }
  if (notesCsvContent && notesCsvContent.split('\n').length > 1) {
      zip.file("notes.csv", notesCsvContent);
  }

  // Add a summary file
  const timestamp = new Date().toISOString();
  const config = warehouseConfig.getConfig();
  const summaryText = `Export generated at: ${timestamp}\nTotal doors: ${doors.length}\nTotal pallets logged (in export): ${pallets.length}\nTotal doors with notes: ${doors.filter((d) => d.notes && d.notes.trim() !== "").length}\n\nGenerated by ${config.appName} v1.0.0\nCompany: ${config.companyName}\nLocation: ${config.warehouseName}\n`;
  zip.file("summary.txt", summaryText);

  // Check if zip is empty
  if (Object.keys(zip.files).length === 0 || (Object.keys(zip.files).length === 1 && zip.files["summary.txt"])) {
      console.warn("Zip file contains no data CSVs, only summary.txt.");
      throw new Error("No data available to export."); // Throw error to be caught by caller
  }

  // Generate timestamp for filename (Improved format)
  const now = new Date();
  const dateStr = `${now.getFullYear().toString()}${(now.getMonth() + 1).toString().padStart(2, '0' )}${now.getDate().toString().padStart(2, '0' )}`;
  const timeStr = `${now.getHours().toString().padStart(2, '0' )}${now.getMinutes().toString().padStart(2, '0' )}${now.getSeconds().toString().padStart(2, '0' )}`;
  const fileName = `walmart_dc8980_export_${dateStr}_${timeStr}.zip`;

  // Generate zip file blob
  const zipContentBlob = await zip.generateAsync({ type: "blob" });

  // --- Manual Download Logic --- 
  const url = URL.createObjectURL(zipContentBlob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();

  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  // --- End Manual Download --- 


  return {
    timestamp,
    fileName,
    doorCount: doors.length,
    palletCount: pallets.length,
    noteCount: doors.filter((d) => d.notes && d.notes.trim() !== "").length,
  };
};

// Test function for export validation
export const validateExport = (
  doors: DoorSchedule[],
  pallets: PalletEntry[],
): boolean => {
  // Ensure doors CSV is properly formatted
  const doorsCSV = createDoorsCSV(doors);
  const doorsLines = doorsCSV.split("\n");
  if (doorsLines.length <= 1) return false; // Only headers

  // Ensure pallets CSV is properly formatted
  const palletsCSV = createPalletsCSV(pallets);
  const palletsLines = palletsCSV.split("\n");
  if (palletsLines.length <= 1 && pallets.length > 0) return false;

  // Everything checks out
  return true;
};
