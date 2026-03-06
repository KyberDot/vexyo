# Vexyo — Subscription & Finance Tracker

A self-hosted, full-stack subscription tracker built with Next.js 14, SQLite, and NextAuth. Track subscriptions, bills, debts, family spending, and more — all from a single Docker container.

---

## Features

- **Subscriptions & Bills** — Track recurring payments with cycle support: weekly, monthly, quarterly, 6-month, yearly, or variable. Categorise, colour-code, and assign to family members or payment methods.
- **Debts** — Log money owed to or from others with due dates and status tracking.
- **Analytics** — Spending breakdowns by category, monthly/yearly totals, and trend charts.
- **Wallet** — Store payment methods (cards, accounts, crypto, etc.) with icons and last-4-digit reference.
- **Family Members** — Assign subscriptions to family members and see per-person spending.
- **AI Agent** — Built-in AI assistant for financial insights and subscription analysis.
- **Notifications** — Renewal reminders (3, 7, or 14 days before due date).
- **Shared Links** — Share a read-only view of your subscription list.
- **Attachments** — Upload receipts and documents to any subscription or bill.
- **Multi-language** — English, Français, Español, Türkçe (switchable via 🌐 in the topbar).
- **Multi-currency** — USD, EUR, GBP, CAD, AUD, EGP, JPY, INR with live conversion display.
- **Magic Link Login** — Passwordless email authentication (requires SMTP).
- **Admin Portal** — Full user management, subscription plans, email templates, platform branding, and SMTP configuration.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Auth | NextAuth.js (JWT, bcrypt, magic links) |
| Database | SQLite via better-sqlite3 |
| Styling | Inline styles + CSS variables (zero external CSS frameworks) |
| Charts | Recharts |
| Email | Nodemailer |
| AI | Anthropic Claude API |
| Runtime | Node.js 20 Alpine (Docker) |

---

## Quick Start

### Docker (recommended)

```bash
docker run -d \
  --name vexyo \
  -p 3000:3000 \
  -v vexyo_data:/data \
  -e NEXTAUTH_SECRET=your-secret-here \
  -e NEXTAUTH_URL=http://localhost:3000 \
  ghcr.io/kyberdot/vexyo:latest
```

Then open [http://localhost:3000](http://localhost:3000) and register your first account. The first account registered is automatically made an admin.

### Docker Compose

```yaml
services:
  vexyo:
    image: ghcr.io/kyberdot/vexyo:latest
    container_name: vexyo
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - vexyo_data:/data
    environment:
      NEXTAUTH_SECRET: your-secret-here-change-this
      NEXTAUTH_URL: https://your-domain.com
      # Optional: AI features
      ANTHROPIC_API_KEY: sk-ant-...
      # Optional: override data path
      DB_PATH: /data

volumes:
  vexyo_data:
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXTAUTH_SECRET` | ✅ | Random secret for JWT signing. Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | Full public URL of your instance (e.g. `https://vexyo.example.com`) |
| `ANTHROPIC_API_KEY` | Optional | Enables the AI Agent feature |
| `DB_PATH` | Optional | Directory for the SQLite database file. Defaults to `/data` |

> **NEXTAUTH_SECRET must be set** — the app will not start without it.

---

## Admin Setup

### First Run
1. Navigate to your instance and register an account — the first user is automatically promoted to admin.
2. Go to **Admin Portal** in the sidebar.

### Platform Settings
- Set your app name, primary colour (with swatch picker), logo, and favicon.
- Upload images directly or paste a URL.
- Toggle public registration on/off.
- Enable Magic Link (passwordless) login.

### Mail / SMTP
Configure your SMTP server under the **Mail** tab:

| Field | Example |
|---|---|
| Host | `smtp.gmail.com` |
| Port | `587` (STARTTLS) or `465` (SSL) |
| Username | `you@gmail.com` |
| Password | App password (not your login password) |
| From | `Vexyo <noreply@yourdomain.com>` |

Click **💾 Save Settings** first, then **🧪 Send Test Email** to verify delivery. Test email saves settings first automatically.

### Inviting Users
Under the **Invites** tab, enter an email address and click **Send Invite**. The recipient receives a branded email with a one-time registration link. Duplicate invites and existing users are blocked automatically.

### Subscription Plans (Access Control)
Under the **Plans** tab you can create plans that restrict what non-admin users can do:

| Limit | Description |
|---|---|
| Max Subscriptions | Cap on active subscriptions (-1 = unlimited) |
| Max Bills | Cap on active bills |
| Max Family Members | Cap on family member profiles |
| Analytics | Toggle access to the Analytics page |
| AI Agent | Toggle access to the AI assistant |
| Export | Toggle export functionality |
| Attachments | Toggle file attachment uploads |

Assign plans to users from the **Users** tab by clicking **📦 Plan** next to any non-admin user. Admins are exempt from all plan restrictions. Set an optional expiry date — the account is automatically disabled when the plan expires.

### Email Templates
Under the **Templates** tab, customise the HTML for all transactional emails:

| Template | Variables |
|---|---|
| Magic Link | `{{appName}}`, `{{link}}`, `{{email}}` |
| Invitation | `{{appName}}`, `{{link}}` |
| Password Reset | `{{appName}}`, `{{link}}` |
| Renewal Reminder | `{{name}}`, `{{days}}`, `{{date}}`, `{{amount}}`, `{{appName}}` |

---

## User Guide

### Adding a Subscription
1. Click **+ Add Subscription** from the Dashboard or Subscriptions page.
2. Step 1 — Choose **Subscription** or **Bill**, pick from popular services or type a name.
3. Step 2 — Enter amount and currency. Leave amount blank for **Variable** billing cycle.
4. Step 3 — Set billing cycle and next billing date.
5. Step 4 (optional) — Add notes, trial end date, payment method, family member.
6. Step 5 (optional) — Set renewal reminders.

### Language
Click the **🌐** globe icon in the top-right toolbar to switch between English, Français, Español, and Türkçe. Your preference is saved per account.

### Currency
Go to **Settings → Currency** to set your display currency. All amounts are stored in their original currency and converted for display using built-in exchange rates.

---

## Security

- Passwords hashed with bcrypt (10 rounds).
- JWT sessions with 30-day expiry.
- All API routes require authenticated session — validated server-side on every request.
- Magic link tokens are single-use and expire after 15 minutes.
- Rate limiting on auth endpoints: 3 attempts/10min (magic link), 3/15min (password reset), 5/hr (registration).
- Security headers on all responses: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `X-XSS-Protection`.
- API routes served with `Cache-Control: no-store`.
- Input validation via Zod on all mutation endpoints.
- SQL injection prevented — all queries use parameterised prepared statements.
- Plan expiry enforced at the JWT layer — expired accounts are automatically deactivated.

---

## Building from Source

```bash
git clone https://github.com/KyberDot/vexyo
cd vexyo
npm install
# Create .env.local with NEXTAUTH_SECRET and NEXTAUTH_URL
npm run dev
```

### Build Docker image locally

```bash
docker build -t vexyo .
docker run -p 3000:3000 -v vexyo_data:/data \
  -e NEXTAUTH_SECRET=secret -e NEXTAUTH_URL=http://localhost:3000 \
  vexyo
```

---

## Data & Backups

All data is stored in a single SQLite file at `/data/vexyo.db` inside the container. Mount a volume at `/data` to persist it across restarts and updates.

```bash
# Backup
docker cp vexyo:/data/vexyo.db ./backup.db

# Restore
docker cp ./backup.db vexyo:/data/vexyo.db
```

The schema auto-migrates on startup — updating the image is safe.

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/            # Login, register, magic-link pages
│   ├── (dashboard)/       # All authenticated pages + layout
│   │   ├── admin/         # Admin portal
│   │   └── dashboard/     # Subscriptions, bills, analytics, etc.
│   └── api/               # All API routes
├── components/            # Shared UI components
│   ├── SubModal.tsx       # Add/edit subscription (multi-step wizard)
│   ├── Toast.tsx          # Global toast notification system
│   ├── ModalPortal.tsx    # React portal — renders modals in document.body
│   └── LanguageSwitcher.tsx
└── lib/
    ├── auth.ts            # NextAuth config + JWT callbacks
    ├── db.ts              # SQLite setup + auto-migrations
    ├── i18n.ts            # Translations (en / fr / es / tr)
    ├── rateLimit.ts       # In-memory rate limiter for auth endpoints
    ├── mailer.ts          # SMTP transporter helper
    ├── emailTemplate.ts   # Branded HTML email builder
    └── SettingsContext.tsx  # Global React context (settings, platform, lang)
```

---

## License

MIT
