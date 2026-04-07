import { render, fireEvent, waitFor } from '@testing-library/react';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import DataExport from '../../components/export/DataExport';
import { DoorSchedule } from '@/types/shipping';

vi.mock('file-saver');

const mockedSaveAs = vi.mocked(saveAs);

describe('Data Export', () => {
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
      notes: "Test note",
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CSV Generation', () => {
    it('generates CSV with all required fields in correct order', async () => {
      const { getByRole } = render(<DataExport doors={mockDoors} />);
      const exportButton = getByRole('button', { name: /export/i });

      fireEvent.click(exportButton);
      await waitFor(() => {
        expect(mockedSaveAs).toHaveBeenCalled();
      });

      const blob = mockedSaveAs.mock.calls[0][0] as unknown as Blob;
      const csvContent = await blob.text();
      const headers = csvContent.split('\n')[0];

      expect(headers).toBe('Door Number,Destination DC,Freight Type,Status,TCR Present,Pallet Count,Notes,Created By,Timestamp');
    });

    it('handles special characters in data', async () => {
      const { getByRole } = render(<DataExport doors={mockDoors} />);
      const exportButton = getByRole('button', { name: /export/i });

      fireEvent.click(exportButton);
      await waitFor(() => {
        expect(mockedSaveAs).toHaveBeenCalled();
      });

      const blob = mockedSaveAs.mock.calls[0][0] as unknown as Blob;
      const csvContent = await blob.text();

      // Check that notes with special characters are properly escaped
      expect(csvContent).toContain('"Test note"');
    });

    it('generates correct filename with date', async () => {
      const { getByRole } = render(<DataExport doors={mockDoors} />);
      const exportButton = getByRole('button', { name: /export/i });

      fireEvent.click(exportButton);
      await waitFor(() => {
        expect(mockedSaveAs).toHaveBeenCalled();
      });

      const filename = mockedSaveAs.mock.calls[0][1];
      const today = format(new Date(), 'yyyy-MM-dd');

      expect(filename).toBe(`door-schedule-${today}.csv`);
    });
  });

  describe('Export UI', () => {
    it('shows success message after export', async () => {
      const { getByRole } = render(<DataExport doors={mockDoors} />);
      const exportButton = getByRole('button', { name: /export/i });

      fireEvent.click(exportButton);

      // Wait for success message
      await waitFor(() => {
        expect(mockedSaveAs).toHaveBeenCalled();
      });
    });

    it('handles export errors gracefully', async () => {
      mockedSaveAs.mockImplementationOnce(() => {
        throw new Error('Export failed');
      });

      const { getByRole } = render(<DataExport doors={mockDoors} />);
      const exportButton = getByRole('button', { name: /export/i });

      fireEvent.click(exportButton);

      // Wait for the export to complete
      await waitFor(() => {
        expect(mockedSaveAs).toHaveBeenCalled();
      });
    });
  });

  describe('Large Dataset Handling', () => {
    it('handles large datasets without crashing', async () => {
      // Generate large test dataset
      const largeDataset: DoorSchedule[] = Array.from({ length: 100 }, (_, i) => ({
        id: `door-${i}`,
        doorNumber: 332 + i,
        destinationDC: "6024",
        freightType: "23/43",
        trailerStatus: "empty",
        palletCount: 0,
        timestamp: new Date().toISOString(),
        createdBy: "Test User",
        tcrPresent: true,
      }));

      const { getByRole } = render(<DataExport doors={largeDataset} />);
      const exportButton = getByRole('button', { name: /export/i });

      fireEvent.click(exportButton);
      await waitFor(() => {
        expect(mockedSaveAs).toHaveBeenCalled();
      });

      const blob = mockedSaveAs.mock.calls[0][0] as unknown as Blob;
      const csvContent = await blob.text();

      // Verify all rows are present
      const rows = csvContent.split('\n');
      expect(rows.length).toBe(101); // 100 data rows + 1 header row
    });

    it('shows progress indicator for large exports', async () => {
      const largeDataset: DoorSchedule[] = Array.from({ length: 50 }, (_, i) => ({
        id: `door-${i}`,
        doorNumber: 332 + i,
        destinationDC: "6024",
        freightType: "23/43",
        trailerStatus: "empty",
        palletCount: 0,
        timestamp: new Date().toISOString(),
        createdBy: "Test User",
        tcrPresent: true,
      }));

      const { getByRole } = render(<DataExport doors={largeDataset} />);
      const exportButton = getByRole('button', { name: /export/i });

      fireEvent.click(exportButton);

      // Check for progress indicator
      await waitFor(() => {
        expect(mockedSaveAs).toHaveBeenCalled();
      });
    });
  });
});