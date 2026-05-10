/**
 * Central event system — all side-effects (notifications, emails) go through here.
 * API routes call dispatchEvent() instead of writing notification logic inline.
 */

import { db } from './db';
import { sendEmail, taskAssignedHtml } from './resend';

// ── Event types ────────────────────────────────────────────────────────────────

export type EventType =
  | 'task.assigned'
  | 'task.status_changed'
  | 'activity.assigned'
  | 'activity.commented'
  | 'user.mentioned';

interface BaseEvent {
  type: EventType;
  actorId: string;
  actorName?: string | null;
}

export interface TaskAssignedEvent extends BaseEvent {
  type: 'task.assigned';
  targetUserId: string;
  taskTitle: string;
  taskDescription?: string;
  priority: string;
  dueDate?: string;
  assigneeEmail?: string;
  assigneeName?: string | null;
}

export interface TaskStatusChangedEvent extends BaseEvent {
  type: 'task.status_changed';
  targetUserId: string;
  taskTitle: string;
  newStatus: string;
}

export interface ActivityAssignedEvent extends BaseEvent {
  type: 'activity.assigned';
  targetUserId: string;
  activityTitle: string;
}

export interface ActivityCommentedEvent extends BaseEvent {
  type: 'activity.commented';
  targetUserIds: string[];
  activityTitle: string;
}

export interface MentionEvent extends BaseEvent {
  type: 'user.mentioned';
  targetUserIds: string[];
  contextSnippet: string;
  link: string;
}

export type AppEvent =
  | TaskAssignedEvent
  | TaskStatusChangedEvent
  | ActivityAssignedEvent
  | ActivityCommentedEvent
  | MentionEvent;

// ── Dispatcher ─────────────────────────────────────────────────────────────────

export async function dispatchEvent(event: AppEvent): Promise<void> {
  switch (event.type) {
    case 'task.assigned': {
      await db.notification.create({
        data: {
          userId:  event.targetUserId,
          message: `Se te asignó la tarea: "${event.taskTitle}"`,
          type:    'task',
          link:    '/dashboard/tasks',
        },
      });

      if (event.assigneeEmail) {
        sendEmail({
          to:      event.assigneeEmail,
          subject: `Nueva tarea asignada: ${event.taskTitle}`,
          html:    taskAssignedHtml({
            userName:        event.assigneeName  ?? 'Usuario',
            taskTitle:       event.taskTitle,
            taskDescription: event.taskDescription ?? '',
            priority:        event.priority,
            dueDate:         event.dueDate ?? '',
            assignedBy:      event.actorName ?? 'El sistema',
            appUrl:          process.env.NEXTAUTH_URL ?? 'https://boostmarketing.vercel.app',
          }),
        }).catch(() => undefined);
      }
      break;
    }

    case 'task.status_changed': {
      await db.notification.create({
        data: {
          userId:  event.targetUserId,
          message: `Tu tarea "${event.taskTitle}" cambió a: ${event.newStatus}`,
          type:    'task',
          link:    '/dashboard/tasks',
        },
      });
      break;
    }

    case 'activity.assigned': {
      await db.notification.create({
        data: {
          userId:  event.targetUserId,
          message: `Se te asignó la actividad: "${event.activityTitle}"`,
          type:    'activity',
          link:    '/dashboard/calendar',
        },
      });
      break;
    }

    case 'activity.commented': {
      if (event.targetUserIds.length === 0) break;
      await db.notification.createMany({
        data: event.targetUserIds.map((uid) => ({
          userId:  uid,
          message: `${event.actorName ?? 'Alguien'} comentó en "${event.activityTitle}"`,
          type:    'activity_comment',
          link:    '/dashboard/calendar',
        })),
        skipDuplicates: true,
      });
      break;
    }

    case 'user.mentioned': {
      if (event.targetUserIds.length === 0) break;
      const snippet = event.contextSnippet.length > 80
        ? event.contextSnippet.slice(0, 77) + '...'
        : event.contextSnippet;
      await db.notification.createMany({
        data: event.targetUserIds.map((uid) => ({
          userId:  uid,
          message: `${event.actorName ?? 'Alguien'} te mencionó: "${snippet}"`,
          type:    'mention',
          link:    event.link,
        })),
        skipDuplicates: true,
      });
      break;
    }
  }
}

// ── Mention resolver ───────────────────────────────────────────────────────────
// Parses @all or @name from a message and returns the matching user IDs.
// The caller filters out the actor before using the result.

export async function resolveMentions(
  message: string,
  excludeUserId?: string,
): Promise<string[]> {
  if (/@all\b/i.test(message)) {
    const users = await db.user.findMany({
      where: { active: true, role: { not: 'CLIENT' } },
      select: { id: true },
    });
    return users.map((u) => u.id).filter((id) => id !== excludeUserId);
  }

  const handles = [...new Set((message.match(/@([\w.]+)/g) ?? []).map((m) => m.slice(1)))];
  if (handles.length === 0) return [];

  const users = await db.user.findMany({
    where: {
      active: true,
      OR: handles.flatMap((h) => [
        { name:  { contains: h, mode: 'insensitive' as const } },
        { email: { startsWith: h, mode: 'insensitive' as const } },
      ]),
    },
    select: { id: true },
  });

  return users.map((u) => u.id).filter((id) => id !== excludeUserId);
}
