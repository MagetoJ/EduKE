import { useState } from 'react'
import { Plus, Search, School, Users, DollarSign, MapPin, Phone, Mail, MoreVertical } from 'lucide-react'
import { useNavigate, Link } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu'

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
  const navigate = useNavigate()
  const { selectSchool } = useAuth()

  const [schools, setSchools] = useState(mockSchools)
  const [isAddSchoolDialogOpen, setIsAddSchoolDialogOpen] = useState(false)
  const [isManageSchoolDialogOpen, setIsManageSchoolDialogOpen] = useState(false)
  const [selectedSchool, setSelectedSchool] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    principal: '',
    logo: ''
  })
  const [adminFormData, setAdminFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'admin'
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const handleAdminInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target
    setAdminFormData(prev => ({ ...prev, [id]: value }))
  }

  const handleManageClick = (school) => {
    setSelectedSchool(school)
    setIsManageSchoolDialogOpen(true)
  }

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // For now, just log the admin data
      console.log('Adding admin for school:', selectedSchool.name, adminFormData)
      // In real app, would POST to /api/schools/:id/admins
      setAdminFormData({ name: '', email: '', phone: '', password: '', role: 'admin' })
      setIsManageSchoolDialogOpen(false)
      setSelectedSchool(null)
    } catch (error) {
      console.error('Error adding admin:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (response.ok) {
        // Add to local state for now
        const newSchool = {
          id: Date.now().toString(),
          ...formData,
          students: 0,
          staff: 0,
          revenue: '$0',
          status: 'Active'
        }
        setSchools(prev => [...prev, newSchool])
        setFormData({ name: '', address: '', phone: '', email: '', principal: '', logo: '' })
        setIsAddSchoolDialogOpen(false)
      }
    } catch (error) {
      console.error('Error adding school:', error)
    }
  }

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
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Add New School</DialogTitle>
                <DialogDescription>
                  Add a new school to the EduKE network
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">School Name</Label>
                    <Input id="name" placeholder="Enter school name" value={formData.name} onChange={handleInputChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="principal">Principal Name</Label>
                    <Input id="principal" placeholder="Enter principal name" value={formData.principal} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" placeholder="Enter full address" value={formData.address} onChange={handleInputChange} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" placeholder="+1-555-0000" value={formData.phone} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" placeholder="contact@school.edu" value={formData.email} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo">School Logo URL</Label>
                  <Input id="logo" placeholder="https://example.com/logo.png" value={formData.logo} onChange={handleInputChange} />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddSchoolDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Add School
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isManageSchoolDialogOpen} onOpenChange={setIsManageSchoolDialogOpen}>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleAdminSubmit}>
              <DialogHeader>
                <DialogTitle>Manage School Admin</DialogTitle>
                <DialogDescription>
                  Add or manage the administrator for {selectedSchool?.name}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adminName">Admin Name</Label>
                  <Input id="name" placeholder="Enter admin name" value={adminFormData.name} onChange={handleAdminInputChange} required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Email Address</Label>
                    <Input id="email" type="email" placeholder="admin@school.edu" value={adminFormData.email} onChange={handleAdminInputChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminPhone">Phone Number</Label>
                    <Input id="phone" placeholder="+1-555-0000" value={adminFormData.phone} onChange={handleAdminInputChange} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adminPassword">Password</Label>
                    <Input id="password" type="password" placeholder="Enter password" value={adminFormData.password} onChange={handleAdminInputChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminRole">Role</Label>
                    <Select onValueChange={(value) => setAdminFormData(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsManageSchoolDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Add Admin
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem asChild>
                      <Link to={`/dashboard/schools/${school.id}`}>View Details</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleManageClick(school)}>
                      Manage Admin
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => console.log('Activate school:', school.name)}>
                      {school.status === 'Active' ? 'Deactivate' : 'Activate'} School
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
