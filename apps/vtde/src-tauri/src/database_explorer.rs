use rusqlite::Connection;
use serde::Serialize;

#[derive(Serialize)]
pub struct TableSummary {
    pub name: String,
    pub row_count: u64,
}

#[derive(Serialize)]
pub struct TableSchema {
    pub cid: i32,
    pub name: String,
    pub type_name: String,
    pub notnull: i32,
    pub dflt_value: Option<String>,
    pub pk: i32,
}

#[derive(Serialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<String>>,
}

#[tauri::command]
pub fn list_databases() -> Result<Vec<String>, String> {
    let mut dbs = Vec::new();

    // Check main DB paths
    let dirs = ["C:\\dev\\databases", "D:\\databases", "D:\\learning-system"];

    for dir in dirs {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file()
                    && path.extension().and_then(|e| e.to_str()) == Some("db") {
                    dbs.push(path.to_string_lossy().into_owned());
                }
            }
        }
    }

    // Add known dashboard db
    dbs.push("C:\\dev\\apps\\monorepo-dashboard\\server\\db\\dashboard.db".to_string());

    dbs.sort();
    dbs.dedup();

    Ok(dbs)
}

#[tauri::command]
pub fn get_tables(db_path: String) -> Result<Vec<TableSummary>, String> {
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").map_err(|e| e.to_string())?;
    let mut tables = Vec::new();

    let table_iter = stmt.query_map([], |row| {
        row.get::<_, String>(0)
    }).map_err(|e| e.to_string())?;

    for table_res in table_iter {
        if let Ok(name) = table_res {
            // Count rows
            let count_query = format!("SELECT COUNT(*) FROM \"{}\"", name);
            let row_count: u64 = conn.query_row(&count_query, [], |row| row.get::<_, i64>(0)).unwrap_or(0) as u64;

            tables.push(TableSummary {
                name,
                row_count,
            });
        }
    }

    Ok(tables)
}

#[tauri::command]
pub fn get_table_schema(db_path: String, table_name: String) -> Result<Vec<TableSchema>, String> {
    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

    let query = format!("PRAGMA table_info(\"{}\")", table_name);
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let mut schema = Vec::new();
    let schema_iter = stmt.query_map([], |row| {
        Ok(TableSchema {
            cid: row.get(0)?,
            name: row.get(1)?,
            type_name: row.get(2)?,
            notnull: row.get(3)?,
            dflt_value: row.get(4).ok(),
            pk: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;

    for s in schema_iter {
        if let Ok(sc) = s {
            schema.push(sc);
        }
    }

    Ok(schema)
}

#[tauri::command]
pub fn execute_query(db_path: String, query: String) -> Result<QueryResult, String> {
    // Basic safety check
    let query_upper = query.to_uppercase();
    if !query_upper.trim_start().starts_with("SELECT") && !query_upper.trim_start().starts_with("PRAGMA") {
        return Err("Only SELECT and PRAGMA queries are allowed for safety".to_string());
    }

    let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;

    let column_count = stmt.column_count();
    let columns: Vec<String> = stmt.column_names().iter().map(|s| s.to_string()).collect();

    let mut rows_data = Vec::new();

    let mut rows = stmt.query([]).map_err(|e| e.to_string())?;
    while let Ok(Some(row)) = rows.next() {
        let mut row_vec = Vec::new();
        for i in 0..column_count {
            // Convert everything to string for simplicity
            let val = match row.get_ref(i) {
                Ok(rusqlite::types::ValueRef::Null) => "NULL".to_string(),
                Ok(rusqlite::types::ValueRef::Integer(i)) => i.to_string(),
                Ok(rusqlite::types::ValueRef::Real(f)) => f.to_string(),
                Ok(rusqlite::types::ValueRef::Text(t)) => String::from_utf8_lossy(t).into_owned(),
                Ok(rusqlite::types::ValueRef::Blob(b)) => format!("<Blob {} bytes>", b.len()),
                Err(_) => "Error".to_string(),
            };
            row_vec.push(val);
        }
        rows_data.push(row_vec);
    }

    Ok(QueryResult {
        columns,
        rows: rows_data,
    })
}
