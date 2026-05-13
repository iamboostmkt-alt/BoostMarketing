import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS } from "@/lib/password";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userId = (session.user as any).id;
  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword)
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });

  if (newPassword.length < 6)
    return NextResponse.json({ error: "La nueva contraseña debe tener al menos 6 caracteres" }, { status: 400 });

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.password)
    return NextResponse.json({ error: "Esta cuenta no tiene contraseña (usa enlace mágico)" }, { status: 400 });

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid)
    return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 400 });

  const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await db.user.update({ where: { id: userId }, data: { password: hashed } });

  return NextResponse.json({ ok: true });
}