import { useEffect, useState, FormEvent } from 'react' // Import useEffect
import { Plus, User, Edit, Trash2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent } from '../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { useApi } from '../contexts/AuthContext' // Import useApi
import { useNavigate } from 'react-router'
import { Badge } from '../components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../components/ui/alert-dialog"

// --- Type definition based on your API/schema ---
type Student = {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  grade: string;
  status: 'active' | 'inactive' | 'graduated';
  email: string;
  phone: string;
  address: string;
  date_of_birth: string;
  gender: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string;
}

// Type for the multi-step form
type StudentFormData = {
  // Step 1: Student Info
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  address: string;
  // Step 2: Academic Info
  admission_number: string;
  grade: string;
  enrollment_date: string;
  // Step 3: Parent Info
  parent_name: string;
  parent_phone: string;
  parent_email: string;
  relationship: string;
}

const EMPTY_FORM: StudentFormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  date_of_birth: '',
  gender: 'male',
  address: '',
  admission_number: '',
  grade: 'Grade 1',
  enrollment_date: '',
  parent_name: '',
  parent_phone: '',
  parent_email: '',
  relationship: 'parent'
}

// Mock data removed

export default function Students() {
  const api = useApi() // <-- 1. Get the api function
  const navigate = useNavigate()

  // --- State for data ---
  const [students, setStudents] = useState<Student[]>([]) // <-- 2. Use state for students
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // --- State for "Enroll" dialog ---
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false)
  const [enrollForm, setEnrollForm] = useState<StudentFormData>(EMPTY_FORM)
  const [step, setStep] = useState(1)

  // --- State for "Edit" dialog ---
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState<Student | null>(null)
  
  // --- State for forms ---
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // --- 3. Add useEffect to fetch students ---
  useEffect(() => {
    const fetchStudents = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await api('/api/students')
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to fetch students')
        }
        const data = await res.json()
        setStudents(data.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
      } finally {
        setIsLoading(false)
      }
    }
    fetchStudents()
  }, [api])

  const handleEnrollDialogChange = (open: boolean) => {
    if (!open) {
      setEnrollForm(EMPTY_FORM)
      setStep(1)
      setFormError(null)
    }
    setIsEnrollDialogOpen(open)
  }
  
  const handleEditDialogChange = (open: boolean) => {
    if (!open) {
      setFormError(null)
    }
    setIsEditDialogOpen(open)
  }

  const handleOpenEditDialog = (student: Student) => {
    setEditForm(student)
    setIsEditDialogOpen(true)
  }

  // --- 4. Update handleSubmit to call the API ---
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFormError(null)
    
    try {
      const response = await api('/api/students', {
        method: 'POST',
        body: JSON.stringify(enrollForm),
      })
      
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to enroll student')
      }
      
      // Add the new student to the top of the list
      setStudents(prev => [data.data, ...prev])
      handleEnrollDialogChange(false)
      
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // --- "Edit Student" Submit Handler (Not implemented yet) ---
  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!editForm) return;
    
    setIsSubmitting(true)
    setFormError(null)

    try {
      const response = await api(`/api/students/${editForm.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
      })
      
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update student')
      }
      
      setStudents(prev => prev.map(s => s.id === data.data.id ? data.data : s))
      handleEditDialogChange(false)
      
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- "Deactivate Student" Handler (Not implemented yet) ---
  const handleDeactivateStudent = async (studentId: string) => {
    try {
      const response = await api(`/api/students/${studentId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'inactive' }),
      })
      
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to deactivate student')
      }
      
      setStudents(prev => prev.map(s => s.id === data.data.id ? data.data : s))
      
    } catch (err) {
      // Show error in the main page error region
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    }
  }
  
  const renderLoading = () => (
    <div className="flex items-center justify-center p-8 text-gray-600">
      <Loader2 className="w-6 h-6 animate-spin mr-2" />
      Loading students...
    </div>
  )
  
  const renderError = (err: string | null) => err && (
    <div className="flex items-center gap-2 text-sm text-red-600 p-3 bg-red-50 rounded-md">
      <AlertCircle className="w-4 h-4" /> {err}
    </div>
  )
  
  const renderFormError = (err: string | null) => err && (
    <div className="flex items-center gap-2 text-sm text-red-600 mt-2">
      <AlertCircle className="w-4 h-4" /> {err}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-600">Manage student enrollment and records</p>
        </div>
        
        <Dialog open={isEnrollDialogOpen} onOpenChange={handleEnrollDialogChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Enroll Student
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleSubmit}> {/* Make sure onSubmit is set */}
              <DialogHeader>
                <DialogTitle>Enroll New Student</DialogTitle>
                <DialogDescription>
                  Complete the steps to add a new student to the school
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4 space-y-4">
                {/* Step 1: Student Information */}
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first_name">First Name</Label>
                        <Input id="first_name" value={enrollForm.first_name} onChange={(e) => setEnrollForm({...enrollForm, first_name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name">Last Name</Label>
                        <Input id="last_name" value={enrollForm.last_name} onChange={(e) => setEnrollForm({...enrollForm, last_name: e.target.value})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={enrollForm.email} onChange={(e) => setEnrollForm({...enrollForm, email: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" value={enrollForm.phone} onChange={(e) => setEnrollForm({...enrollForm, phone: e.target.value})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="date_of_birth">Date of Birth</Label>
                        <Input id="date_of_birth" type="date" value={enrollForm.date_of_birth} onChange={(e) => setEnrollForm({...enrollForm, date_of_birth: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gender">Gender</Label>
                        <Select value={enrollForm.gender} onValueChange={(value) => setEnrollForm({...enrollForm, gender: value})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input id="address" value={enrollForm.address} onChange={(e) => setEnrollForm({...enrollForm, address: e.target.value})} />
                    </div>
                  </div>
                )}
                
                {/* Step 2: Academic Information */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="admission_number">Admission Number</Label>
                        <Input id="admission_number" value={enrollForm.admission_number} onChange={(e) => setEnrollForm({...enrollForm, admission_number: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="enrollment_date">Enrollment Date</Label>
                        <Input id="enrollment_date" type="date" value={enrollForm.enrollment_date} onChange={(e) => setEnrollForm({...enrollForm, enrollment_date: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="grade">Grade</Label>
                      <Input id="grade" value={enrollForm.grade} onChange={(e) => setEnrollForm({...enrollForm, grade: e.target.value})} />
                    </div>
                  </div>
                )}
                
                {/* Step 3: Parent/Guardian Information */}
                {step === 3 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="parent_name">Parent/Guardian Name</Label>
                        <Input id="parent_name" value={enrollForm.parent_name} onChange={(e) => setEnrollForm({...enrollForm, parent_name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="relationship">Relationship</Label>
                        <Input id="relationship" value={enrollForm.relationship} onChange={(e) => setEnrollForm({...enrollForm, relationship: e.target.value})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="parent_phone">Parent Phone</Label>
                        <Input id="parent_phone" value={enrollForm.parent_phone} onChange={(e) => setEnrollForm({...enrollForm, parent_phone: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="parent_email">Parent Email</Label>
                        <Input id="parent_email" type="email" value={enrollForm.parent_email} onChange={(e) => setEnrollForm({...enrollForm, parent_email: e.target.value})} />
                      </div>
                    </div>
                    {renderFormError(formError)}
                  </div>
                )}
              </div>
              
              <DialogFooter className="flex justify-between">
                {step > 1 ? (
                  <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                ) : <div />}
                
                {step < 3 ? (
                  <Button type="button" onClick={() => setStep(step + 1)}>
                    Next
                  </Button>
                ) : (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enroll Student'}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* --- "Edit" Dialog --- */}
        <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogChange}>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleEditSubmit}>
              <DialogHeader>
                <DialogTitle>Edit Student</DialogTitle>
                <DialogDescription>Update student details</DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit_first_name">First Name</Label>
                      <Input id="edit_first_name" value={editForm?.first_name} onChange={(e) => setEditForm({...editForm, first_name: e.target.value} as Student)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_last_name">Last Name</Label>
                      <Input id="edit_last_name" value={editForm?.last_name} onChange={(e) => setEditForm({...editForm, last_name: e.target.value} as Student)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit_email">Email</Label>
                      <Input id="edit_email" type="email" value={editForm?.email} onChange={(e) => setEditForm({...editForm, email: e.target.value} as Student)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_phone">Phone</Label>
                      <Input id="edit_phone" value={editForm?.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value} as Student)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit_admission_number">Admission Number</Label>
                      <Input id="edit_admission_number" value={editForm?.admission_number} onChange={(e) => setEditForm({...editForm, admission_number: e.target.value} as Student)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit_grade">Grade</Label>
                      <Input id="edit_grade" value={editForm?.grade} onChange={(e) => setEditForm({...editForm, grade: e.target.value} as Student)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="edit_status">Status</Label>
                      <Select value={editForm?.status} onValueChange={(value) => setEditForm({...editForm, status: value} as Student)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="graduated">Graduated</SelectItem>
                        </SelectContent>
                      </Select>
                  </div>
                  {renderFormError(formError)}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleEditDialogChange(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {renderError(error)}

      {/* --- 5. Use 'students' state variable here, not 'mockStudents' --- */}
      {isLoading ? renderLoading() : (
        <div className="grid gap-4">
          {students.map((student) => (
            <Card key={student.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{student.first_name} {student.last_name}</h3>
                      <p className="text-sm text-gray-600">ID: {student.admission_number}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-8">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-900">{student.grade}</p>
                      <p className="text-xs text-gray-500">Grade</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-900">{student.parent_name || 'Not assigned'}</p>
                      <p className="text-xs text-gray-500">Parent/Guardian</p>
                      {student.parent_phone && (
                        <p className="text-xs text-blue-600">{student.parent_phone}</p>
                      )}
                      {student.parent_email && (
                        <p className="text-xs text-blue-600 truncate max-w-24">{student.parent_email}</p>
                      )}
                    </div>
                    <Badge className={student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {student.status}
                    </Badge>
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/students/${student.id}`)}>
                        View Profile
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => handleOpenEditDialog(student)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon" disabled={student.status === 'inactive'}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will set {student.first_name}'s status to "inactive". They will no longer have access to the system.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeactivateStudent(student.id)}>
                              Deactivate
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}