import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSupabaseAdmin, STORAGE_BUCKET, getPublicUrl } from '@/lib/supabase';
import { db } from '@/lib/db';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const userId = (session.user as { id: string }).id;

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'No se recibió ningún archivo.' }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Solo JPG, PNG, WebP o GIF.' }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'El archivo supera el límite de 5 MB.' }, { status: 400 });
  }

  const ext = file.name.split('.').pop() ?? 'jpg';
  const filename = `avatars/${userId}-${Date.now()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await getSupabaseAdmin().storage
    .from(STORAGE_BUCKET)
    .upload(filename, buffer, { contentType: file.type, upsert: true });

  if (error) {
    console.error('[avatar upload]', error.message);
    return NextResponse.json({ error: 'Error al subir la imagen.' }, { status: 500 });
  }

  const url = getPublicUrl(filename);

  await db.user.update({ where: { id: userId }, data: { image: url } });

  return NextResponse.json({ url }, { status: 201 });
}
