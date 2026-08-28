// import { invoke } from "@tauri-apps/api/core"; // Reserved for future use
import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';

const systemInfoCpuSchema = z.object({
  currentLoad: z.number(),
  avgLoad: z.number(),
});

const systemInfoMemSchema = z.object({
  total: z.number(),
  free: z.number(),
  used: z.number(),
  active: z.number(),
  available: z.number(),
});

const systemInfoOsSchema = z.object({
  platform: z.string(),
  distro: z.string(),
  release: z.string(),
  arch: z.string(),
});

const systemInfoPayloadSchema = z.object({
  type: z.literal('command_result'),
  payload: z.object({
    result: z.object({
      cpu: systemInfoCpuSchema,
      mem: systemInfoMemSchema,
      os: systemInfoOsSchema,
    }),
  }),
});

export interface SystemInfo {
  cpu: z.infer<typeof systemInfoCpuSchema>;
  mem: z.infer<typeof systemInfoMemSchema>;
  os: z.infer<typeof systemInfoOsSchema>;
}

export const useSystemMonitor = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Listen for IPC messages from the backend
  useEffect(() => {
    const unlisten = listen('ipc-message', (event) => {
      const parsed = systemInfoPayloadSchema.safeParse(event.payload);
      if (!parsed.success) {
        return;
      }

      const result = parsed.data.payload.result;
      setSystemInfo({
        cpu: result.cpu,
        mem: result.mem,
        os: result.os,
      });
    });

    return () => {
      void unlisten.then((f) => f());
    };
  }, []);

  // Function to trigger a manual update (though backend does this automatically now)
  const refreshSystemInfo = useCallback(async () => {
    // We can invoke the same command request logic from frontend if needed
    // But since main.rs is looping, we might just wait.
    // For now, let's rely on the backend loop we set up in Phase 3.
    setIsMonitoring(true);
  }, []);

  return { systemInfo, isMonitoring, refreshSystemInfo };
};
