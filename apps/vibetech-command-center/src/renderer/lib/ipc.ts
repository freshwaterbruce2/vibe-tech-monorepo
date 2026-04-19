import type { IpcResult } from '@shared/types';

export async function unwrap<T>(promise: Promise<IpcResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.ok) {
    const err = new Error(result.error);
    (err as Error & { code?: string }).code = result.code;
    throw err;
  }
  return result.data;
}
