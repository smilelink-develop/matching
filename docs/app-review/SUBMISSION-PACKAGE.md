# Meta App Review 申請パッケージ — SMILE MATCHING

申請対象権限: **`pages_messaging_subscriptions`** (Messenger Recurring Notifications)

提出時、以下を Meta App Dashboard の各フィールドにそのままコピー&ペーストして使ってください。

---

## 0. 申請前チェックリスト

- [ ] アプリは「**ライブモード**」に切り替え準備完了か (申請時は開発モードのままで OK、承認後ライブ化)
- [ ] **プライバシーポリシー URL** が公開アクセス可能か → https://matching.up.railway.app/legal/privacy
- [ ] **アプリアイコン** 1024×1024px がアプリ設定にアップロード済み
- [ ] **ビジネス情報** (会社名、所在地、業種) がアプリ設定で記入済み
- [ ] **デモ動画** をアップロード済み or 公開 URL 用意済み
- [ ] **テスト用 Facebook アカウント** (個人アカウント) を 1 つ用意し、テスター登録済み

---

## 1. App Use Case (アプリ用途の説明)

Meta が提出フォームで「Tell us how you're using this permission」と聞いてくる箇所。

### English (Primary — Meta レビュアー向け)

```
SMILE MATCHING is a B2B recruitment matching platform operated by CROSLAN Inc.
in Japan. We connect overseas worker recruitment partners (staffing agencies,
language schools, training centers) with Japanese companies hiring foreign
workers.

We use pages_messaging_subscriptions to deliver weekly digest notifications
of new job openings to our business partners who have explicitly opted in
to receive them via Messenger. This is essential because:

1. Our partners (recruitment agencies overseas) need timely awareness of
   newly registered job postings to match candidates accordingly.

2. Email response rates are low among our overseas partners; Messenger is
   their preferred B2B communication channel.

3. Partners explicitly choose their preferred frequency (daily, weekly, or
   monthly) when opting in via the standard Messenger notification message
   request UI.

User flow:
- A partner sends any message to our Page (within the 24-hour customer
  service window).
- Our admin team manually triggers an opt-in card to be sent to that
  partner from the partner detail screen.
- The partner sees a "Subscribe to job notifications" card and taps "Allow",
  selecting their preferred frequency.
- From the partner detail screen we can verify their subscription status.
- Each Monday at 9 AM JST, our system pushes a digest of new job openings
  to subscribed partners.
- Partners can stop the subscription at any time directly from Messenger
  (Meta's standard stop UI), which we handle via the messaging_optins
  webhook.

We do not use this permission to send promotional content, marketing, or
solicitations unrelated to recruitment. All notifications are factual job
listing summaries (job title, location, salary range, deadline).
```

### 日本語 (社内記録用)

```
SMILE MATCHING はクロスラン株式会社が運営する B2B 人材紹介マッチングシステムです。
海外の人材送出機関・日本語学校・職業訓練校といった「人材紹介パートナー」と、
外国人材を求める日本企業をつないでいます。

pages_messaging_subscriptions は、明示的に opt-in した B2B パートナーに対して
新規求人案件の週次まとめを Messenger 経由で配信するために使用します。
理由:
1. 海外パートナー (人材送出機関) は新規登録された求人を迅速に把握する必要がある
2. メール開封率が低い海外パートナーが多く、Messenger が B2B 連絡の主要手段
3. パートナーが自ら頻度 (日次/週次/月次) を選択する、Meta 標準の opt-in UI を使用

ユーザーフロー:
- パートナーから弊社 Page に DM 着信 (24h ウィンドウ オープン)
- 管理者がパートナー詳細画面から opt-in カードを送信
- パートナーが「Allow」をタップ + 頻度選択 → 購読開始
- 毎週月曜 9 時 JST に新規求人ダイジェストを購読者へ配信
- パートナーは Messenger 標準 UI で いつでも購読停止可能
  (システムは messaging_optins webhook で受信して状態更新)

販促・マーケティング・無関係な勧誘には一切使用しません。
配信内容は求人情報の事実 (職種・勤務地・給与・締切) のみです。
```

---

## 2. Step-by-Step Instructions for Reviewer

Meta のレビュアーが手元で動作確認するための手順。提出フォームの「Step-by-Step Instructions」欄に貼り付け。

```
Test environment: https://matching.up.railway.app
Test admin login: (we will provide the reviewer with login credentials
                   via Meta's secure submission form)
Test Facebook Page: https://www.facebook.com/{PAGE_USERNAME}

Steps to verify the Recurring Notifications flow:

1. Open Messenger on a mobile device or messenger.com on desktop.

2. Search for our Facebook Page "クロスラン人材紹介" and send a message
   saying "Test review opt-in" (any message will do; this opens the 24-hour
   conversation window).

3. Log in to https://matching.up.railway.app/login with the admin
   credentials we provide.

4. Navigate to https://matching.up.railway.app/partners
   Find the partner that corresponds to your test FB account (we will
   pre-link your PSID to a test partner called "Reviewer Test Partner").

5. On the partner detail page, scroll to the "連絡" (Contact) section.
   Find "Messenger 定期通知 (RN)" panel.

6. Click "週次 購読カードを送信" (Send weekly subscription card).

7. Return to Messenger. You should receive a notification messages
   request card with the title "求人情報の定期通知".

8. Tap "Allow" and select "Weekly".

9. Return to the partner detail page in our admin UI. The panel should
   now show "● 購読中 (頻度: WEEKLY, トピック: 求人情報)" in green.

10. To verify the recurring delivery, go to
    https://matching.up.railway.app/broadcast
    Select "Reviewer Test Partner" via the filter, and click "配信実行".
    You should receive the job digest message in Messenger immediately,
    regardless of whether the 24-hour window is still open.

11. To verify opt-out, in Messenger tap the "Stop notifications" option
    (Meta-standard UI). The partner detail panel should update to
    "🛑 パートナーが購読停止しました".

Edge cases the implementation handles:
- token_expiry_timestamp is stored and displayed; warns when within 30 days
  of expiration.
- messaging_optins webhook with status=REFRESH_TOKEN is supported.
- messaging_optins webhook with status=STOP_NOTIFICATIONS clears the
  subscription token immediately.
```

---

## 3. Screencast (デモ動画) — 撮影シナリオ

Meta は通常 1〜3 分のスクリーンキャストを要求します。OBS / QuickTime / Loom などで録画してください。

### 撮影前の準備
- テスト用 Facebook 個人アカウント (土田さんのもの OK)
- 弊社 Page (クロスラン人材紹介) との 1:1 チャット画面
- 管理画面ログイン済み (https://matching.up.railway.app)
- テスト用パートナー (Messenger PSID 紐づけ済み) 1 件 — `Reviewer Test Partner` 等の名前で作る
- 開発モードのままで OK (ただし テスト FB アカウントは アプリのテスターロール登録必須)

### 撮影シナリオ (1分30秒〜2分)

```
[0:00-0:10] Title card / 用途説明
  「SMILE MATCHING uses pages_messaging_subscriptions to deliver
   weekly job digests to opted-in B2B recruitment partners.」

[0:10-0:20] Setup
  Messenger でパートナーから弊社 Page に「Test message」を送信する画面
  (24h ウィンドウを開けるところを見せる)

[0:20-0:40] Opt-in card 送信
  管理画面 → /partners/{id} → 「連絡」セクション
  → 「週次 購読カードを送信」ボタン押下
  → 「✅ 送信しました」表示

[0:40-1:00] Partner taps Allow
  Messenger に戻り、購読カードが届いた様子
  → タップ → 頻度 (Weekly) を選んで Allow

[1:00-1:15] 購読状態の確認
  管理画面 partner detail に戻り、パネルが緑「● 購読中 (週次)」になっている

[1:15-1:35] 配信テスト (24h 関係なく届く確認)
  /broadcast でテストパートナーを選んで配信
  → Messenger に求人ダイジェストが届く

[1:35-1:50] Opt-out
  Messenger 側で「Stop notifications」を選択 (Meta 標準 UI)
  → 管理画面側で「🛑 パートナーが購読停止しました」に切り替わる

[1:50-2:00] エンディング
  「Thank you for reviewing. Privacy policy is at /legal/privacy.」
```

### 撮影 TIPS
- ブラウザは英語フォントが見やすいので Chrome の英語 UI 推奨
- パートナー名 / メアド / PSID 等の **個人情報はモザイク** または「Reviewer Test Partner」のような汎用名で見せる
- 録画は MP4 形式で 1080p 推奨、Meta アップロード上限 1GB

---

## 4. Privacy Policy 確認

URL: **https://matching.up.railway.app/legal/privacy**

Meta レビュアーは特に以下のセクションをチェックします:

- [ ] Messenger / Meta Platforms 経由のデータ取り扱いを明示
  → `app/legal/privacy/page.tsx` の Section 4 (Facebook Messenger / WhatsApp / LINE プラットフォーム経由のデータ取り扱い) で対応済み ✅
- [ ] 取得する情報 (PSID, メッセージ内容, タイムスタンプ) を明示 ✅
- [ ] 第三者提供しない旨を明示 ✅
- [ ] パートナーの削除請求権を明示 ✅

---

## 5. アプリ設定 (App Dashboard) 確認項目

App Dashboard (https://developers.facebook.com/apps/1294580559501997/) で:

### 基本設定
- アプリ名: 「メッセンジャーツール」 (現状のまま OK)
- アプリアイコン: 1024×1024 PNG 必須
- カテゴリ: Business and Pages
- ビジネス用途: Business
- プライバシーポリシー URL: `https://matching.up.railway.app/legal/privacy`
- 利用規約 URL: (任意。あれば `/legal/terms` 等)
- アプリのドメイン: `matching.up.railway.app`

### Messenger 製品設定
- Webhook URL: `https://matching.up.railway.app/api/messenger/webhook` (既に設定済み)
- Subscribed fields:
  - `messages` ✅
  - `messaging_postbacks` ✅
  - `messaging_optins` ← **これを追加 (今回新規)**
- Page Access Token: 既に発行済み

---

## 6. 申請プロセス概要

1. **アプリ設定 で webhook の messaging_optins 購読を追加**
2. **デモ動画を録画 → アップロード**
3. **App Dashboard → App Review → Permissions and features**
4. **`pages_messaging_subscriptions` を検索 → 「Request」**
5. **Use Case 説明 + Step-by-Step Instructions + 動画 を提出**
6. **追加で 求められたら Privacy Policy URL + テスター用 FB ID も提出**
7. **「Submit for Review」**

審査期間の目安:
- 通常 5〜15 営業日
- 差し戻されることが多いので、レビュアーからの質問への返信を素早く行う前提で

---

## 7. 想定される差し戻し質問と対応

過去事例から:

### Q: 「opt-in は本当にユーザーの自発意思か?」
A: Meta 標準の `notification_messages` テンプレート (我々が UI を独自実装していない) で
opt-in を取っている、と明示。デモ動画でその UI を映す。

### Q: 「opt-out 手段は提供されているか?」
A: Messenger 標準の Stop ボタンで停止可能、システムは webhook 経由で自動的に
購読停止状態を記録、と説明。デモ動画の最後で Stop の挙動を映す。

### Q: 「販促コンテンツは送らないか?」
A: 送る内容は新規求人案件のリスト (職種・勤務地・給与・締切) のみで、
販促 (セール・割引等) は一切含まない、と明示。

### Q: 「How will users know what they signed up for?」
A: opt-in カードのタイトルが「求人情報の定期通知」となっており、頻度選択 UI が
それを明示する、と回答。

---

## 提出後

1. 申請後、毎日 App Dashboard の通知をチェック
2. 質問が来たら 24h 以内に回答 (放置するとリジェクト確率上がる)
3. 承認されたら **アプリをライブモード化** → 即実運用可能
4. ライブモード化のチェックリストは Meta が別途案内
