import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'prospeccao.db');

// Criar diretório
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

console.log('🗃️  Inicializando banco de dados...');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

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

db.close();

console.log('✅ Banco de dados criado em:', DB_PATH);
console.log('\n🚀 Agora rode: npm run dev');
