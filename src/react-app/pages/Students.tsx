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
  const [students] = useState(mockStudents)
  
  const [isEnrollmentDialogOpen, setIsEnrollmentDialogOpen] = useState(false)

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
                <TabsTrigger value="guardian">Guardian Info</TabsTrigger>
              </TabsList>
              
              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="Enter first name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Enter last name" />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" placeholder="student@email.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" placeholder="+1-555-0000" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input id="dateOfBirth" type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select>
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

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" placeholder="Enter full address" />
                </div>
              </TabsContent>

              <TabsContent value="academic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="grade">Grade Level</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="grade-9">Grade 9</SelectItem>
                        <SelectItem value="grade-10">Grade 10</SelectItem>
                        <SelectItem value="grade-11">Grade 11</SelectItem>
                        <SelectItem value="grade-12">Grade 12</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="class">Class Section</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="a">Section A</SelectItem>
                        <SelectItem value="b">Section B</SelectItem>
                        <SelectItem value="c">Section C</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="studentId">Student ID</Label>
                  <Input id="studentId" placeholder="Auto-generated" disabled />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admissionDate">Admission Date</Label>
                  <Input id="admissionDate" type="date" />
                </div>
              </TabsContent>

              <TabsContent value="guardian" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="relation">Relation</Label>
                  <Select>
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
                    <span className="px-2 bg-white text-gray-500">Or enter manually</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="guardianName">Guardian Name</Label>
                    <Input id="guardianName" placeholder="Enter guardian name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guardianPhone">Guardian Phone</Label>
                    <Input id="guardianPhone" placeholder="+1-555-0000" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guardianEmail">Guardian Email</Label>
                  <Input id="guardianEmail" type="email" placeholder="guardian@email.com" />
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEnrollmentDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsEnrollmentDialogOpen(false)}>
                Enroll Student
              </Button>
            </DialogFooter>
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
