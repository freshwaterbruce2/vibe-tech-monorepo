-- Track every file in the monorepo
CREATE TABLE IF NOT EXISTS project_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT UNIQUE NOT NULL,
    file_hash TEXT, -- To detect changes quickly
    last_indexed DATETIME DEFAULT CURRENT_TIMESTAMP,
    language TEXT,
    size_bytes INTEGER
);

-- Store semantic chunks (functions, classes, exports)
CREATE TABLE IF NOT EXISTS code_chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER,
    chunk_type TEXT, -- 'function', 'class', 'import'
    identifier TEXT, -- Name of the function/class
    content TEXT,
    start_line INTEGER,
    end_line INTEGER,
    FOREIGN KEY(file_id) REFERENCES project_files(id)
);

-- Note: In a production environment, we'd enable 'sqlite-vec' 
-- for virtual tables to handle semantic search.
