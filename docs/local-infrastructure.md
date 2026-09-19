# Local Infrastructure & Docker Services - TheQueue

To facilitate a frictionless local development experience, **TheQueue** provides a containerized infrastructure environment using **Docker Compose**.

---

## 1. Local Services & Port Mapping

These service boundaries are configured in `infrastructure/docker/docker-compose.yml`:

| Service           | Container Name      | Host Port | Native Port | Description                                     |
| ----------------- | ------------------- | --------- | ----------- | ----------------------------------------------- |
| **PostgreSQL**    | `thequeue-postgres` | `5432`    | `5432`      | Primary database storing relational schema.     |
| **Redis**         | `thequeue-redis`    | `6379`    | `6379`      | Cache, session accelerator, and BullMQ broker.  |
| **MinIO**         | `thequeue-minio`    | `9000`    | `9000`      | S3-compatible local Object Storage API.         |
| **MinIO Console** | `thequeue-minio`    | `9001`    | `9001`      | S3 administrator dashboard.                     |
| **Mailpit SMTP**  | `thequeue-mailpit`  | `1025`    | `1025`      | Local SMTP server capturing development emails. |
| **Mailpit Web**   | `thequeue-mailpit`  | `8025`    | `8025`      | Mailpit dashboard displaying outgoing emails.   |

---

## 2. Auto-Provisioning & S3 Bucket Creation

To ensure a seamless setup, a lightweight provisioning sidecar service `thequeue-minio-provisioner` runs automatically once MinIO starts.

- It authenticates using the development keys (`local_minio_admin`/`local_minio_secret_123`).
- It checks if the bucket `thequeue-media-local` exists.
- If missing, it creates the bucket and sets its read policy to public.

---

## 3. Infrastructure Control Scripts

Control scripts are configured at the repository root:

- **Up**: `pnpm infrastructure:up` (Brings up all services in background).
- **Down**: `pnpm infrastructure:down` (Shuts down and stops services).
- **Logs**: `pnpm infrastructure:logs` (Streams container output).
- **Reset**: `pnpm infrastructure:reset` (Warns developer and drops all local databases and volume attachments).
