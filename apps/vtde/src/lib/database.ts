import { invoke } from '@tauri-apps/api/core';

export interface TableSummary {
  name: string;
  row_count: number;
}

export interface TableSchema {
  cid: number;
  name: string;
  type_name: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

export interface QueryResult {
  columns: string[];
  rows: string[][];
}

export async function listDatabases(): Promise<string[]> {
  return await invoke<string[]>('list_databases');
}

export async function getTables(dbPath: string): Promise<TableSummary[]> {
  return await invoke<TableSummary[]>('get_tables', { dbPath });
}

export async function getTableSchema(dbPath: string, tableName: string): Promise<TableSchema[]> {
  return await invoke<TableSchema[]>('get_table_schema', { dbPath, tableName });
}

export async function executeQuery(dbPath: string, query: string): Promise<QueryResult> {
  return await invoke<QueryResult>('execute_query', { dbPath, query });
}
