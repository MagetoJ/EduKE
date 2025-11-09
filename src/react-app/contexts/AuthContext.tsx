import React, { createContext, useContext, useState, useEffect } from 'react'

export type UserRole = 'super_admin' | 'admin' | 'teacher' | 'parent' | 'student'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  schoolId?: string
  schoolName?: string
  avatar?: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate checking for existing session
    setTimeout(() => {
      // For demo purposes, set a default user
      setUser({
        id: '1',
        email: 'admin@eduke.com',
        name: 'John Administrator',
        role: 'admin',
        schoolId: 'school-1',
        schoolName: 'Demo High School',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
      })
      setIsLoading(false)
    }, 1000)
  }, [])

  const login = async (email: string) => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Mock different user roles based on email
    let role: UserRole = 'admin'
    let schoolData: { schoolId?: string, schoolName?: string } = { schoolId: 'school-1', schoolName: 'Demo High School' }
    
    if (email.includes('super')) {
      role = 'super_admin'
      schoolData = {}
    } else if (email.includes('teacher')) {
      role = 'teacher'
    } else if (email.includes('parent')) {
      role = 'parent'
    } else if (email.includes('student')) {
      role = 'student'
    }

    setUser({
      id: '1',
      email,
      name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      role,
      schoolId: schoolData.schoolId,
      schoolName: schoolData.schoolName,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
    })
    setIsLoading(false)
  }

  const logout = () => {
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
