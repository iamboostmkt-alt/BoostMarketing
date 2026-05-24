import os, re

# S-14: filtrar emails @boostmkt.com en cron daily
path = r"src/app/api/cron/daily/route.ts"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = """    for (const u of uniqueUsers) {
      await db.notification.create({ data: { userId: u.id, message: `Tu tarea "${t.title}" está vencida`, type: "task", read: false, link: "/dashboard/tasks" } }).catch(() => {});
      await sendMail(u.email, `Tarea vencida: ${t.title}`, templateTareaVencida(t.title, dueDate, branding, u.name ?? undefined));
      emailsEnviados++;
    }"""
new = """    for (const u of uniqueUsers) {
      await db.notification.create({ data: { userId: u.id, message: `Tu tarea "${t.title}" está vencida`, type: "task", read: false, link: "/dashboard/tasks" } }).catch(() => {});
      // Filtrar dominios sin MX
      if (!u.email.endsWith('@boostmkt.com')) {
        await sendMail(u.email, `Tarea vencida: ${t.title}`, templateTareaVencida(t.title, dueDate, branding, u.name ?? undefined));
        emailsEnviados++;
      }
    }"""

if old in content:
    content = content.replace(old, new, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("OK S-14 - daily cron: filtro @boostmkt.com agregado")
else:
    print("SKIP S-14 - bloque no encontrado")

# S-12 + S-13: eliminar crons obsoletos
obsoletos = [
    r"src/app/api/cron/overdue/route.ts",
    r"src/app/api/cron/reminders/route.ts",
    r"src/app/api/cron/review-reminders/route.ts",
    r"src/app/api/cron/cleanup-appointments/route.ts",
    r"src/app/api/cron/cleanup-completed-tasks/route.ts",
    r"src/app/api/cron/weekly-summary/route.ts",
    r"src/app/api/cron/weekly-cleanup/route.ts",
    r"src/app/api/cron/monthly-cleanup/route.ts",
]

eliminados = []
for p in obsoletos:
    if os.path.exists(p):
        os.remove(p)
        # Eliminar carpeta si queda vacía
        folder = os.path.dirname(p)
        if os.path.exists(folder) and not os.listdir(folder):
            os.rmdir(folder)
        eliminados.append(p)
        print(f"OK S-12/13 - eliminado: {p}")
    else:
        print(f"SKIP - no existe: {p}")

print(f"\nTotal eliminados: {len(eliminados)}")
