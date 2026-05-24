import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { getSupabaseAdmin, STORAGE_BUCKET, getPublicUrl } from '@/lib/supabase';
import { db } from '@/lib/db';
import { log } from '@/lib/logger';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  log.api('/api/auth/avatar', 'POST');
  const result = await requireWorkspace();
  if (!result.ok) return result.response;
  const { userId } = result.ctx;

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

  let supabase: ReturnType<typeof getSupabaseAdmin>;
  try {
    supabase = getSupabaseAdmin();
  } catch (configErr) {
    log.warn("/api/auth/avatar", "Supabase not configured");
    return NextResponse.json(
      { error: "El almacenamiento de imagenes no esta configurado. Contacta al administrador." },
      { status: 503 }
    );
  }

  // Verify the bucket exists and is accessible before uploading
  const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets();
  if (bucketsErr) {
    log.supabase('storage.listBuckets', bucketsErr);
    return NextResponse.json(
      { error: `Supabase Storage no accesible: ${bucketsErr.message}` },
      { status: 500 }
    );
  }
  const bucket = buckets?.find((b) => b.name === STORAGE_BUCKET);
  if (!bucket) {
    const msg = `El bucket '${STORAGE_BUCKET}' no existe. Créalo en Supabase → Storage.`;
    log.warn('/api/auth/avatar', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filename, buffer, { contentType: file.type, upsert: true });

  if (error) {
    log.supabase(`storage.upload(${filename})`, error);
    return NextResponse.json(
      { error: `Error al subir imagen: ${error.message}` },
      { status: 500 }
    );
  }

  const url = getPublicUrl(filename);
  log.info('/api/auth/avatar', 'upload ok', { userId, url, bucket: bucket.public ? 'public' : 'private' });

  if (!bucket.public) {
    log.warn('/api/auth/avatar', `bucket '${STORAGE_BUCKET}' is PRIVATE — image URLs will not load. Make it public in Supabase → Storage → Policies.`);
  }

  await db.user.update({ where: { id: userId }, data: { image: url } });

  return NextResponse.json({ url }, { status: 201 });
}

