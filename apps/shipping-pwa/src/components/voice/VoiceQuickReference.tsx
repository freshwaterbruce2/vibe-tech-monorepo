import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@vibetech/ui";
import { Badge } from "@vibetech/ui";
import { Mic, Zap, Package, Truck } from "lucide-react";

const VoiceQuickReference = () => {
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-blue-500" />
          Voice Commands Quick Reference
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Pallet Counter Commands */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-green-500" />
            <h3 className="font-semibold">Pallet Counter</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              "Add counter",
              "Add pallet",
              "Counter",
              "Pallet"
            ].map((cmd) => (
              <div key={cmd} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                <Badge variant="outline" className="text-xs">Say</Badge>
                <span className="font-medium">"{cmd}"</span>
              </div>
            ))}
          </div>
        </div>

        {/* Door Scheduling Commands */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-blue-500" />
            <h3 className="font-semibold">Door Scheduling - SPEED COMMANDS</h3>
          </div>

          {/* Ultra-Fast Commands */}
          <div className="bg-red-50 p-3 rounded-lg">
            <h4 className="font-medium text-red-700 mb-2">🔥 ULTRA-FAST (1-2 seconds)</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                "332",
                "6024",
                "XD",
                "28"
              ].map((cmd) => (
                <div key={cmd} className="flex items-center gap-2 p-1 bg-white rounded">
                  <Badge variant="outline" className="text-xs bg-red-100">Say</Badge>
                  <span className="font-bold text-red-700">"{cmd}"</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fast Commands */}
          <div className="bg-orange-50 p-3 rounded-lg">
            <h4 className="font-medium text-orange-700 mb-2">🚀 FAST (2-3 seconds)</h4>
            <div className="grid grid-cols-1 gap-2">
              {[
                "Door 332 to 6024",
                "Door 335 XD",
                "Door 340 empty"
              ].map((cmd) => (
                <div key={cmd} className="flex items-center gap-2 p-1 bg-white rounded">
                  <Badge variant="outline" className="text-xs bg-orange-100">Say</Badge>
                  <span className="font-medium text-orange-700">"{cmd}"</span>
                </div>
              ))}
            </div>
          </div>

          {/* Complete Commands */}
          <div className="bg-green-50 p-3 rounded-lg">
            <h4 className="font-medium text-green-700 mb-2">⚡ COMPLETE (3-4 seconds)</h4>
            <div className="grid grid-cols-1 gap-2">
              {[
                "Door 332 to 6024 XD empty"
              ].map((cmd) => (
                <div key={cmd} className="flex items-center gap-2 p-1 bg-white rounded">
                  <Badge variant="outline" className="text-xs bg-green-100">Say</Badge>
                  <span className="font-medium text-green-700">"{cmd}"</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Speed Tips */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            <h3 className="font-semibold">SPEED TIPS for Warehouse Efficiency</h3>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-yellow-600 font-bold">🔥</span>
              <span className="text-sm"><strong>FASTEST:</strong> Just say the number! "332" creates door 332</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-yellow-600 font-bold">⚡</span>
              <span className="text-sm"><strong>RAPID:</strong> "Door 332 to 6024" = complete setup in 3 seconds</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-yellow-600 font-bold">🚀</span>
              <span className="text-sm"><strong>CHAIN:</strong> Say multiple commands back-to-back</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-yellow-600 font-bold">💨</span>
              <span className="text-sm"><strong>NO PAUSES:</strong> Speak continuously for maximum speed</span>
            </div>
          </div>
        </div>

        {/* Speed Examples */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2 text-blue-800">⚡ SPEED WORKFLOW EXAMPLES:</h4>
          <div className="space-y-2 text-sm text-blue-700">
            <p><strong>Ultra-Fast:</strong> Click mic → "332" → Done! (2 seconds)</p>
            <p><strong>Fast Setup:</strong> Click mic → "Door 335 to 6024" → Done! (3 seconds)</p>
            <p><strong>Complete:</strong> Click mic → "Door 340 to 6070 XD empty" → Done! (4 seconds)</p>
            <p><strong>Chain Mode:</strong> Click mic → "332" → "335" → "340" → Multiple doors!</p>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};

export default VoiceQuickReference;
