import { db } from '../src/lib/db';

async function main() {
  const user = await db.user.findFirst({ where: { role: 'ADMIN' } });
  if (!user) { console.error('No admin found'); process.exit(1); }
  const workspaceId = user.workspaceId;

  await db.taskTemplate.createMany({
    data: [
      {
        userId: user.id,
        workspaceId,
        title: 'Reel',
        description: 'Template para producción de reels',
        category: 'social_media',
        visibility: 'client_visible',
        priority: 'medium',
        estimatedDays: 7,
        subtasks: ['Brief','Guion','Grabación','Edición','Subtítulos','Revisión interna','Revisión cliente','Programación','Publicación'],
        isActive: true,
      },
      {
        userId: user.id,
        workspaceId,
        title: 'Campaña',
        description: 'Template para campañas de publicidad',
        category: 'ads',
        visibility: 'client_visible',
        priority: 'high',
        estimatedDays: 14,
        subtasks: ['Estrategia','Diseño creativos','Copies','Configuración anuncios','QA','Lanzamiento','Optimización','Reporte'],
        isActive: true,
      },
      {
        userId: user.id,
        workspaceId,
        title: 'Branding',
        description: 'Template para proyectos de branding',
        category: 'design',
        visibility: 'client_visible',
        priority: 'high',
        estimatedDays: 21,
        subtasks: ['Investigación','Moodboard','Conceptos','Diseño','Revisiones','Ajustes finales','Exportación','Entrega'],
        isActive: true,
      },
      {
        userId: user.id,
        workspaceId,
        title: 'Diseño',
        description: 'Template para piezas de diseño',
        category: 'design',
        visibility: 'client_visible',
        priority: 'medium',
        estimatedDays: 3,
        subtasks: ['Brief','Diseño inicial','Ajustes','QA','Exportación','Entrega'],
        isActive: true,
      },
      {
        userId: user.id,
        workspaceId,
        title: 'Contenido General',
        description: 'Template para planeación de contenido mensual',
        category: 'content',
        visibility: 'client_visible',
        priority: 'medium',
        estimatedDays: 30,
        subtasks: ['Planeación','Calendario editorial','Diseño contenido','Copies','Revisión','Programación','Publicación','Reporte'],
        isActive: true,
      },
    ]
  });
  console.log('Templates creados OK');
}

main().catch(console.error).finally(() => db.$disconnect());
