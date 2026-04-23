# 🏫 Prospecção de Escolas de Idiomas

Sistema para buscar escolas de idiomas no Brasil, enriquecer com contatos (telefone, email, sócios) e exportar para Excel.

**Funciona de primeira, sem precisar baixar dados.**

## ✨ Como funciona

```
1. Seleciona estado (ex: "SP")
2. Clica "Buscar Escolas de Idiomas" → retorna ~100 escolas
3. Clica "Enriquecer" → busca telefone, email e sócios
4. Clica "Exportar Excel" → pronto!
```

## 🚀 Instalação

```bash
# 1. Instalar dependências
npm install

# 2. Criar banco de dados
npm run db:init

# 3. Rodar
npm run dev
```

Acesse: **http://localhost:3000**

## 📊 Fluxo completo

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Casa dos      │     │   Brasil API    │     │     SQLite      │
│   Dados API     │────▶│  (enriquece)    │────▶│   (salva leads) │
│ (busca escolas) │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
   ~100 escolas           + telefone              Leads salvos
   por busca              + email                 para exportar
                          + sócios
```

## 🔍 O que busca

- **CNAE 8593700** - Ensino de idiomas
- Escolas de inglês, espanhol, francês, etc.
- Cursos de idiomas
- Franquias (CNA, CCAA, Wizard, Fisk, etc.)

## 🛠️ Comandos

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Desenvolvimento (localhost:3000) |
| `npm run build` | Build de produção |
| `npm start` | Rodar produção |
| `npm run db:init` | Criar/resetar banco SQLite |

## 🚀 Deploy no Easypanel

```bash
npm install
npm run build
npm run db:init
npm start
```

### Docker

```dockerfile
FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npm run db:init
EXPOSE 3000
CMD ["npm", "start"]
```

## 📁 Estrutura

```
prospeccao-cnpj/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── search/    → Busca escolas
│   │   │   ├── enrich/    → Enriquece dados
│   │   │   ├── leads/     → Salva leads
│   │   │   └── export/    → Exporta Excel/CSV
│   │   └── page.tsx       → Interface
│   └── lib/
│       ├── search-api.ts  → API Casa dos Dados
│       ├── enrichment.ts  → API Brasil API
│       └── db.ts          → SQLite
├── data/
│   └── prospeccao.db      → Banco local
└── scripts/
    └── init-db.ts
```

## 🔒 Limites das APIs

| API | Limite | Uso |
|-----|--------|-----|
| Casa dos Dados | ~100 resultados/busca | Busca escolas |
| Brasil API | ~30 req/min | Enriquecimento |

## ⚠️ Importante

- **Vercel não funciona** (SQLite precisa de filesystem)
- Use: Easypanel, Railway, Render ou VPS

## 📄 Licença

MIT
