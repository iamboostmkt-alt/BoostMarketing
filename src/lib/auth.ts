import type { User as AdapterUser } from "next-auth";
import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const isDev = process.env.NODE_ENV === "development";

async function sendMagicLinkEmail(params: {
  identifier: string;
  url: string;
  provider: { from?: string };
}) {
  const { identifier, url, provider } = params;

  if (isDev) {
    console.log("\n========== Magic link (dev) ==========");
    console.log("To:", identifier);
    console.log("URL:", url);
    console.log("=======================================\n");
    return;
  }

  const server = process.env.EMAIL_SERVER;
  const from = process.env.EMAIL_FROM ?? provider.from ?? "noreply@localhost";

  if (!server) {
    console.error(
      "[auth] Magic link: set EMAIL_SERVER and EMAIL_FROM for production"
    );
    throw new Error("Email no configurado. Contacta al administrador.");
  }

  const transport = nodemailer.createTransport(server);
  await transport.sendMail({
    to: identifier,
    from,
    subject: "Tu enlace para iniciar sesión",
    text: `Inicia sesión con este enlace (válido por tiempo limitado):\n${url}`,
    html: `<p>Inicia sesión:</p><p><a href="${url}">${url}</a></p>`,
  });
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
    async jwt({ token, user }) {
      if (user) {
        token.sub   = user.id;
        token.id    = user.id;
        token.role  = user.role;
        token.color = (user as { color?: string }).color;

        // Load custom role once at login — stored in JWT cookie, no subsequent DB hits.
        try {
          const dbUser = await db.user.findUnique({
            where:  { id: user.id },
            select: {
              customRoleId: true,
              customRole:   { select: { label: true, color: true, permissions: true } },
            },
          });
          token.customRoleId    = dbUser?.customRoleId ?? null;
          token.customRoleLabel = dbUser?.customRole?.label ?? null;
          token.customRoleColor = dbUser?.customRole?.color ?? null;
          token.permissions     = (dbUser?.customRole?.permissions as Record<string, boolean>) ?? {};
        } catch {
          token.customRoleId    = null;
          token.customRoleLabel = null;
          token.customRoleColor = null;
          token.permissions     = {};
        }

        if (isDev) console.log("[auth] jwt: token created for", user.email);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id             = (token.id as string) ?? token.sub ?? "";
        session.user.role           = token.role;
        session.user.color          = token.color as string | undefined;
        session.user.customRoleId   = token.customRoleId;
        session.user.customRoleLabel = token.customRoleLabel;
        session.user.customRoleColor = token.customRoleColor;
        session.user.permissions    = token.permissions;
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
