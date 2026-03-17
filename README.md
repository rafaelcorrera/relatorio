# Relatorios GAFS

Dashboard com login para analise de relatorios Excel de restaurante.

## Stack de publicacao

- `GitHub` para versionamento do codigo
- `Netlify` para hospedar o app Next.js
- `Supabase` para autenticacao Google e persistencia dos bundles parseados
- `Groq` ou `OpenAI` para o assistente de perguntas dentro do dashboard

## Como rodar localmente

1. Instale as dependencias:

```bash
npm install
```

2. Crie `.env.local` a partir de `.env.example`.

3. Inicie o projeto:

```bash
npm run dev
```

4. Abra:

```text
http://localhost:3000
```

## Variaveis de ambiente

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ALLOWED_LOGIN_EMAILS=voce@empresa.com,gestor@empresa.com
ADMIN_EMAIL=admin@gafs.local
ADMIN_PASSWORD=gafs123
SESSION_SECRET=troque-esta-chave-antes-de-publicar
AI_PROVIDER=groq
GROQ_API_KEY=cole-sua-chave-aqui
GROQ_MODEL=openai/gpt-oss-20b
OPENAI_API_KEY=cole-sua-chave-aqui
OPENAI_MODEL=gpt-5-mini
```

Observacoes:
- Se `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` estiverem definidos, o login troca automaticamente para `Google via Supabase`.
- Se `SUPABASE_SERVICE_ROLE_KEY` estiver definido, os bundles deixam de ser gravados em `storage/report-store.json` e passam a ser persistidos no Supabase.
- Se `ALLOWED_LOGIN_EMAILS` estiver preenchido, somente esses emails entram no painel.
- Se `ALLOWED_LOGIN_EMAILS` estiver vazio, o projeto consulta a tabela `allowed_login_emails` no Supabase.
- `ADMIN_EMAIL` e `ADMIN_PASSWORD` continuam como fallback para desenvolvimento local sem Supabase.
- `AI_PROVIDER` aceita `groq` ou `openai`. Se nao vier preenchido, o projeto usa `groq` quando `GROQ_API_KEY` existir; caso contrario, cai para `openai`.

## Login Google com allowlist

O fluxo atual funciona assim:
- o usuario clica em `Entrar com Google`
- o Supabase conclui o OAuth
- o callback em `/auth/callback` valida o email
- somente emails predefinidos entram no dashboard

Hoje a allowlist pode vir de dois lugares:
- `ALLOWED_LOGIN_EMAILS` no ambiente
- tabela `allowed_login_emails` no Supabase

## Banco no Supabase

Rode o SQL em [supabase/migrations/202603160001_init_dashboard.sql](supabase/migrations/202603160001_init_dashboard.sql) dentro do `SQL Editor` do Supabase.

Esse script cria:
- `report_bundles` para guardar o bundle parseado de cada periodo
- `allowed_login_emails` para a allowlist de acesso

Se quiser liberar emails pelo banco, insira registros como:

```sql
insert into public.allowed_login_emails (email, label)
values
  ('voce@empresa.com', 'Administrador'),
  ('gestor@empresa.com', 'Gestor');
```

## Publicar no GitHub

Se ainda nao houver repositório:

```bash
git init
git add .
git commit -m "Inicializa dashboard de relatorios"
```

Depois crie o repo no GitHub e conecte:

```bash
git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
git branch -M main
git push -u origin main
```

## Publicar no Supabase

1. Crie um projeto no Supabase.
2. Em `Project Settings > Data API`, copie:
   - `Project URL`
   - `anon/public key`
3. Em `Project Settings > API`, copie a `service_role key`.
4. Rode o SQL da migration.
5. Em `Authentication > Providers > Google`, ative o provedor Google.
6. No Google Cloud Console, configure o OAuth com os redirect URIs:
   - `http://localhost:3000/auth/callback`
   - `https://SEU-SITE.netlify.app/auth/callback`
   - `https://SEU-DOMINIO.com/auth/callback` se houver dominio proprio

## Publicar no Netlify

1. No Netlify, escolha `Add new site` e importe o repo do GitHub.
2. Use:
   - Build command: `npm run build`
   - Node version: `20`
3. Cadastre as variaveis de ambiente do `.env.example`.
4. Garanta que `NEXT_PUBLIC_SITE_URL` aponte para a URL publica do site.
5. Publique.

O projeto ja inclui [netlify.toml](netlify.toml) com o comando de build.

## Assistente IA

O dashboard ja possui a caixa `Faça uma pergunta`.

Como funciona:
- a pergunta vai para `src/app/api/assistant/route.ts`
- o provedor configurado responde usando `Responses API`
- o modelo usa `function calling` para consultar os dados do bundle atual
- os numeros sao retornados a partir dos relatorios parseados, nao do Excel bruto

Para ativar com Groq, defina:

```bash
AI_PROVIDER=groq
GROQ_API_KEY=cole-sua-chave-aqui
GROQ_MODEL=openai/gpt-oss-20b
```

Ou, se preferir usar OpenAI:

```bash
OPENAI_API_KEY=cole-sua-chave-aqui
OPENAI_MODEL=gpt-5-mini
```

## Persistencia dos dados

Com Supabase configurado:
- os bundles ficam na tabela `report_bundles`
- o upload pela interface continua funcionando
- o deploy no Netlify deixa de depender do disco local

Sem Supabase configurado:
- o projeto continua usando `storage/report-store.json`
- o login continua local com email e senha do `.env`

## Validacao

Antes de publicar, rode:

```bash
npm run lint
npm run build
```
