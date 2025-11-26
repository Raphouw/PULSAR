import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
   ssl: { rejectUnauthorized: false }  // important pour Supabase

});

async function test() {
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Connexion OK, time:', res.rows[0]);
  } catch (err) {
    console.error('❌ Erreur connexion DB:', err);
  } finally {
    await pool.end();
  }
}

test();
