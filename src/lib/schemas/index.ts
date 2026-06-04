import { z } from 'zod';

// ── Task schemas ─────────────────────────────────────────────────────────────

export const TaskCreateSchema = z.object({
  title:           z.string().min(1, 'El título es requerido').max(255),
  description:     z.string().max(2000).optional().nullable(),
  status:          z.string().optional(),
  priority:        z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  startDate:       z.string().datetime().optional().nullable(),
  dueDate:         z.string().datetime().optional().nullable(),
  assignedUserId:  z.string().cuid().optional().nullable(),
  assignedUserIds: z.array(z.string().cuid()).optional(),
  clientId:        z.string().cuid().optional().nullable(),
  visibility:      z.enum(['internal', 'client_visible', 'management', 'team_only']).optional(),
  type:            z.string().optional(),
  parentTaskId:    z.string().cuid().optional().nullable(),
  milestoneId:     z.string().cuid().optional().nullable(),
  references:      z.array(z.object({
    title: z.string(),
    url:   z.string().url(),
    type:  z.string(),
  })).optional(),
});

export const TaskUpdateSchema = z.object({
  id:              z.string().cuid('ID inválido'),
  title:           z.string().min(1).max(255).optional(),
  description:     z.string().max(2000).optional().nullable(),
  status:          z.string().optional(),
  priority:        z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  startDate:       z.string().datetime().optional().nullable(),
  dueDate:         z.string().datetime().optional().nullable(),
  assignedUserId:  z.string().cuid().optional().nullable(),
  assignedUserIds: z.array(z.string().cuid()).optional(),
  clientId:        z.string().cuid().optional().nullable(),
  visibility:      z.enum(['internal', 'client_visible', 'management', 'team_only']).optional(),
  type:            z.string().optional(),
  milestoneId:     z.string().cuid().optional().nullable(),
  phase:           z.string().optional().nullable(),
  references:      z.array(z.object({
    title: z.string(),
    url:   z.string().url(),
    type:  z.string(),
  })).optional(),
});

// ── Client schemas ────────────────────────────────────────────────────────────

export const ClientCreateSchema = z.object({
  name:              z.string().min(1, 'El nombre es requerido').max(255),
  email:             z.string().email('Email inválido'),
  company:           z.string().max(255).optional().nullable(),
  phone:             z.string().max(50).optional().nullable(),
  status:            z.enum(['prospect', 'active', 'inactive']).optional(),
  assignedManagerId: z.string().cuid().optional().nullable(),
  notes:             z.string().max(2000).optional().nullable(),
});

export const ClientUpdateSchema = ClientCreateSchema.partial().extend({
  id: z.string().cuid('ID inválido'),
});

// ── Appointment schemas ──────────────────────────────────────────────────────

export const AppointmentCreateSchema = z.object({
  name:            z.string().min(1, 'El nombre es requerido').max(255),
  email:           z.string().email('Email inválido'),
  phone:           z.string().max(50).optional().nullable(),
  date:            z.string().min(1, 'La fecha es requerida'),
  notes:           z.string().max(2000).optional().nullable(),
  meetUrl:         z.string().url('URL inválida').optional().nullable(),
  assignedUserIds: z.array(z.string()).optional(),
  clientId:        z.string().optional().nullable(),
  status:          z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
});

export const AppointmentUpdateSchema = AppointmentCreateSchema.partial().extend({
  id: z.string().min(1, 'ID requerido'),
});

// ── Meeting schemas ───────────────────────────────────────────────────────────

export const MeetingCreateSchema = z.object({
  name:            z.string().min(1, 'El nombre es requerido').max(255),
  date:            z.string().min(1, 'La fecha es requerida'),
  notes:           z.string().max(2000).optional().nullable(),
  meetUrl:         z.string().url('URL inválida').optional().nullable(),
  assignedUserIds: z.array(z.string()).optional(),
  status:          z.enum(['pending', 'confirmed', 'cancelled', 'completed']).optional(),
});

export const MeetingUpdateSchema = MeetingCreateSchema.partial().extend({
  id: z.string().min(1, 'ID requerido'),
});

// ── Helper ────────────────────────────────────────────────────────────────────

export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): 
  { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const errors = result.error.issues.map((e: any) => e.message).join(', ');
    return { success: false, error: errors };
  }
  return { success: true, data: result.data };
}
