import { useCallback, useEffect, useState } from 'react'
import { Plus, Search, School, Users, DollarSign, MapPin, Phone, Mail, MoreVertical } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu'
import { useApi } from '../contexts/AuthContext'

type SchoolRecord = {
  id: string
  name: string
  address: string
  phone: string
  email: string
  principal: string
  students: number
  staff: number
  revenue: string
  status: string
}

export default function Schools() {
  const apiFetch = useApi()
  const [schools, setSchools] = useState<SchoolRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAddSchoolDialogOpen, setIsAddSchoolDialogOpen] = useState(false)
  const [isManageSchoolDialogOpen, setIsManageSchoolDialogOpen] = useState(false)
  const [selectedSchool, setSelectedSchool] = useState<SchoolRecord | null>(null)
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

  const loadSchools = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiFetch('/api/schools')
      if (!response.ok) {
        throw new Error('Failed to load schools')
      }
      const data: SchoolRecord[] = await response.json()
      setSchools(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error loading schools'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }, [apiFetch])

  useEffect(() => {
    loadSchools()
  }, [loadSchools])

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = event.target
    setFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleAdminInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = event.target
    setAdminFormData((prev) => ({ ...prev, [id]: value }))
  }

  const handleManageClick = (school: SchoolRecord) => {
    setSelectedSchool(school)
    setIsManageSchoolDialogOpen(true)
  }

  const handleAdminSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setAdminFormData({ name: '', email: '', phone: '', password: '', role: 'admin' })
    setIsManageSchoolDialogOpen(false)
    setSelectedSchool(null)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      const response = await apiFetch('/api/schools', {
        method: 'POST',
        body: JSON.stringify(formData)
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to add school')
      }
      await loadSchools()
      setFormData({ name: '', address: '', phone: '', email: '', principal: '', logo: '' })
      setIsAddSchoolDialogOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error adding school'
      setError(message)
    } finally {
      setIsLoading(false)
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
              <Plus className="mr-2 h-4 w-4" />
              Add School
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Add New School</DialogTitle>
                <DialogDescription>Add a new school to the EduKE network</DialogDescription>
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
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? 'Saving...' : 'Add School'}
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
                <DialogDescription>Add or manage the administrator for {selectedSchool?.name}</DialogDescription>
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
                    <Select onValueChange={(value) => setAdminFormData((prev) => ({ ...prev, role: value }))}>
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
                <Button type="submit">Add Admin</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <Input placeholder="Search schools..." className="pl-10" disabled />
        </div>
      </div>

      {error && <p className="text-sm font-medium text-red-500">{error}</p>}

      {isLoading && schools.length === 0 ? (
        <p className="text-sm text-muted-foreground">Loading schools...</p>
      ) : (
        <div className="grid gap-6">
          {schools.map((school) => (
            <Card key={school.id} className="transition-shadow hover:shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600">
                      <School className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{school.name}</CardTitle>
                      <p className="text-sm text-gray-600">Principal: {school.principal || 'Not set'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="rounded-full px-3 py-1 text-sm font-medium text-green-800">
                      {school.status || 'Active'}
                    </span>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="mb-4 grid gap-4 md:grid-cols-2">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">{school.address}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span className="text-sm">{school.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">{school.email}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 border-t pt-4">
                  <div className="text-center">
                    <div className="mb-1 flex items-center justify-center space-x-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span className="text-lg font-semibold text-gray-900">{school.students}</span>
                    </div>
                    <p className="text-xs text-gray-500">Students</p>
                  </div>

                  <div className="text-center">
                    <div className="mb-1 flex items-center justify-center space-x-2">
                      <Users className="h-4 w-4 text-green-500" />
                      <span className="text-lg font-semibold text-gray-900">{school.staff}</span>
                    </div>
                    <p className="text-xs text-gray-500">Staff</p>
                  </div>

                  <div className="text-center">
                    <div className="mb-1 flex items-center justify-center space-x-2">
                      <DollarSign className="h-4 w-4 text-purple-500" />
                      <span className="text-lg font-semibold text-gray-900">{school.revenue}</span>
                    </div>
                    <p className="text-xs text-gray-500">Total Revenue</p>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
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
                      <DropdownMenuItem onClick={() => handleManageClick(school)}>Manage Admin</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
