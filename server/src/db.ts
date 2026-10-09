import { Pool } from 'pg';

const url = process.env.DATABASE_URL;

export const pool: Pool | null = url
  ? new Pool({
      connectionString: url,
      ssl: url.includes('localhost') || url.includes('127.0.0.1') ? undefined : { rejectUnauthorized: false },
    })
  : null;

export async function initDb(): Promise<void> {
  if (!pool) {
    console.warn('DATABASE_URL not set: accounts are disabled (guests only).');
    return;
  }
  await pool.query(`
    create table if not exists users (
      id serial primary key,
      username text not null,
      username_lower text not null unique,
      password_hash text not null,
      created_at timestamptz not null default now()
    )
  `);
  console.log('Database ready.');
}