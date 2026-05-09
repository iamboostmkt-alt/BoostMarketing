import { db } from './src/lib/db';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('demo1234', 10);
  
  const user = await db.user.upsert({
    where: { email: 'demo@boostmarketing.com' },
    update: {},
    create: {
      email: 'demo@boostmarketing.com',
      name: 'Demo User',
      password: hashedPassword,
      role: 'admin',
      color: '#7c3aed',
    },
  });

  console.log(`✅ User created: ${user.email}`);

  // Create contacts
  const contactData = [
    { name: 'María García', email: 'maria@empresa.com', company: 'TechCorp', phone: '+34 612 345 678', status: 'lead', value: 5000 },
    { name: 'Carlos López', email: 'carlos@startup.io', company: 'StartupIO', phone: '+34 623 456 789', status: 'prospect', value: 8000 },
    { name: 'Ana Martínez', email: 'ana@design.co', company: 'DesignCo', phone: '+34 634 567 890', status: 'negotiation', value: 12000 },
    { name: 'Pedro Sánchez', email: 'pedro@marketing.es', company: 'MarketPro', phone: '+34 645 678 901', status: 'won', value: 15000 },
    { name: 'Laura Fernández', email: 'laura@brand.com', company: 'BrandCo', phone: '+34 656 789 012', status: 'lead', value: 3500 },
    { name: 'Roberto Ruiz', email: 'roberto@digital.mx', company: 'DigitalMX', phone: '+52 667 123 456', status: 'prospect', value: 9200 },
  ];

  for (const contact of contactData) {
    await db.contact.upsert({
      where: { id: `contact-${contact.email}` },
      update: {},
      create: {
        id: `contact-${contact.email}`,
        userId: user.id,
        ...contact,
      },
    });
  }
  console.log(`✅ ${contactData.length} contacts created`);

  // Create clients
  const clientData = [
    { name: 'TechCorp Solutions', email: 'info@techcorp.com', company: 'TechCorp', phone: '+34 912 345 678', status: 'active' },
    { name: 'StartupIO Inc', email: 'hello@startup.io', company: 'StartupIO', phone: '+34 923 456 789', status: 'active' },
    { name: 'DesignCo Agency', email: 'contact@design.co', company: 'DesignCo', phone: '+34 934 567 890', status: 'active' },
    { name: 'MarketPro España', email: 'info@marketpro.es', company: 'MarketPro', phone: '+34 945 678 901', status: 'inactive' },
  ];

  for (const client of clientData) {
    await db.client.upsert({
      where: { id: `client-${client.email}` },
      update: {},
      create: {
        id: `client-${client.email}`,
        userId: user.id,
        ...client,
      },
    });
  }
  console.log(`✅ ${clientData.length} clients created`);

  // Create tasks
  const taskData = [
    { title: 'Diseñar landing page para TechCorp', description: 'Crear diseño responsivo con enfoque en conversión', status: 'editing', priority: 'high', dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
    { title: 'Preparar reporte mensual de analytics', description: 'Compilar métricas de rendimiento del mes anterior', status: 'pending', priority: 'medium', dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) },
    { title: 'Revisión de contenido para StartupIO', description: 'Revisar copys y assets de la campaña Q1', status: 'review', priority: 'medium', dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
    { title: 'Actualizar estrategia SEO', description: 'Investigar nuevas keywords y optimizar contenido existente', status: 'pending', priority: 'high', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    { title: 'Configurar automatización de email', description: 'Crear secuencias de nurturing para leads nuevos', status: 'completed', priority: 'low', dueDate: null },
    { title: 'Crear propuesta para DesignCo', description: 'Elaborar propuesta de servicios para la nueva campaña', status: 'pending', priority: 'urgent', dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
    { title: 'Optimizar funnels de conversión', description: 'A/B testing en landing pages principales', status: 'editing', priority: 'medium', dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
    { title: 'Reunión de seguimiento con MarketPro', description: 'Revisar KPIs y próximos pasos', status: 'pending', priority: 'low', dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000) },
  ];

  for (const task of taskData) {
    await db.task.create({
      data: {
        userId: user.id,
        ...task,
      },
    });
  }
  console.log(`✅ ${taskData.length} tasks created`);

  // Create notifications
  const notificationData = [
    { message: 'Nueva tarea asignada: Crear propuesta para DesignCo', type: 'task', link: '/dashboard/tasks' },
    { message: 'Carlos López avanzó a la etapa de Negociación', type: 'contact', link: '/dashboard/crm' },
    { message: 'Nuevo cliente registrado: TechCorp Solutions', type: 'client', link: '/dashboard/clients' },
    { message: 'Tarea completada: Configurar automatización de email', type: 'task', link: '/dashboard/tasks' },
    { message: 'Recordatorio: Reunión con MarketPro mañana', type: 'info', link: '/dashboard/calendar' },
  ];

  for (const notif of notificationData) {
    await db.notification.create({
      data: {
        userId: user.id,
        ...notif,
        read: false,
        createdAt: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`✅ ${notificationData.length} notifications created`);

  // Create activity logs
  const activityData = [
    { action: 'Tarea creada: Diseñar landing page para TechCorp', entity: 'task', entityId: '1', details: '{"status":"editing","priority":"high"}' },
    { action: 'Contacto creado: María García', entity: 'contact', entityId: '1', details: '{"company":"TechCorp","status":"lead"}' },
    { action: 'Cliente creado: TechCorp Solutions', entity: 'client', entityId: '1', details: '{"company":"TechCorp"}' },
    { action: 'Tarea completada: Configurar automatización de email', entity: 'task', entityId: '5', details: '{"status":"completed"}' },
    { action: 'Contacto actualizado: Carlos López → Negociación', entity: 'contact', entityId: '2', details: '{"status":"negotiation"}' },
    { action: 'Tarea creada: Actualizar estrategia SEO', entity: 'task', entityId: '4', details: '{"status":"pending","priority":"high"}' },
    { action: 'Nuevo lead: Laura Fernández de BrandCo', entity: 'contact', entityId: '5', details: '{"company":"BrandCo","status":"lead"}' },
    { action: 'Tarea creada: Crear propuesta para DesignCo', entity: 'task', entityId: '6', details: '{"status":"pending","priority":"urgent"}' },
  ];

  for (const activity of activityData) {
    await db.activityLog.create({
      data: {
        userId: user.id,
        ...activity,
        createdAt: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`✅ ${activityData.length} activity logs created`);

  console.log('🎉 Seeding complete!');
}

seed()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
