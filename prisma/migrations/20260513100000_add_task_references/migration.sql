-- Add task_references field to Task
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_references JSONB NOT NULL DEFAULT '[]';
