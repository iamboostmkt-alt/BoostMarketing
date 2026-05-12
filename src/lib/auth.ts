import type { User as AdapterUser } from "next-auth";
import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { sendMail, isSmtpConfigured } from "@/lib/mailer";

const isDev = process.env.NODE_ENV === "development";

async function sendMagicLinkEmail(params: {
  identifier: string;
  url: string;
  provider: { from?: string };
}) {
  const { identifier, url, provider } = params;

  if (isDev && !isSmtpConfigured()) {
    console.log("\n========== Magic link (dev) ==========");
    console.log("To:", identifier);
    console.log("URL:", url);
    console.log("=======================================\n");
    return;
  }

  const html = `<p>Inicia sesión:</p><p><a href="${url}">${url}</a></p>`;
  const sent = await sendMail(
    identifier,
    "Tu enlace para iniciar sesión",
    html
  );
  if (!sent) {
    console.error(
      "[auth] Magic link: configure EMAIL_SERVER_HOST, EMAIL_SERVER_PORT, EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD, EMAIL_FROM"
    );
    throw new Error("Email no configurado. Contacta al administrador.");
  }
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
            allowDangerousEmailAccountLinking: false,
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
        const rawEmail = credentials?.email?.trim();
        const password = credentials?.password;

        if (!rawEmail || !password) {
          throw new Error("Email y contraseña son obligatorios.");
        }

        const email = rawEmail.toLowerCase();

        let user;
        try {
          user = await db.user.findUnique({
            where: { email },
          });
        } catch (err) {
          if (isDev) console.error("[auth] authorize: database error", err);
          throw new Error(
            "No se pudo iniciar sesión. Intenta de nuevo en unos momentos."
          );
        }

        if (!user?.password) {
          throw new Error(
            "No encontramos una cuenta con ese email o la cuenta no tiene contraseña configurada."
          );
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
          throw new Error("La contraseña no es correcta.");
        }

        if (!user.active) {
          throw new Error(
            "Tu cuenta está desactivada. Contacta al administrador."
          );
        }

        if (isDev) {
          console.log("[auth] authorize: success —", user.email, user.role);
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
  events: {
    async signIn({ user }) {
      if (!user?.id || !user.email) return;
      const normalized = user.email.toLowerCase();
      if (normalized !== user.email) {
        await db.user
          .update({
            where: { id: user.id },
            data: { email: normalized },
          })
          .catch(() => undefined);
      }
    },
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.sub     = user.id;
        token.id      = user.id;
        token.role    = user.role;
        token.color   = (user as { color?: string }).color;
        // Explicitly store image so it survives JWT round-trips
        token.picture = (user as { image?: string | null }).image ?? token.picture ?? undefined;

        // Load custom role once at login — stored in JWT cookie, no subsequent DB hits.
        try {
          const dbUser = await db.user.findUnique({
            where:  { id: user.id },
            select: {
              lifecycleStatus: true,
              customRoleId: true,
              customRole:   { select: { label: true, color: true, permissions: true } },
            },
          });
          token.lifecycleStatus = dbUser?.lifecycleStatus ?? (user as { lifecycleStatus?: string | null }).lifecycleStatus ?? null;
          token.customRoleId    = dbUser?.customRoleId ?? null;
          token.customRoleLabel = dbUser?.customRole?.label ?? null;
          token.customRoleColor = dbUser?.customRole?.color ?? null;
          token.permissions     = (dbUser?.customRole?.permissions as Record<string, boolean>) ?? {};
        } catch {
          token.customRoleId    = null;
          token.customRoleLabel = null;
          token.customRoleColor = null;
          token.permissions     = {};
          token.lifecycleStatus = (user as { lifecycleStatus?: string | null }).lifecycleStatus ?? null;
        }

        if (token.lifecycleStatus === undefined) {
          token.lifecycleStatus = (user as { lifecycleStatus?: string | null }).lifecycleStatus ?? null;
        }
      }

      // Called when client invokes update({ image: newUrl }) — refreshes avatar in JWT cookie
      if (trigger === 'update' && (session as { image?: string | null })?.image !== undefined) {
        token.picture = (session as { image: string | null }).image ?? undefined;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id              = (token.id as string) ?? token.sub ?? "";
        session.user.role            = token.role;
        session.user.color           = token.color as string | undefined;
        // Sync avatar from JWT — token.picture is the standard JWT claim for image
        session.user.image           = (token.picture as string | null | undefined) ?? null;
        session.user.customRoleId    = token.customRoleId;
        session.user.customRoleLabel = token.customRoleLabel;
        session.user.customRoleColor = token.customRoleColor;
        session.user.permissions     = token.permissions;
        session.user.lifecycleStatus = (token.lifecycleStatus as string | null | undefined) ?? null;
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
