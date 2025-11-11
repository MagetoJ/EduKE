import { useMemo, useState } from 'react'
import { User, BookOpen, DollarSign, Calendar, AlertTriangle } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Label } from '../components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Badge } from '../components/ui/badge'
import { useApi, useAuth } from '../contexts/AuthContext'

type DisciplineRecord = {
  id: number
  student_id: number
  teacher_id: number | null
  type: string
  severity: string
  description: string
  date: string
  status: string | null
}

type PerformanceRecord = {
  id: number
  student_id: number
  teacher_id: number | null
  subject: string
  grade: number | string
  term: string | null
  comments: string | null
  date_recorded: string | null
}

type AttendanceRecord = {
  id: number
  student_id: number
  date: string
  status: string
  teacher_id: number | null
}

type FinancialSummary = {
  feesPaid: number
  feesDue: number
  totalFees: number
  status: string
}

type ParentAccessResponse = {
  student: {
    id: number
    name: string
    grade: string | null
    class: string | null
  }
  discipline: DisciplineRecord[]
  performance: PerformanceRecord[]
  attendance: AttendanceRecord[]
  financial: FinancialSummary
}

type SubjectPerformance = {
  subject: string
  average: number
}

type AttendanceSummary = {
  present: number
  absent: number
  late: number
  total: number
  percentage: number
}

type StudentDashboardData = {
  id: string
  name: string
  grade: string | null
  className: string | null
  discipline: DisciplineRecord[]
  performance: {
    subjects: SubjectPerformance[]
    overallAverage: number
  }
  attendance: AttendanceSummary
  financial: FinancialSummary
}

export default function ParentDashboard() {
  const apiFetch = useApi()
  const { user } = useAuth()
  const [studentId, setStudentId] = useState('')
  const [studentPassword, setStudentPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [studentData, setStudentData] = useState<StudentDashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const attendanceCards = useMemo(() => {
    if (!studentData) {
      return { present: 0, absent: 0, late: 0, percentage: 0 }
    }
    return studentData.attendance
  }, [studentData])

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setError('You must be logged in to access student data.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await apiFetch('/api/parent/access', {
        method: 'POST',
        body: JSON.stringify({
          student_id: Number(studentId),
          student_password: studentPassword
        })
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Invalid student ID or password')
      }

      const data: ParentAccessResponse = await response.json()

      const performanceGroups: Record<string, number[]> = {}
      data.performance.forEach((record) => {
        const numericGrade = Number(record.grade)
        if (Number.isNaN(numericGrade)) {
          return
        }
        if (!performanceGroups[record.subject]) {
          performanceGroups[record.subject] = []
        }
        performanceGroups[record.subject].push(numericGrade)
      })

      const subjectPerformance: SubjectPerformance[] = Object.entries(performanceGroups).map(([subject, scores]) => ({
        subject,
        average: Number((scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(1))
      }))

      const overallAverage = subjectPerformance.length
        ? Number(
            (
              subjectPerformance.reduce((sum, current) => sum + current.average, 0) /
              subjectPerformance.length
            ).toFixed(1)
          )
        : 0

      const attendanceSummary = data.attendance.reduce<AttendanceSummary>(
        (summary, record) => {
          const status = record.status.toLowerCase()
          if (status === 'present') {
            summary.present += 1
          } else if (status === 'late') {
            summary.late += 1
          } else if (status === 'absent') {
            summary.absent += 1
          }
          summary.total += 1
          return summary
        },
        { present: 0, absent: 0, late: 0, total: 0, percentage: 0 }
      )

      attendanceSummary.percentage = attendanceSummary.total
        ? Math.round((attendanceSummary.present / attendanceSummary.total) * 100)
        : 0

      setStudentData({
        id: data.student.id.toString(),
        name: data.student.name,
        grade: data.student.grade,
        className: data.student.class,
        discipline: data.discipline,
        performance: {
          subjects: subjectPerformance
            .sort((a, b) => b.average - a.average)
            .slice(0, subjectPerformance.length),
          overallAverage
        },
        attendance: attendanceSummary,
        financial: data.financial
      })
      setIsAuthenticated(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error connecting to server'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated || !studentData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Parent Access</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuthenticate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="studentId">Student ID</Label>
                <Input
                  id="studentId"
                  placeholder="Enter student ID"
                  value={studentId}
                  onChange={(event) => setStudentId(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentPassword">Student Password</Label>
                <Input
                  id="studentPassword"
                  type="password"
                  placeholder="Enter student password"
                  value={studentPassword}
                  onChange={(event) => setStudentPassword(event.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm font-medium text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Loading...' : 'Access Student Information'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSwitchStudent = () => {
    setIsAuthenticated(false)
    setStudentData(null)
    setStudentId('')
    setStudentPassword('')
    setError(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
          <p className="text-gray-600">
            Viewing information for {studentData.name} (ID: {studentData.id})
          </p>
        </div>
        <Button variant="outline" onClick={handleSwitchStudent}>
          Switch Student
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="discipline">Discipline</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Grade</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{studentData.grade ?? 'N/A'}</div>
                <p className="text-xs text-muted-foreground">Class {studentData.className ?? 'N/A'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{studentData.performance.overallAverage}%</div>
                <p className="text-xs text-muted-foreground">Overall performance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attendance</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{attendanceCards.percentage}%</div>
                <p className="text-xs text-muted-foreground">Present rate</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fees Status</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${studentData.financial.feesDue}</div>
                <p className="text-xs text-muted-foreground">Outstanding</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subject Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {studentData.performance.subjects.length === 0 && (
                  <p className="text-sm text-muted-foreground">No performance records available.</p>
                )}
                {studentData.performance.subjects.map((subject) => (
                  <div key={subject.subject} className="flex items-center justify-between">
                    <span className="capitalize">{subject.subject}</span>
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-24 rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-blue-600"
                          style={{ width: `${Math.min(subject.average, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">{subject.average}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discipline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Discipline Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {studentData.discipline.length === 0 && (
                  <p className="text-sm text-muted-foreground">No discipline records available.</p>
                )}
                {studentData.discipline.map((record) => (
                  <div key={record.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center space-x-4">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="font-medium">{record.type}</p>
                        <p className="text-sm text-gray-600">{new Date(record.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={record.severity === 'Minor' ? 'secondary' : 'destructive'}>
                        {record.severity}
                      </Badge>
                      <span className="text-sm text-gray-600">{record.status ?? 'Pending'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{attendanceCards.present}</div>
                  <p className="text-sm text-gray-600">Present</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{attendanceCards.absent}</div>
                  <p className="text-sm text-gray-600">Absent</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{attendanceCards.late}</div>
                  <p className="text-sm text-gray-600">Late</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{attendanceCards.percentage}%</div>
                  <p className="text-sm text-gray-600">Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Fees</span>
                  <span>${studentData.financial.totalFees}</span>
                </div>
                <div className="flex justify-between">
                  <span>Fees Paid</span>
                  <span className="text-green-600">${studentData.financial.feesPaid}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Outstanding</span>
                  <span className="text-red-600">${studentData.financial.feesDue}</span>
                </div>
                <div className="border-t pt-2">
                  <Badge variant={studentData.financial.status === 'Paid' ? 'default' : 'secondary'}>
                    {studentData.financial.status}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
