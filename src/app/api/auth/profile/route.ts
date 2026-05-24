import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspace } from "@/core/auth/require-workspace";
import { rateLimit } from "@/lib/security/rate-limit";
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const _rl = await rateLimit(req, { limit: 30, windowMs: 60000, identifier: 'profile-get' });
  if (!_rl.success) return _rl.response;

  try {
    const result = await requireWorkspace();
    if (!result.ok) return result.response;
    const { userId } = result.ctx;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        lifecycleStatus: true,
        color: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const _rl_profile_patch = await rateLimit(req, { limit: 10, windowMs: 60000, identifier: 'profile-patch' });
  if (!_rl_profile_patch.success) return _rl_profile_patch.response;

  try {
    const result = await requireWorkspace();
    if (!result.ok) return result.response;
    const { userId } = result.ctx;
    const body = await req.json();
    const { name, image, color, removeImage } = body;

    // Build update data with only provided fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (color !== undefined) updateData.color = color;
    if (removeImage === true) {
      updateData.image = null;
    } else if (image !== undefined) {
      updateData.image = image;
    }

    const user = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        lifecycleStatus: true,
        color: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId,
        action: 'UPDATE_PROFILE',
        entity: 'User',
        entityId: userId,
        details: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Profile PATCH error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
