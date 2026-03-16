import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@vibetech/ui";
import { Button } from "@vibetech/ui";
import { Mic, Volume2, Settings2, PlayCircle, CheckCircle2, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

 
export const VoiceTutorial = () => {
  const [activeExample, setActiveExample] = useState<string | null>(null);

  const playExample = (example: string) => {
    setActiveExample(example);
    // Simulate playing for 2 seconds
    setTimeout(() => setActiveExample(null), 2000);
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Voice Command Tutorial
        </CardTitle>
        <CardDescription>
          Learn how to use voice commands effectively
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="tips">Tips</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Quick Start Commands</h3>
              <div className="space-y-2">
                {[
                  { text: "Add door", desc: "Creates a new door entry" },
                  { text: "Quick door", desc: "Adds with default settings" },
                  { text: "Door number 332", desc: "Adds specific door" },
                ].map((cmd) => (
                  <div key={cmd.text} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{cmd.text}</p>
                      <p className="text-sm text-muted-foreground">{cmd.desc}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={activeExample === cmd.text ? "text-green-500" : ""}
                      onClick={() => playExample(cmd.text)}
                    >
                      {activeExample === cmd.text ? <CheckCircle2 className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-medium">Advanced Commands</h3>
              <div className="space-y-2">
                {[
                  { text: "Door for 6024", desc: "Quick DC assignment" },
                  { text: "Empty door", desc: "Set trailer status" },
                  { text: "XD door", desc: "Set freight type" },
                  { text: "Add door 332 to 6024 XD empty", desc: "Complete details" },
                ].map((cmd) => (
                  <div key={cmd.text} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{cmd.text}</p>
                      <p className="text-sm text-muted-foreground">{cmd.desc}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={activeExample === cmd.text ? "text-green-500" : ""}
                      onClick={() => playExample(cmd.text)}
                    >
                      {activeExample === cmd.text ? <CheckCircle2 className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tips" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium">Voice Recognition Tips</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
                    <li>Speak clearly at a normal pace</li>
                    <li>Use numbers for door and DC identifiers</li>
                    <li>Wait for the listening indicator</li>
                    <li>Try to minimize background noise</li>
                    <li>Use natural language - "please" and "can you" work too</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                <Settings2 className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium">Activation Modes</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm mt-2">
                    <li>Button Press: Click to start listening</li>
                    <li>Continuous: Always listening</li>
                    <li>Hotword: Say "Add Door" to activate</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="bg-muted/50 mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Volume2 className="h-4 w-4" />
          <span>Enable voice feedback in settings</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.open("/settings", "_blank")}>
          Open Settings
        </Button>
      </CardFooter>
    </Card>
  );
};

export default VoiceTutorial; 