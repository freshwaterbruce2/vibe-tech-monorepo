import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@vibetech/ui";
import { Button } from "@vibetech/ui";
import { Plus } from "lucide-react";
import { usePalletEntries } from "@/hooks/usePalletEntries";
import { PalletEntry } from "@/types/shipping";
import PalletRow from "./PalletRow";
import PalletExport from "./PalletExport";
import PalletVoiceControl from "./PalletVoiceControl";

const PalletCounter = () => {
  const {
    palletEntries,
    addPalletEntry,
    updateCount,
    deletePalletEntry,
    updateDoorNumber,
    toggleTimer,
    formatElapsedTime,
  } = usePalletEntries();

  return (
    <Card className="container mx-auto shadow-lg border-t-4 border-t-walmart-yellow transition-all duration-200 hover:shadow-xl">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold text-walmart-blue">
            Pallet Counter
          </CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={addPalletEntry}
              size="sm"
              className="bg-walmart-yellow text-walmart-blue hover:bg-walmart-yellow/90 transition-all duration-300 transform hover:scale-105 min-h-[44px] font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Counter
            </Button>
            <PalletVoiceControl onAddDoor={addPalletEntry} />
            <PalletExport palletEntries={palletEntries} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {palletEntries.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-lg bg-gray-50 border-2 border-dashed border-gray-200">
              <p className="text-lg font-medium text-gray-600">
                No pallet counters added yet
              </p>
              <p className="text-sm mt-1 text-gray-500">
                Click "Add Counter" to get started with pallet counting.
              </p>
              <Button
                onClick={addPalletEntry}
                className="mt-4 bg-walmart-yellow text-walmart-blue hover:bg-walmart-yellow/90 min-h-[44px] font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Counter
              </Button>
            </div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" role="list" data-testid="pallet-entry-list">
              {palletEntries.map((entry) => (
                <li key={entry.id}>
                  <PalletRow
                    key={entry.id}
                    entry={entry}
                    onIncrement={() => updateCount(entry.id, true)}
                    onDecrement={() => updateCount(entry.id, false)}
                    onDelete={() => deletePalletEntry(entry.id)}
                    onDoorNumberChange={(doorNumber) =>
                      updateDoorNumber(entry.id, doorNumber)
                    }
                    onToggleTimer={() => toggleTimer(entry.id)}
                    formatElapsedTime={formatElapsedTime}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PalletCounter;
