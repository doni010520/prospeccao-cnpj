import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Caminho do banco
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'prospeccao.db');

// Garantir que o diretório existe
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Singleton
let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    
    // Criar tabelas se não existirem
    db.exec(`
      CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cnpj TEXT UNIQUE NOT NULL,
        razao_social TEXT,
        nome_fantasia TEXT,
        cnae_fiscal TEXT,
        cnae_descricao TEXT,
        uf TEXT,
        cidade TEXT,
        bairro TEXT,
        endereco TEXT,
        cep TEXT,
        telefone TEXT,
        email TEXT,
        capital_social REAL,
        porte TEXT,
        data_abertura TEXT,
        situacao TEXT,
        nome_socio_1 TEXT,
        cargo_socio_1 TEXT,
        nome_socio_2 TEXT,
        cargo_socio_2 TEXT,
        fonte_enriquecimento TEXT,
        data_enriquecimento TEXT,
        status TEXT DEFAULT 'novo' CHECK(status IN ('novo', 'contatado', 'qualificado', 'descartado')),
        notas TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
      CREATE INDEX IF NOT EXISTS idx_leads_uf ON leads(uf);
      CREATE INDEX IF NOT EXISTS idx_leads_cnae ON leads(cnae_fiscal);
    `);
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Tipos
export interface Lead {
  id: number;
  cnpj: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  cnae_fiscal: string | null;
  cnae_descricao: string | null;
  uf: string | null;
  cidade: string | null;
  bairro: string | null;
  endereco: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  capital_social: number | null;
  porte: string | null;
  data_abertura: string | null;
  situacao: string | null;
  nome_socio_1: string | null;
  cargo_socio_1: string | null;
  nome_socio_2: string | null;
  cargo_socio_2: string | null;
  fonte_enriquecimento: string | null;
  data_enriquecimento: string | null;
  status: string;
  notas: string | null;
  created_at: string;
  updated_at: string;
}
