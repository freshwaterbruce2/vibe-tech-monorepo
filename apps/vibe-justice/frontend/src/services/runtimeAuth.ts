import { invoke } from '@tauri-apps/api/core'
import { isTauri } from './tauri'

let runtimeApiKey: string | undefined
let initializedForTauri = false

export async function initializeRuntimeAuth(): Promise<void> {
  runtimeApiKey = isTauri()
    ? await (async () => {
        await invoke<string>('start_backend')
        initializedForTauri = true
        return invoke<string>('get_internal_api_key')
      })()
    : import.meta.env.VITE_VIBE_JUSTICE_API_KEY
}

export function getRuntimeApiKey(): string | undefined {
  if (initializedForTauri) return runtimeApiKey
  return runtimeApiKey ?? import.meta.env.VITE_VIBE_JUSTICE_API_KEY
}

export function resetRuntimeAuthForTests(): void {
  runtimeApiKey = undefined
  initializedForTauri = false
}
