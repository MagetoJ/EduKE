import { useMemo } from 'react'
import { useParams } from 'react-router'
import { Award, CalendarDays, Clock3, ClipboardList, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Badge } from '../components/ui/badge'

const examProfiles = [
  {
    id: '1',
    title: 'Mid-term Mathematics Exam',
    course: 'Advanced Mathematics',
    date: 'Mar 20, 2024 • 9:00 AM',
    duration: '2 hours',
    totalMarks: 100,
    status: 'Scheduled',
    venue: 'Hall A',
    instructions: 'Students must arrive 15 minutes early. Calculators permitted. No smart devices allowed.',
    results: [
      { id: 'r1', studentName: 'John Smith', score: 92, grade: 'A', status: 'Projected' },
      { id: 'r2', studentName: 'Sarah Johnson', score: 95, grade: 'A', status: 'Projected' },
      { id: 'r3', studentName: 'Michael Brown', score: 78, grade: 'B+', status: 'Projected' }
    ],
    analytics: {
      expectedAverage: '84%',
      topPerformers: 6,
      remediationNeeded: 4
    }
  },
  {
    id: '2',
    title: 'Biology Chapter Test',
    course: 'Biology',
    date: 'Mar 22, 2024 • 10:00 AM',
    duration: '1.5 hours',
    totalMarks: 75,
    status: 'Scheduled',
    venue: 'Lab 3',
    instructions: 'Bring lab notebooks and wear protective gear. Multiple choice and short answer sections.',
    results: [],
    analytics: {
      expectedAverage: '88%',
      topPerformers: 4,
      remediationNeeded: 2
    }
  },
  {
    id: '3',
    title: 'Literature Analysis Exam',
    course: 'English Literature',
    date: 'Mar 10, 2024 • 1:00 PM',
    duration: '2 hours',
    totalMarks: 100,
    status: 'Completed',
    venue: 'Hall B',
    instructions: 'Closed book essay-based examination covering major works from the term.',
    results: [
      { id: 'r4', studentName: 'John Smith', score: 88, grade: 'A-', status: 'Confirmed' },
      { id: 'r5', studentName: 'Emma Davis', score: 91, grade: 'A', status: 'Confirmed' },
      { id: 'r6', studentName: 'Michael Brown', score: 83, grade: 'B+', status: 'Confirmed' }
    ],
    analytics: {
      expectedAverage: '85%',
      topPerformers: 8,
      remediationNeeded: 3
    }
  }
]

export function ExamDetail() {
  const { id } = useParams()
  const exam = useMemo(() => examProfiles.find((item) => item.id === id) ?? examProfiles[0], [id])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900">{exam.title}</h1>
        <p className="text-gray-600">{exam.course}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>Exam timing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2 text-gray-900">
              <CalendarDays className="w-4 h-4" />
              <span>{exam.date}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Clock3 className="w-4 h-4" />
              <span>Duration {exam.duration}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exam Details</CardTitle>
            <CardDescription>Structure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2 text-gray-900">
              <Award className="w-4 h-4" />
              <span>Total Marks {exam.totalMarks}</span>
            </div>
            <p className="text-sm text-gray-600">Venue {exam.venue}</p>
            <Badge variant={exam.status === 'Completed' ? 'secondary' : 'outline'} className="w-fit">{exam.status}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preparation Notes</CardTitle>
            <CardDescription>Guidelines</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 leading-relaxed">{exam.instructions}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="results" className="space-y-6">
        <TabsList>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Student Results</CardTitle>
              <CardDescription>Performance overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {exam.results.length === 0 ? (
                <p className="text-sm text-gray-600">Results will appear after grading is completed.</p>
              ) : (
                exam.results.map((result) => (
                  <div key={result.id} className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{result.studentName}</p>
                      <p className="text-sm text-gray-600">Status {result.status}</p>
                    </div>
                    <div className="flex items-center gap-6 mt-3 md:mt-0">
                      <p className="text-lg font-semibold text-gray-900">{result.score}</p>
                      <Badge variant={result.status === 'Confirmed' ? 'secondary' : 'outline'}>{result.grade}</Badge>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Exam Analytics</CardTitle>
              <CardDescription>Projected performance</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <div>
                <p className="text-sm text-gray-600">Expected Average</p>
                <p className="text-2xl font-semibold text-gray-900">{exam.analytics.expectedAverage}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Top Performers</p>
                <p className="text-2xl font-semibold text-blue-600">{exam.analytics.topPerformers}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Remediation Needed</p>
                <p className="text-2xl font-semibold text-red-600">{exam.analytics.remediationNeeded}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preparation Checklist</CardTitle>
              <CardDescription>Logistics tracking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm text-gray-700">Exam papers printed</span>
                <Badge variant="secondary">Complete</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm text-gray-700">Invigilators assigned</span>
                <Badge variant="secondary">Complete</Badge>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm text-gray-700">Room setup confirmed</span>
                <Badge variant="outline">Pending</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
