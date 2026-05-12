-- Role: UNASSIGNED + TEAM_MEMBER, consolidate legacy internal roles, task soft-delete, optional activities → tasks

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'Role' AND e.enumlabel = 'UNASSIGNED'
  ) THEN
    ALTER TYPE "Role" ADD VALUE 'UNASSIGNED';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'Role' AND e.enumlabel = 'TEAM_MEMBER'
  ) THEN
    ALTER TYPE "Role" ADD VALUE 'TEAM_MEMBER';
  END IF;
END $$;

UPDATE "users"
SET "role" = 'TEAM_MEMBER'::"Role"
WHERE "role"::text IN ('DESIGNER', 'MARKETING');

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'UNASSIGNED'::"Role";

ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

-- Optional: migrate legacy `activities` into `tasks` when the table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'activities'
  ) THEN
    DELETE FROM "activity_comments";
    DELETE FROM "activity_assigned_users";

    INSERT INTO "tasks" (
      "id",
      "user_id",
      "assigned_user_id",
      "client_id",
      "title",
      "description",
      "status",
      "priority",
      "start_date",
      "due_date",
      "created_at",
      "updated_at",
      "deleted_at"
    )
    SELECT
      'mig_' || substr(md5(random()::text || a.id || clock_timestamp()::text), 1, 22),
      a."created_by_user_id",
      a."assigned_user_id",
      a."client_id",
      a.title,
      a.description,
      CASE
        WHEN a.status = 'completed' THEN 'completed'
        WHEN a.status = 'pending' THEN 'pending'
        ELSE 'in_progress'
      END,
      COALESCE(NULLIF(trim(a.priority), ''), 'medium'),
      a."start_date",
      a."end_date",
      a."created_at",
      a."updated_at",
      NULL
    FROM "activities" a;

    DELETE FROM "activities";
  END IF;
END $$;
