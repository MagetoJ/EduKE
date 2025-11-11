import { useMemo } from 'react'
import { useParams } from 'react-router'
import { Users, Calendar, BookOpen, Clock, FileText } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Badge } from '../components/ui/badge'

const courseProfiles = [
  {
    id: '1',
    name: 'Advanced Mathematics',
    code: 'MATH-401',
    teacher: 'Dr. Sarah Wilson',
    grade: 'Grade 10',
    schedule: 'Mon, Wed, Fri • 9:00 AM',
    description: 'Comprehensive study of algebra, geometry, and calculus foundations preparing students for advanced examinations.',
    students: [
      { id: '1', name: 'John Smith', status: 'Active', progress: '92%' },
      { id: '2', name: 'Sarah Johnson', status: 'Active', progress: '90%' },
      { id: '3', name: 'Michael Brown', status: 'Active', progress: '84%' }
    ],
    assignments: [
      { id: '1', title: 'Algebraic Equations Quiz', dueDate: 'Mar 15, 2024', submissions: '18/28', status: 'Active' },
      { id: '4', title: 'Geometry Project', dueDate: 'Mar 22, 2024', submissions: '12/28', status: 'Draft' }
    ],
    exams: [
      { id: '1', title: 'Mid-term Mathematics Exam', date: 'Mar 20, 2024', duration: '2 hours', totalMarks: 100, status: 'Scheduled' }
    ],
    resources: [
      { id: 'r1', label: 'Weekly Lesson Plan', type: 'Document' },
      { id: 'r2', label: 'Formula Reference Sheet', type: 'PDF' }
    ]
  },
  {
    id: '2',
    name: 'Biology',
    code: 'BIO-301',
    teacher: 'Mr. James Anderson',
    grade: 'Grade 10',
    schedule: 'Tue, Thu • 10:30 AM',
    description: 'Laboratory driven exploration of biological systems, cellular structures, and ecological relationships.',
    students: [
      { id: '2', name: 'Sarah Johnson', status: 'Active', progress: '94%' },
      { id: '4', name: 'Emma Davis', status: 'Active', progress: '89%' }
    ],
    assignments: [
      { id: '2', title: 'Cell Division Lab Report', dueDate: 'Mar 18, 2024', submissions: '12/25', status: 'Active' }
    ],
    exams: [
      { id: '2', title: 'Biology Chapter Test', date: 'Mar 22, 2024', duration: '1.5 hours', totalMarks: 75, status: 'Scheduled' }
    ],
    resources: [
      { id: 'r3', label: 'Microscopy Lab Guide', type: 'PDF' }
    ]
  },
  {
    id: '3',
    name: 'English Literature',
    code: 'ENG-201',
    teacher: 'Ms. Emily Parker',
    grade: 'Grade 9',
    schedule: 'Mon, Wed, Fri • 11:00 AM',
    description: 'Analysis of classic and contemporary literature with focus on critical thinking and creative writing.',
    students: [
      { id: '1', name: 'John Smith', status: 'Active', progress: '95%' },
      { id: '3', name: 'Michael Brown', status: 'Active', progress: '87%' }
    ],
    assignments: [
      { id: '3', title: 'Shakespeare Essay', dueDate: 'Mar 12, 2024', submissions: '30/30', status: 'Completed' }
    ],
    exams: [
      { id: '3', title: 'Literature Analysis Exam', date: 'Mar 10, 2024', duration: '2 hours', totalMarks: 100, status: 'Completed' }
    ],
    resources: [
      { id: 'r4', label: 'Reading List', type: 'Document' },
      { id: 'r5', label: 'Essay Rubric', type: 'Document' }
    ]
  }
]

export function CourseDetail() {
  const { id } = useParams()
  const course = useMemo(() => courseProfiles.find((item) => item.id === id) ?? courseProfiles[0], [id])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{course.name}</h1>
        <p className="text-gray-600">Course ID: {course.code}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Instructor</CardTitle>
            <CardDescription>Course lead</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-lg font-semibold text-gray-900">{course.teacher}</p>
            <p className="text-sm text-gray-600">{course.grade}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>Weekly sessions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center space-x-2 text-gray-900">
              <Calendar className="w-4 h-4" />
              <span>{course.schedule}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Duration varies per session</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enrollment</CardTitle>
            <CardDescription>Current roster</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center space-x-2 text-gray-900">
              <Users className="w-4 h-4" />
              <span>{course.students.length} students</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <BookOpen className="w-4 h-4" />
              <span>Assignments {course.assignments.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Course Overview</CardTitle>
          <CardDescription>Objectives and scope</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed">{course.description}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="students" className="space-y-6">
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="exams">Exams</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Student Roster</CardTitle>
              <CardDescription>Enrolled learners</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {course.students.map((student) => (
                <div key={student.id} className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{student.name}</p>
                    <p className="text-sm text-gray-600">Progress {student.progress}</p>
                  </div>
                  <Badge variant={student.status === 'Active' ? 'secondary' : 'outline'} className="mt-3 md:mt-0">{student.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assignments</CardTitle>
              <CardDescription>Assessment tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {course.assignments.map((assignment) => (
                <div key={assignment.id} className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{assignment.title}</p>
                    <p className="text-sm text-gray-600">Due {assignment.dueDate}</p>
                  </div>
                  <div className="flex items-center gap-8 mt-3 md:mt-0">
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Submissions</p>
                      <p className="text-lg font-semibold text-gray-900">{assignment.submissions}</p>
                    </div>
                    <Badge variant={assignment.status === 'Completed' ? 'secondary' : 'outline'}>{assignment.status}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exams" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Examinations</CardTitle>
              <CardDescription>Upcoming and completed exams</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {course.exams.map((exam) => (
                <div key={exam.id} className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{exam.title}</p>
                    <p className="text-sm text-gray-600">{exam.date}</p>
                  </div>
                  <div className="flex items-center gap-8 mt-3 md:mt-0">
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Duration</p>
                      <p className="text-lg font-semibold text-gray-900">{exam.duration}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Total Marks</p>
                      <p className="text-lg font-semibold text-gray-900">{exam.totalMarks}</p>
                    </div>
                    <Badge variant={exam.status === 'Completed' ? 'secondary' : 'outline'}>{exam.status}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Resources</CardTitle>
              <CardDescription>Supporting materials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {course.resources.map((resource) => (
                <div key={resource.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3 text-gray-900">
                    <FileText className="w-4 h-4" />
                    <span>{resource.label}</span>
                  </div>
                  <Badge variant="outline">{resource.type}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
