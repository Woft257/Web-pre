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

Mo `http://localhost:3000`. User co the tu tao account bang UID 8 chu so + password, tu doi password sau khi dang nhap; JWT trong cookie `httpOnly` duy tri dang nhap 7 ngay. Admin console tai `http://localhost:3000/admin` yeu cau `ADMIN_SECRET`, co user/match-state/settlement va export CSV; admin khong the sua Kalshi probability.

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

Integration va E2E test can Supabase local dang chay va `.env.local` hop le. E2E global setup chi cho phep URL loopback va tu reset Supabase local truoc moi lan chay; no se khong reset Supabase Cloud.

## Live feed

Gia home dung chinh xac midpoint bid/ask cua home contract Kalshi; away la binary complement de tong payout luon bang 100%. Away contract duoc dung de doi chieu va feed bi tu choi neu lech qua 5 diem phan tram. Ty so va trang thai tran lay tu hai FIFA live endpoint. Worker khong doc the, VAR hay event khac va khong can provider API key.

```powershell
npm run worker:live:once
npm run worker:live
npm run worker:cloud:once
npm run worker:cloud
```

`worker:live*` doc `.env.local` cho Supabase local; `worker:cloud*` doc `.env` cho Supabase Cloud tren may worker rieng. Khi FIFA score tang, market suspend cho den khi gia thuc su thay doi va hai snapshot xac nhan da duoc ghi. Manual admin hold khong the bi worker tu mo; admin phai Release hold, sau do van cho hai snapshot. Khi FIFA tra trang thai chinh thuc ket thuc, worker luu official winner va chuyen `ended`, nhung admin van phai doi chieu source/reference truoc settlement.

Vercel Function khong phu hop cho process polling lien tuc. Web/API van deploy Vercel, con lenh worker trong cung repository phai chay tren mot process always-on. Truoc Production can rehearsal do tre va kiem tra dieu khoan su dung cua cac endpoint cong khai.

## Deploy

1. Tao Supabase project rieng cho Preview va Production.
2. Apply migrations trong `supabase/migrations/` va seed co kiem soat.
3. Trong Vercel Project Settings -> Environment Variables, khai bao toan bo bien trong `.env.example` cho ca Production va Preview; `.env.local` bi Git ignore nen khong duoc upload len Vercel.
4. Kiem tra RLS, RPC grants, Realtime publication va chay smoke test tren URL Vercel.
5. Rehearsal live feed va quy trinh suspend/settle/void truoc ngay su kien.

Ba secret sau la bat buoc ngay trong luc Vercel build va tuyet doi khong duoc them tien to `NEXT_PUBLIC_`:

| Bien | Yeu cau |
| --- | --- |
| `SESSION_SECRET` | Chuoi ngau nhien toi thieu 32 ky tu, dung de ky JWT cookie |
| `ADMIN_SECRET` | Toi thieu 12 ky tu, day la mat khau vao trang admin |
| `ODDS_WORKER_SECRET` | Chuoi ngau nhien toi thieu 12 ky tu, dung cho provider webhook |

Co the tao secret ngau nhien tren may local bang lenh sau, chay rieng mot lan cho moi secret:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Sau khi them hoac sua Environment Variables, can redeploy deployment cu de build moi nhan cac gia tri. Khong commit `.env.local` hoac gia tri secret vao repository.

Khoi tao schema va hai market tren Supabase Cloud (thay `<project-ref>` bang ref trong Supabase URL):

```powershell
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push --linked --include-all --include-seed --dry-run
npx supabase db push --linked --include-all --include-seed
```

Luon doc ket qua `--dry-run` truoc khi push. Sau khi thanh cong, `/api/health` phai tra `database: connected` va `marketCount: 2`.

Chi tiet trang thai va hang muc Production con thieu nam trong [PROJECT_PLAN.md](./PROJECT_PLAN.md). Quy trinh rehearsal/van han nam trong [RUNBOOK.md](./RUNBOOK.md).
