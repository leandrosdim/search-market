import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

let pool: Pool | undefined;

function readDatabaseUrlFromEnvFile(): string | undefined {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return undefined;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim().replace(/^['\"]|['\"]$/g, "");
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("postgresql://") || line.startsWith("postgres://")) return line;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^['\"]|['\"]$/g, "");
    if (key === "DATABASE_URL" || value.startsWith("postgresql://") || value.startsWith("postgres://")) {
      return value;
    }
  }
  return undefined;
}

export function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL || readDatabaseUrlFromEnvFile();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is missing. Put a PostgreSQL connection string in .env.");
  }
  return databaseUrl;
}

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const result = await getPool().query(sql, params);
  return result.rows as T[];
}
