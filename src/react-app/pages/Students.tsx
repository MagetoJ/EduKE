import { useEffect, useState } from 'react'
import { useAuth, useApi } from '../contexts/AuthContext'
import { Link } from 'react-router'
import { Plus, Search, Filter, Pencil, User } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'



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

export default function Students() {
  const { user } = useAuth()
  const api = useApi()
  const [gradeLevels, setGradeLevels] = useState<string[]>(CURRICULUM_LEVELS.cbc)
  const [students, setStudents] = useState([])
  const [isLoading, setIsLoading] = useState(true)

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
    parent_name: '',
    parent_email: '',
    parent_phone: '',
    parent_password: ''
  })
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    grade: '',
    class: '',
    status: '',
    parentGuardian: '',
    fees: ''
  })
  const [academicYear, setAcademicYear] = useState({
    id: null as number | null,
    start_date: null as string | null,
    end_date: null as string | null,
    status: null as 'active' | 'completed' | null
  })
  const [lastCompletedYear, setLastCompletedYear] = useState<{ start_date: string; end_date: string } | null>(null)
  const [startDate, setStartDate] = useState('')
  const [isYearLoading, setIsYearLoading] = useState(false)
  const [isStartingYear, setIsStartingYear] = useState(false)
  const [isEndingYear, setIsEndingYear] = useState(false)
  const [promotionSummary, setPromotionSummary] = useState<{ promoted: number; retained: number; graduated: number } | null>(null)

  useEffect(() => {
    if (user?.schoolCurriculum) {
      const levels = CURRICULUM_LEVELS[user.schoolCurriculum] ?? CURRICULUM_LEVELS.cbc
      setGradeLevels(levels)
    } else {
      setGradeLevels(CURRICULUM_LEVELS.cbc)
    }
  }, [user?.schoolCurriculum])

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setIsLoading(true)
        const response = await api('/api/students')
        const data = await response.json()
        
        if (response.ok && data.success) {
          const mappedStudents = data.data.map((student: any) => ({
            id: student.id.toString(),
            name: `${student.first_name} ${student.last_name}`.trim(),
            email: student.email || '',
            grade: student.grade || '',
            class: student.class_section || '',
            status: student.status ? student.status.charAt(0).toUpperCase() + student.status.slice(1) : 'Active',
            phone: student.phone || '',
            parentGuardian: student.parent_name || '',
            fees: '0'
          }))
          setStudents(mappedStudents)
        }
      } catch (err) {
        console.error('Error fetching students:', err)
      } finally {
        setIsLoading(false)
      }
    }
    
    if (user) {
      fetchStudents()
    }
  }, [api, user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setEditFormData(prev => ({ ...prev, [id]: value }))
  }

  const handleSelectChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleEditSelectChange = (field: string, value: string) => {
    setEditFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      let parentId = null

      // Create caregiver user account first if details provided
      if (formData.parent_email && formData.parent_password) {
        const parentResponse = await api('/api/users', {
          method: 'POST',
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

      const studentResponse = await api('/api/students', {
        method: 'POST',
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

        if (formData.password) {
          await api('/api/users', {
            method: 'POST',
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

        const newStudent = {
          id: studentId.toString(),
          name: `${formData.first_name} ${formData.last_name}`,
          email: formData.email,
          grade: formData.grade,
          class: 'A',
          status: 'Active',
          phone: formData.phone,
          parentGuardian: formData.parent_name || 'Parent/Guardian Name',
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
          parent_password: ''
        })
        setIsEnrollmentDialogOpen(false)
      }
    } catch (error) {
      console.error('Error enrolling student:', error)
    }
  }

  const openEditDialog = (student: any) => {
    setEditFormData({
      id: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone,
      grade: student.grade,
      class: student.class,
      status: student.status,
      parentGuardian: student.parentGuardian,
      fees: student.fees
    })
    setEditingStudentId(student.id)
    setIsEditDialogOpen(true)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingStudentId) {
      return
    }

    setStudents(prev => prev.map(student => (
      student.id === editingStudentId
        ? { ...student, ...editFormData }
        : student
    )))
    setIsEditDialogOpen(false)
    setEditingStudentId(null)
  }

  const loadAcademicYear = async () => {
    setIsYearLoading(true)
    try {
      const response = await fetch('/api/academic-year')
      if (response.ok) {
        const data = await response.json()
        if (data.activeYear) {
          setAcademicYear({
            id: data.activeYear.id,
            start_date: data.activeYear.start_date,
            end_date: data.activeYear.end_date,
            status: 'active'
          })
        } else {
          setAcademicYear({ id: null, start_date: null, end_date: null, status: null })
        }

        if (data.latestYear) {
          setLastCompletedYear({
            start_date: data.latestYear.start_date,
            end_date: data.latestYear.end_date
          })
        } else {
          setLastCompletedYear(null)
        }
      }
    } catch (error) {
      console.error('Failed to load academic year', error)
    } finally {
      setIsYearLoading(false)
    }
  }

  const handleStartYear = async () => {
    if (!startDate) {
      return
    }
    setIsStartingYear(true)
    setPromotionSummary(null)
    try {
      const response = await fetch('/api/academic-year/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_date: startDate, school_id: 1 })
      })

      if (response.ok) {
        setStartDate('')
        await loadAcademicYear()
      }
    } catch (error) {
      console.error('Failed to start academic year', error)
    } finally {
      setIsStartingYear(false)
    }
  }

  const handleEndYear = async () => {
    if (!academicYear.id || academicYear.status !== 'active') {
      return
    }
    setIsEndingYear(true)
    try {
      const response = await fetch('/api/academic-year/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year_id: academicYear.id, school_id: 1 })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.promotionSummary) {
          setPromotionSummary(result.promotionSummary)
        }
        if (Array.isArray(result.updatedStudents) && result.updatedStudents.length > 0) {
          setStudents(prev => prev.map(student => {
            const updated = result.updatedStudents.find((item: { id: number }) => item.id.toString() === student.id)
            if (!updated) {
              return student
            }
            return {
              ...student,
              grade: updated.grade ?? student.grade,
              status: updated.status ?? student.status
            }
          }))
        }
        await loadAcademicYear()
      }
    } catch (error) {
      console.error('Failed to end academic year', error)
    } finally {
      setIsEndingYear(false)
    }
  }

  useEffect(() => {
    loadAcademicYear()
  }, [])

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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
                <TabsTrigger value="academic">Academic Info</TabsTrigger>
                <TabsTrigger value="guardian">Parent/Guardian Account</TabsTrigger>
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
                        {gradeLevels.map(grade => (
                          <SelectItem key={grade} value={grade}>
                            {grade}
                          </SelectItem>
                        ))}
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
                  <h4 className="font-medium">Link Existing Parent/Guardian Account</h4>
                  <div className="space-y-2">
                    <Label htmlFor="parentSearch">Search Parent/Guardian by Email</Label>
                    <Input id="parentSearch" placeholder="Enter parent/guardian's email" />
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
                    <Label htmlFor="parent_name">Parent/Guardian Name</Label>
                    <Input id="parent_name" placeholder="Enter parent/guardian name" value={formData.parent_name} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parent_phone">Parent/Guardian Phone</Label>
                    <Input id="parent_phone" placeholder="+1-555-0000" value={formData.parent_phone} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="parent_email">Parent/Guardian Email</Label>
                    <Input id="parent_email" type="email" placeholder="parent@email.com" value={formData.parent_email} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parent_password">Parent/Guardian Password</Label>
                    <Input id="parent_password" type="password" placeholder="Enter password" value={formData.parent_password} onChange={handleInputChange} />
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

        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open)
            if (!open) {
              setEditingStudentId(null)
            }
          }}
        >
          <DialogContent className="max-w-xl">
            <form onSubmit={handleEditSubmit} className="space-y-6">
              <DialogHeader>
                <DialogTitle>Edit Student</DialogTitle>
                <DialogDescription>
                  Update student details
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={editFormData.name} onChange={handleEditInputChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={editFormData.email} onChange={handleEditInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={editFormData.phone} onChange={handleEditInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade</Label>
                  <Input id="grade" value={editFormData.grade} onChange={handleEditInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class">Class</Label>
                  <Input id="class" value={editFormData.class} onChange={handleEditInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={editFormData.status} onValueChange={(value) => handleEditSelectChange('status', value)}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="Transferred">Transferred</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parentGuardian">Parent/Guardian</Label>
                  <Input id="parentGuardian" value={editFormData.parentGuardian} onChange={handleEditInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fees">Fees</Label>
                  <Input id="fees" value={editFormData.fees} onChange={handleEditInputChange} />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Academic Year</CardTitle>
          <CardDescription>Administer annual cycle and student promotions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isYearLoading ? (
            <p className="text-sm text-gray-500">Loading academic year...</p>
          ) : academicYear.status === 'active' ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Academic year started on {academicYear.start_date ? new Date(academicYear.start_date).toLocaleDateString() : 'N/A'}
                </p>
                {lastCompletedYear && (
                  <p className="text-xs text-gray-500">
                    Previous year ended on {new Date(lastCompletedYear.end_date).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Button onClick={handleEndYear} disabled={isEndingYear}>
                {isEndingYear ? 'Ending...' : 'End Academic Year'}
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="academic_year_start">Academic Year Start Date</Label>
                <Input
                  id="academic_year_start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <Button onClick={handleStartYear} disabled={!startDate || isStartingYear}>
                {isStartingYear ? 'Starting...' : 'Start Academic Year'}
              </Button>
            </div>
          )}

          {promotionSummary && (
            <div className="grid grid-cols-3 gap-4 border-t pt-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">{promotionSummary.promoted}</p>
                <p className="text-xs text-gray-500">Promoted</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{promotionSummary.retained}</p>
                <p className="text-xs text-gray-500">Retained</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{promotionSummary.graduated}</p>
                <p className="text-xs text-gray-500">Graduated</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                    <h3 className="font-semibold text-gray-900">
                      <Link to={`/dashboard/students/${student.id}`} className="hover:text-blue-600 transition-colors">
                        {student.name}
                      </Link>
                    </h3>
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
                    <p className="text-sm font-medium text-gray-900">{student.parentGuardian}</p>
                    <p className="text-xs text-gray-500">Parent/Guardian</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">{student.fees}</p>
                    <p className="text-xs text-gray-500">Fees</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      {student.status}
                    </span>
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(student)}>
                      <Pencil className="w-4 h-4" />
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
