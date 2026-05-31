export interface BaseAdapter {
  name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
}
