import { useState } from 'react'
import { Plus, Search, Edit, AlertTriangle, BookOpen, Users } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Textarea } from '../components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Badge } from '../components/ui/badge'

type TeacherStudent = {
  id: string
  name: string
  grade: string
  class: string
}

export default function TeacherDashboard() {
  const [isDisciplineDialogOpen, setIsDisciplineDialogOpen] = useState(false)
  const [isPerformanceDialogOpen, setIsPerformanceDialogOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<TeacherStudent | null>(null)

  // Mock data
  const mockStudents: TeacherStudent[] = [
    { id: '1', name: 'John Smith', grade: 'Grade 10', class: '10A' },
    { id: '2', name: 'Sarah Johnson', grade: 'Grade 10', class: '10A' },
    { id: '3', name: 'Michael Brown', grade: 'Grade 10', class: '10A' },
    { id: '4', name: 'Emma Davis', grade: 'Grade 11', class: '11B' },
  ]

  const mockDisciplineRecords = [
    {
      id: 1,
      studentId: '1',
      studentName: 'John Smith',
      date: '2024-01-15',
      type: 'Late to class',
      severity: 'Minor',
      description: 'Arrived 10 minutes late to Mathematics class',
      status: 'Resolved'
    },
    {
      id: 2,
      studentId: '2',
      studentName: 'Sarah Johnson',
      date: '2024-01-20',
      type: 'Incomplete homework',
      severity: 'Minor',
      description: 'Failed to submit Science homework assignment',
      status: 'Warning issued'
    }
  ]

  const [disciplineForm, setDisciplineForm] = useState({
    studentId: '',
    type: '',
    severity: 'Minor',
    description: '',
    date: new Date().toISOString().split('T')[0]
  })

  const [performanceForm, setPerformanceForm] = useState({
    studentId: '',
    subject: '',
    grade: '',
    term: 'Term 1',
    comments: ''
  })

  const handleDisciplineSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/discipline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: parseInt(disciplineForm.studentId),
          teacher_id: 1, // Would come from logged-in user
          type: disciplineForm.type,
          severity: disciplineForm.severity,
          description: disciplineForm.description,
          date: disciplineForm.date
        })
      })

      if (response.ok) {
        alert('Discipline record added successfully')
        setDisciplineForm({
          studentId: '',
          type: '',
          severity: 'Minor',
          description: '',
          date: new Date().toISOString().split('T')[0]
        })
        setIsDisciplineDialogOpen(false)
      } else {
        alert('Error adding discipline record')
      }
    } catch (error) {
      console.error('Error submitting discipline:', error)
      alert('Error connecting to server')
    }
  }

  const handlePerformanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: parseInt(performanceForm.studentId),
          teacher_id: 1, // Would come from logged-in user
          subject: performanceForm.subject,
          grade: parseInt(performanceForm.grade),
          term: performanceForm.term,
          comments: performanceForm.comments
        })
      })

      if (response.ok) {
        alert('Performance record added successfully')
        setPerformanceForm({
          studentId: '',
          subject: '',
          grade: '',
          term: 'Term 1',
          comments: ''
        })
        setIsPerformanceDialogOpen(false)
      } else {
        alert('Error adding performance record')
      }
    } catch (error) {
      console.error('Error submitting performance:', error)
      alert('Error connecting to server')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
          <p className="text-gray-600">Manage student discipline and performance records</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStudents.length}</div>
            <p className="text-xs text-muted-foreground">Grade 10A class</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Discipline Cases</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockDisciplineRecords.length}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Updates</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="students" className="space-y-4">
        <TabsList>
          <TabsTrigger value="students">My Students</TabsTrigger>
          <TabsTrigger value="discipline">Discipline</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input placeholder="Search students..." className="pl-10" />
            </div>
          </div>

          <div className="grid gap-4">
            {mockStudents.map((student) => (
              <Card key={student.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{student.name}</h3>
                      <p className="text-sm text-gray-600">{student.grade} • Class {student.class}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedStudent(student)
                          setIsDisciplineDialogOpen(true)
                        }}
                      >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Add Discipline
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedStudent(student)
                          setIsPerformanceDialogOpen(true)
                        }}
                      >
                        <BookOpen className="w-4 h-4 mr-2" />
                        Update Performance
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="discipline" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Discipline Records</h2>
            <Dialog open={isDisciplineDialogOpen} onOpenChange={setIsDisciplineDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Discipline Record
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleDisciplineSubmit}>
                  <DialogHeader>
                    <DialogTitle>Add Discipline Record</DialogTitle>
                    <DialogDescription>
                      Record a disciplinary incident for {selectedStudent?.name}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="student">Student</Label>
                      <Select
                        value={disciplineForm.studentId}
                        onValueChange={(value) => setDisciplineForm(prev => ({ ...prev, studentId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select student" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockStudents.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.name} - {student.grade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="type">Incident Type</Label>
                        <Select
                          value={disciplineForm.type}
                          onValueChange={(value) => setDisciplineForm(prev => ({ ...prev, type: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Late to class">Late to class</SelectItem>
                            <SelectItem value="Incomplete homework">Incomplete homework</SelectItem>
                            <SelectItem value="Disruptive behavior">Disruptive behavior</SelectItem>
                            <SelectItem value="Fighting">Fighting</SelectItem>
                            <SelectItem value="Cheating">Cheating</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="severity">Severity</Label>
                        <Select
                          value={disciplineForm.severity}
                          onValueChange={(value) => setDisciplineForm(prev => ({ ...prev, severity: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Minor">Minor</SelectItem>
                            <SelectItem value="Moderate">Moderate</SelectItem>
                            <SelectItem value="Major">Major</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={disciplineForm.date}
                        onChange={(e) => setDisciplineForm(prev => ({ ...prev, date: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe the incident..."
                        value={disciplineForm.description}
                        onChange={(e) => setDisciplineForm(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsDisciplineDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Add Record</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {mockDisciplineRecords.map((record) => (
              <Card key={record.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      <div>
                        <h4 className="font-medium">{record.studentName}</h4>
                        <p className="text-sm text-gray-600">{record.type} • {record.date}</p>
                        <p className="text-sm text-gray-500">{record.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={record.severity === 'Minor' ? 'secondary' : 'destructive'}>
                        {record.severity}
                      </Badge>
                      <Badge variant="outline">{record.status}</Badge>
                      <Button variant="ghost" size="icon">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Performance Records</h2>
            <Dialog open={isPerformanceDialogOpen} onOpenChange={setIsPerformanceDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Performance Record
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handlePerformanceSubmit}>
                  <DialogHeader>
                    <DialogTitle>Update Student Performance</DialogTitle>
                    <DialogDescription>
                      Record performance for {selectedStudent?.name}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="student">Student</Label>
                      <Select
                        value={performanceForm.studentId}
                        onValueChange={(value) => setPerformanceForm(prev => ({ ...prev, studentId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select student" />
                        </SelectTrigger>
                        <SelectContent>
                          {mockStudents.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.name} - {student.grade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Select
                          value={performanceForm.subject}
                          onValueChange={(value) => setPerformanceForm(prev => ({ ...prev, subject: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select subject" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Mathematics">Mathematics</SelectItem>
                            <SelectItem value="English">English</SelectItem>
                            <SelectItem value="Science">Science</SelectItem>
                            <SelectItem value="History">History</SelectItem>
                            <SelectItem value="Geography">Geography</SelectItem>
                            <SelectItem value="Art">Art</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="grade">Grade (%)</Label>
                        <Input
                          id="grade"
                          type="number"
                          min="0"
                          max="100"
                          placeholder="85"
                          value={performanceForm.grade}
                          onChange={(e) => setPerformanceForm(prev => ({ ...prev, grade: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="term">Term</Label>
                      <Select
                        value={performanceForm.term}
                        onValueChange={(value) => setPerformanceForm(prev => ({ ...prev, term: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Term 1">Term 1</SelectItem>
                          <SelectItem value="Term 2">Term 2</SelectItem>
                          <SelectItem value="Term 3">Term 3</SelectItem>
                          <SelectItem value="Final">Final Exam</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="comments">Comments</Label>
                      <Textarea
                        id="comments"
                        placeholder="Additional comments about performance..."
                        value={performanceForm.comments}
                        onChange={(e) => setPerformanceForm(prev => ({ ...prev, comments: e.target.value }))}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsPerformanceDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Update Performance</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-6">
              <p className="text-center text-gray-500">Performance records will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}