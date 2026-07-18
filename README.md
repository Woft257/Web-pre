# MEXC - VUA PHA LUOI DOC QUYEN

Next.js + Supabase app cho su kien VUA PHA LUOI DOC QUYEN cua cong dong MEXC Viet Nam.

## Luong nguoi dung

1. Nhap ma moi dung chung va UID MEXC 8 chu so.
2. Lan dau se gan UID voi ma da dung; lan sau dang nhap lai bang dung cap ma + UID.
3. Tra loi mot lan ba cau hoi: doi thang, ti so Argentina - Tay Ban Nha va Messi co ghi ban hay khong.
4. Sau khi gui, prediction bi khoa o ca API va database; timeline hien UID da che, thu tu FCFS va chia 20 luot moi trang.
5. Bang xep hang chi hien sau khi admin cong bo ket qua. Moi cau dung duoc 10 diem; dong diem xep theo `submitted_at` som hon.

Moi ma co the dung cho nhieu UID. Nam ma khoi tao chi duoc luu dang SHA-256 trong database; plaintext nam trong file local git-ignore `INVITE_CODES.local.md`.

## Chay local

```powershell
npm install
npm run db:start
npm run db:reset
npm run dev
```

Mo `http://localhost:3000`. Trang admin khong co link tren public UI; truy cap truc tiep `http://localhost:3000/admin` va nhap `ADMIN_SECRET`.

Admin co the xoa tung participant va prediction cua ho. Danger zone cho phep reset toan bo participants/predictions/result/BXH ve trang thai moi, nhung giu lai invite codes; nut reset chi bat sau khi nhap chinh xac `RESET`.

## Kiem thu

```powershell
npm run lint
npm run typecheck
npm run test:run
npm run test:integration
npx supabase test db
npx supabase db lint --local
npm run test:e2e
npm run build
```

E2E global setup chi cho phep reset Supabase co hostname loopback, vi vay khong the xoa nham database Cloud.

## Deploy

Vercel can:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET` (toi thieu 32 ky tu)
- `ADMIN_SECRET` (toi thieu 12 ky tu)
- `NEXT_PUBLIC_APP_TIME_ZONE=Asia/Bangkok`

Truoc deploy, backup Supabase va chay `npx supabase db push --dry-run`. Migration `20260718220000_prediction_contest_rebuild.sql` co chu dich xoa schema market cu va thay bang contest schema, nen phai duoc review truoc khi push Production.
