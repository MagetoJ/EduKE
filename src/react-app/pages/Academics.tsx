import { useEffect, useState } from 'react'
import { BookOpen, FileText, Award, Download } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { useAuth } from '../contexts/AuthContext'

// Mock courses data
const mockCourses = [
  {
    id: '1',
    name: 'Advanced Mathematics',
    code: 'MATH-401',
    teacher: 'Dr. Sarah Wilson',
    grade: 'Grade 10',
    students: 28,
    schedule: 'Mon, Wed, Fri - 9:00 AM'
  },
  {
    id: '2',
    name: 'Biology',
    code: 'BIO-301',
    teacher: 'Mr. James Anderson',
    grade: 'Grade 10',
    students: 25,
    schedule: 'Tue, Thu - 10:30 AM'
  },
  {
    id: '3',
    name: 'English Literature',
    code: 'ENG-201',
    teacher: 'Ms. Emily Parker',
    grade: 'Grade 9',
    students: 30,
    schedule: 'Mon, Wed, Fri - 11:00 AM'
  }
]

// Mock assignments data
const mockAssignments = [
  {
    id: '1',
    title: 'Algebraic Equations Quiz',
    course: 'Advanced Mathematics',
    dueDate: '2024-03-15',
    submissions: 18,
    totalStudents: 28,
    status: 'Active'
  },
  {
    id: '2',
    title: 'Cell Division Lab Report',
    course: 'Biology',
    dueDate: '2024-03-18',
    submissions: 12,
    totalStudents: 25,
    status: 'Active'
  },
  {
    id: '3',
    title: 'Shakespeare Essay',
    course: 'English Literature',
    dueDate: '2024-03-12',
    submissions: 30,
    totalStudents: 30,
    status: 'Completed'
  }
]

// Mock exams data
const mockExams = [
  {
    id: '1',
    title: 'Mid-term Mathematics Exam',
    course: 'Advanced Mathematics',
    date: '2024-03-20',
    duration: '2 hours',
    totalMarks: 100,
    status: 'Scheduled'
  },
  {
    id: '2',
    title: 'Biology Chapter Test',
    course: 'Biology',
    date: '2024-03-22',
    duration: '1.5 hours',
    totalMarks: 75,
    status: 'Scheduled'
  },
  {
    id: '3',
    title: 'Literature Analysis Exam',
    course: 'English Literature',
    date: '2024-03-10',
    duration: '2 hours',
    totalMarks: 100,
    status: 'Completed'
  }
]

const CURRICULUM_LEVELS: Record<string, string[]> = {
  cbc: [
    'PP1',
    'PP2',
    'Grade 1',
    'Grade 2',
    'Grade 3',
    'Grade 4',
    'Grade 5',
    'Grade 6',
    'Grade 7',
    'Grade 8',
    'Grade 9',
    'Grade 10',
    'Grade 11',
    'Grade 12'
  ],
  '844': [
    'Grade 1',
    'Grade 2',
    'Grade 3',
    'Grade 4',
    'Grade 5',
    'Grade 6',
    'Grade 7',
    'Grade 8',
    'Form 1',
    'Form 2',
    'Form 3',
    'Form 4'
  ],
  british: [
    'Year 1',
    'Year 2',
    'Year 3',
    'Year 4',
    'Year 5',
    'Year 6',
    'Year 7',
    'Year 8',
    'Year 9',
    'Year 10',
    'Year 11',
    'Year 12',
    'Year 13'
  ],
  american: [
    'Kindergarten',
    'Grade 1',
    'Grade 2',
    'Grade 3',
    'Grade 4',
    'Grade 5',
    'Grade 6',
    'Grade 7',
    'Grade 8',
    'Grade 9',
    'Grade 10',
    'Grade 11',
    'Grade 12'
  ],
  ib: [
    'PYP 1',
    'PYP 2',
    'PYP 3',
    'PYP 4',
    'PYP 5',
    'MYP 1',
    'MYP 2',
    'MYP 3',
    'MYP 4',
    'MYP 5',
    'DP 1',
    'DP 2'
  ]
}

export default function Academics() {
  const { user } = useAuth()
  const [gradeLevels, setGradeLevels] = useState<string[]>(CURRICULUM_LEVELS.cbc)
  const [activeTab, setActiveTab] = useState('courses')
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false)
  const [isExamDialogOpen, setIsExamDialogOpen] = useState(false)
  const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false)

  useEffect(() => {
    if (user?.schoolCurriculum) {
      const levels = CURRICULUM_LEVELS[user.schoolCurriculum] ?? CURRICULUM_LEVELS.cbc
      setGradeLevels(levels)
    } else {
      setGradeLevels(CURRICULUM_LEVELS.cbc)
    }
  }, [user?.schoolCurriculum])

  const canManage = user?.role === 'admin' || user?.role === 'teacher'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Academics</h1>
          <p className="text-gray-600">Manage courses, assignments, and examinations</p>
        </div>
        
        <div className="flex space-x-2">
          {canManage && (
            <>
              {user.role === 'admin' && (
                <Dialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <BookOpen className="w-4 h-4 mr-2" />
                      Add Course
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Course</DialogTitle>
                      <DialogDescription>
                        Create a new course for the academic year
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="courseName">Course Name</Label>
                          <Input id="courseName" placeholder="Enter course name" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="courseCode">Course Code</Label>
                          <Input id="courseCode" placeholder="e.g., MATH-401" />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="teacher">Assigned Teacher</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select teacher" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sarah">Dr. Sarah Wilson</SelectItem>
                              <SelectItem value="james">Mr. James Anderson</SelectItem>
                              <SelectItem value="emily">Ms. Emily Parker</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="grade">Grade Level</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select grade" />
                            </SelectTrigger>
                            <SelectContent>
                              {gradeLevels.map(grade => (
                                <SelectItem key={grade} value={grade}>
                                  {grade}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="schedule">Schedule</Label>
                        <Input id="schedule" placeholder="e.g., Mon, Wed, Fri - 9:00 AM" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <textarea 
                          id="description" 
                          className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          placeholder="Course description..."
                        />
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsCourseDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={() => setIsCourseDialogOpen(false)}>
                        Create Course
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    New Assignment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Assignment</DialogTitle>
                    <DialogDescription>
                      Create a new assignment for your students
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="assignmentTitle">Assignment Title</Label>
                      <Input id="assignmentTitle" placeholder="Enter assignment title" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="course">Course</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select course" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="math">Advanced Mathematics</SelectItem>
                            <SelectItem value="bio">Biology</SelectItem>
                            <SelectItem value="eng">English Literature</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dueDate">Due Date</Label>
                        <Input id="dueDate" type="datetime-local" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="totalMarks">Total Marks</Label>
                        <Input id="totalMarks" type="number" placeholder="100" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="assignmentType">Type</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="homework">Homework</SelectItem>
                            <SelectItem value="project">Project</SelectItem>
                            <SelectItem value="quiz">Quiz</SelectItem>
                            <SelectItem value="lab">Lab Report</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="instructions">Instructions</Label>
                      <textarea 
                        id="instructions" 
                        className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Assignment instructions and requirements..."
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAssignmentDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setIsAssignmentDialogOpen(false)}>
                      Create Assignment
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isExamDialogOpen} onOpenChange={setIsExamDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Award className="w-4 h-4 mr-2" />
                    Schedule Exam
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Schedule Examination</DialogTitle>
                    <DialogDescription>
                      Schedule a new examination for students
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="examTitle">Exam Title</Label>
                      <Input id="examTitle" placeholder="Enter exam title" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="examCourse">Course</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select course" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="math">Advanced Mathematics</SelectItem>
                            <SelectItem value="bio">Biology</SelectItem>
                            <SelectItem value="eng">English Literature</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="examDate">Exam Date & Time</Label>
                        <Input id="examDate" type="datetime-local" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="duration">Duration (minutes)</Label>
                        <Input id="duration" type="number" placeholder="120" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="examMarks">Total Marks</Label>
                        <Input id="examMarks" type="number" placeholder="100" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="questionPaper">Question Paper</Label>
                        <Input id="questionPaper" type="file" accept=".pdf,.doc,.docx" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="answerKey">Answer Key</Label>
                        <Input id="answerKey" type="file" accept=".pdf,.doc,.docx" />
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsExamDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setIsExamDialogOpen(false)}>
                      Schedule Exam
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="exams">Examinations</TabsTrigger>
          <TabsTrigger value="grading">Grading</TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="space-y-6">
          <div className="grid gap-4">
            {mockCourses.map((course) => (
              <Card key={course.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-white" />
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-gray-900">{course.name}</h3>
                        <p className="text-sm text-gray-600">{course.code} • {course.grade}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-8">
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-900">{course.teacher}</p>
                        <p className="text-xs text-gray-500">Instructor</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-900">{course.students}</p>
                        <p className="text-xs text-gray-500">Students</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-900">{course.schedule}</p>
                        <p className="text-xs text-gray-500">Schedule</p>
                      </div>

                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <div className="grid gap-4">
            {mockAssignments.map((assignment) => (
              <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-gray-900">{assignment.title}</h3>
                        <p className="text-sm text-gray-600">{assignment.course}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-8">
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-900">{assignment.dueDate}</p>
                        <p className="text-xs text-gray-500">Due Date</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-900">{assignment.submissions}/{assignment.totalStudents}</p>
                        <p className="text-xs text-gray-500">Submissions</p>
                      </div>

                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        assignment.status === 'Active' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {assignment.status}
                      </span>

                      <Button variant="outline" size="sm">
                        View Submissions
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="exams" className="space-y-6">
          <div className="grid gap-4">
            {mockExams.map((exam) => (
              <Card key={exam.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                        <Award className="w-6 h-6 text-white" />
                      </div>
                      
                      <div>
                        <h3 className="font-semibold text-gray-900">{exam.title}</h3>
                        <p className="text-sm text-gray-600">{exam.course}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-8">
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-900">{exam.date}</p>
                        <p className="text-xs text-gray-500">Exam Date</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-900">{exam.duration}</p>
                        <p className="text-xs text-gray-500">Duration</p>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-900">{exam.totalMarks}</p>
                        <p className="text-xs text-gray-500">Total Marks</p>
                      </div>

                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        exam.status === 'Scheduled' 
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {exam.status}
                      </span>

                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-1" />
                          Papers
                        </Button>
                        <Button variant="outline" size="sm">
                          View Results
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="grading" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gradebook</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Award className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Grading System</h3>
                <p>Manage student grades, rubrics, and assessment criteria</p>
                <Button className="mt-4">Set Up Gradebook</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
