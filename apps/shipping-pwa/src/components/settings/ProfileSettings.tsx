import { useState, useEffect, type ChangeEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@vibetech/ui";
import { Label } from "@/components/ui/label";
import { Input } from "@vibetech/ui";
import { Button } from "@vibetech/ui";
import { User } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
// cspell:ignore sonner
import { toast } from "sonner";

const ProfileSettings = () => {
  const { currentUser, updateUser } = useUser();
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [isChanged, setIsChanged] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayName(currentUser.displayName);
    setIsChanged(false);
  }, [currentUser.displayName]);

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDisplayName(e.target.value);
    setIsChanged(e.target.value !== currentUser.displayName);
  };

  const handleSave = () => {
    if (displayName.trim() === "") {
      toast.error("Display name cannot be empty", {
        description: "Please enter a valid display name",
      });
      return;
    }

    updateUser({ ...currentUser, displayName: displayName.trim() });
    toast.success("Profile updated", {
      description: "Your display name has been updated",
    });
    setIsChanged(false);

    // Store in IndexedDB for persistence
    if ("indexedDB" in window) {
      const request = indexedDB.open("door-ship-flow-db", 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("userProfile")) {
          db.createObjectStore("userProfile", { keyPath: "id" });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(["userProfile"], "readwrite");
        const store = transaction.objectStore("userProfile");
        store.put({
          ...currentUser,
          id: "currentUser",
          displayName: displayName.trim(),
        });
      };
    }
  };

  return (
    <Card className="container mx-auto mb-8 border-walmart-blue">
      <CardHeader className="border-b bg-walmart-blue bg-opacity-5">
        <CardTitle className="flex items-center text-walmart-blue">
          <User className="mr-2 h-5 w-5" />
          <span>Profile</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="display-name" className="text-base">
            Display Name
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="display-name"
              value={displayName}
              onChange={handleNameChange}
              placeholder="Enter your display name"
              className="flex-1 min-h-[44px]"
              aria-label="Your display name"
            />
            <Button
              onClick={handleSave}
              className="bg-walmart-blue hover:bg-walmart-blue-dark min-h-[44px]"
              disabled={!isChanged}
              aria-label="Save display name"
            >
              Save
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            This name will be displayed in the header and on exports
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfileSettings;
