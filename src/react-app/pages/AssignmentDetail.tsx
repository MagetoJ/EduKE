import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router'
import { CalendarDays, ClipboardCheck, Timer, Upload } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { useApi } from '../contexts/AuthContext'

// --- Types based on your API ---
type Assignment = {
  id: string;
  title: string;
  course_name: string;
  due_date: string;
  status: string;
  description: string;
  max_score: number;
  // Fields from mock data not in your API: instructions, grading
}

type Submission = {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  score: string | null;
  submitted_at: string;
}

// Mock data removed

export function AssignmentDetail() {
  const { id } = useParams<{ id: string }>()
  const api = useApi()

  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setError("No assignment ID found.")
      setIsLoading(false)
      return
    }

    const fetchAssignmentData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [assignmentRes, submissionsRes] = await Promise.all([
          api(`/api/assignments/${id}`),
          api(`/api/assignments/${id}/submissions`)
        ])

        if (!assignmentRes.ok) {
          throw new Error('Failed to fetch assignment details')
        }
        if (!submissionsRes.ok) {
          throw new Error('Failed to fetch submissions')
        }

        const assignmentData = await assignmentRes.json()
        const submissionsData = await submissionsRes.json()

        setAssignment(assignmentData.data)
        setSubmissions(submissionsData.data)

      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAssignmentData()
  }, [id, api])

  if (isLoading) {
    return <p>Loading assignment details...</p>
  }

  if (error) {
    return <p className="text-red-500">{error}</p>
  }

  if (!assignment) {
    return <p>Assignment not found.</p>
  }
  
  // Calculate submission counts
  const totalStudents = submissions.length; // Or you need to get this from course
  const submissionCount = submissions.filter(s => s.status === 'submitted' || s.status === 'graded').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900">{assignment.title}</h1>
        <p className="text-gray-600">{assignment.course_name}</p>
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
              <p className="text-lg font-semibold text-gray-900">{submissionCount} / {totalStudents}</p>
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
              <span>{new Date(assignment.due_date).toLocaleString()}</span>
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
          {/* Note: 'instructions' and 'grading' are not in your database schema for assignments. 
            You must add these columns to the 'assignments' table and update the 
            GET /api/assignments/:id endpoint to return them.
          */}
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
              {submissions.map((submission) => (
                <div key={submission.id} className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{submission.first_name} {submission.last_name}</p>
                    <p className="text-sm text-gray-600">Submitted {new Date(submission.submitted_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-6 mt-3 md:mt-0">
                    <Badge variant={submission.status === 'submitted' || submission.status === 'graded' ? 'secondary' : 'outline'}>{submission.status}</Badge>
                    <p className="text-lg font-semibold text-gray-900">{submission.score || '-'}</p>
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
                <p className="text-2xl font-semibold text-gray-900">- / {assignment.max_score}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">On-time Submissions</p>
                <p className="text-2xl font-semibold text-blue-600">{submissionCount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-semibold text-red-600">{totalStudents - submissionCount}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}