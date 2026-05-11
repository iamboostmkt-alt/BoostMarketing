/**
 * Email notification preferences resolver.
 *
 * We don't have a `notification_preferences` table (and we agreed to avoid a
 * schema migration). Preferences are derived from the user's role + globally
 * tunable env flags. The shape mirrors what a future `NotificationPreference`
 * model would carry, so we can swap the resolver later without changing call
 * sites.
 */

import 'server-only';
import { db } from '@/lib/db';

export interface NotificationPreferences {
  emailTaskNotifications:    boolean;
  emailMentionNotifications: boolean;
  emailClientMessages:       boolean;
  emailSystemAlerts:         boolean;
}

const CLIENT_DEFAULTS: NotificationPreferences = {
  // Clients receive emails only for things THEY can act on.
  emailTaskNotifications:    true,
  emailMentionNotifications: false,   // internal-only concept
  emailClientMessages:       true,    // when staff replies in their room
  emailSystemAlerts:         false,   // internal-only concept
};

const INTERNAL_DEFAULTS: NotificationPreferences = {
  emailTaskNotifications:    true,
  emailMentionNotifications: true,
  emailClientMessages:       true,
  emailSystemAlerts:         true,
};

function envFlag(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw == null) return fallback;
  return raw === '1' || raw.toLowerCase() === 'true';
}

function applyEnvOverrides(prefs: NotificationPreferences): NotificationPreferences {
  // Allow ops to globally disable categories from Vercel without code changes.
  return {
    emailTaskNotifications:    prefs.emailTaskNotifications    && envFlag('EMAILS_TASKS_ENABLED',    true),
    emailMentionNotifications: prefs.emailMentionNotifications && envFlag('EMAILS_MENTIONS_ENABLED', true),
    emailClientMessages:       prefs.emailClientMessages       && envFlag('EMAILS_CLIENT_ENABLED',   true),
    emailSystemAlerts:         prefs.emailSystemAlerts         && envFlag('EMAILS_SYSTEM_ENABLED',   true),
  };
}

/** Returns true if email is globally killed (master switch). */
export function emailsGloballyDisabled(): boolean {
  return process.env.EMAILS_DISABLED === '1' || process.env.EMAILS_DISABLED === 'true';
}

export async function getPreferencesForUser(userId: string): Promise<NotificationPreferences | null> {
  const user = await db.user.findUnique({
    where:  { id: userId },
    select: { role: true, active: true, email: true },
  });
  if (!user || !user.active || !user.email) return null;

  const base = user.role === 'CLIENT' ? CLIENT_DEFAULTS : INTERNAL_DEFAULTS;
  return applyEnvOverrides(base);
}

export async function getPreferencesByEmail(email: string): Promise<NotificationPreferences | null> {
  const user = await db.user.findUnique({
    where:  { email },
    select: { role: true, active: true },
  });
  if (!user || !user.active) return null;

  const base = user.role === 'CLIENT' ? CLIENT_DEFAULTS : INTERNAL_DEFAULTS;
  return applyEnvOverrides(base);
}
