# BoostMarketing — Full Upgrade & Architecture Compilation

## Overview

This document compiles ALL architecture upgrades, landing page restoration, Supabase integration, realtime systems, middleware protection, dashboard improvements, command palette, notifications, settings module, and production fixes for the BoostMarketing platform.

---

# 1. APP ARCHITECTURE

## Public Website
- `/` → Marketing Landing Page
- `/login` → Authentication
- `/register` → Registration
- `/dashboard/*` → Protected SaaS CRM Platform

---

# 2. GLOBAL STYLES

## app/globals.css

```css
@keyframes float {
  0%,100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

@keyframes float-delayed {
  0%,100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}

.animate-float-delayed {
  animation: float-delayed 5s ease-in-out infinite 1s;
}

.animate-slide-up {
  animation: slide-up .6s ease-out forwards;
}

.hero-gradient {
  background:
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(124,58,237,.15), transparent),
    radial-gradient(ellipse 60% 40% at 80% 50%, rgba(76,29,149,.08), transparent),
    radial-gradient(ellipse 60% 40% at 20% 60%, rgba(139,92,246,.06), transparent);
}
```

---

# 3. SUPABASE DATABASE SCHEMA

## Profiles Table

```sql
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text not null,
  role text not null default 'client',
  avatar text default '',
  color text default '#7c3aed',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
on public.profiles for select
using (true);

create policy "Users can insert their own profile."
on public.profiles for insert
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id);
```

---

## Auto Profile Trigger

```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id,email,name,role,avatar,color)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce(new.raw_user_meta_data ->> 'role', 'client'),
    coalesce(new.raw_user_meta_data ->> 'avatar', 'UU'),
    coalesce(new.raw_user_meta_data ->> 'color', '#7c3aed')
  );

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
```

---

# 4. REALTIME DATABASE TABLES

```sql
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  message text not null,
  type text default 'info',
  read boolean default false,
  link text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.activity_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id text not null,
  details jsonb default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

---

# 5. SUPABASE CLIENTS

## lib/supabase/client.ts

```ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

---

## lib/supabase/server.ts

```ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {}
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {}
        },
      },
    }
  );
}
```

---

# 6. NEXT.JS MIDDLEWARE

## middleware.ts

```ts
import { updateSession } from '@/lib/supabase/middleware';
import { type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

---

# 7. AUTH CONTEXT

## context/AuthContext.tsx

```tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: any) => {
  const supabase = createClient();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      setSession(session);
      setUser(session?.user ?? null);

      setIsLoading(false);
    };

    getSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      session,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

---

# 8. MARKETING LAYOUT

## app/(marketing)/layout.tsx

```tsx
import Link from 'next/link';

export default function MarketingLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0b0b0f] text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-[#0b0b0f]/70 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-6">
          <Link href="/" className="font-bold text-xl">
            BoostMarketing
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/login">
              Iniciar Sesión
            </Link>

            <Link
              href="/login"
              className="bg-brand-600 px-4 py-2 rounded-lg"
            >
              Empezar
            </Link>
          </div>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  );
}
```

---

# 9. LANDING PAGE

## app/(marketing)/page.tsx

```tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="hero-gradient">
      <section className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">

          <div>
            <span className="text-brand-400 font-medium">
              Agencia Creativa & CRM Platform
            </span>

            <h1 className="text-6xl font-bold leading-tight mt-6">
              Escala tu marca con contenido y automatización.
            </h1>

            <p className="text-slate-400 mt-6 text-lg">
              Producción, estrategia, CRM y automatización en una sola plataforma.
            </p>

            <div className="flex gap-4 mt-10">
              <Link
                href="/login"
                className="bg-brand-600 px-6 py-3 rounded-xl"
              >
                Iniciar Ahora
              </Link>

              <a
                href="#services"
                className="border border-white/10 px-6 py-3 rounded-xl"
              >
                Ver Servicios
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="bg-[#15151c]/60 border border-white/[0.08] rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
              <div className="space-y-4">
                <div className="h-20 rounded-2xl bg-white/[0.04]"></div>
                <div className="h-20 rounded-2xl bg-white/[0.04]"></div>
                <div className="h-20 rounded-2xl bg-white/[0.04]"></div>
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
```

---

# 10. LOGIN PAGE

## app/(auth)/login/page.tsx

```tsx
'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0b0f]">
      <div className="w-full max-w-md bg-[#15151c] p-8 rounded-2xl border border-white/[0.06]">
        <h1 className="text-2xl font-bold text-white mb-6">
          Iniciar Sesión
        </h1>

        <form className="space-y-4">
          <input
            type="email"
            placeholder="Correo"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
          />

          <input
            type="password"
            placeholder="Contraseña"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
          />

          <button
            className="w-full bg-brand-600 py-3 rounded-lg"
            disabled={loading}
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

# 11. COMMAND PALETTE

## components/dashboard/CommandPalette.tsx

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Command } from 'cmdk';

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);

    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <Command.Dialog open={open} onOpenChange={setOpen}>
      <div className="bg-[#15151c] rounded-2xl p-4">
        <Command.Input placeholder="Buscar..." />
      </div>
    </Command.Dialog>
  );
}
```

---

# 12. REALTIME HOOK

## lib/hooks/useRealtime.ts

```ts
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useRealtimeTable<T extends { id: string }>(
  tableName: string,
  initialData: T[]
) {
  const supabase = createClient();
  const [data, setData] = useState<T[]>(initialData);

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${tableName}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setData((prev) => [...prev, payload.new]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return data;
}
```

---

# 13. SETTINGS PAGE

## app/(dashboard)/dashboard/settings/page.tsx

```tsx
'use client';

import { useState } from 'react';

export default function SettingsPage() {
  const [name, setName] = useState('');

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white">
        Ajustes
      </h1>

      <div className="mt-8 bg-[#15151c] border border-white/[0.06] rounded-2xl p-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
        />
      </div>
    </div>
  );
}
```

---

# 14. TAILWIND SAFE CLASS MAPS

## lib/theme-maps.ts

```ts
export const statusColors: Record<string, string> = {
  pending: 'bg-slate-500/20 text-slate-400',
  editing: 'bg-cyan-500/20 text-cyan-400',
  review: 'bg-amber-500/20 text-amber-400',
  completed: 'bg-green-500/20 text-green-400',
};

export const dotColors: Record<string, string> = {
  purple: 'bg-purple-500',
  cyan: 'bg-cyan-500',
  amber: 'bg-amber-500',
  green: 'bg-green-500',
};
```

---

# 15. DASHBOARD LAYOUT

## app/(dashboard)/dashboard/layout.tsx

```tsx
'use client';

import { useState } from 'react';

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#0b0b0f]">
      <aside className="w-64 border-r border-white/[0.06]">
        Sidebar
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-white/[0.06]">
          Topnav
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

# 16. REQUIRED PACKAGES

```bash
npm install @supabase/supabase-js
npm install @supabase/ssr
npm install cmdk
npm install lucide-react
npm install framer-motion
```

---

# 17. ENVIRONMENT VARIABLES

## .env.local

```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

---

# 18. FINAL STRUCTURE

```txt
app/
 ├── (marketing)/
 │   ├── layout.tsx
 │   └── page.tsx
 │
 ├── (auth)/
 │   ├── login/page.tsx
 │   └── register/page.tsx
 │
 ├── (dashboard)/
 │   └── dashboard/
 │       ├── page.tsx
 │       ├── settings/page.tsx
 │       └── layout.tsx
 │
components/
 ├── dashboard/
 │   ├── CommandPalette.tsx
 │   ├── sidebar.tsx
 │   ├── topnav.tsx
 │   └── ActivityTimeline.tsx
 │
 └── landing/
     ├── Hero.tsx
     ├── Services.tsx
     └── Contact.tsx

lib/
 ├── hooks/
 ├── supabase/
 └── theme-maps.ts
```

---

# 19. BUILD COMMAND

```bash
npm run build
```

---

# 20. DEVELOPMENT SERVER

```bash
npm run dev
```

