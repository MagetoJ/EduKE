import { useMemo } from 'react'
import { useParams } from 'react-router'
import { FileText, CalendarDays, ClipboardCheck, Timer, Upload } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'

const assignmentProfiles = [
  {
    id: '1',
    title: 'Algebraic Equations Quiz',
    course: 'Advanced Mathematics',
    dueDate: 'Mar 15, 2024 • 11:59 PM',
    status: 'Active',
    totalStudents: 28,
    submissions: 18,
    description: 'Short quiz covering linear and quadratic equations with emphasis on problem solving speed.',
    instructions: 'Students must show all working steps. Calculators are allowed. Upload scanned solutions as PDF.',
    grading: 'Each question carries equal marks. Partial credit is awarded for clear working.',
    submissionsList: [
      { id: '1', studentName: 'John Smith', status: 'Submitted', score: '45/50', submittedAt: 'Mar 14, 2024 • 2:15 PM' },
      { id: '2', studentName: 'Sarah Johnson', status: 'Submitted', score: '47/50', submittedAt: 'Mar 14, 2024 • 3:40 PM' },
      { id: '3', studentName: 'Michael Brown', status: 'Pending', score: '-', submittedAt: '-' },
      { id: '4', studentName: 'Emma Davis', status: 'Submitted', score: '48/50', submittedAt: 'Mar 14, 2024 • 4:05 PM' }
    ]
  },
  {
    id: '2',
    title: 'Cell Division Lab Report',
    course: 'Biology',
    dueDate: 'Mar 18, 2024 • 5:00 PM',
    status: 'Active',
    totalStudents: 25,
    submissions: 12,
    description: 'Detailed laboratory report on mitosis observations with photographic evidence and analysis.',
    instructions: 'Attach lab photos and label each stage of mitosis. Provide reflection on anomalies observed.',
    grading: 'Rubric includes accuracy, analysis depth, and presentation clarity.',
    submissionsList: [
      { id: '2-1', studentName: 'Sarah Johnson', status: 'Submitted', score: '88%', submittedAt: 'Mar 17, 2024 • 1:20 PM' },
      { id: '2-2', studentName: 'Emma Davis', status: 'Pending', score: '-', submittedAt: '-' }
    ]
  },
  {
    id: '3',
    title: 'Shakespeare Essay',
    course: 'English Literature',
    dueDate: 'Mar 12, 2024 • 11:59 PM',
    status: 'Completed',
    totalStudents: 30,
    submissions: 30,
    description: 'Literary analysis essay comparing themes across three Shakespearean plays.',
    instructions: 'Minimum 1500 words with citations. Upload as DOCX or PDF.',
    grading: 'Focus on thesis clarity, textual evidence, and critical insight.',
    submissionsList: [
      { id: '3-1', studentName: 'John Smith', status: 'Graded', score: '94%', submittedAt: 'Mar 11, 2024 • 9:00 PM' },
      { id: '3-2', studentName: 'Michael Brown', status: 'Graded', score: '88%', submittedAt: 'Mar 11, 2024 • 6:45 PM' }
    ]
  }
]

export function AssignmentDetail() {
  const { id } = useParams()
  const assignment = useMemo(() => assignmentProfiles.find((item) => item.id === id) ?? assignmentProfiles[0], [id])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900">{assignment.title}</h1>
        <p className="text-gray-600">{assignment.course}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
            <CardDescription>Submission overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge variant={assignment.status === 'Completed' ? 'secondary' : 'outline'} className="w-fit">{assignment.status}</Badge>
            <div>
              <p className="text-sm text-gray-600">Submissions</p>
              <p className="text-lg font-semibold text-gray-900">{assignment.submissions} / {assignment.totalStudents}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Due Date</CardTitle>
            <CardDescription>Submission deadline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2 text-gray-900">
              <CalendarDays className="w-4 h-4" />
              <span>{assignment.dueDate}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Timer className="w-4 h-4" />
              <span>Automatic reminders sent 24 hours prior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Manage workflow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full">
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Grade Submissions
            </Button>
            <Button variant="outline" className="w-full">
              <Upload className="w-4 h-4 mr-2" />
              Download Responses
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assignment Brief</CardTitle>
          <CardDescription>Expectations and instructions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-500">Overview</p>
            <p className="text-gray-700 leading-relaxed">{assignment.description}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Instructions</p>
            <p className="text-gray-700 leading-relaxed">{assignment.instructions}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Grading Notes</p>
            <p className="text-gray-700 leading-relaxed">{assignment.grading}</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="submissions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="submissions">Submissions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="submissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Student Submissions</CardTitle>
              <CardDescription>Track completion and grading</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {assignment.submissionsList.map((submission) => (
                <div key={submission.id} className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{submission.studentName}</p>
                    <p className="text-sm text-gray-600">Submitted {submission.submittedAt}</p>
                  </div>
                  <div className="flex items-center gap-6 mt-3 md:mt-0">
                    <Badge variant={submission.status === 'Submitted' || submission.status === 'Graded' ? 'secondary' : 'outline'}>{submission.status}</Badge>
                    <p className="text-lg font-semibold text-gray-900">{submission.score}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Snapshot</CardTitle>
              <CardDescription>Summary metrics</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <div>
                <p className="text-sm text-gray-600">Average Score</p>
                <p className="text-2xl font-semibold text-gray-900">42/50</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">On-time Submissions</p>
                <p className="text-2xl font-semibold text-blue-600">16</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Late Submissions</p>
                <p className="text-2xl font-semibold text-red-600">2</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
