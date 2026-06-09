export interface DatabaseInventoryEntry {
    name: string;
    path: string;
    purpose: string;
}
export declare const DATABASE_INVENTORY_PATH = "D:\\databases\\DB_INVENTORY.md";
export declare const FALLBACK_DATABASE_INVENTORY: readonly DatabaseInventoryEntry[];
export declare function parseDatabaseInventoryMarkdown(markdown: string): DatabaseInventoryEntry[];
export declare function loadDatabaseInventory(inventoryPath?: string): DatabaseInventoryEntry[];
//# sourceMappingURL=database-inventory.d.ts.map