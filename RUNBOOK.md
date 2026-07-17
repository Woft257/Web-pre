# MEXC Kickoff Markets Runbook

> Trang thai: ban local/rehearsal. Phai dien provider contact, production URL va nguoi truc truoc khi su kien bat dau.

## 1. Thong tin can dien

- Vercel Production URL: `TBD`
- Supabase Production project: `TBD`
- Primary odds provider / support contact: `TBD`
- Fallback provider / support contact: `TBD`
- Nguoi co quyen settle/void: `TBD`
- Kenh incident noi bo: `TBD`

Khong ghi secret hoac API key vao file nay. Secret chi nam trong Vercel/Supabase secret store.

## 2. Truoc su kien

### T-7 ngay

- Xac nhan provider co dung market final-winner nhi phan, gom hiep phu/luan luu.
- Chay proof-of-coverage tren tran tuong tu; do goal -> bet-stop -> odds moi va quota.
- Apply migration vao Preview, test RLS/RPC/Realtime va backup/restore.
- Chay `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run test:integration`, `npx supabase test db`, `npm run test:e2e`, `npm run build`.

### T-1 ngay

- Chot kickoff/trading end theo UTC va doi chieu UI `GMT+7`.
- Kiem tra `/api/health`, hai market, provider mapping va last source timestamp.
- Xac nhan alert quota/feed stale, primary/fallback deviation va nguoi truc.
- Rehearsal admin suspend, hai-snapshot resume, preview settle va preview void.

### T-30 phut

- Xac nhan feed `healthy`, score `0-0`, oracle timestamp moi va Realtime dang `live`.
- Kiem tra mot UID test co the quote; khong commit trade test tren Production neu khong co UID test rieng.
- Mo admin operations va provider dashboard tren may truc.

## 3. Trong tran

- Theo doi source timestamp, score, minute, oracle version, provider quota va API error rate.
- Suspend ngay khi goal/VAR/penalty/red card/bet-stop, score regression, feed stale hoac primary/fallback lech qua nguong da duyet.
- Khong resume bang status flag. Cho hai odds snapshot moi sau suspend va xac nhan score khong regression.
- Neu provider outage: giu last valid price de xem, khong mo trading; ghi incident timestamp va provider ticket.
- Neu Supabase/Vercel loi: suspend market khi he thong tro lai truoc khi cho giao dich tiep.

## 4. Incident checklist

### Feed stale hoac mat feed

1. Suspend market, ghi ly do va timestamp.
2. Kiem tra provider status/quota va fallback.
3. Doi chieu score/clock voi nguon thu hai.
4. Chi resume sau hai snapshot moi va score hop le.

### Score hoac odds bat thuong

1. Khong sua truc tiep balance, trade, position hoac ledger.
2. Suspend market; luu raw provider payload va oracle version lien quan.
3. Doi chieu primary/fallback va lien he provider.
4. Neu can sua diem, dung adjustment/reversal migration/RPC co audit duoc duyet, khong update ledger cu.

### API/DB loi

1. Kiem tra `/api/health`, Vercel logs va Supabase status.
2. Suspend market sau khi control plane phuc hoi.
3. Xac minh idempotency key/trade/ledger truoc khi cho user retry.
4. Khong replay request settlement neu chua kiem tra settlement record; RPC settlement/void la idempotent.

## 5. Ket thuc va settlement

1. Chuyen market sang `ended`; trading phai disabled.
2. Lay ket qua final-winner tu nguon chinh thuc va doi chieu nguon thu hai.
3. Dien result source/reference trong admin, chay preview va doi chieu affected users/total payout.
4. Xac nhan lan hai, settle mot lan va kiem tra settlement/audit/ledger/BXH.
5. Neu tran huy/hoan qua nguong da chot, preview void va xac nhan redemption `0,5/share`.

## 6. Sau su kien

- Export SQL backup, giu provider incident log va settlement references theo retention policy.
- Smoke test leaderboard/portfolio va xac nhan persistence sau redeploy.
- Revoke/rotate worker/admin/provider secrets khong con can thiet.
- Ghi post-event report: latency, suspension duration, requote rate, provider outage va manual action.
