import { NextResponse } from 'next/server';

const DEPRECATED_MSG =
  'El módulo de actividades fue sustituido por tareas. Usa GET/POST /api/tasks.';

/** Legacy endpoint — mantiene compatibilidad con clientes antiguos sin tocar la BD. */
export async function GET() {
  return NextResponse.json({
    activities: [],
    deprecated: true,
    message: DEPRECATED_MSG,
  });
}

export async function POST() {
  return NextResponse.json({ error: DEPRECATED_MSG }, { status: 410 });
}

export async function PUT() {
  return NextResponse.json({ error: DEPRECATED_MSG }, { status: 410 });
}

export async function DELETE() {
  return NextResponse.json({ error: DEPRECATED_MSG }, { status: 410 });
}
