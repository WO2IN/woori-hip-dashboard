'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { SessionUser } from '@/lib/types'
import { getSession, clearSession } from '@/lib/auth-client'

interface AuthContextValue {
  user: SessionUser | null
  loading: boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  logout: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const session = getSession()
    setUser(session)
    setLoading(false)

    if (!session && pathname !== '/login') {
      window.location.replace('/login')
    }
  }, [pathname])

  const logout = useCallback(() => {
    clearSession()
    setUser(null)
    window.location.replace('/login')
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
