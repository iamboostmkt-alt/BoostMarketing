import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin, STORAGE_BUCKET, getPublicUrl } from '@/lib/supabase';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'ADMIN') return null;
  return session;
}

// POST — upload an image to Supabase Storage, returns { url }
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const folder = (formData.get('folder') as string | null) ?? 'team';

  if (!file) return NextResponse.json({ error: 'No se recibió ningún archivo.' }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Tipo de archivo no permitido. Solo JPG, PNG, WebP o GIF.' }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'El archivo supera el límite de 5 MB.' }, { status: 400 });
  }

  const ext = file.name.split('.').pop() ?? 'jpg';
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await getSupabaseAdmin().storage
    .from(STORAGE_BUCKET)
    .upload(filename, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    console.error('[upload] Supabase error:', error.message);
    return NextResponse.json({ error: 'Error al subir la imagen. Inténtalo de nuevo.' }, { status: 500 });
  }

  return NextResponse.json({ url: getPublicUrl(filename) }, { status: 201 });
}

// DELETE — remove an image from Supabase Storage by path
export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const path = searchParams.get('path');
  if (!path) return NextResponse.json({ error: 'path es requerido.' }, { status: 400 });

  const { error } = await getSupabaseAdmin().storage.from(STORAGE_BUCKET).remove([path]);
  if (error) {
    console.error('[upload] Supabase delete error:', error.message);
    return NextResponse.json({ error: 'Error al eliminar la imagen.' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Imagen eliminada.' });
}
