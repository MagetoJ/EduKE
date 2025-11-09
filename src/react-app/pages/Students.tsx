import { useState } from 'react'
import { Plus, Search, Filter, MoreVertical, User } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent } from '../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'

// Mock student data
const mockStudents = [
  { id: '1', name: 'John Smith', email: 'john.smith@email.com', grade: 'Grade 10', class: '10A', status: 'Active', phone: '+1-555-0101', parent: 'Robert Smith', fees: '$1,200' },
  { id: '2', name: 'Sarah Johnson', email: 'sarah.j@email.com', grade: 'Grade 11', class: '11B', status: 'Active', phone: '+1-555-0102', parent: 'Linda Johnson', fees: '$1,350' },
  { id: '3', name: 'Michael Brown', email: 'michael.b@email.com', grade: 'Grade 9', class: '9A', status: 'Active', phone: '+1-555-0103', parent: 'David Brown', fees: '$1,100' },
  { id: '4', name: 'Emma Davis', email: 'emma.d@email.com', grade: 'Grade 12', class: '12A', status: 'Active', phone: '+1-555-0104', parent: 'Jennifer Davis', fees: '$1,500' },
]

export default function Students() {
  const [students, setStudents] = useState(mockStudents)

  const [isEnrollmentDialogOpen, setIsEnrollmentDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    address: '',
    grade: '',
    enrollment_date: '',
    password: '',
    school_id: 1, // Default to first school
    // Parent account
    parent_name: '',
    parent_email: '',
    parent_phone: '',
    parent_password: '',
    // Teacher account
    teacher_name: '',
    teacher_email: '',
    teacher_phone: '',
    teacher_password: '',
    teacher_class: '',
    teacher_subject: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      let parentId = null

      // Create parent user account first if parent details provided
      if (formData.parent_email && formData.parent_password) {
        const parentResponse = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.parent_name,
            email: formData.parent_email,
            password: formData.parent_password,
            role: 'parent',
            phone: formData.parent_phone,
            school_id: formData.school_id
          })
        })

        if (parentResponse.ok) {
          const parentResult = await parentResponse.json()
          parentId = parentResult.id
        }
      }

      // Create the student record with parent_id
      const studentResponse = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone,
          date_of_birth: formData.date_of_birth,
          address: formData.address,
          grade: formData.grade,
          enrollment_date: formData.enrollment_date,
          school_id: formData.school_id,
          parent_id: parentId
        })
      })

      if (studentResponse.ok) {
        const studentResult = await studentResponse.json()
        const studentId = studentResult.id

        // Create student user account
        if (formData.password) {
          await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `${formData.first_name} ${formData.last_name}`,
              email: formData.email,
              password: formData.password,
              role: 'student',
              phone: formData.phone,
              school_id: formData.school_id
            })
          })
        }

        // Create teacher user account
        if (formData.teacher_email && formData.teacher_password) {
          await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: formData.teacher_name,
              email: formData.teacher_email,
              password: formData.teacher_password,
              role: 'teacher',
              phone: formData.teacher_phone,
              school_id: formData.school_id,
              class_assigned: formData.teacher_class,
              subject: formData.teacher_subject
            })
          })
        }

        // Add to local state
        const newStudent = {
          id: studentId.toString(),
          name: `${formData.first_name} ${formData.last_name}`,
          email: formData.email,
          grade: formData.grade,
          class: 'A', // Default
          status: 'Active',
          phone: formData.phone,
          parent: formData.parent_name || 'Guardian Name',
          fees: '$0'
        }
        setStudents(prev => [...prev, newStudent])
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          date_of_birth: '',
          address: '',
          grade: '',
          enrollment_date: '',
          password: '',
          school_id: 1,
          parent_name: '',
          parent_email: '',
          parent_phone: '',
          parent_password: '',
          teacher_name: '',
          teacher_email: '',
          teacher_phone: '',
          teacher_password: '',
          teacher_class: '',
          teacher_subject: ''
        })
        setIsEnrollmentDialogOpen(false)
      }
    } catch (error) {
      console.error('Error enrolling student:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-600">Manage student enrollment and information</p>
        </div>
        
        <Dialog open={isEnrollmentDialogOpen} onOpenChange={setIsEnrollmentDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Enroll Student
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Student Enrollment</DialogTitle>
                <DialogDescription>
                  Add a new student to the school system
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
                <TabsTrigger value="academic">Academic Info</TabsTrigger>
                <TabsTrigger value="guardian">Parent Account</TabsTrigger>
                <TabsTrigger value="teacher">Teacher Account</TabsTrigger>
              </TabsList>
              
              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input id="first_name" placeholder="Enter first name" value={formData.first_name} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input id="last_name" placeholder="Enter last name" value={formData.last_name} onChange={handleInputChange} required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" placeholder="student@email.com" value={formData.email} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" placeholder="+1-555-0000" value={formData.phone} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input id="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select onValueChange={(value) => handleSelectChange('gender', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" placeholder="Enter full address" value={formData.address} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Student Password</Label>
                    <Input id="password" type="password" placeholder="Enter password" value={formData.password} onChange={handleInputChange} required />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="academic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="grade">Grade Level</Label>
                    <Select onValueChange={(value) => handleSelectChange('grade', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Grade 9">Grade 9</SelectItem>
                        <SelectItem value="Grade 10">Grade 10</SelectItem>
                        <SelectItem value="Grade 11">Grade 11</SelectItem>
                        <SelectItem value="Grade 12">Grade 12</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="class">Class Section</Label>
                    <Select onValueChange={(value) => handleSelectChange('class', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Section A</SelectItem>
                        <SelectItem value="B">Section B</SelectItem>
                        <SelectItem value="C">Section C</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="studentId">Student ID</Label>
                  <Input id="studentId" placeholder="Auto-generated" disabled />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="enrollment_date">Admission Date</Label>
                  <Input id="enrollment_date" type="date" value={formData.enrollment_date} onChange={handleInputChange} />
                </div>
              </TabsContent>

              <TabsContent value="guardian" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="relation">Relation</Label>
                  <Select onValueChange={(value) => handleSelectChange('relation', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select relation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="guardian">Guardian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 border rounded-lg space-y-4">
                  <h4 className="font-medium">Link Existing Parent Account</h4>
                  <div className="space-y-2">
                    <Label htmlFor="parentSearch">Search Parent by Email</Label>
                    <Input id="parentSearch" placeholder="Enter parent's email" />
                  </div>
                  <Button variant="outline" size="sm">Search & Link</Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or create new account</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="parent_name">Parent Name</Label>
                    <Input id="parent_name" placeholder="Enter parent name" value={formData.parent_name} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parent_phone">Parent Phone</Label>
                    <Input id="parent_phone" placeholder="+1-555-0000" value={formData.parent_phone} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="parent_email">Parent Email</Label>
                    <Input id="parent_email" type="email" placeholder="parent@email.com" value={formData.parent_email} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parent_password">Parent Password</Label>
                    <Input id="parent_password" type="password" placeholder="Enter password" value={formData.parent_password} onChange={handleInputChange} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="teacher" className="space-y-4">
                <div className="p-4 border rounded-lg space-y-4">
                  <h4 className="font-medium">Assign Teacher Account</h4>
                  <div className="space-y-2">
                    <Label htmlFor="teacherSearch">Search Teacher by Email</Label>
                    <Input id="teacherSearch" placeholder="Enter teacher's email" />
                  </div>
                  <Button variant="outline" size="sm">Search & Assign</Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or create new account</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="teacher_name">Teacher Name</Label>
                    <Input id="teacher_name" placeholder="Enter teacher name" value={formData.teacher_name} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teacher_phone">Teacher Phone</Label>
                    <Input id="teacher_phone" placeholder="+1-555-0000" value={formData.teacher_phone} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="teacher_email">Teacher Email</Label>
                    <Input id="teacher_email" type="email" placeholder="teacher@email.com" value={formData.teacher_email} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teacher_password">Teacher Password</Label>
                    <Input id="teacher_password" type="password" placeholder="Enter password" value={formData.teacher_password} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="teacher_class">Assigned Class</Label>
                    <Select onValueChange={(value) => handleSelectChange('teacher_class', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10A">Grade 10 - Section A</SelectItem>
                        <SelectItem value="10B">Grade 10 - Section B</SelectItem>
                        <SelectItem value="11A">Grade 11 - Section A</SelectItem>
                        <SelectItem value="11B">Grade 11 - Section B</SelectItem>
                        <SelectItem value="12A">Grade 12 - Section A</SelectItem>
                        <SelectItem value="12B">Grade 12 - Section B</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teacher_subject">Subject</Label>
                    <Select onValueChange={(value) => handleSelectChange('teacher_subject', value)}>
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
                        <SelectItem value="Physical Education">Physical Education</SelectItem>
                        <SelectItem value="Class Teacher">Class Teacher</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEnrollmentDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Enroll Student
              </Button>
            </DialogFooter>
          </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search students..."
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
      </div>

      <div className="grid gap-4">
        {students.map((student) => (
          <Card key={student.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900">{student.name}</h3>
                    <p className="text-sm text-gray-600">{student.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-8">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">{student.grade}</p>
                    <p className="text-xs text-gray-500">Grade</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">{student.class}</p>
                    <p className="text-xs text-gray-500">Class</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">{student.parent}</p>
                    <p className="text-xs text-gray-500">Parent</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">{student.fees}</p>
                    <p className="text-xs text-gray-500">Fees</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      {student.status}
                    </span>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
