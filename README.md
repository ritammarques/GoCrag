# GoCrag — Boulder Scout App

> "Ajudar praticantes de boulder outdoor a decidir rapidamente onde escalar hoje."

App mobile-first que une spots, meteorologia em tempo real, beta da comunidade e acesso ao local num único fluxo simples.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS 3 |
| Mapa | Leaflet 1.9 + OpenStreetMap (sem API key) |
| Clustering | leaflet.markercluster |
| Auth + DB + Storage | Supabase |
| Meteorologia | OpenWeatherMap API (free tier) |
| Deploy | Netlify + @netlify/plugin-nextjs |

---

## Setup Local

### 1. Pré-requisitos
- Node.js 18+
- Conta no [Supabase](https://supabase.com)
- API key do [OpenWeatherMap](https://openweathermap.org/api)

### 2. Instalar e configurar

```bash
git clone https://github.com/<user>/gocrag.git
cd gocrag
npm install
cp .env.example .env.local   # edita com as tuas credenciais
```

### 3. Base de dados Supabase

Vai a **Supabase Dashboard → SQL Editor** e corre por ordem:

```
1. supabase/schema_v2.sql    ← tabelas + RLS + Storage policies
2. supabase/seed_v2.sql      ← spots, sectores e desafios de teste
```

### 4. Correr localmente

```bash
npm run dev        # → http://localhost:3000
npm run build      # verifica se o build passa antes de fazer push
npm run type-check # verifica TypeScript
```

---

## Deploy Netlify via GitHub (passo a passo)

### Passo 1 — Repositório GitHub

```bash
git init
git add .
git commit -m "feat: initial GoCrag app"
git branch -M main
git remote add origin https://github.com/<user>/gocrag.git
git push -u origin main
```

### Passo 2 — Criar site no Netlify

1. Vai a [app.netlify.com](https://app.netlify.com) → **Add new site → Import an existing project**
2. Escolhe **GitHub** e autoriza o acesso
3. Seleciona o repositório `gocrag`
4. Build settings (o `netlify.toml` já os define, mas confirma):
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`
5. Clica **Deploy site**

O plugin `@netlify/plugin-nextjs` é instalado automaticamente pelo Netlify (declarado no `netlify.toml`) — **não precisas de o adicionar ao `package.json`**.

### Passo 3 — Variáveis de ambiente no Netlify

Vai a **Site settings → Environment variables → Add a variable**:

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` |
| `NEXT_PUBLIC_OPENWEATHER_API_KEY` | a tua key |
| `NEXT_PUBLIC_APP_URL` | `https://gocrag.netlify.app` |

Depois de adicionar, faz **Trigger deploy → Deploy site**.

### Passo 4 — Configurar Supabase para produção

Vai a **Supabase Dashboard → Authentication → URL Configuration**:

```
Site URL:       https://gocrag.netlify.app
Redirect URLs:  https://gocrag.netlify.app/**
                http://localhost:3000/**
```

### Passo 5 — Deploy automático (CI/CD)

A partir de agora, cada `git push origin main` dispara um deploy automático no Netlify.

```bash
# Workflow típico
git add .
git commit -m "fix: corrige score de condições"
git push origin main
# → Netlify faz build e deploy automaticamente
```

---

## Estrutura de ficheiros

```
gocrag/
├── netlify.toml              ← build config + plugin Netlify
├── next.config.mjs           ← Next.js config (SSR, images, headers)
├── middleware.ts             ← refresh de sessão Supabase
├── .env.example              ← template de variáveis
├── .eslintrc.json
├── next-env.d.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
│
├── supabase/
│   ├── schema_v2.sql         ← tabelas + RLS + Storage policies
│   └── seed_v2.sql           ← 7 spots, 11 sectores, 15 desafios
│
└── src/
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── page.tsx                      → redirect /map
    │   ├── login/page.tsx
    │   ├── map/page.tsx                  ← HOME
    │   ├── explore/page.tsx
    │   ├── favorites/page.tsx
    │   ├── profile/page.tsx
    │   └── spot/[id]/
    │       ├── page.tsx
    │       └── sector/[sectorId]/
    │           ├── page.tsx
    │           └── challenge/[challengeId]/page.tsx
    ├── components/
    │   ├── auth/AuthModal.tsx
    │   ├── layout/{AppShell,BottomNav}.tsx
    │   ├── map/MapView.tsx               ← dynamic import (no SSR)
    │   ├── spot/{SpotCard,UploadSection}.tsx
    │   └── ui/index.tsx
    ├── hooks/
    │   ├── useAuth.ts
    │   ├── useGeolocation.ts
    │   ├── useOnline.ts
    │   ├── useSpots.ts
    │   ├── useUpload.ts
    │   └── useWeather.ts
    ├── lib/
    │   ├── conditions.ts
    │   ├── supabase.ts
    │   ├── supabase-server.ts
    │   ├── utils.ts
    │   └── weather.ts
    └── types/index.ts
```

---

## Arquitectura Netlify + Next.js

```
GitHub push → Netlify CI build (npm run build)
                ↓
         @netlify/plugin-nextjs
                ↓
    Server Components  → Netlify Functions (SSR)
    Client Components  → Static bundle
    API Routes         → Netlify Functions
    Middleware         → Netlify Edge Functions
    Static assets      → Netlify CDN
```

O plugin `@netlify/plugin-nextjs` converte automaticamente:
- App Router com SSR → Netlify Functions
- `next/image` → Netlify Image CDN
- Middleware → Netlify Edge Functions

---

## Weather Score

```
Score inicial: 100

Penalizações:
  Chuva > 2 mm/h    → -60   Humidade > 85%    → -20
  Chuva 0–2 mm/h    → -35   Humidade 70–85%   → -10
  Temp < 5° ou >35° → -20   Vento > 40 km/h   → -20
  Temp < 10° ou >30°→  -8   Vento > 25 km/h   → -10

Resultado:  ≥70 BOM (verde) | ≥40 OK (amarelo) | <40 MAU (vermelho)
```

---

## Troubleshooting

**Build falha com "window is not defined"**
→ O `MapView` usa `dynamic({ ssr: false })` — está protegido.
  Se aparecer noutro componente, envolve com `if (typeof window === 'undefined') return null`.

**Leaflet markers não aparecem**
→ Confirma que o CSS do Leaflet está no `layout.tsx` (links para unpkg.com).
  Os ícones padrão são substituídos por `divIcon` — não precisam de imagens locais.

**Supabase retorna 401**
→ Verifica as env vars no Netlify. As variáveis `NEXT_PUBLIC_*` têm de estar definidas
  **antes** do build (não em runtime).

**Deploy Netlify falha com "plugin not found"**
→ O `@netlify/plugin-nextjs` é instalado pelo Netlify automaticamente quando declarado
  no `netlify.toml`. Não o adiciones ao `package.json`.

**Erro CORS no OpenWeatherMap**
→ A API é chamada do browser (client component) — não há CORS se a key for válida.
  Confirma que `NEXT_PUBLIC_OPENWEATHER_API_KEY` está definida.
