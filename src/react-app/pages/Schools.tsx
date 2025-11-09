import { useState } from 'react'
import { Plus, Search, School, Users, DollarSign, MapPin, Phone, Mail, MoreVertical } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Label } from '../components/ui/label'

// Mock schools data
const mockSchools = [
  {
    id: '1',
    name: 'Demo High School',
    address: '123 Education St, Learning City, LC 12345',
    phone: '+1-555-0100',
    email: 'admin@demohigh.edu',
    principal: 'Dr. Sarah Johnson',
    students: 847,
    staff: 67,
    revenue: '$124,000',
    status: 'Active'
  },
  {
    id: '2',
    name: 'Excellence Academy',
    address: '456 Knowledge Ave, Study Town, ST 67890',
    phone: '+1-555-0200',
    email: 'contact@excellence.edu',
    principal: 'Prof. Michael Brown',
    students: 1243,
    staff: 89,
    revenue: '$187,000',
    status: 'Active'
  },
  {
    id: '3',
    name: 'Future Leaders School',
    address: '789 Innovation Blvd, Progress City, PC 54321',
    phone: '+1-555-0300',
    email: 'info@futureleaders.edu',
    principal: 'Dr. Emily Davis',
    students: 692,
    staff: 54,
    revenue: '$98,000',
    status: 'Active'
  }
]

export default function Schools() {
  const [schools] = useState(mockSchools)
  const [isAddSchoolDialogOpen, setIsAddSchoolDialogOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Schools</h1>
          <p className="text-gray-600">Manage all schools in the network</p>
        </div>
        
        <Dialog open={isAddSchoolDialogOpen} onOpenChange={setIsAddSchoolDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add School
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New School</DialogTitle>
              <DialogDescription>
                Add a new school to the EduKE network
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schoolName">School Name</Label>
                  <Input id="schoolName" placeholder="Enter school name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="principalName">Principal Name</Label>
                  <Input id="principalName" placeholder="Enter principal name" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="Enter full address" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" placeholder="+1-555-0000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="contact@school.edu" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">School Logo URL</Label>
                <Input id="logo" placeholder="https://example.com/logo.png" />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddSchoolDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsAddSchoolDialogOpen(false)}>
                Add School
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search schools..."
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-6">
        {schools.map((school) => (
          <Card key={school.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <School className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{school.name}</CardTitle>
                    <p className="text-sm text-gray-600">Principal: {school.principal}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1 text-sm font-medium bg-green-100 text-green-800 rounded-full">
                    {school.status}
                  </span>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center space-x-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">{school.address}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">{school.phone}</span>
                </div>
                <div className="flex items-center space-x-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">{school.email}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-1">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="text-lg font-semibold text-gray-900">{school.students}</span>
                  </div>
                  <p className="text-xs text-gray-500">Students</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-1">
                    <Users className="w-4 h-4 text-green-500" />
                    <span className="text-lg font-semibold text-gray-900">{school.staff}</span>
                  </div>
                  <p className="text-xs text-gray-500">Staff</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 mb-1">
                    <DollarSign className="w-4 h-4 text-purple-500" />
                    <span className="text-lg font-semibold text-gray-900">{school.revenue}</span>
                  </div>
                  <p className="text-xs text-gray-500">Monthly Revenue</p>
                </div>
              </div>

              <div className="flex justify-end pt-4 space-x-2">
                <Button variant="outline" size="sm">
                  View Details
                </Button>
                <Button size="sm">
                  Manage School
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
