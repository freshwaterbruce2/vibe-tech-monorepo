import {
  createDoorsCSV,
  createPalletsCSV,
  createNotesCSV,
  validateExport,
} from "../services/exportService";
import { DoorSchedule, PalletEntry } from "@/types/shipping";

describe("Export Service", () => {
  const mockDoors: DoorSchedule[] = [
    {
      id: "door1",
      doorNumber: 342,
      destinationDC: "6024",
      freightType: "23/43",
      trailerStatus: "empty",
      palletCount: 0,
      timestamp: "2025-04-29T10:00:00Z",
      createdBy: "Test User",
      tcrPresent: false,
      notes: "Test note for door 342",
    },
    {
      id: "door2",
      doorNumber: 343,
      destinationDC: "6070",
      freightType: "28",
      trailerStatus: "partial",
      palletCount: 5,
      timestamp: "2025-04-29T11:00:00Z",
      createdBy: "Test User",
      tcrPresent: true,
    },
  ];

  const mockPallets: PalletEntry[] = [
    {
      id: "pallet1",
      doorNumber: 342,
      count: 3,
      timestamp: "2025-04-29T10:30:00Z",
      createdBy: "Test User",
    },
  ];

  test("createDoorsCSV should format doors data correctly", () => {
    const csv = createDoorsCSV(mockDoors);
    const rows = csv.split("\n");

    // Check header row
    expect(rows[0]).toContain("Door ID");
    expect(rows[0]).toContain("Door Number");
    expect(rows[0]).toContain("Notes");

    // Check data rows
    expect(rows[1]).toContain("door1");
    expect(rows[1]).toContain("342");
    expect(rows[1]).toContain("Test note for door 342");

    expect(rows[2]).toContain("door2");
    expect(rows[2]).toContain("343");
  });

  test("createPalletsCSV should format pallets data correctly", () => {
    const csv = createPalletsCSV(mockPallets);
    const rows = csv.split("\n");

    // Check header row
    expect(rows[0]).toContain("Pallet ID");
    expect(rows[0]).toContain("Pallet Count");

    // Check data row
    expect(rows[1]).toContain("pallet1");
    expect(rows[1]).toContain("3");
    expect(rows[1]).toContain("Test User");
  });

  test("createNotesCSV should only include doors with notes", () => {
    const csv = createNotesCSV(mockDoors);
    const rows = csv.split("\n");

    // Should have header + 1 row (only one door has notes)
    expect(rows.length).toBe(2);
    expect(rows[1]).toContain("door1");
    expect(rows[1]).toContain("Test note for door 342");
  });

  test("validateExport should confirm export data is valid", () => {
    const isValid = validateExport(mockDoors, mockPallets);
    expect(isValid).toBe(true);

    // Should fail with empty data
    const isInvalid = validateExport([], []);
    expect(isInvalid).toBe(false);
  });
});
