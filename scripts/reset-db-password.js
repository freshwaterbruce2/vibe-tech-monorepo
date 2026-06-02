import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import bcryptjs from 'bcryptjs';
import { existsSync } from 'node:fs';

const parseArgs = () => {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg?.startsWith('--')) {
      const key = arg.slice(2);
      const val = args[i + 1];
      if (val && !val.startsWith('--')) {
        params[key] = val;
        i++;
      } else {
        params[key] = 'true';
      }
    }
  }
  return params;
};

const main = () => {
  const params = parseArgs();
  const dbPath = params.db ?? process.env.RESET_DB_PATH;
  const email = params.email ?? process.env.RESET_DB_EMAIL;
  const password = params.password ?? process.env.RESET_DB_PASSWORD;

  if (!dbPath) {
    console.error('Error: Database path is required. Provide it via --db <path>.');
    process.exit(1);
  }
  if (!email) {
    console.error('Error: User email is required. Provide it via --email <email>.');
    process.exit(1);
  }
  if (!password) {
    console.error('Error: Plain-text password is required. Provide it via --password <password>.');
    process.exit(1);
  }

  // Path isolated storage policy: database MUST be located on the D:\ drive
  if (!dbPath.toLowerCase().startsWith('d:\\')) {
    console.error(`Error: Isolated storage policy violation. Database must reside on the D:\\ drive. Got: ${dbPath}`);
    process.exit(1);
  }

  if (!existsSync(dbPath)) {
    console.error(`Error: Database file does not exist at: ${dbPath}`);
    process.exit(1);
  }

  console.log(`Connecting to database: ${dbPath}`);
  const db = new Database(dbPath);

  try {
    // Inspect table schema
    const tableInfo = db.prepare("PRAGMA table_info(users)").all();
    if (tableInfo.length === 0) {
      console.error("Error: 'users' table does not exist in the database.");
      process.exit(1);
    }

    const columns = tableInfo.map(col => col.name.toLowerCase());
    
    // Check if user exists
    const userEmailCol = columns.includes('email') ? 'email' : (columns.includes('user_email') ? 'user_email' : null);
    if (!userEmailCol) {
      console.error("Error: Could not identify email column in 'users' table.");
      process.exit(1);
    }

    const userCheck = db.prepare(`SELECT 1 FROM users WHERE LOWER(${userEmailCol}) = ?`).get(email.toLowerCase());
    if (!userCheck) {
      console.error(`Error: User with email '${email}' not found in the database.`);
      process.exit(1);
    }

    // Determine Hashing Strategy based on columns
    let sql = '';
    let binds = [];

    const hasSalt = columns.includes('password_salt');
    const hasHash = columns.includes('password_hash');
    const hasPasswordCol = columns.includes('password');

    if (hasSalt && hasHash) {
      console.log('Detected scrypt hashing schema (password_hash & password_salt columns). Applying scrypt...');
      // scrypt
      const salt = crypto.randomBytes(16);
      const hash = crypto.scryptSync(password, salt, 64);
      
      sql = `UPDATE users SET password_hash = ?, password_salt = ? WHERE LOWER(${userEmailCol}) = ?`;
      binds = [hash, salt, email.toLowerCase()];
    } else if (hasHash) {
      console.log('Detected single password_hash column. Applying bcrypt...');
      // bcrypt
      const salt = bcryptjs.genSaltSync(12);
      const hash = bcryptjs.hashSync(password, salt);
      
      sql = `UPDATE users SET password_hash = ? WHERE LOWER(${userEmailCol}) = ?`;
      binds = [hash, email.toLowerCase()];
    } else if (hasPasswordCol) {
      console.log('Detected single password column. Applying bcrypt...');
      // bcrypt
      const salt = bcryptjs.genSaltSync(12);
      const hash = bcryptjs.hashSync(password, salt);
      
      sql = `UPDATE users SET password = ? WHERE LOWER(${userEmailCol}) = ?`;
      binds = [hash, email.toLowerCase()];
    } else {
      console.error("Error: Unable to find a matching password column (password_hash or password) in 'users' table.");
      process.exit(1);
    }

    const result = db.prepare(sql).run(...binds);
    if (result.changes > 0) {
      console.log(`Success: Password successfully updated for '${email}'.`);
    } else {
      console.error(`Error: Failed to update password for '${email}'.`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Error during database operation:', err.message);
    process.exit(1);
  } finally {
    db.close();
  }
};

main();
