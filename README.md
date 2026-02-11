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

## Security (Free-tier scope)

- Admin auth cookie: signed `httpOnly`, `Secure`, `SameSite=Strict`
- Admin email固定: `ADMIN_EMAIL` / `NEXT_PUBLIC_ADMIN_EMAIL`
- Admin login concealment: optional `ADMIN_LOGIN_KEY` (access via `/admin/login?k=...`)
- `bonnedits852@gmail.com` で通常ログインすると管理アクセスが有効化
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

## Notes

- ユーザー認証は Supabase Auth（新規登録/ログイン/退会）を利用
- メンバーポータルは URL トークン方式
- 不正対策は最小限（完全防止ではない）
