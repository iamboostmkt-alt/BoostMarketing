'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { createContext, useContext, ReactNode } from 'react';

interface AuthContextType {
  session: ReturnType<typeof useSession>['session'];
  status: 'loading' | 'authenticated' | 'unauthenticated';
  userId: string | null;
  userRole: string | null;
  userColor: string | null;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  status: 'loading',
  userId: null,
  userRole: null,
  userColor: null,
});

function AuthInner({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  const value: AuthContextType = {
    session,
    status,
    userId: (session?.user as any)?.id ?? null,
    userRole: (session?.user as any)?.role ?? null,
    userColor: (session?.user as any)?.color ?? null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider
      // Prevent unnecessary refetches that cause loading flicker
      refetchOnWindowFocus={false}
      refetchInterval={5 * 60} // Refetch every 5 minutes to keep session alive
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
