import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import {
  Users,
  BookOpen,
  DollarSign,
  TrendingUp,
  School,
  UserCheck,
  MessageSquare
} from 'lucide-react'
import { useApi, useAuth } from '../contexts/AuthContext'

type SchoolRecord = {
  id: string
  name: string
  students: number
  staff: number
  revenue: string
  status: string
}

type StudentRecord = {
  id: string
  name: string
  grade: string | null
  class: string | null
  status: string | null
  fees: string | null
}

type StaffRecord = {
  id: string
  name: string
  role: string
  status: string | null
}

const parseCurrency = (value: string | null | undefined) => {
  if (!value) {
    return 0
  }
  const numeric = Number(value.replace(/[^0-9.-]/g, ''))
  return Number.isNaN(numeric) ? 0 : numeric
}

export default function Dashboard() {
  const { user } = useAuth()
  const apiFetch = useApi()
  const [schools, setSchools] = useState<SchoolRecord[]>([])
  const [students, setStudents] = useState<StudentRecord[]>([])
  const [staff, setStaff] = useState<StaffRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        return
      }
      setIsLoading(true)
      setError(null)
      setSchools([])
      setStudents([])
      setStaff([])

      try {
        if (user.role === 'super_admin') {
          const response = await apiFetch('/api/schools')
          if (!response.ok) {
            throw new Error('Failed to load schools')
          }
          const data: SchoolRecord[] = await response.json()
          setSchools(data)
        } else if (user.role === 'admin') {
          const [studentsResponse, staffResponse] = await Promise.all([
            apiFetch('/api/students'),
            apiFetch('/api/staff')
          ])
          if (!studentsResponse.ok) {
            throw new Error('Failed to load students')
          }
          if (!staffResponse.ok) {
            throw new Error('Failed to load staff')
          }
          const studentData: StudentRecord[] = await studentsResponse.json()
          const staffData: StaffRecord[] = await staffResponse.json()
          setStudents(studentData)
          setStaff(staffData)
        } else if (user.role === 'teacher') {
          const studentsResponse = await apiFetch('/api/students')
          if (!studentsResponse.ok) {
            throw new Error('Failed to load students')
          }
          const studentData: StudentRecord[] = await studentsResponse.json()
          setStudents(studentData)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load dashboard data'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [apiFetch, user])

  if (!user) return null

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading dashboard...</p>
  }

  if (error) {
    return <p className="text-sm font-medium text-red-500">{error}</p>
  }

  const superAdminMetrics = useMemo(() => {
    const totalSchools = schools.length
    const totalStudents = schools.reduce((sum, school) => sum + Number(school.students || 0), 0)
    const totalStaff = schools.reduce((sum, school) => sum + Number(school.staff || 0), 0)
    const totalRevenue = schools.reduce((sum, school) => sum + parseCurrency(school.revenue), 0)
    return { totalSchools, totalStudents, totalStaff, totalRevenue }
  }, [schools])

  const adminMetrics = useMemo(() => {
    const totalStudents = students.length
    const activeStudents = students.filter((student) => student.status === 'Active').length
    const uniqueCourses = new Set(students.map((student) => student.grade ?? '')).size
    const totalStaff = staff.length
    const outstandingFees = students.reduce((sum, student) => sum + parseCurrency(student.fees), 0)
    return { totalStudents, activeStudents, uniqueCourses, totalStaff, outstandingFees }
  }, [students, staff])

  const teacherMetrics = useMemo(() => {
    const classSet = new Set<string>()
    students.forEach((student) => {
      if (student.class) {
        classSet.add(student.class)
      }
    })
    return {
      studentCount: students.length,
      classCount: classSet.size,
      pendingGrades: 0,
      unreadMessages: 0
    }
  }, [students])

  const renderSuperAdminDashboard = () => (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">System Overview</h1>
        <p className="text-gray-600">Manage all schools across the network</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{superAdminMetrics.totalSchools}</div>
            <p className="text-xs text-muted-foreground">Active institutions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{superAdminMetrics.totalStudents.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all schools</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${superAdminMetrics.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Collected to date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{superAdminMetrics.totalStaff}</div>
            <p className="text-xs text-muted-foreground">Educators and administrators</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderAdminDashboard = () => (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">School Dashboard</h1>
        <p className="text-gray-600">Overview of {user.schoolName}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminMetrics.totalStudents}</div>
            <p className="text-xs text-muted-foreground">{adminMetrics.activeStudents} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Programs Offered</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminMetrics.uniqueCourses}</div>
            <p className="text-xs text-muted-foreground">Distinct grade levels</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Fees</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${adminMetrics.outstandingFees.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminMetrics.totalStaff}</div>
            <p className="text-xs text-muted-foreground">Active faculty</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderTeacherDashboard = () => (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user.name}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Students</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teacherMetrics.studentCount}</div>
            <p className="text-xs text-muted-foreground">Across assigned classes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes Taught</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teacherMetrics.classCount}</div>
            <p className="text-xs text-muted-foreground">Unique sections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Grades</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teacherMetrics.pendingGrades}</div>
            <p className="text-xs text-muted-foreground">Awaiting submission</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teacherMetrics.unreadMessages}</div>
            <p className="text-xs text-muted-foreground">Unread notifications</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderParentDashboard = () => (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Parent Dashboard</h1>
        <p className="text-gray-600">Use the Parent view to access detailed student information.</p>
      </div>
    </div>
  )

  const renderStudentDashboard = () => (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user.name}</p>
      </div>
    </div>
  )

  const renderDashboard = () => {
    switch (user.role) {
      case 'super_admin':
        return renderSuperAdminDashboard()
      case 'admin':
        return renderAdminDashboard()
      case 'teacher':
        return renderTeacherDashboard()
      case 'parent':
        return renderParentDashboard()
      case 'student':
        return renderStudentDashboard()
      default:
        return renderAdminDashboard()
    }
  }

  return renderDashboard()
}
