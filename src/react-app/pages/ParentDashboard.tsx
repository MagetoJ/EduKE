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

type Child = {
  id: string
  first_name: string
  last_name: string
  admission_number: string
  grade: string
  class_assigned: string
  email: string
  phone: string
  date_of_birth: string
  gender: string
  status: string
}

export default function ParentDashboard() {
  const apiFetch = useApi()
  const { user } = useAuth()
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChildId, setSelectedChildId] = useState<string>('')
  const [studentData, setStudentData] = useState<StudentDashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const attendanceCards = useMemo(() => {
    if (!studentData) {
      return { present: 0, absent: 0, late: 0, percentage: 0 }
    }
    return studentData.attendance
  }, [studentData])

  // Load children on mount
  useEffect(() => {
    const loadChildren = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await apiFetch('/api/parent/children')
        if (!response.ok) {
          throw new Error('Failed to load children')
        }
        const data = await response.json()
        setChildren(data.data || [])
        if (data.data && data.data.length > 0) {
          setSelectedChildId(data.data[0].id)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load children')
      } finally {
        setIsLoading(false)
      }
    }
    loadChildren()
  }, [apiFetch])

  // Load student data when child is selected
  useEffect(() => {
    if (selectedChildId) {
      loadStudentData(selectedChildId)
    }
  }, [selectedChildId])

  const loadStudentData = async (childId: string) => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch performance, attendance, fees in parallel
      const [performanceRes, attendanceRes, feesRes] = await Promise.all([
        apiFetch(`/api/students/${childId}/performance`),
        apiFetch(`/api/students/${childId}/attendance`),
        apiFetch(`/api/students/${childId}/fees`)
      ])

      const performanceData = performanceRes.ok ? await performanceRes.json() : { data: [] }
      const attendanceData = attendanceRes.ok ? await attendanceRes.json() : { data: [] }
      const feesData = feesRes.ok ? await feesRes.json() : { data: [] }

      const child = children.find(c => c.id === childId)
      if (!child) return

      // Process performance
      const performanceGroups: Record<string, number[]> = {}
      performanceData.data?.forEach((record: any) => {
        const numericGrade = Number(record.score)
        if (Number.isNaN(numericGrade)) return
        const subject = record.subject || 'General'
        if (!performanceGroups[subject]) {
          performanceGroups[subject] = []
        }
        performanceGroups[subject].push(numericGrade)
      })

      const subjectPerformance: SubjectPerformance[] = Object.entries(performanceGroups).map(([subject, scores]) => ({
        subject,
        average: Number((scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(1))
      }))

      const overallAverage = subjectPerformance.length
        ? Number((subjectPerformance.reduce((sum, current) => sum + current.average, 0) / subjectPerformance.length).toFixed(1))
        : 0

      // Process attendance
      const attendanceSummary = attendanceData.data?.reduce<AttendanceSummary>(
        (summary, record: any) => {
          const status = record.status?.toLowerCase()
          if (status === 'present') summary.present += 1
          else if (status === 'late') summary.late += 1
          else if (status === 'absent') summary.absent += 1
          summary.total += 1
          return summary
        },
        { present: 0, absent: 0, late: 0, total: 0, percentage: 0 }
      ) || { present: 0, absent: 0, late: 0, total: 0, percentage: 0 }

      attendanceSummary.percentage = attendanceSummary.total > 0
        ? Number(((attendanceSummary.present / attendanceSummary.total) * 100).toFixed(1))
        : 0

      // Process fees
      const totalFees = feesData.data?.reduce((sum: number, fee: any) => sum + (Number(fee.amount_due) || 0), 0) || 0
      const paidFees = feesData.data?.reduce((sum: number, fee: any) => sum + (Number(fee.amount_paid) || 0), 0) || 0
      const financial: FinancialSummary = {
        feesPaid: paidFees,
        feesDue: totalFees - paidFees,
        totalFees,
        status: paidFees >= totalFees ? 'Paid' : 'Pending'
      }

      setStudentData({
        id: child.id,
        name: `${child.first_name} ${child.last_name}`,
        grade: child.grade,
        className: child.class_assigned,
        discipline: [], // TODO: fetch discipline if available
        performance: {
          subjects: subjectPerformance,
          overallAverage
        },
        attendance: attendanceSummary,
        financial
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load student data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChildChange = (childId: string) => {
    setSelectedChildId(childId)
  }

  if (children.length === 0 && !isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">No Children Found</CardTitle>
            <CardDescription>You don't have any children registered in the system.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!studentData && !isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Select Child</CardTitle>
            <CardDescription>Choose a child to view their information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Child</Label>
                <Select value={selectedChildId} onValueChange={handleChildChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a child" />
                  </SelectTrigger>
                  <SelectContent>
                    {children.map((child) => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.first_name} {child.last_name} - {child.grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && <p className="text-sm font-medium text-red-500">{error}</p>}
              <Button onClick={() => selectedChildId && loadStudentData(selectedChildId)} className="w-full" disabled={isLoading || !selectedChildId}>
                {isLoading ? 'Loading...' : 'View Information'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSwitchChild = () => {
    setStudentData(null)
    setError(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Parent Dashboard</h1>
          <p className="text-gray-600">
            Viewing information for {studentData.name}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="child-select">Child:</Label>
            <Select value={selectedChildId} onValueChange={handleChildChange}>
              <SelectTrigger id="child-select" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.first_name} {child.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
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
