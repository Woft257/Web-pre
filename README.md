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

## Live feed

Gia lay tu bid/ask cua bon Kalshi contract; ty so va trang thai tran lay tu hai FIFA live endpoint. Worker khong doc the, VAR hay event khac va khong can provider API key.

```powershell
npm run worker:live:once
npm run worker:live
```

Lenh `worker:live:once` dung cho smoke test mot vong; `worker:live` poll mac dinh moi 2 giay. Khi FIFA score tang, market suspend cho den khi ca hai ticker Kalshi co update moi va hai snapshot xac nhan da duoc ghi. Khi FIFA tra trang thai chinh thuc ket thuc, market chuyen `ended` nhung van can admin xac nhan de settlement.

Vercel Function khong phu hop cho process polling lien tuc. Web/API van deploy Vercel, con lenh worker trong cung repository phai chay tren mot process always-on. Truoc Production can rehearsal do tre va kiem tra dieu khoan su dung cua cac endpoint cong khai.

## Deploy

1. Tao Supabase project rieng cho Preview va Production.
2. Apply migrations trong `supabase/migrations/` va seed co kiem soat.
3. Khai bao toan bo bien trong `.env.example` tren Vercel; khong dat service-role/provider/admin secret vao bien `NEXT_PUBLIC_*`.
4. Kiem tra RLS, RPC grants, Realtime publication va chay smoke test tren URL Vercel.
5. Rehearsal live feed va quy trinh suspend/settle/void truoc ngay su kien.

Chi tiet trang thai va hang muc Production con thieu nam trong [PROJECT_PLAN.md](./PROJECT_PLAN.md). Quy trinh rehearsal/van han nam trong [RUNBOOK.md](./RUNBOOK.md).
