import React, { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@vibetech/ui";
import { X } from "lucide-react";
import DoorStepper from "./DoorStepper";
import DCSegmentedControl from "./DCSegmentedControl";
import FreightTypeRadio from "./FreightTypeRadio";
import TrailerStatusToggle from "./TrailerStatusToggle";
import {
  DoorSchedule,
  DestinationDC,
  FreightType,
  TrailerStatus,
} from "@/types/shipping";

type PickerTab = "door" | "dc" | "freight" | "status";

interface UniversalPickerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  doorData: Partial<DoorSchedule>;
  onUpdate: (field: keyof DoorSchedule, value: unknown) => void;
  initialTab?: PickerTab;
}

const UniversalPickerDrawer = ({
  isOpen,
  onClose,
  doorData,
  onUpdate,
  initialTab = "door",
}: UniversalPickerDrawerProps) => {
  const [activeTab, setActiveTab] = useState<PickerTab>(initialTab);

  // Auto-advance to next tab after selection
  const advanceToNextTab = () => {
    switch (activeTab) {
      case "door":
        setActiveTab("dc");
        break;
      case "dc":
        setActiveTab("freight");
        break;
      case "freight":
        setActiveTab("status");
        break;
      case "status":
        // Close drawer when done with the last field
        onClose();
        break;
    }
  };

  // Reset to initial tab when drawer opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <div className="mx-auto w-full max-w-lg">
          <DrawerHeader className="flex items-center justify-between">
            <DrawerTitle className="text-xl font-bold text-walmart-blue">
              Configure Door
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DrawerClose>
          </DrawerHeader>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as PickerTab)}
            className="p-4"
          >
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="door" className="text-base font-medium">
                Door #
              </TabsTrigger>
              <TabsTrigger value="dc" className="text-base font-medium">
                Destination
              </TabsTrigger>
              <TabsTrigger value="freight" className="text-base font-medium">
                Freight
              </TabsTrigger>
              <TabsTrigger value="status" className="text-base font-medium">
                Status
              </TabsTrigger>
            </TabsList>

            <TabsContent value="door" className="py-4 space-y-4">
              <h3 className="text-xl font-semibold mb-4">Select Door Number</h3>
              <DoorStepper
                value={doorData.doorNumber || 332}
                onChange={(value) => {
                  onUpdate("doorNumber", value);
                  advanceToNextTab();
                }}
              />
              <p className="text-sm text-gray-500 mt-2">
                Valid door numbers: 332-454
              </p>
            </TabsContent>

            <TabsContent value="dc" className="py-4 space-y-4">
              <h3 className="text-xl font-semibold mb-4">
                Select Destination DC
              </h3>
              <DCSegmentedControl
                value={doorData.destinationDC || "6024"}
                onValueChange={(value) => {
                  onUpdate("destinationDC", value);
                  advanceToNextTab();
                }}
              />
            </TabsContent>

            <TabsContent value="freight" className="py-4 space-y-4">
              <h3 className="text-xl font-semibold mb-4">
                Select Freight Type
              </h3>
              <FreightTypeRadio
                value={doorData.freightType || "23/43"}
                onChange={(value) => {
                  onUpdate("freightType", value);
                  advanceToNextTab();
                }}
              />
            </TabsContent>

            <TabsContent value="status" className="py-4 space-y-4">
              <h3 className="text-xl font-semibold mb-4">
                Select Trailer Status
              </h3>
              <TrailerStatusToggle
                value={doorData.trailerStatus || "empty"}
                onChange={(value) => {
                  onUpdate("trailerStatus", value);
                  advanceToNextTab();
                }}
              />
            </TabsContent>
          </Tabs>

          <div className="p-4 pt-0 flex justify-end">
            <Button
              onClick={() => advanceToNextTab()}
              className="bg-walmart-blue hover:bg-walmart-blue-dark text-white"
            >
              {activeTab === "status" ? "Done" : "Next"}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default UniversalPickerDrawer;
