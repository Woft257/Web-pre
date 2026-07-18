# MEXC BAN LINH VO DICH - Runbook

## Truoc khi mo su kien

- Backup Supabase Production.
- Dry-run va apply migration contest; xac nhan dung 5 invite-code hash active.
- Cau hinh env tren Vercel va rotate cac secret da tung bi chia se.
- Test hai UID cung dang ky duoc bang mot ma, nhung UID cu khong dang nhap duoc bang ma khac.
- Xac nhan gio dong prediction la `19/07/2026 23:59 GMT+7`.
- Test CSV participants va leaderboard.

## Trong thoi gian nhan prediction

- Theo doi `/api/health`, participant count va prediction count.
- Timeline phai chi hien sau khi user da submit va UID luon o dang `12****78`.
- Timeline chia 10 luot/trang; kiem tra trang sau van giu dung so thu tu FCFS toan cuc.
- Neu can dung som, vao `/admin` va bam `Dong du doan`.
- Khong update/delete row trong `predictions`; database trigger se tu choi `PREDICTION_IMMUTABLE`.
- Neu can loai mot UID, chi dung nut Delete participant trong admin de RPC xoa co audit va cap nhat claim counter.

## Cong bo ket qua

1. Vao `/admin` bang `ADMIN_SECRET`.
2. Dong nhan prediction.
3. Nhap doi thang, ti so Argentina - Tay Ban Nha va Messi co ghi ban hay khong.
4. Kiem tra lai, bam `Cong bo bang xep hang` va xac nhan dialog.
5. Kiem tra top theo `points DESC, submitted_at ASC`.
6. Export participants CSV va leaderboard CSV.

Admin co the cap nhat va cong bo lai neu ket qua nhap sai; moi lan publish deu co `admin_audit_logs`.

## Reset su kien

- Chi dung danger zone khi can xoa toan bo du lieu tham gia va chay lai su kien.
- Nhap dung `RESET`, doc dialog confirmation va xac nhan.
- Reset xoa participants, predictions, result/BXH, rate limits va audit cu; giu invite codes, dua claim counters ve 0 va ghi mot audit reset moi.

## Sau su kien

- Export CSV va backup database.
- Doi chieu dieu kien nhan thuong voi link moi doi tac.
- Phan bo phan thuong trong 10 ngay lam viec.
- Rotate `ADMIN_SECRET`, `SESSION_SECRET` va service-role key neu can.
