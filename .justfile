# Demoify task runner. Run `just` to list recipes.

# List available recipes.
default:
    @just --list

# One-shot dev setup: install deps, create .env, start the DB, generate client, run migrations.
setup: install env db generate migrate
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

# Create and apply database migrations.
migrate:
    npx prisma migrate dev

# Start the dev server (http://localhost:3000).
run:
    npm run dev

# Open Prisma Studio to inspect the database.
studio:
    npx prisma studio

# List signed-up users with their song count, credits, and join date.
users:
    node scripts/list-users.mjs

# Drop and recreate the database (destructive).
reset:
    npx prisma migrate reset

# Production build.
build:
    npm run build

# Run ESLint.
lint:
    npm run lint
