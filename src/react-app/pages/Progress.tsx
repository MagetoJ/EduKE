import { useState } from 'react'
import { TrendingUp, Calendar, BookOpen, Award, Clock, Target, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { useAuth } from '../contexts/AuthContext'

// Mock data for student progress
const mockStudentData = {
  attendance: {
    percentage: 94,
    daysPresent: 156,
    daysAbsent: 10,
    totalDays: 166
  },
  grades: [
    { subject: 'Mathematics', grade: 'A-', percentage: 88, trend: 'up' },
    { subject: 'Science', grade: 'B+', percentage: 85, trend: 'up' },
    { subject: 'English', grade: 'A', percentage: 92, trend: 'stable' },
    { subject: 'History', grade: 'B', percentage: 82, trend: 'down' },
    { subject: 'Art', grade: 'A+', percentage: 96, trend: 'up' }
  ],
  upcomingAssignments: [
    { id: '1', subject: 'Mathematics', title: 'Algebra Quiz', dueDate: '2024-03-15', status: 'pending' },
    { id: '2', subject: 'Science', title: 'Lab Report', dueDate: '2024-03-18', status: 'pending' },
    { id: '3', subject: 'English', title: 'Essay Submission', dueDate: '2024-03-20', status: 'pending' }
  ],
  recentGrades: [
    { subject: 'Mathematics', assignment: 'Mid-term Exam', grade: 'A-', date: '2024-03-08' },
    { subject: 'Science', assignment: 'Chapter 5 Quiz', grade: 'B+', date: '2024-03-06' },
    { subject: 'English', assignment: 'Book Report', grade: 'A', date: '2024-03-05' }
  ]
}

// Mock children data for parents (if they have multiple children)
const mockChildren = [
  { id: '1', name: 'Emma Davis', grade: 'Grade 10', class: '10A' },
  { id: '2', name: 'Jake Davis', grade: 'Grade 8', class: '8B' }
]

export default function Progress() {
  const { user } = useAuth()
  const [selectedChild, setSelectedChild] = useState<string | undefined>(mockChildren[0]?.id)

  if (!user || (user.role !== 'parent' && user.role !== 'student')) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Access denied. This page is only available to parents and students.</p>
      </div>
    )
  }

  const renderParentView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Child's Progress</h1>
          <p className="text-gray-600">Track your child's academic performance and activities</p>
        </div>
        
        {mockChildren.length > 1 && (
          <div className="w-64">
            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger>
                <SelectValue placeholder="Select child" />
              </SelectTrigger>
              <SelectContent>
                {mockChildren.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    {child.name} - {child.grade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{mockStudentData.attendance.percentage}%</div>
            <p className="text-xs text-muted-foreground">
              {mockStudentData.attendance.daysPresent} of {mockStudentData.attendance.totalDays} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">B+</div>
            <p className="text-xs text-muted-foreground">88.6% overall</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assignments Due</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{mockStudentData.upcomingAssignments.length}</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Fees</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">$450</div>
            <p className="text-xs text-muted-foreground">Due March 15th</p>
          </CardContent>
        </Card>
      </div>

      {/* Subject Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Subject Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockStudentData.grades.map((subject, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <BookOpen className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{subject.subject}</p>
                      <p className="text-sm text-gray-500">{subject.percentage}%</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-lg font-bold ${
                      subject.grade.startsWith('A') ? 'text-green-600' :
                      subject.grade.startsWith('B') ? 'text-blue-600' :
                      'text-orange-600'
                    }`}>
                      {subject.grade}
                    </span>
                    <TrendingUp className={`w-4 h-4 ${
                      subject.trend === 'up' ? 'text-green-500' :
                      subject.trend === 'down' ? 'text-red-500' :
                      'text-gray-400'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockStudentData.upcomingAssignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium">{assignment.title}</p>
                      <p className="text-sm text-gray-500">{assignment.subject}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{assignment.dueDate}</p>
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                      Pending
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderStudentView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Progress</h1>
          <p className="text-gray-600">Track your academic performance and goals</p>
        </div>
      </div>

      {/* Overview Cards - Same as parent view */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{mockStudentData.attendance.percentage}%</div>
            <p className="text-xs text-muted-foreground">
              {mockStudentData.attendance.daysPresent} of {mockStudentData.attendance.totalDays} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">B+</div>
            <p className="text-xs text-muted-foreground">88.6% overall</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assignments Due</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{mockStudentData.upcomingAssignments.length}</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Rank</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">7th</div>
            <p className="text-xs text-muted-foreground">Out of 42 students</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Grades and Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Grades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockStudentData.recentGrades.map((grade, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <BookOpen className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{grade.assignment}</p>
                      <p className="text-sm text-gray-500">{grade.subject} • {grade.date}</p>
                    </div>
                  </div>
                  <span className={`text-lg font-bold px-3 py-1 rounded ${
                    grade.grade.startsWith('A') ? 'bg-green-100 text-green-800' :
                    grade.grade.startsWith('B') ? 'bg-blue-100 text-blue-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {grade.grade}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockStudentData.upcomingAssignments.map((assignment) => (
                <div key={assignment.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{assignment.title}</h4>
                    <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                      Due Soon
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{assignment.subject}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Due: {assignment.dueDate}</span>
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                      Submit Work
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  return user.role === 'parent' ? renderParentView() : renderStudentView()
}
