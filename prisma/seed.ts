import { db } from '../src/lib/db';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('demo1234', 12);
  
  const user = await db.user.upsert({
    where: { email: 'demo@boostmarketing.com' },
    update: {},
    create: {
      email: 'demo@boostmarketing.com',
      name: 'Carlos Mendoza',
      password: hashedPassword,
      role: 'admin',
      color: '#7c3aed',
    },
  });

  console.log(`✅ User created: ${user.email}`);

  // Create demo contacts/CRM
  const contacts = [
    { name: 'María García', email: 'maria@techcorp.com', company: 'TechCorp', phone: '+52 55 1234 5678', status: 'lead', value: 15000, notes: 'Interesada en paquete de contenido' },
    { name: 'Roberto Sánchez', email: 'roberto@innova.io', company: 'Innova.io', phone: '+52 33 9876 5432', status: 'lead', value: 25000, notes: 'Requiere estrategia digital completa' },
    { name: 'Ana López', email: 'ana@verde.mx', company: 'Verde Sostenible', phone: '+52 81 5555 1234', status: 'prospect', value: 35000, notes: 'Presentación enviada, esperando respuesta' },
    { name: 'Diego Ramírez', email: 'diego@foodie.app', company: 'FoodieApp', phone: '+52 55 7777 8888', status: 'prospect', value: 18000, notes: 'Reunión agendada para la próxima semana' },
    { name: 'Laura Martínez', email: 'laura@estilomx.com', company: 'Estilo MX', phone: '+52 55 4444 3333', status: 'negotiation', value: 50000, notes: 'Negociando contrato anual' },
    { name: 'Pedro Torres', email: 'pedro@construye.mx', company: 'Construye MX', phone: '+52 33 2222 1111', status: 'negotiation', value: 42000, notes: 'Revisión de términos legales' },
    { name: 'Sofía Hernández', email: 'sofia@artstudio.mx', company: 'Art Studio', phone: '+52 55 6666 7777', status: 'won', value: 30000, notes: 'Contrato firmado - Paquete Premium' },
    { name: 'Miguel Álvarez', email: 'miguel@solar.mx', company: 'Solar Energy', phone: '+52 81 9999 0000', status: 'won', value: 65000, notes: 'Proyecto activo - Entrega Q2' },
  ];

  for (const contact of contacts) {
    await db.contact.create({
      data: { ...contact, userId: user.id },
    });
  }
  console.log(`✅ ${contacts.length} contacts created`);

  // Create demo tasks
  const tasks = [
    { title: 'Diseñar campaña de redes sociales - Verde Sostenible', description: 'Crear assets para Instagram, Facebook y LinkedIn', status: 'editing', priority: 'high', dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
    { title: 'Editar video promocional - FoodieApp', description: 'Montaje final del video de 60 segundos para lanzamiento', status: 'editing', priority: 'urgent', dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) },
    { title: 'Preparar reporte mensual de analytics', description: 'Compilar métricas de todos los clientes activos', status: 'pending', priority: 'medium', dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
    { title: 'Revisar propuesta de Estilo MX', description: 'Feedback creativo sobre el segundo round de propuestas', status: 'review', priority: 'high', dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
    { title: 'Actualizar contenido del sitio web - BoostMarketing', description: 'Nuevos casos de estudio y testimonios', status: 'pending', priority: 'low', dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    { title: 'Reunión de estrategia - Construye MX', description: 'Definir KPIs y métricas de éxito para Q2', status: 'pending', priority: 'medium', dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000) },
    { title: 'Fotografía de producto - Art Studio', description: 'Sesión fotográfica para catálogo primavera', status: 'completed', priority: 'medium', dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
    { title: 'Setup CRM para nuevo cliente', description: 'Configurar pipeline y automatizaciones para Solar Energy', status: 'completed', priority: 'high', dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    { title: 'Brief creativo - Innova.io', description: 'Preparar brief para equipo de diseño', status: 'pending', priority: 'high', dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) },
    { title: 'Email marketing campaña Q1', description: 'Diseño y copy para secuencia de 5 emails', status: 'review', priority: 'medium', dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000) },
  ];

  for (const task of tasks) {
    await db.task.create({
      data: { ...task, userId: user.id },
    });
  }
  console.log(`✅ ${tasks.length} tasks created`);

  // Create demo clients
  const clients = [
    { name: 'Sofía Hernández', email: 'sofia@artstudio.mx', company: 'Art Studio', phone: '+52 55 6666 7777', status: 'active' },
    { name: 'Miguel Álvarez', email: 'miguel@solar.mx', company: 'Solar Energy', phone: '+52 81 9999 0000', status: 'active' },
    { name: 'Carmen Ruiz', email: 'carmen@belleza.mx', company: 'Belleza MX', phone: '+52 55 1111 2222', status: 'active' },
    { name: 'Jorge Morales', email: 'jorge@auto.mx', company: 'AutoPro', phone: '+52 33 3333 4444', status: 'inactive' },
  ];

  for (const client of clients) {
    await db.client.create({
      data: { ...client, userId: user.id },
    });
  }
  console.log(`✅ ${clients.length} clients created`);

  // Create demo notifications
  const notifications = [
    { userId: user.id, message: 'Nueva tarea asignada: Brief creativo - Innova.io', type: 'task', link: '/dashboard/tasks', read: false },
    { userId: user.id, message: 'Laura Martínez actualizó el estado del deal a Negociación', type: 'crm', link: '/dashboard/crm', read: false },
    { userId: user.id, message: 'El reporte de analytics está listo para revisar', type: 'info', link: '/dashboard/analytics', read: false },
    { userId: user.id, message: '¡Bienvenido a BoostMarketing! Empieza explorando tu dashboard.', type: 'welcome', link: '/dashboard', read: true },
  ];

  for (const notification of notifications) {
    await db.notification.create({ data: notification });
  }
  console.log(`✅ ${notifications.length} notifications created`);

  // Create demo activity logs
  const activities = [
    { userId: user.id, action: 'CREATED', entity: 'Task', entityId: '1', details: JSON.stringify({ title: 'Setup CRM para nuevo cliente' }) },
    { userId: user.id, action: 'UPDATED', entity: 'Contact', entityId: '2', details: JSON.stringify({ name: 'Laura Martínez', status: 'negotiation' }) },
    { userId: user.id, action: 'COMPLETED', entity: 'Task', entityId: '3', details: JSON.stringify({ title: 'Fotografía de producto - Art Studio' }) },
    { userId: user.id, action: 'CREATED', entity: 'Client', entityId: '4', details: JSON.stringify({ name: 'Sofía Hernández', company: 'Art Studio' }) },
    { userId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id, details: JSON.stringify({ name: user.name }) },
  ];

  for (const activity of activities) {
    await db.activityLog.create({ data: activity });
  }
  console.log(`✅ ${activities.length} activity logs created`);

  console.log('\n🎉 Seed complete! Demo credentials:');
  console.log('   Email: demo@boostmarketing.com');
  console.log('   Password: demo1234');
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
