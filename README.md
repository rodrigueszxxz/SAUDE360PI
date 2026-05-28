# Saúde 360 — Plataforma de Agendamento Médico

Sistema completo para clínicas: agendamento online, teleconsulta, triagem, prontuário eletrônico, pagamentos via Stripe e notificações WhatsApp.

**Stack:** Node.js + Express (backend) · React + Vite + TypeScript (frontend) · Supabase (banco) · Redis (opcional) · Docker

---

## Pré-requisitos

| Ferramenta | Versão mínima | Download |
|---|---|---|
| Node.js | 20+ | https://nodejs.org |
| Docker + Docker Compose | qualquer recente | https://docs.docker.com/get-docker |
| Conta Supabase | — | https://supabase.com |
| Conta Stripe (opcional) | — | https://stripe.com |
| Conta Twilio (opcional) | — | https://twilio.com |

---

## Configuração Inicial (única vez)

### 1. Banco de dados — Supabase

1. Acesse [supabase.com](https://supabase.com) → **New project**
2. Anote a **URL do projeto** e a **Service Role key** (Settings → API)
3. No Supabase, vá em **SQL Editor** → cole e execute o conteúdo de `banco_completo_atualizado.sql`

> O script cria todas as tabelas, índices, políticas RLS e dados iniciais.

---

### 2. Variáveis de ambiente — Backend

```bash
cd saude360_backend
cp .env.example .env    # ou edite o .env já existente
```

Abra `.env` e preencha:

```env
# Obrigatórios
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_KEY=<service_role key do Supabase>
JWT_SECRET=<string aleatória longa — veja comando abaixo>
JWT_REFRESH_SECRET=<outra string aleatória longa>

# Opcionais (funciona sem eles, mas com aviso)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
```

**Gerar chaves JWT:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Execute duas vezes — use uma para `JWT_SECRET` e outra para `JWT_REFRESH_SECRET`.

---

### 3. Variáveis de ambiente — Frontend

O arquivo `.env.local` já está configurado para desenvolvimento local:

```env
VITE_API_URL=http://localhost:3002
```

Não precisa alterar nada para rodar localmente.

---

## Rodando o Projeto

### Opção A — Docker (recomendado)

Roda backend + frontend + Redis com um único comando:

```bash
# Na raiz do projeto (onde está o docker-compose.yml)
docker compose up --build
```

Aguarde os containers subirem (~1 minuto na primeira vez). Acesse:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3002
- **Docs Swagger:** http://localhost:3002/api-docs

Para parar:
```bash
docker compose down
```

---

### Opção B — Manual (sem Docker)

#### Terminal 1 — Backend

```bash
cd saude360_backend
npm install
npm run dev
```

O servidor sobe em **http://localhost:3002** com hot-reload.

#### Terminal 2 — Frontend

```bash
cd saude360_frontend
npm install
npm run dev
```

O app abre em **http://localhost:8080** (ou 5173, conforme Vite).

> Redis é opcional. Sem ele, as filas de espera funcionam em memória com log de aviso.

---

## Primeiros Acessos

### Criar usuário de teste

Com o backend rodando, execute o seed:

```bash
cd saude360_backend
node scripts/seed_usuarios_teste.js
```

Isso cria usuários padrão (verifique o script para ver emails/senhas).

### Acessar como Admin ou Médico

Usuários com papel `admin` ou `medico` são criados diretamente no banco. Acesse:

```bash
# No SQL Editor do Supabase
INSERT INTO usuarios (nome, email, senha_hash, papel, ativo)
VALUES (
  'Admin',
  'admin@clinica.com',
  -- Gere o hash antes: node -e "require('bcrypt').hash('SuaSenha123',12).then(console.log)"
  '$2b$12$HASH_AQUI',
  'admin',
  true
);
```

---

## Pagamentos com Stripe

Por padrão, o Stripe está **desabilitado** (sem cobrança real). Para ativar:

1. Crie conta em [stripe.com](https://stripe.com)
2. Pegue a `sk_test_...` em Dashboard → Developers → API keys
3. Coloque no `.env`:
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   ```
4. Para webhooks locais, use o Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3002/pagamentos/webhook-stripe
   ```
   Copie o `whsec_...` gerado para `STRIPE_WEBHOOK_SECRET`.

---

## WhatsApp (Twilio)

Por padrão, mensagens são **logadas no console** sem envio real. Para ativar:

1. Crie conta em [twilio.com](https://twilio.com)
2. Ative o **Sandbox do WhatsApp** (gratuito para testes)
3. Preencha no `.env`:
   ```env
   TWILIO_ACCOUNT_SID=ACxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxx
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   ```

---

## Estrutura do Projeto

```
saude360/
├── banco_completo_atualizado.sql   # Schema completo do banco
├── docker-compose.yml              # Orquestração dos serviços
├── saude360_backend/               # API Node.js
│   ├── app.js                      # Ponto de entrada
│   ├── .env                        # Variáveis de ambiente (não comitar!)
│   ├── config/                     # Supabase, Redis, Swagger
│   ├── controllers/                # Lógica dos endpoints
│   ├── middlewares/                # Auth JWT, auditoria, validação CPF
│   ├── migrations/                 # Scripts SQL incrementais
│   ├── queues/                     # Fila de lista de espera
│   ├── repositories/               # Acesso ao banco (queries)
│   ├── routes/                     # Definição das rotas HTTP
│   ├── scripts/                    # Seed de dados de teste
│   └── services/                   # Regras de negócio, integrações
└── saude360_frontend/              # App React + Vite
    ├── src/
    │   ├── components/             # Componentes reutilizáveis
    │   ├── context/                # AuthContext (JWT em memória)
    │   ├── hooks/                  # Custom hooks
    │   ├── lib/                    # API client, utilitários
    │   └── pages/                  # Páginas por papel de usuário
    └── public/                     # Assets estáticos
```

---

## Papéis de Usuário

| Papel | Acesso |
|---|---|
| `paciente` | Portal do paciente, agendamento, pagamento, chatbot |
| `medico` | Painel médico, agenda, prontuário, triagem |
| `recepcionista` | Painel da recepção, check-in QR, lista de espera |
| `admin` | Tudo acima + KPIs, relatório financeiro, auditoria |

---

## Comandos Úteis

```bash
# Ver logs dos containers Docker
docker compose logs -f backend
docker compose logs -f frontend

# Recriar apenas o backend após mudanças
docker compose up --build backend

# Verificar saúde da API
curl http://localhost:3002/health

# Testar conexão com banco (backend rodando)
curl http://localhost:3002/medicos
```

---

## Problemas Comuns

**"Variáveis de ambiente ausentes"** ao iniciar o backend  
→ Verifique se `.env` existe em `saude360_backend/` com `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` preenchidos.

**Frontend conecta mas retorna 401 em tudo**  
→ O banco está vazio ou o usuário não foi criado. Execute o seed ou insira um usuário manualmente.

**Redis não disponível (aviso no log)**  
→ Normal sem Docker. As filas funcionam em memória. Ignore o aviso em desenvolvimento.

**Stripe desabilitado (aviso no log)**  
→ Normal sem `STRIPE_SECRET_KEY`. O botão de pagamento fica visível mas não processa cobrança real.

**CORS bloqueado no browser**  
→ Verifique se `ALLOWED_ORIGINS` no `.env` inclui a URL do seu frontend.
