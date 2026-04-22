import type { ReactNode } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";

interface SplitPaneProps {
  left: ReactNode;
  right: ReactNode;
  leftSize?: number;
  rightSize?: number;
}

export function SplitPane({ left, right, leftSize = 35, rightSize = 65 }: SplitPaneProps) {
  return (
    <Group orientation="horizontal" className="h-full w-full">
      <Panel defaultSize={leftSize} minSize={20} className="bg-void-black">
        {left}
      </Panel>

      <Separator className="w-1 bg-surface-black hover:bg-neon-mint transition-colors flex items-center justify-center">
         <div className="h-8 w-0.5 bg-gray-600 rounded" />
      </Separator>

      <Panel defaultSize={rightSize} minSize={20} className="bg-surface-black">
        {right}
      </Panel>
    </Group>
  );
}
