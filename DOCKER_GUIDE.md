# Docker Guide For This Project

This project uses Docker to run the backend and PostgreSQL in separate containers.

Current Docker files:

- `docker-compose.yml` - development setup
- `docker-compose.prod.yml` - production-style setup
- `backend/Dockerfile` - instructions for building the NestJS backend image
- `backend/.dockerignore` - files Docker should not copy into the image

## Big Picture

Docker image:

An image is like a packaged template. It contains the operating system layer, Node.js, dependencies, and app code needed to run your backend.

Docker container:

A container is a running copy of an image.

Docker Compose:

Compose lets us start multiple containers together using one file. In this project, Compose starts:

- one `backend` container for NestJS
- one `postgres` container for PostgreSQL

The backend and Postgres are separate containers, but they can talk to each other through the same Docker network.

## Why Two Compose Files?

We have two Compose files because development and production need different behavior.

### `docker-compose.yml`

This is for development.

It runs the backend with:

```bash
npm run start:dev
```

That means NestJS runs in watch mode. When you edit backend files, the container can reload the app.

It also mounts your local backend folder into the container:

```yaml
volumes:
  - ./backend:/app
  - backend_node_modules:/app/node_modules
```

This is useful while coding because changes on your machine are visible inside Docker.

### `docker-compose.prod.yml`

This is for production-style running.

It runs the compiled backend with:

```bash
npm run start:prod
```

It does not mount your source code into the container. Instead, the code is copied into the Docker image during build time.

That makes production more stable because the running container does not depend on your local files changing.

## Main Differences

| Feature | Development | Production |
| --- | --- | --- |
| Compose file | `docker-compose.yml` | `docker-compose.prod.yml` |
| Backend target | `development` | `production` |
| Command | `npm run start:dev` | `npm run start:prod` |
| Watches file changes | Yes | No |
| Uses local code mount | Yes | No |
| Postgres host port | `5433` | not exposed by default |
| Best for | coding | testing deploy-like behavior |

## Development Compose File

File:

```text
docker-compose.yml
```

### `services`

```yaml
services:
```

Services are the containers Compose will manage. We currently have:

- `postgres`
- `backend`

### Postgres Service

```yaml
postgres:
  image: postgres:17
```

This uses the official PostgreSQL version 17 image from Docker Hub.

```yaml
container_name: skincare-postgres-dev
```

This gives the container a friendly name.

```yaml
restart: unless-stopped
```

If the container crashes, Docker restarts it automatically unless you manually stopped it.

```yaml
environment:
  POSTGRES_USER: skincare
  POSTGRES_PASSWORD: skincare_password
  POSTGRES_DB: skincare_db
```

These variables create the default database, user, and password inside PostgreSQL.

```yaml
ports:
  - "5433:5432"
```

This maps a port from your computer to the container.

Format:

```text
HOST_PORT:CONTAINER_PORT
```

So:

```text
5433:5432
```

means:

- use `localhost:5433` from your computer
- use port `5432` inside the Postgres container

We use `5433` on your computer because your machine already had something using `5432`.

```yaml
volumes:
  - postgres_dev_data:/var/lib/postgresql/data
```

This saves database data in a Docker volume. Without this, your database data could disappear when the container is removed.

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U skincare -d skincare_db"]
  interval: 10s
  timeout: 5s
  retries: 5
```

This checks if Postgres is ready before the backend starts.

### Backend Service

```yaml
backend:
  build:
    context: ./backend
    target: development
```

This tells Docker to build the backend image from the `backend` folder.

`target: development` means Docker will use the `development` stage inside `backend/Dockerfile`.

```yaml
container_name: skincare-backend-dev
```

This gives the backend container a friendly name.

```yaml
environment:
  NODE_ENV: development
  PORT: 3000
  DATABASE_URL: postgresql://skincare:skincare_password@postgres:5432/skincare_db
```

These variables are available inside the backend container.

Important part:

```text
postgres:5432
```

Inside Docker Compose, services can talk to each other using service names. The backend can connect to the database using the name `postgres`.

```yaml
ports:
  - "3000:3000"
```

This maps backend port `3000` from the container to your computer.

You can open:

```text
http://localhost:3000
```

```yaml
volumes:
  - ./backend:/app
  - backend_node_modules:/app/node_modules
```

The first volume mounts your backend code into the container.

The second volume protects the container's `node_modules` folder. This avoids mixing your local `node_modules` with Linux container dependencies.

```yaml
depends_on:
  postgres:
    condition: service_healthy
```

This tells Docker to wait until Postgres is healthy before starting the backend.

### Volumes

```yaml
volumes:
  postgres_dev_data:
  backend_node_modules:
```

These are named Docker volumes.

`postgres_dev_data` stores database files.

`backend_node_modules` stores dependencies installed inside the backend container.

## Production Compose File

File:

```text
docker-compose.prod.yml
```

The production file is similar, but it is stricter.

### Production Postgres

```yaml
environment:
  POSTGRES_USER: ${POSTGRES_USER:-skincare}
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-change_me}
  POSTGRES_DB: ${POSTGRES_DB:-skincare_db}
```

This syntax means:

```text
Use the environment variable if it exists.
Otherwise use the default value after :-
```

Example:

```yaml
${POSTGRES_PASSWORD:-change_me}
```

If `POSTGRES_PASSWORD` exists, Docker uses it.

If not, Docker uses:

```text
change_me
```

For real production, you should not use `change_me`. You should provide a strong password.

### No Postgres Port In Production

The production Postgres service does not expose a host port.

That means your computer cannot directly connect to it using `localhost:5432`.

But the backend can still connect to it internally using:

```text
postgres:5432
```

This is safer because the database is not exposed outside Docker.

### Production Backend

```yaml
build:
  context: ./backend
  target: production
```

This uses the `production` stage from the Dockerfile.

```yaml
DATABASE_URL: postgresql://${POSTGRES_USER:-skincare}:${POSTGRES_PASSWORD:-change_me}@postgres:5432/${POSTGRES_DB:-skincare_db}
```

This builds the database URL using environment variables.

```yaml
ports:
  - "${BACKEND_PORT:-3000}:3000"
```

This means:

- expose the backend on `BACKEND_PORT` if it exists
- otherwise expose it on `3000`

So by default:

```text
http://localhost:3000
```

## Backend Dockerfile

File:

```text
backend/Dockerfile
```

This Dockerfile uses multi-stage builds.

Multi-stage means one Dockerfile has multiple named sections. Each section is used for a different purpose.

Current stages:

- `base`
- `development`
- `build`
- `production`

## Base Stage

```dockerfile
FROM node:24-bookworm AS base
```

This starts from the official Node.js 24 image.

`bookworm` is the Debian Linux version used by the image.

`AS base` gives this stage a name.

```dockerfile
WORKDIR /app
```

This sets the working folder inside the container to:

```text
/app
```

Commands after this run from `/app`.

```dockerfile
COPY package*.json ./
```

This copies:

- `package.json`
- `package-lock.json`

into the image.

We copy dependency files first so Docker can cache dependency installation.

## Development Stage

```dockerfile
FROM base AS development
```

This starts the development stage from the base stage.

```dockerfile
RUN npm ci --omit=optional
```

This installs dependencies using the lockfile.

`npm ci` is better for Docker than `npm install` because it installs exactly what is in `package-lock.json`.

`--omit=optional` skips optional platform-specific packages that are not needed for this app.

```dockerfile
COPY . .
```

This copies backend source code into the image.

```dockerfile
EXPOSE 3000
```

This documents that the app uses port `3000`.

```dockerfile
CMD ["npm", "run", "start:dev"]
```

This is the default command for the development container.

It runs:

```bash
npm run start:dev
```

## Build Stage

```dockerfile
FROM base AS build
```

This stage prepares a production build.

```dockerfile
RUN npm ci --omit=optional
```

Installs dependencies.

```dockerfile
COPY . .
```

Copies source code.

```dockerfile
RUN npm run build
```

Compiles the NestJS TypeScript code into JavaScript inside `dist`.

```dockerfile
RUN npm prune --omit=dev
```

Removes development dependencies after the build is finished.

Production does not need packages like Jest, TypeScript, or Nest CLI at runtime.

## Production Stage

```dockerfile
FROM node:24-bookworm-slim AS production
```

This uses a smaller Node.js image for the final production container.

```dockerfile
ENV NODE_ENV=production
```

Sets the environment to production.

```dockerfile
WORKDIR /app
```

Sets the working folder.

```dockerfile
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
```

These copy only the needed files from the `build` stage into the final production image.

The final image gets:

- production dependencies
- package files
- compiled JavaScript
- Prisma files

```dockerfile
EXPOSE 3000
```

Documents that the app uses port `3000`.

```dockerfile
CMD ["npm", "run", "start:prod"]
```

Starts the production app.

In this project, `start:prod` runs:

```bash
node dist/src/main
```

## Important Backend Change For Docker

In `backend/src/main.ts`, the app listens on:

```ts
await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
```

`0.0.0.0` means the app accepts connections from outside the container.

Without this, the app may run inside Docker but your browser may not reach it through `localhost:3000`.

## Development Commands

Run these from the project root:

```bash
cd /home/khwaja/Desktop/blueWave/skincare
```

### Start Development

```bash
docker compose up
```

This starts the backend and Postgres in the terminal.

You will see logs directly.

Press `Ctrl + C` to stop it.

### Start Development In Background

```bash
docker compose up -d
```

`-d` means detached mode.

The containers run in the background.

### Stop Development

```bash
docker compose down
```

This stops and removes the containers and network.

It does not delete the named database volume.

### See Running Containers

```bash
docker compose ps
```

This shows container status, ports, and health.

### See Backend Logs

```bash
docker compose logs -f backend
```

`-f` means follow.

It keeps showing new logs as they happen.

### See Postgres Logs

```bash
docker compose logs -f postgres
```

### Rebuild Development Image

```bash
docker compose up --build
```

Use this after changing:

- `backend/package.json`
- `backend/package-lock.json`
- `backend/Dockerfile`

For normal code changes, you usually do not need rebuild in development because the backend folder is mounted.

### Test Backend

```bash
curl http://localhost:3000
```

Expected starter response:

```text
Hello World!
```

Or open in browser:

```text
http://localhost:3000
```

### Connect To Dev Postgres From Host

Use:

```text
host: localhost
port: 5433
user: skincare
password: skincare_password
database: skincare_db
```

## Production Commands

Run these from the project root.

### Build Production Image

```bash
docker compose -f docker-compose.prod.yml build
```

This builds the backend using the production Dockerfile stage.

### Start Production

```bash
docker compose -f docker-compose.prod.yml up -d
```

This starts production backend and production Postgres in the background.

### Stop Production

```bash
docker compose -f docker-compose.prod.yml down
```

This stops the production containers and removes the production network.

It does not delete the database volume.

### See Production Status

```bash
docker compose -f docker-compose.prod.yml ps
```

### See Production Logs

```bash
docker compose -f docker-compose.prod.yml logs -f backend
```

### Run Production With Custom Variables

Example:

```bash
POSTGRES_USER=skincare POSTGRES_PASSWORD=my_secret POSTGRES_DB=skincare_db BACKEND_PORT=3000 docker compose -f docker-compose.prod.yml up -d
```

This overrides the default values in `docker-compose.prod.yml`.

## Useful Docker Commands

### List Running Containers

```bash
docker ps
```

### List All Containers

```bash
docker ps -a
```

### List Images

```bash
docker images
```

### List Volumes

```bash
docker volume ls
```

### Remove Stopped Containers

```bash
docker container prune
```

Docker will ask for confirmation.

### Remove Unused Images

```bash
docker image prune
```

Docker will ask for confirmation.

## About Database Data

When you run:

```bash
docker compose down
```

Docker removes containers, but it keeps named volumes.

That means your database data remains.

If you want to delete the dev database data completely:

```bash
docker compose down -v
```

Be careful with `-v`.

It deletes volumes, including the database data.

For production:

```bash
docker compose -f docker-compose.prod.yml down -v
```

This deletes the production database volume.

Only use it when you really want to erase the data.

## Common Problems

### Port Already In Use

If you see an error like:

```text
address already in use
```

It means another app is already using that port.

In this project, dev Postgres uses host port `5433` because your machine already had `5432` busy.

### Backend Starts But Browser Cannot Reach It

Make sure Nest listens on `0.0.0.0`.

This project already does that in `backend/src/main.ts`.

### Changed Dependencies But Container Still Fails

Run:

```bash
docker compose up --build
```

Dependency changes usually need a rebuild.

### Want To Start Fresh

For dev:

```bash
docker compose down -v
docker compose up --build
```

This removes containers and database data, then rebuilds.

## What To Add Later For Frontend

Later, when a frontend is created, we can add:

- `frontend/Dockerfile`
- a `frontend` service in `docker-compose.yml`
- a `frontend` service in `docker-compose.prod.yml`

The final structure can become:

```text
project root
├── docker-compose.yml
├── docker-compose.prod.yml
├── backend/
│   └── Dockerfile
└── frontend/
    └── Dockerfile
```

Then one command can start everything:

```bash
docker compose up
```
