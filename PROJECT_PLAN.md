# Ke hoach du an MEXC Football Prediction

> Trang thai: MVP local da trien khai; live worker da dung Kalshi price + FIFA score, con cho Production deploy va rehearsal.
>
> Muc tieu: xay dung mot ung dung du doan ket qua bong da bang diem, trai nghiem giao dich tuong tu Polymarket, giao dien theo nhan dien MEXC, frontend va API cung nam trong mot du an Next.js de deploy tren Vercel.

## 1. Yeu cau da ghi nhan

- [x] Du an moi, hien tai chua co source code ung dung.
- [x] Dung Next.js cho ca frontend va backend (Route Handlers/Server Actions).
- [x] Deploy tren Vercel.
- [x] Dung Supabase Postgres lam nguon du lieu duy nhat; khong dung file JSON lam database.
- [x] Dung Supabase Realtime cho gia market va BXH.
- [x] Nguoi dung truy cap bang UID gom dung 8 chu so.
- [x] Moi UID duoc cap diem ao de tham gia; khong nap, rut hoac su dung tien that.
- [x] Gia/ty le thay doi theo thoi diem dat, trai nghiem gan voi prediction market.
- [x] Cho phep mua/ban co phan ca truoc tran va trong luc tran dang dien ra.
- [x] Co phan da mua duoc dinh gia lai theo odds live; so share khong thay doi khi gia len/xuong.
- [x] Do so user it, gia thi truong lay tu live odds ben ngoai thay vi phu thuoc thanh khoan noi bo.
- [x] Co bang xep hang cap nhat lien tuc.
- [x] Giao dien mang nhan dien MEXC theo anh tham chieu: nen den, chu trang, xanh MEXC, mat do thong tin giong giao dien giao dich.
- [x] Co hai market ban dau:
  - Phap vs Anh, tranh hang ba, 04:00 ngay 19/07.
  - Argentina vs Tay Ban Nha, chung ket, 02:00 ngay 20/07.

## 2. Cac quyet dinh can chot truoc khi code

### 2.1. Thoi gian va luat tran dau

- [x] Hai moc thoi gian thuoc nam 2026.
- [x] Mui gio hien thi, kickoff va trading end la `Asia/Bangkok` (`GMT+7`).
- [x] Market van cho phep giao dich sau kickoff trong luc tran dang dien ra.
- [x] Dung giao dich khi tran ket thuc, bao gom ca hiep phu/luan luu neu co.
- [x] Acceptance delay cho lenh in-play la 3 giay, sau do kiem tra lai oracle truoc khi khop.
- [x] Ket qua la doi thang chung cuoc gom hiep phu/luan luu, market chi co hai lua chon va khong co cua `Hoa`.
- [x] Tran hoan duoi 24 gio: suspend va giu vi the; hoan qua 24 gio, huy hoac khong co ket qua chinh thuc: void market.
- [x] Market void redeem moi outstanding share o `0,5`; khong rollback tung trade vi user co the da cash out/dung lai diem.

### 2.2. Diem va danh tinh

- [x] Moi UID nhan `10.000` diem khoi tao.
- [x] Moi lenh toi thieu `10` diem; khong co max order/max exposure, gioi han mua chi la balance kha dung cua UID.
- [x] Moi UID chi duoc cap diem mot lan trong toan bo su kien.
- [x] UID dung 8 chu so co the tu dang ky tren public UI hoac duoc admin tao; unique UID dam bao chi cap diem mot lan.
- [x] Login dung UID + password hash `scrypt`; JWT HS256 nam trong cookie `httpOnly` 7 ngay va `auth_version` thu hoi token cu khi doi password.
- [x] Chi hien UID da che tren BXH, vi du `12****78`.

### 2.3. Co che prediction market

- [x] Chon mo hinh `live odds oracle + virtual market maker` vi luong user khong du de tu tao price discovery.
- [x] MVP gom market order buy/sell, mark-to-market va payout giong Polymarket; chua lam so lenh CLOB/limit order.
- [x] Mot share thang redeem `1` diem, share thua redeem `0`.
- [x] Cho phep ban/cash out vi the ca truoc va trong tran khi market dang open.
- [x] VMM neo oracle voi thanh khoan mac dinh `b = 100.000 shares`, spread tong `1%`, max live price `0,01-0,99`.
- [x] Luu diem/share bang integer micro-unit (`1 diem = 1.000.000 micro-points`), UI hien toi da 2 chu so thap phan.
- [x] MVP khong thu phi diem.

Pham vi khuyen nghi:

| Hang muc | MVP khuyen nghi | Ban mo rong gan CLOB Polymarket |
| --- | --- | --- |
| Tao gia | Live odds oracle neo VMM, luon co quote khi feed hop le | Lenh mua/ban khop voi nguoi dung khac |
| Dat lenh | Market order theo quote | Market order va limit order |
| Thanh khoan | He thong cap thanh khoan ao | Can nguoi tao lap thi truong/nguoi dat lenh doi ung |
| Buy/sell trong tran | Co, qua VMM khi oracle hop le | Co, qua thanh khoan tren order book |
| Do phuc tap | Phu hop MVP hai tran | Can transaction, order matching va xu ly canh tranh phuc tap |

## 3. Supabase va persistence

Supabase Postgres la source of truth cho user, diem, market, trade, vi the, ledger va BXH. Next.js van chua toan bo UI/API trong cung mot repository; Supabase chi dong vai tro database va kenh realtime duoc quan ly.

- [x] Bo phuong an luu du lieu bang file JSON.
- [x] Chon Supabase Postgres cho persistence va Supabase Realtime cho cap nhat live.
- [ ] Tao project Supabase rieng cho local/development, Preview va Production.
- [x] Quan ly schema bang SQL migration trong repository; seed hai tran bang `supabase/seed.sql`.
- [x] Dung Supabase CLI/local stack khi phat trien va chay migration test.
- [x] Tao Supabase client rieng cho browser va server, khong import nham server secret vao Client Component.
- [x] Chi de `NEXT_PUBLIC_SUPABASE_URL` va publishable/anon key o client.
- [x] Giu `SUPABASE_SERVICE_ROLE_KEY` chi tren server/Vercel env; tuyet doi khong gui xuong browser.
- [x] Bat Row Level Security cho moi bang co du lieu nguoi dung.
- [x] Client khong duoc ghi truc tiep vao balance, trade, position, ledger hoac settlement.
- [x] Tao Postgres function/RPC `place_trade` de lock user + market va commit tru diem, trade, position, VMM state, ledger trong mot transaction.
- [x] RPC `place_trade` kiem tra `oracle_version`, `vmm_version`, do moi feed va trading status; MVP dung zero-slippage, version doi la requote.
- [x] Tao RPC `settle_market` va `void_market` idempotent, co quyen admin ro rang.
- [x] Dung unique constraint/idempotency key de double-click/retry khong tao hai lenh.
- [x] Tao bang public chi chua UID da che va chi so BXH; khong realtime truc tiep bang user/session nhay cam.
- [x] Bat Realtime chi cho bang `markets` va `leaderboard_entries` de han che data leak va luong su kien.
- [ ] Cau hinh backup, Point-in-Time Recovery theo goi Supabase duoc chon va quy trinh export/restore bang SQL.

## 4. Kien truc de xuat

- [x] Khoi tao Next.js App Router + TypeScript.
- [x] Dung Server Components cho du lieu doc ban dau va Client Components cho form/trading/realtime.
- [x] Dung Route Handlers cho session, quote, trade, portfolio, BXH va admin settlement.
- [x] Dat toan bo cong thuc market trong domain layer, khong tinh payout o client.
- [x] Dung schema validation cho UID, request API, env va record doc tu Supabase.
- [x] Server/provider la nguon trang thai va thoi gian duy nhat cho pre-match/live/suspend/end; client countdown chi de hien thi.
- [x] Luu timestamp theo ISO 8601/UTC, chuyen sang `GMT+7` khi hien thi.
- [x] Dung integer `micro-points` o backend, khong dung phep tinh float truc tiep cho balance/payout.
- [x] Tat cache cho balance, quote, market dong va leaderboard.

Cau truc thu muc du kien:

```text
app/
  api/
  admin/
  page.tsx
components/
  auth/
  markets/
  leaderboard/
  portfolio/
  ui/
lib/
  auth/
  domain/
  odds-provider/
  repositories/
  realtime/
  supabase/
  validation/
public/
  brand/
  teams/
supabase/
  migrations/
  seed.sql
tests/
```

## 5. Nguon du lieu live va price oracle

### 5.1. Phan biet du lieu tran va du lieu gia

- [x] FIFA live API chi dung de doc ty so, phut va trang thai tran; khong ingest the, VAR hay event khac.
- [x] Kalshi la nguon gia duy nhat; gia cap nhat cua phan anh thong tin trong tran ma khong can user noi bo tao thanh khoan.
- [x] Supabase Realtime chi phat gia/trang thai da xu ly den UI; Supabase khong tu tao odds.
- [x] Chon hai cap contract Kalshi cho dung hai tran va map dung doi home/away trong database.
- [x] Xac nhan rule Kalshi la doi thang tran tranh hang ba va doi vo dich World Cup, khong dung market `1X2 sau 90 phut`.
- [ ] Xac nhan SLA/do tre, rate limit, quota, dieu khoan hien thi va quyen su dung data cho su kien MEXC.

### 5.2. Lua chon provider

- [x] Price: Kalshi REST public market endpoint, doc bid/ask cua bon ticker da chot.
- [x] Score: FIFA live endpoint ma WorldCupMatchTime dung, map theo `IdMatch` va ma doi thay vi thu tu home/away cua UI.
- [x] Worker chi quan tam score tang va trang thai scheduled/live/ended; khong doc Bookings, VAR hay cac event khac.
- [ ] Chay proof-of-coverage trong hai tran that de do do tre goal -> FIFA score -> Kalshi update -> resume.

Tai lieu tham chieu:

- [Kalshi market data](https://docs.kalshi.com/getting_started/quick_start_market_data)
- [WorldCupMatchTime schedule](https://www.worldcupmatchtime.com/en/schedule)
- [FIFA live API - France vs England](https://api.fifa.com/api/v3/live/football/17/285023/289291/400021542)
- [FIFA live API - Spain vs Argentina](https://api.fifa.com/api/v3/live/football/17/285023/289292/400021543)
- [Vercel Functions WebSockets](https://vercel.com/docs/functions/websockets)

### 5.3. Luong ingest

- [x] REST polling tap trung o `worker/odds-ingest.ts`; browser khong goi truc tiep Kalshi/FIFA.
- [x] Hai endpoint hien tai khong can provider API key; service-role key van chi nam trong worker server-side.
- [x] Co `POST /api/provider/webhook` duoc bao ve bang worker secret cho provider push/request ngan.
- [x] Durable state nam trong Supabase; client Supabase Realtime co resubscribe/refetch va polling fallback.
- [ ] Worker polling 2 giay can process chay lien tuc; khong dat trong Vercel Function co lifecycle ngan, can chot noi host worker truoc Production.
- [x] Worker nam cung repository; Next.js/Vercel van la web app va API chinh.
- [x] Moi update duoc validate, map dung market, ghi `odds_snapshots`, cap nhat oracle/match state atomic, sau do Realtime phat thay doi.
- [x] Settlement khong tu dong dua vao odds; API admin bat buoc nhap nguon va tham chieu ket qua.

### 5.4. Chuan hoa odds

- [x] Moi contract Kalshi dung midpoint: `m_i = (yes_bid_i + yes_ask_i) / 2`.
- [x] Chuan hoa hai contract: `p_i = m_i / sum(m)` de tong xac suat bang `1`.
- [x] Tu choi ticker sai, market khong active, crossed book, spread qua 15% va timestamp sai.
- [x] Luu bid/ask, Kalshi `updated_time`, FIFA status, provider/received timestamp, oracle version va cong thuc trong raw payload.
- [x] Gioi han gia live `0.01-0.99`; chi settlement moi chuyen payout ve `1/0`.

## 6. Mo hinh du lieu

- [x] `User`: UID, password hash, `auth_version`, balance, diem khoi tao, thoi diem tao, trang thai.
- [x] `Session`: JWT co `sub`, `authVersion`, `iat`, `exp`, issuer/audience va JTI; luu trong cookie `httpOnly`.
- [x] `Market`: hai doi, loai tran, kickoff, trading end, status, outcome, provider mapping va thong so VMM.
- [x] Match state nam trong `markets`: phut, ty so, period, event gan nhat, provider timestamp va feed status.
- [x] `OddsSnapshot`: market, provider, odds goc, fair probability, source/received timestamp va version.
- [x] Oracle state nam trong `markets`: fair probability, version, freshness, trading status va ly do suspend.
- [x] `Trade`: UID/user, market, side, buy/sell, cash delta, gia snapshot, shares, quote ID va timestamp.
- [x] `Position`: tong shares theo UID, market va ket qua.
- [x] `LedgerEntry`: moi lan cong/tru diem, ly do, tham chieu trade/settlement; khong sua lich su.
- [x] `Settlement`: ket qua, nguoi thuc hien, nguon ket qua, timestamp va trang thai.
- [x] `LeaderboardEntry`: equity, balance, diem trong vi the, lai/lo va so tran dung.
- [x] Tao index/constraint cho UID, market status, trade timestamp, idempotency key va leaderboard sort key.

Trang thai market in-play:

```text
scheduled -> pre_match_open -> live_open -> ended -> settled
                              <-> suspended
                                          \-> voided/refunded
```

## 7. Luat giao dich va payout

- [x] Mot share cua ket qua thang redeem `1` diem; share ket qua thua redeem `0`.
- [x] Gia hien tai duoc dien giai nhu xac suat thi truong, vi du `62%`, khong phai ty le do he thong cam ket.
- [x] So share khong thay doi khi oracle price thay doi; chi gia tri hien tai cua vi the tang/giam.
- [x] Mark-to-market theo oracle mid, khong dung last trade de xep hang.
- [x] Cong thuc equity: `cash + sum(shares_i * current_oracle_price_i)`.
- [x] Sell/cash-out dung executable bid sau spread va price impact, co the thap hon mark-to-market.
- [x] Quote tra ve average price, impact, shares, max payout/profit va `expiresAt`.
- [x] Quote song 5 giay, kem `oracle_version`, `vmm_version`, `feed_timestamp` va zero-slippage policy.
- [x] Khi confirm, server xac minh token/version/freshness va tu choi neu quote cu hoac state da doi.
- [x] Trade chi thanh cong neu market mo, UID active, du balance va nam trong han muc.
- [x] VMM state, balance, position, trade va ledger cap nhat trong mot transaction atomic.
- [x] Khong cho ban qua so shares dang co.
- [x] Lenh in-play co acceptance delay 3 giay va kiem tra oracle/VMM version lan cuoi truoc commit.
- [x] Tu dong suspend khi FIFA score tang, loi/mat feed hoac payload khong hop le; tu dong ended khi FIFA tra ket qua chinh thuc.
- [x] Sau goal, doi ca hai ticker Kalshi co `updated_time` moi, sau do moi bat dau xac nhan hai snapshot de resume.
- [x] Khi suspended, giu last valid price chi de hien thi va khong nhan buy/sell.
- [x] Chi mo lai sau hai oracle snapshot moi lien tiep; score regression bi tu choi va direct status resume bi chan.
- [ ] Co primary/fallback feed; neu hai nguon lech qua nguong thi suspend va yeu cau admin kiem tra.
- [x] Giu min order `10`; bo max order/max exposure theo yeu cau ngay 18/07.
- [x] Settlement idempotent: chay lai khong tra thuong lan hai.
- [x] Market void redeem outstanding shares o `0,5` va ghi ledger day du.
- [x] Cong thuc oracle-anchored VMM/payout co trong domain/RPC va vi du bang diem trong tai lieu nay.

Vi du mark-to-market, tam bo qua spread va price impact:

```text
User mua 1.000 shares Anh khi price = 0,35 -> chi phi 350 diem.
Anh ghi ban, oracle cap nhat price = 0,70 -> vi the tri gia 700 diem, lai chua chot +350.
Neu price giam lai 0,35 -> vi the con 350 diem.
Neu Anh thang chung cuoc -> 1.000 shares redeem 1.000 diem; neu thua -> 0 diem.
```

## 8. API du kien

- [x] `POST /api/register` - tu tao account UID + password, cap diem mot lan va cap JWT.
- [x] `POST /api/session` - xac thuc UID + password va cap JWT session.
- [x] `DELETE /api/session` - thoat UID hien tai.
- [x] `GET /api/me` - balance, equity va thong tin session.
- [x] `GET /api/markets` - danh sach market va gia hien tai.
- [x] `GET /api/markets/[marketId]` - chi tiet market, lich su gia va trang thai.
- [x] `POST /api/markets/[marketId]/quote` - bao gia buy/sell.
- [x] `POST /api/markets/[marketId]/trades` - xac nhan lenh bang idempotency key.
- [x] `GET /api/portfolio` - vi the va lich su giao dich cua UID.
- [x] `GET /api/leaderboard` - BXH cap nhat, gioi han 100 dong MVP.
- [x] `POST /api/provider/webhook` - ingest event/odds va xac minh worker secret.
- [x] `POST /api/admin/markets/[marketId]/status` - suspend/resume/end thu cong.
- [x] `POST /api/admin/markets/[marketId]/settle` - preview, nhap ket qua va quyet toan.
- [x] `POST /api/admin/markets/[marketId]/void` - huy market/redeem theo quy tac void.
- [x] Chuan hoa error code, HTTP status va message hien thi tren UI, gom PostgREST conflict.
- [x] `GET /api/health` - smoke-check ket noi database va so market.

## 9. Realtime va BXH

- [x] Dung cong thuc xep hang realtime: `equity = balance kha dung + gia tri mark-to-market theo oracle cua vi the`.
- [x] Sau settlement, BXH dung balance da quyet toan thay cho gia tri uoc tinh.
- [x] Tie-breaker: equity, P/L, so du doan dung, sau do thoi diem cap nhat som hon.
- [x] Duy tri bang BXH public tu giao dich commit; chi chua UID che va chi so cong khai.
- [x] Client subscribe Realtime cho market/BXH va refetch du lieu chinh thuc khi nhan event.
- [x] Realtime market row gom price inputs, score, match clock, status, feed freshness va oracle version.
- [x] Portfolio ca nhan cap nhat qua endpoint co session, khong broadcast du lieu nhay cam.
- [x] Hien connection indicator `connecting/live/offline` va timestamp cap nhat market tren UI.
- [x] Co polling 15 giay khi can va tam dung khi tab khong active.
- [x] API response dung `no-store`, khong de CDN tra balance/BXH cu.
- [x] Dung reconnect cua Supabase, co refetch fallback va cleanup subscription khi unmount.
- [x] Integration test hai trade dong thoi xac nhan chi mot request commit va balance khong bi tru hai lan.

## 10. Giao dien theo nhan dien MEXC

### 10.1. Design system

- [x] Dung SVG logo MEXC do nguoi dung cung cap tai `public/brand/mexc-logo.svg`, giu dung ty le `355:64`.
- [x] Palette: nen `#000000`, panel `#080B10`, border `#202630`, chu trang/xam va action xanh MEXC.
- [x] Dung typography sans-serif gon, so lieu de doc va letter spacing `0`.
- [x] Card/panel toi da 8px border radius; khong dung gradient/orb trang tri.
- [x] Dung Lucide icon trong cac button/chuc nang quen thuoc va title cho icon button.
- [ ] Asset bong da gom co doi tuyen, bieu tuong cup va anh san van dong co quyen su dung; toi uu WebP/AVIF.
- [x] UID gate va footer ghi ro day la diem su kien, khong nap tien/khong ca cuoc tien that.
- [ ] Neu microsite khong phai domain MEXC chinh thuc, them nhan dien/phap ly phu hop; khong gay hieu nham ve dang nhap, nap tien hoac vi.

### 10.2. Bo cuc

- [x] Header desktop: logo MEXC, ten `Kickoff Markets`, tab Markets/Leaderboard/My predictions, UID va balance.
- [x] Khong sao chep cac nav/nut `Deposit`, `Wallets`, `Orders` khong co chuc nang.
- [x] Header mobile: logo, menu gon va bottom navigation.
- [x] Man hinh dau tien hien hai market, xac suat va order ticket; hero chi la event strip gon.
- [x] Desktop: danh sach/chi tiet market ben trai, trading panel ben phai.
- [x] Mobile: market va trading panel full-width theo document flow, tranh bottom sheet che price/history.
- [x] Hien balance/equity/open value, tong market/player/pick va timestamp cap nhat trong cac thanh thong tin gon.
- [x] Footer toi gian: ten su kien va `GMT+7`; khong hien link admin tren public UI.

### 10.3. Thanh phan chinh

- [x] Form auth co segmented control Sign in/Create account, UID 8 chu so, password/confirm va error inline/loading/retry.
- [x] User dang nhap co the tu doi password tren desktop/mobile; bat buoc current password va rotate JWT moi sau khi tang `auth_version`.
- [x] Market card: co/ten doi, loai tran, kickoff `GMT+7`, status va xac suat hien tai.
- [x] Market in-play: ty so, phut, event moi, feed freshness va trang thai Live/Suspended/Ended.
- [x] Trading panel: chon doi, buy/sell, nhap diem/share, 25/50/75/Max, quote va payout.
- [x] Bieu do price history hien odds ticks va marker event tu raw snapshot, co tooltip noi dung event.
- [x] Confirmation panel trong order ticket hien average price, impact, shares, diem/payout va nut confirm; khong dung modal de giu ngu canh market.
- [x] Khi suspended/ended, tat dieu khien nhung van hien last valid price, vi the, ly do va history.
- [x] Portfolio: balance, open value, equity, lai/lo, vi the va lich su trade.
- [x] BXH dang bang: hang, UID che, equity, balance/open value, P/L va so tran dung.
- [x] Highlight UID hien tai tren BXH.
- [x] Co Next loading/error boundary, empty state, offline/connecting indicator, trade error/success va disabled state khi closed/settled.
- [x] Nut/input/link co focus-visible ring; button toi thieu 44px va status co icon/text ngoai mau sac.
- [x] Playwright kiem tra UI tai 375px, 768px, 1280px va 1440px khong co document overflow.

## 11. Trang admin va quyet toan

- [x] Tao route `/admin` rieng, khong dat control quyet toan tren giao dien nguoi dung.
- [x] Bao ve admin API bang timing-safe secret, same-origin guard, rate limit va audit log.
- [x] Admin xem feed status, last odds/event timestamp va oracle version.
- [ ] Hien do lech primary/fallback sau khi chot provider production.
- [x] Admin co the suspend market; direct resume bi chan va chi mo lai sau hai oracle snapshot moi, score khong duoc regression.
- [x] Admin xem market, feed/oracle timestamp/version, trading status va payout preview truoc settle.
- [x] Admin khong co quyen sua probability/oracle; match-state chi sua score/phut/event va gia chi nhan `kalshi-fifa` o API + DB constraint.
- [x] Admin quan ly user: add UID/password, reset password/tang `auth_version` de revoke JWT va delete user chua co trade.
- [x] Admin export BXH day du ra CSV co UID khong che.
- [x] Admin export toan bo user ra CSV, gom UID/diem/trang thai va khong gom password hash/session.
- [x] UI bat buoc preview payout truoc khi bat nut settle/void, sau do con browser confirmation truoc commit.
- [x] Luu nguon ket qua va result reference/ghi chu khi settle/void.
- [x] Co dry-run cho biet so UID va tong payout truoc khi settle.
- [ ] Co quy trinh sua sai: khong sua ledger cu truc tiep; tao reversal/adjustment co audit.
- [ ] Result feed de xuat ket qua, nhung MVP van yeu cau admin/nguon thu hai xac nhan truoc khi settle hai tran.

## 12. Bao mat va do tin cay

- [x] JWT session HS256 co issuer/audience, key tach context, expiry 7 ngay; cookie `httpOnly`, Production `secure`, `sameSite=lax`.
- [x] Validate tat ca input tai server bang Zod/RPC; client validation chi ho tro UX.
- [x] Rate limit atomic endpoint register/session (IP + UID), market read, quote, trade, leaderboard, provider va admin.
- [x] Khong tin balance, price, payout, timestamp hay UID gui tu client; quote duoc ky server-side.
- [x] Chong replay/double submit bang idempotency key va unique constraint.
- [x] Khong ghi full UID, session token hoac admin secret vao log client.
- [x] Khong de odds provider key, raw licensed feed hoac service-role key lo ra client.
- [ ] Tach env Preview va Production; khong dung chung du lieu test voi su kien that.
- [x] Ghi immutable ledger cho cap diem/trade/settlement/void va admin audit log cho status/settlement/void.
- [x] Co `/api/health`, HTTP status/error code chuan va server log cho loi khong du kien.

## 13. Kiem thu

### Unit test

- [x] Chuyen decimal odds sang fair probability va loai bookmaker margin dung.
- [x] VMM bam oracle, quote va price impact dung sau buy/sell.
- [x] Share giu nguyen so luong va mark-to-market dung khi price `0,35 -> 0,70 -> 0,35`.
- [x] Unit/pgTAP kiem tra price impact, micro-share rounding, max payout va exact cash debit.
- [ ] Khong cho balance am/ban qua vi the.
- [x] pgTAP kiem tra transition live/suspended/ended va API hien thi timestamp theo `GMT+7`.
- [x] pgTAP kiem tra settlement va void retry idempotent, moi loai chi co mot settlement/ledger redemption.
- [x] pgTAP kiem tra leaderboard mark-to-market sau oracle update va payout sau settlement.
- [x] Parser Kalshi/FIFA kiem tra ticker, bid/ask, team mapping va scheduled/live/ended dung.
- [ ] Mat feed/goal that chuyen market sang suspended dung trong rehearsal Production.

### Integration test

- [x] UID/password sai bi tu choi; public registration trung UID bi `409` va moi UID chi nhan diem dung mot lan.
- [x] Portfolio can session hop le; request an danh bi tu choi.
- [x] E2E kiem tra quote het han va quote co oracle version cu deu tra `409`; zero-slippage policy yeu cau exact version.
- [x] Oracle doi version lam quote cu bi tu choi `409 ORACLE_VERSION_CHANGED`.
- [x] Hai request cung version chi co mot request commit, request con lai requote.
- [x] Double-click/retry cung idempotency key chi tao mot trade.
- [x] Admin endpoint tra `401` khi thieu secret.

### End-to-end va visual test

- [x] Luong self-register -> JWT persist qua reload -> password reset revoke JWT -> login lai duoc Playwright kiem tra.
- [x] Luong UID/password login -> quote -> buy -> sell/cash-out -> portfolio duoc Playwright kiem tra.
- [x] Luong admin match-state -> goal -> suspend -> hai Kalshi worker snapshot moi/resume duoc kiem tra; admin price payload bi tu choi.
- [ ] Mat feed trong tran giu last price de xem nhung khong cho dat lenh.
- [ ] Luong ended -> result confirmed -> admin settle -> payout -> BXH cuoi.
- [ ] Luong void/refund.
- [ ] Refresh/cold start/redeploy khong lam mat du lieu production.
- [ ] Kiem tra desktop/mobile, keyboard, focus, contrast va reduced motion.
- [x] Chup screenshot desktop/mobile, xac nhan asset load va kiem tra khong co horizontal overflow.

## 14. Lo trinh trien khai

### Milestone 0 - Chot dac ta

- [x] Chot cac quyet dinh tai muc 2 theo bo mac dinh MVP ngay 17/07/2026.
- [x] Chot live odds oracle + VMM cho MVP; chua lam CLOB day du.
- [x] Chot Supabase Postgres + Realtime lam data platform.
- [x] Chon Kalshi price + FIFA score va xac nhan mapping dung hai tran.
- [ ] Duyet dieu khoan su dung, do tre va rui ro endpoint cong khai khong co SLA.
- [ ] Duyet wireframe giao dien MEXC desktop/mobile.

### Milestone 1 - Nen tang

- [x] Scaffold Next.js, lint, TypeScript, Vitest/Playwright va env example.
- [x] Cai dat Supabase local/CLI, migration va seed SQL cho hai market.
- [x] Tao schema, generated database types va repository/service layer cho Supabase.
- [x] Tao Kalshi/FIFA adapter; test oracle cung di qua worker-auth Kalshi, khong co admin replay price.
- [x] Viet domain/RPC logic oracle-VMM, ledger, position va settlement kem test.

### Milestone 2 - API va persistence

- [x] Lam self-registration/admin provision UID, password `scrypt`, JWT session va cap diem mot lan.
- [x] Lam market/quote/trade/portfolio/leaderboard API.
- [x] Viet va test RPC transaction atomic cho trade/settlement/void.
- [x] Lam worker ingest Kalshi price + FIFA score, validate va ghi oracle atomic.
- [ ] Them health/alert cho worker va primary/fallback neu can.
- [x] Bat RLS, policy/grants va Realtime publication toi thieu can thiet.
- [x] Lam admin status/match-state/preview/settle/void va audit log; match-state khong cham oracle.

### Milestone 3 - Giao dien MEXC

- [x] Xay design tokens, header va responsive shell theo MEXC.
- [x] Xay UID gate, market list/detail va trading panel.
- [x] Xay portfolio, price history va BXH.
- [x] Hoan thien loading/error/live/suspended/ended/settled/offline states can cho MVP.

### Milestone 4 - Realtime va hardening

- [x] Them Supabase Realtime subscription cho score/odds/status/BXH, refetch va reconnect fallback.
- [x] Them suspend/resume hai snapshot, stale-feed/score-regression guard va acceptance delay 3 giay.
- [ ] Them provider Production primary/fallback va deviation guard sau khi co credential/coverage.
- [x] Them idempotency, atomic rate limit, same-origin guard va concurrency test.
- [ ] Chay unit, integration, E2E, accessibility va visual test.
- [x] Review server-only secret, RLS/grants, UID masking, JWT issuer/audience/auth version va admin flow.

### Milestone 5 - Deploy va nghiem thu

- [ ] Cau hinh Supabase/Vercel Preview/Production va env vars.
- [ ] Apply migration va seed production theo cach idempotent.
- [ ] Kiem tra RLS, RPC grants va Realtime publication tren Production.
- [ ] Smoke test tren URL Vercel bang desktop/mobile.
- [ ] Test backup/restore SQL va quy trinh settle/void truoc su kien.
- [ ] Chay rehearsal tren mot tran live: do latency, goal suspension, odds recovery va quota.
- [ ] Xac nhan khong mat du lieu sau cold start/redeploy.
- [ ] Chot runbook theo doi trong hai ngay dien ra su kien.

## 15. Dieu kien hoan thanh

- [x] UID hop le nhan diem dung mot lan va khong the chi tieu qua balance.
- [x] Gia/quote thay doi theo oracle/VMM va luu gia tai thoi diem xac nhan.
- [x] Co phan mua o `0,35` duoc mark dung khi oracle tang `0,70` va giam lai `0,35`.
- [ ] Market giao dich duoc trong tran, suspend dung luc co su kien/feed stale va dung han khi tran ket thuc.
- [x] Lenh dung oracle/VMM version cu hoac trong luc suspended bi server tu choi/requote.
- [x] Payout/void redemption dung quy tac, co ledger va RPC idempotent.
- [x] BXH phan anh trade/oracle/settlement qua bang durable va Realtime.
- [ ] Du lieu Supabase Production ton tai sau cold start va Vercel redeploy.
- [x] UI dung logo/nhan dien MEXC, responsive va khong co nut Deposit/Wallet gia.
- [x] Khong co luong tien that; UI ghi ro event points va no real-money wagering.
- [x] Admin settlement duoc bao ve, co preview, confirm va audit trail.
- [ ] Tat ca test quan trong pass tren moi truong gan production.

## 16. Ghi chu trien khai

### 17/07/2026 - Bat dau implementation

- Da chot bo mac dinh MVP tai muc 2 de co the trien khai lien tuc; cac gia tri nay phai nam trong config/env, khong hard-code rai rac.
- Login da chuyen sang UID + password `scrypt`; user co the self-register hoac duoc admin provision.
- Chua co Supabase Production project URL/key. Kalshi/FIFA khong can provider API key; ket noi production chi duoc danh dau hoan tat sau smoke test/rehearsal.
- Ghi chu lich su: ngay 17/07 worker con dung The Odds API prototype; phuong an nay da duoc thay the ngay 18/07.
- Logo SVG MEXC nguoi dung cung cap da duoc luu nguyen noi dung tai `public/brand/mexc-logo.svg` va dung tren user/admin shell.

### 17/07/2026 - MVP local da kiem thu

- Next.js frontend/API, Supabase migrations/seed/RLS/RPC/Realtime, admin operations va giao dien MEXC da co trong repository; oracle price chi con Kalshi/FIFA worker.
- Local database reset thanh cong tu toan bo migration va `supabase/seed.sql`; `/api/health` tra `200`, database connected va dung hai market.
- Ket qua verification moi nhat: ESLint pass, TypeScript pass, production build pass, `npm audit` co `0 vulnerabilities`, Vitest `28/28`, integration concurrency `1/1`, pgTAP `57/57`, Playwright `9/9` workflow ap dung pass (`7` case skip co chu dich theo project/viewport).
- Playwright da test buy + sell/cash-out, Realtime goal/suspend/hai-snapshot-resume, oracle-version/expired quote, UID/admin guard, settle/void preview, asset flags va overflow tai 375/768/1280/1440px.
- README da ghi cach chay local, test, worker va checklist deploy. Dev app: `http://localhost:3000`; local Supabase Studio: `http://127.0.0.1:54323`.
- `RUNBOOK.md` da co checklist T-7/T-1/T-30, live monitoring, incident, settle/void va post-event; can dien URL/contact/provider threshold khi chot Production.
- Chua danh dau Production: can tao Supabase Preview/Production, cau hinh Vercel env, apply migration, backup/restore, smoke test URL that va xac nhan persistence sau redeploy.
- Chua du dieu kien live event: can provider final-winner nhi phan co SLA/bet-stop, primary/fallback, proof-of-coverage, auto suspend/reopen guard va rehearsal mot tran live.
- Hang muc UX/ops mo rong con trong checklist: provider fallback deviation, reversal/adjustment workflow va full accessibility/contrast audit.

### 18/07/2026 - Chuyen sang Kalshi price + FIFA score

- Da bo The Odds API khoi live worker; khong can provider API key.
- Da map Kalshi `FRA/ENG/ARG/ES` va FIFA match `400021542/400021543` trong seed + migration.
- Worker poll FIFA truoc de phat hien goal/ended, sau do poll hai contract Kalshi, normalize bid/ask midpoint va ghi Supabase atomic.
- Goal chi resume sau khi ca hai `updated_time` Kalshi moi va co hai snapshot xac nhan; khong ingest the, VAR hay event khac.
- Vercel build bat buoc co `SESSION_SECRET` (>= 32 ky tu), `ADMIN_SECRET` va `ODDS_WORKER_SECRET` (>= 12 ky tu) trong Project Environment Variables; `.env.local` khong duoc deploy do da Git ignore.
- Supabase Cloud project trong config Production da duoc ket noi thu read-only nhung tra `PGRST205` cho `public.markets`: remote schema/seed chua duoc push; can link dung project, chay `db push --dry-run`, sau do `db push --include-all --include-seed` va xac nhan `/api/health` co hai market.
- Da them unit test parser/mapping. Con bat buoc rehearsal latency va chot noi host process worker lien tuc truoc Production.
- Heartbeat feed khong tao odds tick/khong tang `oracle_version`; history API nen snapshot trung va chart dung truc Y dong de hien bien dong nho.
- Chart lay them Kalshi candlestick 1 gio trong 7 ngay, ghep hai ticker theo timestamp, ve hai line home/away va co range `24H/7D` nhu market chart.
- UI hien dung Kalshi oracle voi 2 so thap phan va khong hien VMM inventory price thay cho oracle.
- Bo gioi han mua `2.000`/exposure `5.000`; chi con min `10` va balance kha dung.
- Xac suat UI co dinh 2 so thap phan; bo link Admin khoi public footer va khoa toan bo `/admin` den khi `ADMIN_SECRET` duoc xac thuc.
- Admin co user management, password `scrypt`, session revocation, delete guard cho trade history va CSV user/leaderboard export.
- User co the self-register; auth dung JWT `httpOnly` 7 ngay va password reset tang `auth_version` de vo hieu token cu.
- Self-registration chi xac nhan nguoi dung giu password, chua xac minh UID thuoc tai khoan MEXC that; neu co giai thuong that phai them MEXC OAuth/API hoac claim code.
- Reset local data ngay 18/07/2026; sua sach 4 `supabase db lint` warning (loop variable/rate-limit return) va compact history sau merge de khong con React duplicate key.
- User password change xac minh password hien tai, rate limit theo user, rotate JWT cho current session va revoke cac JWT cu qua `auth_version`.
- Desktop header tach rieng user info, nut Change password va nut Sign out; mobile menu cung co hai action rieng.
- Bo text `Kalshi midpoint` tren market detail; xoa admin replay price route/slider, them RPC match-state khong doi oracle va DB constraint chi chap nhan provider `kalshi-fifa`.
