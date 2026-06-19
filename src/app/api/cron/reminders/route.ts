import { NextRequest } from 'next/server';
import { GET as appointmentReminders } from '../appointment-reminders/route';

// Alias para cron-job.org que llama /api/cron/reminders
export const dynamic = 'force-dynamic';
export { appointmentReminders as GET };
