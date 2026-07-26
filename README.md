# Samra Backend (NestJS)

REST API for the Easy POS Arabia frontend. Built with **NestJS**, **Mongoose**, and **MongoDB**.

## Prerequisites

- Node.js 18+
- Docker

## Setup

1. Start MongoDB:

```bash
docker compose up -d
```

2. Install dependencies:

```bash
npm install
cp .env.example .env
```

3. Seed sample data:

```bash
npm run seed
```

4. Seed sales report demo data (many invoices across different dates):

```bash
npm run seed:reports
# Re-run safely (clears previous seeded sales only):
npm run seed:reports -- --clear
# Custom range:
npm run seed:reports -- --days 120 --max-per-day 10 --clear
```

5. Start the API:

```bash
npm run start:dev
```

The server runs at `http://localhost:3000` with global prefix `/api`.

Swagger UI: `http://localhost:3000/api/docs` (production: `https://samra-backend.vercel.app/api/docs`).

## API Endpoints

| Resource | Endpoints |
|----------|-----------|
| Health | `GET /api/health` |
| Categories | `GET/POST /api/categories`, `PUT/DELETE /api/categories/:id` |
| Products | `GET/POST /api/products`, `GET /api/products/barcode/:code`, `PUT/DELETE /api/products/:id` |
| Sales | `GET/POST /api/sales`, `GET /api/sales/:id` |
| Purchases | `GET/POST /api/purchases`, `GET /api/purchases/:id` |
| Expenses | `GET/POST /api/expenses`, `GET /api/expenses/types`, `PUT/DELETE /api/expenses/:id` |
| Reports | `GET /api/reports/:type?from=&to=` |
| Notifications | `POST /api/notifications/whatsapp/test` |

Report types: `sales`, `purchases`, `expenses`, `profits`, `top-selling`, `purchased-items`, `sold-items`.

## WhatsApp alerts (Green API)

Low-stock alerts are sent when product stock hits 5, 4, 3, 2, 1, or 0.

1. Create a free account at [green-api.com](https://green-api.com)
2. Create an instance and scan the QR code with WhatsApp on your phone (`201013816502`)
3. Set in `.env`:

```env
WHATSAPP_ENABLED=true
WHATSAPP_PROVIDER=greenapi
WHATSAPP_OWNER_PHONE=201013816502
GREENAPI_INSTANCE_ID=1101xxxxxx
GREENAPI_API_TOKEN=xxxxxxxxxxxxxxxx
```

4. Restart the backend and test:

```bash
curl -X POST http://localhost:3000/api/notifications/whatsapp/test \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Messages are sent from your linked WhatsApp to `201013816502` (your own number).

## Environment

| Variable | Default |
|----------|---------|
| `PORT` | `3000` |
| `MONGODB_URI` | `mongodb://admin:admin123@localhost:27017/samra?authSource=admin` |
| `CORS_ORIGIN` | `http://localhost:8080` |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run start:dev` | Start with hot reload |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run compiled app |
| `npm run seed` | Seed categories and products |
