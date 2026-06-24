# Demoify task runner. Run `just` to list recipes.

# List available recipes.
default:
    @just --list

# One-shot dev setup: install deps, create .env, generate client, run migrations.
setup: install env generate migrate
    @echo "Setup complete. Run 'just run' to start the dev server."

# Install dependencies.
install:
    npm install

# Create .env from the example if it doesn't exist yet.
env:
    @test -f .env && echo ".env already exists, leaving it untouched." || (cp .env.example .env && echo "Created .env from .env.example — fill in the required values.")

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

# Drop and recreate the database (destructive).
reset:
    npx prisma migrate reset

# Production build.
build:
    npm run build

# Run ESLint.
lint:
    npm run lint
