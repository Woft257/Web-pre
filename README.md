# MEXC Kickoff Markets

Ung dung prediction market bang diem cho hai tran bong da ngay 19-20/07/2026. Frontend va API cung chay trong Next.js; Supabase Postgres la source of truth va Supabase Realtime phat thay doi market/BXH.

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Supabase Postgres, RPC transaction, RLS va Realtime
- Virtual market maker neo theo live-odds oracle
- Vitest, pgTAP va Playwright

## Chay local

Yeu cau Node.js 22+, Docker Desktop va Supabase CLI (da co trong dev dependencies).

```powershell
npm install
npx supabase start
npx supabase db reset
Copy-Item .env.example .env.local
```

Dien URL, anon key va service-role key do `npx supabase status` tra ve vao `.env.local`, sau do dien cac secret local toi thieu 12/32 ky tu theo `.env.example`.

```powershell
npm run dev
```

Mo `http://localhost:3000`. Trang dieu hanh replay/settlement nam tai `http://localhost:3000/admin` va yeu cau `ADMIN_SECRET`.

## Kiem thu

```powershell
npm run lint
npm run typecheck
npm run test:run
npm run test:integration
npx supabase test db
npm run test:e2e
npm run build
```

Integration va E2E test can Supabase local dang chay va `.env.local` hop le. `npm run test:integration` tao du lieu test trong local database; chay `npm run db:reset` de dua database ve seed ban dau.

## Live odds

`ODDS_PROVIDER=replay` la che do phat trien mac dinh. Admin co the gui replay tick de test score, clock, status va Realtime ma khong ton quota.

Worker prototype cho The Odds API:

```powershell
npm run worker:odds
```

Worker chi nhan market nhi phan final-winner; no se tu choi market bong da 1X2 co ba cua. Khong dung worker REST prototype cho su kien production cho den khi da xac nhan coverage, latency, bet-stop, quota va dieu khoan data.

## Deploy

1. Tao Supabase project rieng cho Preview va Production.
2. Apply migrations trong `supabase/migrations/` va seed co kiem soat.
3. Khai bao toan bo bien trong `.env.example` tren Vercel; khong dat service-role/provider/admin secret vao bien `NEXT_PUBLIC_*`.
4. Kiem tra RLS, RPC grants, Realtime publication va chay smoke test tren URL Vercel.
5. Rehearsal live feed va quy trinh suspend/settle/void truoc ngay su kien.

Chi tiet trang thai va hang muc Production con thieu nam trong [PROJECT_PLAN.md](./PROJECT_PLAN.md). Quy trinh rehearsal/van han nam trong [RUNBOOK.md](./RUNBOOK.md).
