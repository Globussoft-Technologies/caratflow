# CaratFlow Deployment Guide

## Prerequisites

| Software     | Version  | Purpose                    |
|-------------|----------|----------------------------|
| Node.js     | >= 20.0  | Runtime (22.x recommended) |
| pnpm        | >= 9.0   | Package manager            |
| Docker      | >= 24.0  | Container runtime          |
| MySQL       | 8.0      | Primary database           |
| Redis       | 7.x     | Cache, queues, sessions    |
| Meilisearch | 1.11     | Full-text search           |
| MinIO       | latest   | S3-compatible file storage |

## Development Setup

### Step 1: Clone the repository

```bash
git clone <repository-url> CaratFlow
cd CaratFlow
```

### Step 2: Start infrastructure services

```bash
docker-compose up -d
```

This starts MySQL, Redis, Meilisearch, and MinIO.

### Step 3: Install dependencies

```bash
pnpm install
```

### Step 4: Configure environment

```bash
cp .env.example .env
```

Review `.env` and update values if needed (defaults work for local development).

### Step 5: Set up the database

```bash
pnpm db:generate    # Generate Prisma client
pnpm db:push        # Push schema to database
pnpm db:seed        # Seed demo data
```

### Step 6: Start development servers

```bash
pnpm dev
```

This starts:
- API server at `http://localhost:4000`
- Web app at `http://localhost:3000`

### Optional: Database studio

```bash
pnpm db:studio      # Opens Prisma Studio at http://localhost:5555
```

## Production Deployment

### Docker Build

Build the API and Web apps as Docker images:

```dockerfile
# apps/api/Dockerfile (example)
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS build
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @caratflow/api build

FROM base AS runtime
WORKDIR /app
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/node_modules ./node_modules
EXPOSE 4000
CMD ["node", "dist/main.js"]
```

### Database Migration

In production, use Prisma Migrate instead of `db:push`:

```bash
pnpm --filter @caratflow/db prisma migrate deploy
```

### SSL/TLS

- Use a reverse proxy (nginx, Caddy, or cloud load balancer) for SSL termination
- API should run on HTTP internally behind the proxy
- Set `NODE_ENV=production` to enable secure cookie flags

### Health Check

The API exposes `GET /api/v1/health` for load balancer health checks.

## Environment Variables Reference

### Database

| Variable             | Required | Default                  | Description                     |
|---------------------|----------|--------------------------|---------------------------------|
| DATABASE_URL        | Yes      | (see .env.example)       | MySQL connection string         |
| MYSQL_ROOT_PASSWORD | Docker   | caratflow_root           | MySQL root password             |
| MYSQL_DATABASE      | Docker   | caratflow                | Database name                   |
| MYSQL_USER          | Docker   | caratflow                | Database user                   |
| MYSQL_PASSWORD      | Docker   | caratflow_pass           | Database password               |

### Redis

| Variable  | Required | Default                | Description          |
|----------|----------|------------------------|----------------------|
| REDIS_URL | Yes      | redis://localhost:6379 | Redis connection URL |

### Authentication

| Variable           | Required | Default                    | Description             |
|-------------------|----------|----------------------------|-------------------------|
| JWT_SECRET        | Yes      | (change in production)     | JWT signing secret (min 32 chars) |
| JWT_ACCESS_EXPIRY | No       | 15m                        | Access token TTL        |
| JWT_REFRESH_EXPIRY| No       | 7d                         | Refresh token TTL       |

### Search

| Variable         | Required | Default                  | Description             |
|-----------------|----------|--------------------------|-------------------------|
| MEILI_URL       | Yes      | http://localhost:7700    | Meilisearch URL         |
| MEILI_MASTER_KEY| Yes      | caratflow_meili_key      | Meilisearch master key  |

### File Storage (S3)

| Variable       | Required | Default              | Description              |
|---------------|----------|----------------------|--------------------------|
| S3_ENDPOINT   | Yes      | http://localhost:9000 | S3/MinIO endpoint        |
| S3_ACCESS_KEY | Yes      | caratflow            | S3 access key            |
| S3_SECRET_KEY | Yes      | caratflow_minio      | S3 secret key            |
| S3_BUCKET     | Yes      | caratflow            | S3 bucket name           |
| S3_REGION     | No       | us-east-1            | S3 region                |

### Application

| Variable    | Required | Default               | Description              |
|------------|----------|-----------------------|--------------------------|
| NODE_ENV   | Yes      | development           | Environment mode         |
| API_PORT   | No       | 4000                  | API server port          |
| API_URL    | No       | http://localhost:4000  | Public API URL           |
| WEB_URL    | No       | http://localhost:3000  | Public web app URL       |
| CORS_ORIGINS| No      | http://localhost:3000  | Allowed CORS origins     |

### External APIs

| Variable      | Required | Default | Description                        |
|--------------|----------|---------|------------------------------------|
| RATE_API_URL | No       | (empty) | Gold/silver price feed URL         |
| RATE_API_KEY | No       | (empty) | API key for rate feed              |

## Scaling Considerations

### Database

- **Read replicas**: Route read queries to MySQL replicas for reporting workloads
- **Connection pooling**: Use PgBouncer-equivalent or Prisma Data Proxy
- **Partitioning**: Partition large tables (stock_movements, audit_logs) by date

### Redis

- **Clustering**: Redis Cluster for high availability
- **Separate instances**: Use separate Redis instances for cache vs. BullMQ queues

### API

- **Horizontal scaling**: Run multiple API instances behind a load balancer
- **Sticky sessions are not required** (JWT is stateless)
- **Rate limiting**: Implement at the load balancer or API gateway level

### Search

- **Meilisearch**: Single-node is sufficient for most jewelry stores
- **For large catalogs**: Meilisearch supports multi-node clusters

### File Storage

- **Production**: Replace MinIO with AWS S3, GCS, or Azure Blob
- **CDN**: Serve product images via CloudFront or equivalent CDN
