import { useState } from 'react'
import { Plus, Search, Filter, UserCheck, Mail, Phone, Calendar, Clock, CheckCircle, XCircle, DollarSign } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'

// Mock staff data
const mockStaff = [
  {
    id: '1',
    name: 'Dr. Sarah Wilson',
    email: 'sarah.wilson@school.edu',
    phone: '+1-555-0201',
    role: 'Teacher',
    department: 'Mathematics',
    joinDate: '2019-08-15',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b2b5aac1?w=150&h=150&fit=crop&crop=face'
  },
  {
    id: '2',
    name: 'Mr. James Anderson',
    email: 'james.anderson@school.edu',
    phone: '+1-555-0202',
    role: 'Teacher',
    department: 'Science',
    joinDate: '2020-01-12',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
  },
  {
    id: '3',
    name: 'Ms. Lisa Thompson',
    email: 'lisa.thompson@school.edu',
    phone: '+1-555-0203',
    role: 'Administrator',
    department: 'Administration',
    joinDate: '2018-03-20',
    status: 'Active',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
  }
]

// Mock leave requests
const mockLeaveRequests = [
  {
    id: '1',
    staffName: 'Dr. Sarah Wilson',
    type: 'Sick Leave',
    startDate: '2024-03-15',
    endDate: '2024-03-17',
    days: 3,
    reason: 'Medical appointment and recovery',
    status: 'Pending'
  },
  {
    id: '2',
    staffName: 'Mr. James Anderson',
    type: 'Annual Leave',
    startDate: '2024-03-20',
    endDate: '2024-03-25',
    days: 5,
    reason: 'Family vacation',
    status: 'Pending'
  }
]

export default function Staff() {
  const [activeTab, setActiveTab] = useState('directory')
  const [staff] = useState(mockStaff)
  const [leaveRequests, setLeaveRequests] = useState(mockLeaveRequests)
  const [isStaffDialogOpen, setIsStaffDialogOpen] = useState(false)

  const handleLeaveAction = (requestId: string, action: 'approve' | 'deny') => {
    setLeaveRequests(prev => 
      prev.map(request => 
        request.id === requestId 
          ? { ...request, status: action === 'approve' ? 'Approved' : 'Denied' }
          : request
      )
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600">Manage staff members, leave requests, and payroll</p>
        </div>
        
        <Dialog open={isStaffDialogOpen} onOpenChange={setIsStaffDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add Staff Member</DialogTitle>
              <DialogDescription>
                Add a new staff member to the school
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4">
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
                  <Input id="email" type="email" placeholder="staff@school.edu" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" placeholder="+1-555-0000" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="administrator">Administrator</SelectItem>
                      <SelectItem value="counselor">Counselor</SelectItem>
                      <SelectItem value="librarian">Librarian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mathematics">Mathematics</SelectItem>
                      <SelectItem value="science">Science</SelectItem>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="history">History</SelectItem>
                      <SelectItem value="administration">Administration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="joinDate">Join Date</Label>
                <Input id="joinDate" type="date" />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStaffDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsStaffDialogOpen(false)}>
                Add Staff Member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="directory">Staff Directory</TabsTrigger>
          <TabsTrigger value="leave">Leave Management</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="directory" className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search staff..."
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>

          <div className="grid gap-4">
            {staff.map((member) => (
              <Card key={member.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-12 h-12 rounded-full"
                      />
                      
                      <div>
                        <h3 className="font-semibold text-gray-900">{member.name}</h3>
                        <p className="text-sm text-gray-600">{member.role} • {member.department}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-8">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">{member.email}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span className="text-sm">{member.phone}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">Joined {new Date(member.joinDate).getFullYear()}</span>
                      </div>

                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        {member.status}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="leave" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Leave Requests Pending Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaveRequests.filter(req => req.status === 'Pending').map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">{request.staffName}</h4>
                        <p className="text-sm text-gray-600">{request.type} • {request.days} days</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <p className="text-sm font-medium">{request.startDate}</p>
                        <p className="text-xs text-gray-500">Start Date</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">{request.endDate}</p>
                        <p className="text-xs text-gray-500">End Date</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-green-600 hover:text-green-700"
                          onClick={() => handleLeaveAction(request.id, 'approve')}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleLeaveAction(request.id, 'deny')}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Deny
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {leaveRequests.filter(req => req.status === 'Pending').length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No pending leave requests
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Leave History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaveRequests.filter(req => req.status !== 'Pending').map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <Clock className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">{request.staffName}</h4>
                        <p className="text-sm text-gray-600">{request.type} • {request.days} days</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <p className="text-sm font-medium">{request.startDate}</p>
                        <p className="text-xs text-gray-500">Start Date</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">{request.endDate}</p>
                        <p className="text-xs text-gray-500">End Date</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        request.status === 'Approved' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {request.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payroll Management</CardTitle>
              <div className="flex space-x-4">
                <Button>Generate Payroll</Button>
                <Button variant="outline">Export Reports</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Payroll System</h3>
                <p>Manage staff salaries, bonuses, and payment processing</p>
                <Button className="mt-4">Set Up Payroll</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
