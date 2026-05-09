'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import type { Session } from 'next-auth';
import { createContext, useContext, ReactNode } from 'react';

interface AuthContextType {
  session: Session | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  userId: string | null;
  userRole: string | null;
  userColor: string | null;
}

// NON-BLOCKING: default to 'unauthenticated' instead of 'loading'.
// This prevents any component from being stuck in a loading state
// if the session fetch never resolves.
const AuthContext = createContext<AuthContextType>({
  session: null,
  status: 'unauthenticated',
  userId: null,
  userRole: null,
  userColor: null,
});

function AuthInner({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  const value: AuthContextType = {
    session,
    status,
    userId: session?.user?.id ?? null,
    userRole: session?.user?.role ?? null,
    userColor: session?.user?.color ?? null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider
      refetchOnWindowFocus={false}
      refetchInterval={5 * 60}
    >
      <AuthInner>{children}</AuthInner>
    </SessionProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
