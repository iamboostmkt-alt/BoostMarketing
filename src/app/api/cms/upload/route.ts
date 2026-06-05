import { NextRequest, NextResponse } from "next/server";
import { requireWorkspace } from "@/core/auth/require-workspace";
import { getSupabaseAdmin, STORAGE_BUCKET, getPublicUrl } from "@/lib/supabase";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const result = await requireWorkspace({ roles: ["ADMIN"] });
  if (!result.ok) return result.response;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as string | null) ?? "team";

  if (!file) return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Tipo de archivo no permitido. Solo JPG, PNG, WebP o GIF." }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "El archivo supera el límite de 5 MB." }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await getSupabaseAdmin().storage
    .from(STORAGE_BUCKET)
    .upload(filename, buffer, { contentType: file.type, upsert: false });

  if (error) {
    console.error("[upload] Supabase error:", error.message);
    // Fallback: intentar con UploadThing via la API interna
    try {
      const { UTApi } = await import("uploadthing/server");
      const utapi = new UTApi();
      const blob = new Blob([buffer], { type: file.type });
      const utFile = new File([blob], file.name, { type: file.type });
      const res = await utapi.uploadFiles([utFile]);
      const uploaded = res?.[0];
      if (uploaded?.data?.ufsUrl || uploaded?.data?.url) {
        return NextResponse.json({ url: uploaded.data.ufsUrl ?? uploaded.data.url }, { status: 201 });
      }
    } catch (utErr) {
      console.error("[upload] UploadThing fallback error:", utErr);
    }
    return NextResponse.json({ error: "Error al subir la imagen. Verifica que Supabase Storage esté configurado." }, { status: 500 });
  }

  return NextResponse.json({ url: getPublicUrl(filename) }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const result = await requireWorkspace({ roles: ["ADMIN"] });
  if (!result.ok) return result.response;

  const path = new URL(req.url).searchParams.get("path");
  if (!path) return NextResponse.json({ error: "path es requerido." }, { status: 400 });

  const { error } = await getSupabaseAdmin().storage.from(STORAGE_BUCKET).remove([path]);
  if (error) {
    console.error("[upload] Supabase delete error:", error.message);
    return NextResponse.json({ error: "Error al eliminar la imagen." }, { status: 500 });
  }

  return NextResponse.json({ message: "Imagen eliminada." });
}
