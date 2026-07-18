# PROJECT PLAN - MEXC WORLD CUP 2026 PREDICTION

Cap nhat: 18/07/2026 (GMT+7)

## 1. Pham vi da chot

- [x] Next.js frontend + Route Handlers cung deploy Vercel.
- [x] Supabase Postgres luu durable state; khong dung JSON file.
- [x] Bo toan bo runtime prediction market, Kalshi, price chart, buy/sell, portfolio va worker.
- [x] Giu nhan dien MEXC, stadium asset va responsive desktop/mobile.
- [x] Mot ma moi co the dung cho nhieu UID.
- [x] Moi UID gan voi ma da dung lan dau; dang nhap lai phai dung cap ma + UID.

## 2. Cau hoi va cham diem

- [x] Cau 1: doi chien thang Argentina/Tay Ban Nha.
- [x] Cau 2: ti so chinh xac Argentina - Tay Ban Nha.
- [x] Cau 3: Messi co ghi ban hay khong.
- [x] Moi cau dung 10 diem, toi da 30 diem.
- [x] Dong diem thi `submitted_at` som hon xep tren (FCFS), sau do dung prediction UUID lam tie-break deterministic.
- [x] Form hien ro cach tinh diem va canh bao khong the sua sau khi gui.

## 3. Bao mat va tinh toan ven

- [x] Invite code chi luu SHA-256 hash; 5 plaintext code nam trong file local git-ignore.
- [x] Claim code/UID atomic trong RPC va rate limit theo IP + cap code/UID.
- [x] JWT session `httpOnly`, expiry 7 ngay, co issuer/audience/auth version.
- [x] `predictions.user_id` unique: mot UID chi co mot prediction.
- [x] DB trigger chan moi `UPDATE` va `DELETE` tren prediction.
- [x] Timeline che UID va chi tra ve sau khi current user da submit.
- [x] RLS bat tren moi table; browser khong truy cap Supabase truc tiep, API server dung service role.
- [x] Admin page khong co public link va bat buoc `ADMIN_SECRET`.
- [x] CSP/security headers chi cho phep ket noi same-origin.

## 4. Giao dien nguoi dung

- [x] Access gate bat nhap ma truoc UID.
- [x] Tab Du doan co ba control day du va confirmation checkbox.
- [x] Sau submit hien summary khoa va tu chuyen Timeline.
- [x] Timeline sap xep som den muon, hien masked UID, ba cau tra loi va timestamp GMT+7.
- [x] Bang xep hang an den khi admin publish.
- [x] Tab The le co day du noi dung, giai thuong, doi tuong va disclaimer nguoi dung cung cap.
- [x] Mobile navigation va layout khong horizontal overflow.

## 5. Admin

- [x] Xem participant/prediction/code counts.
- [x] Xem code hint, so UID da claim va lan dung gan nhat.
- [x] Tao them reusable code; plaintext chi hien mot lan.
- [x] Dong/mo prediction (khong mo lai duoc sau khi result da publish).
- [x] Nhap va publish doi thang, ti so, Messi ghi ban.
- [x] Publish tu dong dong prediction va audit action.
- [x] Xem full UID + prediction trong admin.
- [x] Export participants CSV va leaderboard CSV.

## 6. Data va migration

- [x] Migration `20260718220000_prediction_contest_rebuild.sql` thay toan bo public schema market cu.
- [x] Giu nguyen noi dung/version `20260718200000` vi Cloud da apply; khong repair/revert migration history remote.
- [x] Seed contest final va 5 reusable invite-code hash.
- [x] Generated Supabase TypeScript types theo schema moi.
- [x] Local reset thanh cong tu toan bo migration history.
- [ ] Backup va apply migration tren Supabase Production.
- [ ] Redeploy Vercel voi env moi, da bo odds/worker variables.
- [ ] Smoke test tren URL Production.

## 7. Kiem thu

- [x] TypeScript va ESLint pass sau khi bo runtime cu.
- [x] Unit test validation, masking, serialization, JWT.
- [x] Integration test mot code dung cho nhieu UID va concurrent submit chi commit mot row.
- [x] pgTAP 38 check: reusable code, access pair, immutable prediction, scoring, FCFS, publish/audit.
- [x] Database lint khong co issue.
- [x] Playwright desktop/mobile: access, submit, timeline, relogin, API 404 cu, admin publish, CSV, leaderboard, rules, overflow (`4/4` workflow pass, `4` skip theo viewport).
- [x] Production build va HTTP smoke test pass; `/api/health` tra `200`, schema sach co `0` participant/`0` prediction.

## 8. Ghi chu van hanh

- Moi ma duoc tai su dung; `claim_count` dem so UID dang ky, khong dem so lan login.
- UID da claim bang ma A khong the dang nhap bang ma B.
- Prediction dong theo `submission_closes_at` hoac nut admin, tuy dieu kien nao den truoc.
- Admin co the publish lai ket qua neu nhap sai; prediction goc van bat bien va moi publish co audit log.
- Migration Production la thay doi destructive co chu dich voi schema market cu; bat buoc backup truoc khi push.
- Cloud dry-run ngay 18/07/2026 thanh cong va chi liet ke `20260718220000_prediction_contest_rebuild.sql`; chua push migration that.
