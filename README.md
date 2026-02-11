# ChronoFlow Web MVP

ChronoFlow の無料運用向け MVP 実装です。

## Tech Stack

- Next.js App Router + TypeScript
- Supabase (Postgres + Storage)
- Vercel deploy

## Setup

1. install

```bash
npm install
```

2. env

`.env.local` を作成して以下を設定:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_ADMIN_EMAIL=bonnedits852@gmail.com
NEXT_PUBLIC_ENABLE_ADMIN_PASSWORD_LOGIN=false
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_SESSION_SECRET=
ADMIN_LOGIN_KEY=
ADMIN_EMAIL=bonnedits852@gmail.com
ENABLE_ADMIN_PASSWORD_LOGIN=false
SITE_NAME=ChronoFlow
```

本番推奨:
- `ADMIN_SESSION_SECRET` は32文字以上
- `ENABLE_ADMIN_PASSWORD_LOGIN=false`（通常はSupabaseログインのみ）
- `ADMIN_PASSWORD` は `ENABLE_ADMIN_PASSWORD_LOGIN=true` の時だけ必要（16文字以上）

3. Supabase SQL

`supabase/schema.sql` を SQL Editor で実行。

4. Storage bucket

Supabase Storage で `member-assets` バケットを作成。

5. run

```bash
npm run dev
```

## Routes

### Public

- `/`
- `/members`
- `/members/[memberId]`
- `/rankings`
- `/auditions`
- `/auditions/result`
- `/learn/ae`
- `/auth/login`
- `/auth/register`
- `/account`
- `/contact`

### Member Portal

- `/portal/[portalToken]`

### Admin

- `/admin/login`
- `/admin`
- `/admin/auditions`
- `/admin/members`
- `/admin/assets`
- `/admin/learn/ae`
- `/admin/announcements`
- `/admin/users`
- `/admin/inquiries`
- `/admin/security`

## Security (Free-tier scope)

- Admin auth cookie: signed `httpOnly`, `Secure`, `SameSite=Strict`
- Admin email固定: `ADMIN_EMAIL` / `NEXT_PUBLIC_ADMIN_EMAIL`
- Admin login concealment: optional `ADMIN_LOGIN_KEY` (access via `/admin/login?k=...`)
- `bonnedits852@gmail.com` で通常ログインすると管理アクセスが有効化
- 停止済みアカウントはログイン後も操作不可（申請/問い合わせ/退会などをAPI側で拒否）
- `admin/password` ログインは既定で無効（`ENABLE_ADMIN_PASSWORD_LOGIN=false`）
- Middleware guard: `/admin/*` and `/api/admin/*`
- Hardening headers: `CSP`, `HSTS(prod)`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `COOP`, `CORP`
- Public write endpoints rate-limit:
  - `/api/reactions`
  - `/api/auditions/apply`
  - `/api/auditions/check`
  - `/api/admin/login`
- Reaction abuse control: `member_id + device_id + reacted_on` unique
- Member announcements API scope guard (`portalToken` required for members scope)

## 運用ログ監視と定期監査

- 管理画面 `/admin/security` で直近のセキュリティイベントを確認できます
- 監査用の主要イベントは `security_events` テーブルに保存されます
- 定期監査（推奨: 週1）:
  - 停止/削除したアカウントの妥当性確認
  - お問い合わせ未対応件数の確認
  - Supabase Security Advisor と Vercel Logs の警告確認
  - 依存関係更新（`npm audit`, Next.js更新）の確認

## Notes

- ユーザー認証は Supabase Auth（新規登録/ログイン/退会）を利用
- メンバーポータルは URL トークン方式
- 不正対策は最小限（完全防止ではない）
