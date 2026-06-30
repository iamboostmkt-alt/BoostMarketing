-- ══════════════════════════════════════════════════════════════
-- HABILITAR ROW LEVEL SECURITY EN TODAS LAS TABLAS
-- Weeklink usa Prisma con service_role (bypassa RLS automáticamente)
-- Esto solo bloquea acceso directo vía anon/authenticated key
-- ══════════════════════════════════════════════════════════════

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspaces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verification_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "password_reset_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_assigned_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_feedback" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_assigned_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "milestones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "deliverable_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_assigned_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "channels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "channel_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_reactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_unreads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activity_assigned_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activity_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activity_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appointment_assigned_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "push_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "site_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "custom_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "team_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workspace_invites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analytics_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_presence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "webhook_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "portfolio_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "testimonials" ENABLE ROW LEVEL SECURITY;

-- Políticas: bloquear acceso anónimo directo (anon key)
-- Prisma usa service_role → bypassa estas políticas automáticamente
CREATE POLICY IF NOT EXISTS "deny_anon_users" ON "users" FOR ALL TO anon USING (false);
CREATE POLICY IF NOT EXISTS "deny_anon_accounts" ON "accounts" FOR ALL TO anon USING (false);
CREATE POLICY IF NOT EXISTS "deny_anon_sessions" ON "sessions" FOR ALL TO anon USING (false);
CREATE POLICY IF NOT EXISTS "deny_anon_tasks" ON "tasks" FOR ALL TO anon USING (false);
CREATE POLICY IF NOT EXISTS "deny_anon_clients" ON "clients" FOR ALL TO anon USING (false);
CREATE POLICY IF NOT EXISTS "deny_anon_chat" ON "chat_messages" FOR ALL TO anon USING (false);
CREATE POLICY IF NOT EXISTS "deny_anon_notifications" ON "notifications" FOR ALL TO anon USING (false);
CREATE POLICY IF NOT EXISTS "deny_anon_push" ON "push_subscriptions" FOR ALL TO anon USING (false);
CREATE POLICY IF NOT EXISTS "deny_anon_tokens" ON "password_reset_tokens" FOR ALL TO anon USING (false);
CREATE POLICY IF NOT EXISTS "deny_anon_ai" ON "ai_sessions" FOR ALL TO anon USING (false);
CREATE POLICY IF NOT EXISTS "deny_anon_webhooks" ON "webhook_subscriptions" FOR ALL TO anon USING (false);
CREATE POLICY IF NOT EXISTS "deny_anon_workspaces" ON "workspaces" FOR ALL TO anon USING (false);
CREATE POLICY IF NOT EXISTS "deny_anon_projects" ON "projects" FOR ALL TO anon USING (false);
CREATE POLICY IF NOT EXISTS "deny_anon_contacts" ON "contacts" FOR ALL TO anon USING (false);
CREATE POLICY IF NOT EXISTS "deny_anon_activity_logs" ON "activity_logs" FOR ALL TO anon USING (false);
