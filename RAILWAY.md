# Railway deployment

The monorepo keeps Railway build and start commands in the root package.json.

## Service commands

| Service | Build | Start |
| --- | --- | --- |
| web | `npm run build:web` | `npm run start:web` |
| api | `npm run build:api` | `npm run start:api` |
| host | `npm run build:host` | `npm run start:host` |
| admin | `npm run build:admin` | `npm run start:admin` |
| worker | `npm run build:worker` | `npm run start:worker` |

The API build generates the Prisma client before compiling the NestJS application.

## Applying Railway service configuration from GitHub

The `.github/workflows/railway-config.yml` workflow applies the commands above to existing Railway services.

Add a GitHub Actions repository secret named `RAILWAY_TOKEN` containing a Railway project token for the target project/environment. Then run **Configure Railway services** from GitHub Actions.

No application credentials (S3, database, Redis, Stripe, SMTP, session secrets) belong in this repository. Keep them in Railway and expose them to services through Railway variables/reference variables.

## Infrastructure

Expected Railway resources:

- web
- api
- host
- admin
- worker
- PostgreSQL
- Redis
- thequeue-media bucket

The API and worker use server-side S3-compatible credentials. Never expose S3 access keys through `NEXT_PUBLIC_*` variables.
