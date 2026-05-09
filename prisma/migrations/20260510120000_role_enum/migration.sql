-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'CLIENT');

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role" USING (
  CASE
    WHEN lower(trim("role"::text)) IN ('admin', 'ADMIN') THEN 'ADMIN'::"Role"
    ELSE 'CLIENT'::"Role"
  END
);

ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'CLIENT'::"Role";
