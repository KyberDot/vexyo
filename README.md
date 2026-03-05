# SubTrack — Subscription Manager

A self-hosted subscription tracking app built with Next.js 14, SQLite, and NextAuth.

## Features

- **Dashboard** — monthly/yearly totals, spend trend, category breakdown, upcoming renewals
- **Subscriptions** — add, edit, delete, pause, search & filter
- **Analytics** — charts, top costs, duplicate detector
- **Categories** — spend grouped by category
- **Family** — subscriptions per family member
- **Payment Methods** — subscriptions per card
- **Notifications** — renewal reminders
- **Shared Links** — read-only share links for family
- **AI Agent** — add subscriptions via natural language, spending insights
- **Auth** — email + password, JWT sessions

## Docker Compose

```yaml
subtrack:
  build: .
  container_name: subtrack
  restart: unless-stopped
  ports:
    - "127.0.0.1:3210:3000"
  environment:
    - NEXTAUTH_URL=${NEXTAUTH_URL}
    - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    - DB_PATH=/data
  volumes:
    - subtrack_data:/data
  networks:
    - your-network
```

## Setup

### 1. Clone and configure

```bash
git clone <your-repo>
cd subtrack
cp .env.example .env
```

Edit `.env`:

```
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://subs.yourdomain.com
ANTHROPIC_API_KEY=sk-ant-...
```

### 2. Build and run

```bash
docker compose up -d --build
```

### 3. Create your account

Visit `http://localhost:3210/register` and create an account.

## Nginx reverse proxy

```nginx
location / {
    proxy_pass http://127.0.0.1:3210;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

## Data

SQLite database stored in a Docker volume at `/data/subtrack.db`. Survives container rebuilds.
