import type { User as AdapterUser } from "next-auth";
import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db"
import { logAction } from "@/lib/audit";
import { sendMail, isSmtpConfigured } from "@/lib/mailer";

const isDev = process.env.NODE_ENV === "development";

async function sendMagicLinkEmail(params: {
  identifier: string;
  url: string;
  provider: { from?: string };
}) {
  const { identifier, url } = params;

  if (isDev && !isSmtpConfigured()) {
    console.log("\n========== Magic link (dev) ==========");
    console.log("To:", identifier);
    console.log("URL:", url);
    console.log("=======================================\n");
    return;
  }

  const html = `<p>Inicia sesión:</p><p><a href="${url}">${url}</a></p>`;

  await sendMail(
    identifier,
    "Tu enlace para iniciar sesión",
    html
  );

  
}

const googleConfigured =
  Boolean(process.env.GOOGLE_CLIENT_ID) &&
  Boolean(process.env.GOOGLE_CLIENT_SECRET);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),

  providers: [
    ...(googleConfigured
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
        ]
      : []),

    EmailProvider({
      from: process.env.EMAIL_FROM ?? "BoostMarketing <noreply@localhost>",
      maxAge: 24 * 60 * 60,
      normalizeIdentifier(identifier: string) {
        return identifier.trim().toLowerCase();
      },
      sendVerificationRequest: async (params) => {
        await sendMagicLinkEmail({
          identifier: params.identifier,
          url: params.url,
          provider: params.provider,
        });
      },
    }),

    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials): Promise<AdapterUser | null> {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) {
          throw new Error("Email y contraseña son obligatorios.");
        }

        const user = await db.user.findUnique({
          where: { email },
        });

        if (!user?.password) {
          throw new Error("Usuario no encontrado.");
        }

        const valid = await bcrypt.compare(password, user.password);

        if (!valid) {
          throw new Error("ContraseÃ±a incorrecta.");
        }

        // Si es usuario invitado → activar en primer login
        if (!user.active) {
          if (user.lifecycleStatus === "INVITED") {
            await db.user.update({
              where: { id: user.id },
              data: { active: true, lifecycleStatus: "ACTIVE" },
            });
          } else {
            throw new Error("Cuenta desactivada.");
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          color: user.color,
          lifecycleStatus: user.lifecycleStatus,
        };
      },
    }),
  ],

  callbacks: {
    // Vincular login con Google al usuario existente del workspace (mismo email)
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          const existing = await db.user.findFirst({
            where: { email: { equals: user.email!, mode: 'insensitive' } },
            include: { accounts: true },
          });
          if (existing) {
            // Verificar si ya existe el Account de Google vinculado
            const googleAccount = existing.accounts.find(
              a => a.provider === 'google' && a.providerAccountId === account.providerAccountId
            );
            if (!googleAccount) {
              // Crear el Account record para vincular Google con el usuario existente
              await db.account.create({
                data: {
                  userId: existing.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  access_token: account.access_token,
                  refresh_token: account.refresh_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                  session_state: account.session_state,
                },
              });
            }
            // Actualizar imagen de perfil desde Google solo si no tiene una propia
            if (!existing.image && (profile as any)?.picture) {
              await db.user.update({
                where: { id: existing.id },
                data: { image: (profile as any).picture },
              });
            }
            // Forzar que el user.id del callback sea el del usuario existente
            user.id = existing.id;
            // Permitir login vinculando al usuario existente
            return true;
          }
          // No existe usuario con ese email en el workspace → bloquear
          // (solo pueden acceder usuarios previamente invitados)
          return '/login?error=NoWorkspaceAccount';
        } catch (e) {
          console.error('[OAuth signIn error]', e);
          return false;
        }
      }
      return true;
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub = user.id;
        token.id = user.id;
        token.role = user.role;
        token.color = user.color;
        token.picture = user.image ?? undefined;

        // Si es un usuario CLIENT que inicia sesión, marcar su portal como activo
        if (user.role === 'CLIENT') {
          db.client.updateMany({
            where: { email: { equals: user.email ?? '', mode: 'insensitive' }, workspaceId: user.workspaceId ?? '' },
            data: { portalStatus: 'active' },
          }).catch(() => {});
        }


        try {
          const dbUser = await db.user.findUnique({
            where: { id: user.id },
            select: {
              lifecycleStatus: true,
              customRoleId: true,
              workspaceId: true,
              workspace: {
                select: { name: true },
              },
              customRole: {
                select: {
                  label: true,
                  color: true,
                  permissions: true,
                },
              },
            },
          });

          token.lifecycleStatus = dbUser?.lifecycleStatus ?? null;
          token.customRoleId = dbUser?.customRoleId ?? null;
          token.workspaceId = dbUser?.workspaceId ?? null;
          token.workspaceName = dbUser?.workspace?.name ?? null;
          token.customRoleLabel = dbUser?.customRole?.label ?? null;
          token.customRoleColor = dbUser?.customRole?.color ?? null;
          token.permissions =
            (dbUser?.customRole?.permissions as Record<string, boolean>) ??
            {};
        } catch {
          token.lifecycleStatus = null;
          token.customRoleId = null;
          token.workspaceId = null;
          token.workspaceName = null;
          token.customRoleLabel = null;
          token.customRoleColor = null;
          token.permissions = {};
        }
        // Log login — fire and forget, no bloquea el auth
        if (token.workspaceId && user.id) {
          logAction({
            userId:      user.id ?? null,
            workspaceId: token.workspaceId as string,
            action:      'USER_LOGIN',
            entity:      'User',
            entityId:    user.id as string,
            details:     { role: token.role },
          }).catch(() => undefined);
        }
      }

      if (
        trigger === "update" &&
        session?.image !== undefined
      ) {
        token.picture = session.image ?? undefined;
      }

      // Refrescar datos del token si no tiene workspaceId O si han pasado mas de 1 hora desde el ultimo refresh
      const now = Date.now() / 1000;
      const lastRefresh = (token.lastRefresh as number) ?? 0;
      const needsRefresh = !token.workspaceId || (now - lastRefresh) > 3600;
      if (needsRefresh && token.id) {
        try {
          const dbUser = await db.user.findUnique({
            where: { id: token.id as string },
            select: {
              workspaceId: true,
              workspace: { select: { name: true } },
              lifecycleStatus: true,
              customRoleId: true,
              role: true,
              color: true,
              image: true,
              customRole: { select: { label: true, color: true, permissions: true } },
            },
          });
          if (dbUser?.workspaceId) {
            token.workspaceId   = dbUser.workspaceId;
            token.workspaceName = dbUser.workspace?.name ?? null;
            token.role          = dbUser.role;
            token.color         = dbUser.color ?? undefined;
            // Actualizar imagen del token con la que está en DB
            if (dbUser.image) token.picture = dbUser.image;

            // Sync portalStatus: si el usuario CLIENT ya está activo, actualizar el cliente
            if (dbUser.role === 'CLIENT' && token.email) {
              db.client.updateMany({
                where: {
                  email: { equals: token.email as string, mode: 'insensitive' },
                  workspaceId: dbUser.workspaceId ?? '',
                  portalStatus: { in: ['pending', 'invited'] },
                },
                data: { portalStatus: 'active' },
              }).catch(() => {});
            }
            token.lifecycleStatus  = dbUser.lifecycleStatus ?? null;
            token.customRoleId     = dbUser.customRoleId ?? null;
            token.customRoleLabel  = dbUser.customRole?.label ?? null;
            token.customRoleColor  = dbUser.customRole?.color ?? null;
            token.permissions      = (dbUser.customRole?.permissions as Record<string, boolean>) ?? {};
            token.lastRefresh      = now;
          }
        } catch (e) { console.error("[auth jwt refresh]", e); }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role = token.role;
        session.user.color = token.color;
        session.user.image = token.picture ?? null;
        session.user.customRoleId = token.customRoleId;
        session.user.workspaceId = token.workspaceId as string | null;
        session.user.workspaceName = token.workspaceName as string | null;
        session.user.customRoleLabel = token.customRoleLabel;
        session.user.customRoleColor = token.customRoleColor;
        session.user.permissions = token.permissions;
        session.user.lifecycleStatus =
  (token.lifecycleStatus as any) ?? null;
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  pages: {
    signIn: "/login",
    verifyRequest: "/verify-request",
  },

  secret: process.env.NEXTAUTH_SECRET,
  debug: isDev,
};

