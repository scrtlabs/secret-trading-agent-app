import sqlite3 from "sqlite3";
import "./envConfig";
import { resolve } from "path";

const verboseSqlite3 = sqlite3.verbose();
const DBPATH = process.env.DBPATH || "../db/memory.db";
const resolvedDBPATH = resolve(DBPATH);
let db: sqlite3.Database;
let isInitializing = false;
let setupPromise: Promise<void> | null = null;

function query<T>(
  dbInstance: sqlite3.Database,
  sql: string,
  params: any[] = [],
): Promise<T> {
  return new Promise((resolve, reject) => {
    dbInstance.all(sql, params, (err, rows) => {
      if (err) {
        console.error("Database query error:", err);
        reject(err);
      } else {
        resolve(rows as T);
      }
    });
  });
}

function get<T>(
  dbInstance: sqlite3.Database,
  sql: string,
  params: any[] = [],
): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    dbInstance.get(sql, params, (err, row) => {
      if (err) {
        console.error("Database get error:", err);
        reject(err);
      } else {
        resolve(row as T | undefined);
      }
    });
  });
}

function run(
  dbInstance: sqlite3.Database,
  sql: string,
  params: any[] = [],
): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    dbInstance.run(sql, params, function (err) {
      if (err) {
        console.error("Database run error:", err);
        reject(err);
      } else {
        resolve({
          lastID: (this as any).lastID,
          changes: (this as any).changes,
        });
      }
    });
  });
}

function exec(dbInstance: sqlite3.Database, sql: string): Promise<void> {
  return new Promise((resolve, reject) => {
    dbInstance.exec(sql, (err) => {
      if (err) {
        console.error("Database exec error:", err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export function openDb(): Promise<sqlite3.Database> {
  return new Promise((resolve, reject) => {
    if (db) {
      if (setupPromise) {
        setupPromise.then(() => resolve(db)).catch(reject);
      } else {
        resolve(db);
      }
      return;
    }

    if (isInitializing) {
      const checkInterval = setInterval(() => {
        if (db) {
          clearInterval(checkInterval);
          if (setupPromise) {
            setupPromise.then(() => resolve(db)).catch(reject);
          } else {
            resolve(db);
          }
        } else if (!isInitializing) {
          clearInterval(checkInterval);
          reject(new Error("Initialization state error"));
        }
      }, 50); // Check every 50ms
      return;
    }

    isInitializing = true;
    console.log("Opening database connection...");
    console.log(resolvedDBPATH);
    const newDb = new verboseSqlite3.Database(resolvedDBPATH, (err) => {
      if (err) {
        console.error("Failed to open database:", err);
        isInitializing = false;
        reject(err);
      } else {
        console.log("Database connection opened.");
        db = newDb;
        setupPromise = setupDatabase(db)
          .then(() => {
            isInitializing = false;
            resolve(db);
          })
          .catch((setupErr) => {
            console.error("Database setup failed:", setupErr);
            isInitializing = false;
            reject(setupErr);
          });
      }
    });
  });
}

export async function setupDatabase(
  dbInstance: sqlite3.Database,
): Promise<void> {
  console.log("Setting up database tables...");
  await exec(
    dbInstance,
    `
    PRAGMA foreign_keys = ON;
  `,
  );
  await exec(
    dbInstance,
    `
      CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          wallet_address TEXT NOT NULL UNIQUE,
          sscrt_key TEXT,
          susdc_key TEXT,
          allowed_to_spend_sscrt TEXT,
          allowed_to_spend_susdc TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS conversations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          wallet_address TEXT NOT NULL,
          message TEXT NOT NULL,
          response TEXT NOT NULL,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (wallet_address) REFERENCES users(wallet_address)
      );
    `,
  );

  await exec(
    dbInstance,
    `
        CREATE TABLE IF NOT EXISTS trading_state (
            wallet_address TEXT PRIMARY KEY,
            convinced INTEGER DEFAULT 0 -- 0 means not convinced, 1 means convinced
        );
    `,
  );
  console.log("Database tables ensured.");
}

export async function storeMemory(
  wallet_address: string,
  message: string,
  response: string,
): Promise<void> {
  const dbInstance = await openDb();
  await run(
    dbInstance,
    "INSERT INTO conversations (wallet_address, message, response) VALUES (?, ?, ?)",
    [wallet_address, message, response],
  );
}

interface ConversationRow {
  message: string;
  response: string;
  wallet_address: string;
}

interface Memory {
  message: string;
  response: string;
  user_id: string;
}

export async function getMemory(
  wallet_address: string,
): Promise<Memory[]> {
  const dbInstance = await openDb();
  const history = await query<ConversationRow[]>(
    dbInstance,
    "SELECT message, response FROM conversations WHERE wallet_address = ? ORDER BY timestamp ASC",
    [wallet_address],
  );

  if (history && history.length) {
    const transformedHistory = history.map((row) => ({
      message: row.message,
      response: row.response,
      user_id: row.wallet_address,
    }));

    return transformedHistory;
  }

  return [];
}

interface TradingStateRow {
  convinced: number;
}

export async function checkConvinced(wallet_address: string): Promise<number> {
  const dbInstance = await openDb();
  const result = await get<TradingStateRow>(
    dbInstance,
    "SELECT convinced FROM trading_state WHERE wallet_address = ?",
    [wallet_address],
  );
  return result?.convinced ?? 0;
}

export async function getUser(wallet_address: string): Promise<User | null> {
  const dbInstance = await openDb();
  const result = await get<User>(
    dbInstance,
    "SELECT * FROM users WHERE wallet_address = ?",
    [wallet_address],
  );

  return result ?? null;
}

export async function createUser(wallet_address: string): Promise<void> {
  const dbInstance = await openDb();
  await run(
    dbInstance,
    "INSERT INTO users (wallet_address) VALUES (?)",
    [wallet_address],
  );
}

export async function setViewingKeys(wallet_address: string, sscrt_key: string, susdc_key: string): Promise<void> {
  const dbInstance = await openDb();
  const user = await getUser(wallet_address);
  if (!user) {
    throw new Error("User not found");
  }

  await run(
    dbInstance,
    "UPDATE users SET sscrt_key = ?, susdc_key = ? WHERE wallet_address = ?",
    [sscrt_key, susdc_key, wallet_address],
  );
}

export async function checkAllowedToSpend(wallet_address: string): Promise<boolean> {
  const user = await getUser(wallet_address);
  if (!user) {
    throw new Error("User not found");
  }

  let isAllowedSscrt = false;
  let isAllowedSusdc = false;

  if (user.allowed_to_spend_sscrt && user.allowed_to_spend_sscrt === 'true') {
    isAllowedSscrt = true;
  }

  if (user.allowed_to_spend_susdc && user.allowed_to_spend_susdc === 'true') {
    isAllowedSusdc = true;
  }

  return isAllowedSscrt && isAllowedSusdc;
}

export async function setAllowedToSpend(wallet_address: string): Promise<void> {
  const user = await getUser(wallet_address);
  if (!user) {
    throw new Error("User not found");
  }

  console.log("user", user);

  const isAllowedSscrt = user.allowed_to_spend_sscrt === 'true';
  const isAllowedSusdc = user.allowed_to_spend_susdc === 'true';

  if (isAllowedSscrt && isAllowedSusdc) {
    return;
  }

  const dbInstance = await openDb();
  await run(
    dbInstance,
    "UPDATE users SET allowed_to_spend_sscrt = ?,allowed_to_spend_susdc = ? WHERE wallet_address = ?",
    ['true', 'true', wallet_address],
  );
}

export async function updateConvinced(wallet_address: string): Promise<void> {
  const dbInstance = await openDb();
  await run(
    dbInstance,
    `INSERT INTO trading_state (wallet_address, convinced)
         VALUES (?, 1)
         ON CONFLICT(wallet_address) DO UPDATE SET convinced=1`,
    [wallet_address],
  );
  console.log(`User ${wallet_address} marked as convinced.`);
}

process.on("exit", () => {
  if (db) {
    console.log("Closing database connection...");
    db.close((err) => {
      if (err) {
        console.error("Error closing database:", err.message);
      } else {
        console.log("Database connection closed.");
      }
    });
  }
});

