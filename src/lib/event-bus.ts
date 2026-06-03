/**
 * Client-side singleton event bus.
 * Components emit and subscribe to typed events without direct coupling.
 * All real-time updates flow through here from RealtimeProvider.
 */

type Handler<T = unknown> = (payload: T) => void;
export type Unsubscribe = () => void;

class EventBus {
  private readonly map = new Map<string, Set<Handler>>();

  on<T = unknown>(event: string, handler: Handler<T>): Unsubscribe {
    if (!this.map.has(event)) this.map.set(event, new Set());
    const set = this.map.get(event)!;
    set.add(handler as Handler);
    return () => set.delete(handler as Handler);
  }

  emit<T = unknown>(event: string, payload: T): void {
    this.map.get(event)?.forEach((h) => h(payload));
  }
}

// Named exports for the event catalogue — used for type-safe subscriptions
export const RT_EVENTS = {
  ACTIVITY_CREATED:   'activity.created',
  ACTIVITY_UPDATED:   'activity.updated',
  ACTIVITY_DELETED:   'activity.deleted',
  TASK_CREATED:       'task.created',
  TASK_UPDATED:       'task.updated',
  TASK_DELETED:       'task.deleted',
  MESSAGE_SENT:       'message.sent',
  NOTIFICATION_NEW:   'notification.created',
  PRESENCE_UPDATED:   'presence.updated',
  COMMENT_CREATED:    'comment.created',
  FILE_UPLOADED:      'file.uploaded',
  MEETING_SCHEDULED:  'meeting.scheduled',
  INVITE_SENT:        'invite.sent',
  TASK_DUE_SOON:      'task.due_soon',
  CLIENT_UPDATED:     'client.updated',
  USER_UPDATED:       'user.updated',
} as const;

export type RTEventName = (typeof RT_EVENTS)[keyof typeof RT_EVENTS];

export const bus = new EventBus();
