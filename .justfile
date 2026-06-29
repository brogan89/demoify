# Demoify task runner. Run `just` to list recipes.

# List available recipes.
default:
    @just --list

# One-shot dev setup: install deps, create .env, generate client, apply local D1 migrations.
setup: install env generate migrate
    @echo "Setup complete. Run 'just run' to start the dev server."

# Install dependencies.
install:
    npm install

# Create .env from the example if it doesn't exist yet.
env:
    @test -f .env && echo ".env already exists, leaving it untouched." || (cp .env.example .env && echo "Created .env from .env.example — fill in the required values.")

# Start the local Postgres database (Docker) and wait until it's ready.
db:
    docker compose up -d --wait

# Stop the local Postgres database (data is preserved in a named volume).
db-stop:
    docker compose down

# Generate the Prisma client.
generate:
    npx prisma generate

# Apply D1 migrations to the local (emulated) database.
migrate:
    npx wrangler d1 migrations apply demoify --local

# Apply D1 migrations to the remote (production) database.
migrate-remote:
    npx wrangler d1 migrations apply demoify --remote

# Start the dev server and open it in the browser (http://localhost:3000).
run:
    (for i in $(seq 1 50); do curl -s -o /dev/null http://localhost:3000 && open http://localhost:3000 && break; sleep 0.2; done) &
    npm run dev

# Start the dev server against the live production D1 (read-only). Requires
# `wrangler login`. Useful for testing data-driven pages (e.g. /explore) with
# real data. Writes are blocked by a guard in src/lib/db.ts.
run-remote:
    npm run dev:remote

# Open Prisma Studio to inspect the database.
studio:
    npx prisma studio

# List signed-up users with their song count, credits, and join date.
users:
    node scripts/list-users.mjs

# Federation hub admin (register/trust/approve instances). Run with no args for help.
#   just federation add "Name" https://their-instance.example
federation *ARGS:
    node scripts/federation.mjs {{ARGS}}

# Drop and recreate the database (destructive).
reset:
    npx prisma migrate reset

# Production build.
build:
    npm run build

# Run ESLint.
lint:
    npm run lint
