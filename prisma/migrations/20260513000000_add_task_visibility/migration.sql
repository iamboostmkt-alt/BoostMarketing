-- Add visibility field to Task
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) NOT NULL DEFAULT 'internal';
