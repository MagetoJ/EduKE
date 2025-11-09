import { useState } from 'react'
import { Search, User, BookOpen, DollarSign, Calendar, AlertTriangle } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Label } from '../components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'

export default function ParentDashboard() {
  const [studentId, setStudentId] = useState('')
  const [studentPassword, setStudentPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [studentData, setStudentData] = useState<any>(null)

  // Mock data for demonstration
  const mockStudentData = {
    id: 'STU001',
    name: 'John Smith',
    grade: 'Grade 10',
    class: '10A',
    performance: {
      math: 85,
      english: 92,
      science: 78,
      history: 88,
      average: 85.75
    },
    discipline: [
      { date: '2024-01-15', type: 'Late to class', severity: 'Minor', status: 'Resolved' },
      { date: '2024-01-20', type: 'Incomplete homework', severity: 'Minor', status: 'Warning issued' }
    ],
    attendance: {
      present: 45,
      absent: 2,
      late: 3,
      total: 50,
      percentage: 90
    },
    financial: {
      feesPaid: 1200,
      feesDue: 300,
      totalFees: 1500,
      status: 'Partial'
    }
  }

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/parent/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          student_password: studentPassword
        })
      })

      if (response.ok) {
        const data = await response.json()
        setStudentData({
          id: data.student.id,
          name: data.student.name,
          grade: data.student.grade,
          class: data.student.class,
          performance: {
            math: 85,
            english: 92,
            science: 78,
            history: 88,
            average: 85.75
          },
          discipline: data.discipline || [],
          attendance: {
            present: 45,
            absent: 2,
            late: 3,
            total: 50,
            percentage: 90
          },
          financial: data.financial
        })
        setIsAuthenticated(true)
      } else {
        alert('Invalid student ID or password')
      }
    } catch (error) {
      console.error('Error authenticating:', error)
      alert('Error connecting to server')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
                  onChange={(e) => setStudentId(e.target.value)}
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
                  onChange={(e) => setStudentPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Access Student Information
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
          <p className="text-gray-600">Viewing information for {studentData.name} (ID: {studentData.id})</p>
        </div>
        <Button variant="outline" onClick={() => setIsAuthenticated(false)}>
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
                <div className="text-2xl font-bold">{studentData.grade}</div>
                <p className="text-xs text-muted-foreground">Class {studentData.class}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{studentData.performance.average}%</div>
                <p className="text-xs text-muted-foreground">Overall performance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attendance</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{studentData.attendance.percentage}%</div>
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
                {Object.entries(studentData.performance).map(([subject, grade]: [string, any]) => (
                  subject !== 'average' && (
                    <div key={subject} className="flex items-center justify-between">
                      <span className="capitalize">{subject}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${grade}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{grade}%</span>
                      </div>
                    </div>
                  )
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
                {studentData.discipline.map((record: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="font-medium">{record.type}</p>
                        <p className="text-sm text-gray-600">{record.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={record.severity === 'Minor' ? 'secondary' : 'destructive'}>
                        {record.severity}
                      </Badge>
                      <span className="text-sm text-gray-600">{record.status}</span>
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{studentData.attendance.present}</div>
                  <p className="text-sm text-gray-600">Present</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{studentData.attendance.absent}</div>
                  <p className="text-sm text-gray-600">Absent</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{studentData.attendance.late}</div>
                  <p className="text-sm text-gray-600">Late</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{studentData.attendance.percentage}%</div>
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
                <div className="pt-2 border-t">
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