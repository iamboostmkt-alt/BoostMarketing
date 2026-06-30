import { NextRequest, NextResponse } from "next/server";
import { requireWorkspace } from "@/core/auth/require-workspace";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const result = await requireWorkspace({ roles: ["ADMIN"] });
  if (!result.ok) return result.response;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Solo JPG, PNG, WebP o GIF." }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "El archivo supera el límite de 5 MB." }, { status: 400 });
  }

  // ── Método 1: UploadThing (más confiable en Vercel) ──
  try {
    const { UTApi } = await import("uploadthing/server");
    const utapi = new UTApi();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const blob = new Blob([buffer], { type: file.type });
    const utFile = new File([blob], file.name, { type: file.type });
    const res = await utapi.uploadFiles([utFile]);
    const uploaded = res?.[0];
    if (uploaded?.data?.ufsUrl || uploaded?.data?.url) {
      return NextResponse.json({ url: uploaded.data.ufsUrl ?? uploaded.data.url }, { status: 201 });
    }
    if (uploaded?.error) {
      console.error("[upload] UploadThing error:", uploaded.error);
    }
  } catch (utErr) {
    console.error("[upload] UploadThing failed:", utErr);
  }

  // ── Método 2: Supabase Storage (fallback) ──
  try {
    const { getSupabaseAdmin, STORAGE_BUCKET, getPublicUrl } = await import("@/lib/supabase");
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = file.name.split(".").pop() ?? "jpg";
    const filename = `cms/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await getSupabaseAdmin().storage
      .from(STORAGE_BUCKET)
      .upload(filename, buffer, { contentType: file.type, upsert: false });
    if (!error) {
      return NextResponse.json({ url: getPublicUrl(filename) }, { status: 201 });
    }
    console.error("[upload] Supabase error:", error.message);
  } catch (sbErr) {
    console.error("[upload] Supabase failed:", sbErr);
  }

  return NextResponse.json({
    error: "Error al subir la imagen. Verifica que UPLOADTHING_SECRET esté configurado en Vercel.",
  }, { status: 500 });
}
