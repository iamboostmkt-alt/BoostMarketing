import re

fixes = {
    r"src/app/api/tasks/route.ts": [
        # GET ya fue arreglado antes — verificar si quedó
    ],
    r"src/app/api/tasks/count/route.ts": [
        ("  if (!workspaceId) return NextResponse.json({ error: 'Workspace no encontrado' }, { status: 400 });\n\n  const count",
         "  // workspaceId opcional en count — JWT se refresca automáticamente\n\n  const count"),
    ],
    r"src/app/api/meetings/route.ts": [
        ("  if (!workspaceId) return NextResponse.json({ error: 'Workspace no encontrado' }, { status: 400 });\n  const where",
         "  // workspaceId opcional — se filtra solo si existe\n  const where"),
    ],
    r"src/app/api/clients/route.ts": [
        # Solo el guard del POST — el GET no tiene guard
        ("    if (!workspaceId) return NextResponse.json({ error: 'Workspace no encontrado' }, { status: 400 });\n    const rawBody",
         "    // workspaceId puede ser null en edge cases — subtareas y registros legacy\n    const rawBody"),
    ],
}

for path, replacements in fixes.items():
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        original = content
        for old, new in replacements:
            if old in content:
                content = content.replace(old, new, 1)
                print(f"OK - {path}")
            else:
                print(f"SKIP - no encontrado en {path}")
        if content != original:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(content)
    except FileNotFoundError:
        print(f"NO ENCONTRADO - {path}")
