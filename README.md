# SOMAX · Guia de Deploy
## Vercel + Supabase (100% gratuito)

---

## 1. SUPABASE — Banco de Dados

### 1.1 Criar projeto
1. Acesse https://app.supabase.com e clique em **New Project**
2. Escolha um nome (ex: `somax-propostas`) e uma senha forte para o banco
3. Aguarde o projeto inicializar (~2 min)

### 1.2 Criar o banco
1. No painel esquerdo, clique em **SQL Editor**
2. Clique em **New Query**
3. Cole o conteúdo do arquivo `supabase_schema.sql`
4. Clique em **Run** (▶)
5. Verifique se apareceu "Success" ao final

### 1.3 Pegar as credenciais
1. Vá em **Project Settings** → **API**
2. Copie:
   - **Project URL** → é o `SUPABASE_URL`
   - **anon / public key** → é o `SUPABASE_ANON`

### 1.4 Configurar Auth
1. Vá em **Authentication** → **Providers**
2. Certifique-se que **Email** está ativado
3. Em **Email Templates**, personalize se quiser
4. Em **URL Configuration**, adicione sua URL do Vercel (após deploy)

---

## 2. EDITAR js/config.js

Abra o arquivo `js/config.js` e substitua:

```javascript
const SUPABASE_URL  = 'https://SEU_PROJECT_ID.supabase.co';
const SUPABASE_ANON = 'SUA_ANON_KEY_AQUI';
const APP_URL       = 'https://somax-orcamentos.vercel.app'; // sua URL real
```

---

## 3. VERCEL — Hospedagem

### 3.1 Opção A: Deploy via GitHub (recomendado)
1. Coloque a pasta `somax-app` em um repositório GitHub (privado)
2. Acesse https://vercel.com e faça login com GitHub
3. Clique em **Add New Project**
4. Selecione o repositório
5. Clique em **Deploy** — pronto!
6. A cada `git push`, o Vercel faz redeploy automático

### 3.2 Opção B: Deploy via CLI
```bash
# Instalar Vercel CLI
npm install -g vercel

# Na pasta do projeto
cd somax-app
vercel

# Seguir as instruções no terminal
```

### 3.3 Opção C: Arrastar e soltar
1. Acesse https://vercel.com/new
2. Arraste a pasta `somax-app` para a área indicada
3. Clique em **Deploy**

---

## 4. PÓS-DEPLOY

### 4.1 Atualizar Supabase com a URL do Vercel
1. No Supabase: **Authentication** → **URL Configuration**
2. **Site URL**: `https://somax-orcamentos.vercel.app`
3. **Redirect URLs**: adicione `https://somax-orcamentos.vercel.app/**`

### 4.2 Criar primeiro usuário Admin
1. Acesse seu site e crie uma conta normalmente
2. No Supabase, vá em **Table Editor** → tabela `profiles`
3. Encontre seu usuário e mude o campo `role` para `admin`
4. Agora você tem acesso total ao sistema

### 4.3 Configurar Omie
1. No app, vá em **Configurações**
2. Insira App Key e App Secret do Omie
3. Clique em **Testar Conexão**

---

## 5. WHATSAPP

O envio via WhatsApp usa o **WhatsApp Web** (wa.me) — não precisa de API paga.

A mensagem é pré-preenchida automaticamente com:
- Nome da proposta e número
- Valor total
- Link para o cliente aprovar/cancelar diretamente

Para enviar: basta clicar em **WhatsApp** no painel PDF e confirmar no WhatsApp Web.

---

## 6. ESTRUTURA DO PROJETO

```
somax-app/
├── index.html              # App principal (requer login)
├── proposta.html           # Página pública para o cliente (approve/cancel)
├── css/
│   ├── main.css            # Estilos do app
│   └── pdf.css             # Estilos do documento PDF
├── js/
│   ├── config.js           # ⚠️ EDITAR: URL e chave do Supabase
│   ├── supabase.js         # Cliente Supabase + helpers
│   ├── auth.js             # Login, registro, logout
│   ├── ui.js               # Navegação e UI helpers
│   ├── items.js            # Gestão de itens da proposta
│   ├── bdi.js              # BDI / Multiplicador
│   ├── omie.js             # Integração Omie ERP
│   ├── proposals.js        # CRUD de propostas + busca
│   ├── send.js             # Envio WhatsApp e E-mail
│   ├── pdf.js              # Geração de PDF
│   ├── templates.js        # Templates de condições
│   ├── config-page.js      # Página de configurações + equipe
│   └── app.js              # Inicialização
└── supabase_schema.sql     # Schema completo do banco
```

---

## 7. FUNCIONALIDADES

| Funcionalidade          | Status |
|-------------------------|--------|
| Login / Registro        | ✅     |
| Múltiplos usuários      | ✅     |
| Controle de roles (Admin/User) | ✅ |
| CRUD de propostas       | ✅     |
| Busca e filtros         | ✅     |
| Integração Omie         | ✅     |
| Cálculo BDI automático  | ✅     |
| Templates de condições  | ✅     |
| Geração de PDF          | ✅     |
| Envio por E-mail        | ✅     |
| Envio por WhatsApp      | ✅     |
| Aprovação pelo cliente  | ✅     |
| Histórico de eventos    | ✅     |
| Dashboard com métricas  | ✅     |
| Deploy gratuito         | ✅     |

---

## Suporte
Dúvidas? Abra uma issue no repositório ou entre em contato.
