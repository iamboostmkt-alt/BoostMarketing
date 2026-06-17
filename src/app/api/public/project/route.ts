import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET público — obtener datos del proyecto por token
// No requiere autenticación
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 });

  const tokenRecord = await db.projectToken.findFirst({
    where: {
      token,
      active: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  if (!tokenRecord) {
    return NextResponse.json({ error: 'Enlace inválido o expirado' }, { status: 404 });
  }

  // Actualizar estadísticas de acceso
  db.projectToken.update({
    where: { id: tokenRecord.id },
    data: { viewCount: { increment: 1 }, lastViewAt: new Date() },
  }).catch(() => {});

  // Obtener proyecto con datos necesarios para el cliente
  const project = await db.project.findFirst({
    where: { id: tokenRecord.projectId },
    include: {
      client:  { select: { id: true, name: true, company: true, logoUrl: true } },
      milestones: {
        where: { visibleToClient: true },
        orderBy: { date: 'asc' },
        select: {
          id: true, title: true, description: true,
          date: true, status: true, progress: true, type: true,
        },
      },
      tasks: {
        where: {
          deletedAt:        null,
          archivedAt:       null,
          visibility:       'client_visible',
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true, title: true, status: true, priority: true,
          dueDate: true, description: true,
          client: { select: { name: true } },
        },
      },
      assignedUsers: {
        include: { user: { select: { id: true, name: true, image: true, customRole: { select: { label: true } } } } },
      },
    },
  });

  if (!project) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });

  // Obtener branding del workspace (logo, colores)
  const branding = await db.siteSettings.findFirst({
    where: { workspaceId: tokenRecord.workspaceId },
    select: { agencyName: true, logoUrl: true },
  });

  // Obtener archivos del proyecto (solo los marcados como visibles)
  const files = await db.taskAttachment.findMany({
    where: {
      task: { projectId: project.id, visibility: 'client_visible' },
      status: 'active',
      isInternal: false,
    },
    select: { id: true, fileName: true, fileUrl: true, fileType: true, createdAt: true },
    take: 20,
    orderBy: { createdAt: 'desc' },
  });

  // Calcular progreso
  const totalTasks    = project.tasks.length;
  const completedTasks = project.tasks.filter(t => t.status === 'completed' || t.status === 'approved').length;
  const progress      = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return NextResponse.json({
    project: {
      id:          project.id,
      name:        project.name,
      description: project.description,
      status:      project.status,
      color:       project.color,
      startDate:   project.startDate,
      endDate:     project.endDate,
      progress,
      client:      project.client,
      milestones:  project.milestones,
      tasks:       project.tasks,
      team: project.assignedUsers.map(au => ({
        id:    au.user.id,
        name:  au.user.name,
        image: au.user.image,
        role:  au.user.customRole?.label || '',
      })),
      files,
    },
    agency: {
      name:   branding?.agencyName || 'Weeklink',
      logo:   branding?.logoUrl || null,
    },
    tokenId: tokenRecord.id,
  });
}
