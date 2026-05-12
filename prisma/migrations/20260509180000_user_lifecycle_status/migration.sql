-- Safe additive migration: user lifecycle (PROSPECT / ACTIVE / INACTIVE)
CREATE TYPE "UserLifecycleStatus" AS ENUM ('PROSPECT', 'ACTIVE', 'INACTIVE');

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lifecycle_status" "UserLifecycleStatus";

-- Existing rows: leave NULL (no automatic conversion per product rules)
