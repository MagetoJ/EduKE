import { useState } from 'react'
import { Plus, DollarSign, Search, Filter, Calendar, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router'

// Mock fee structures
const mockFeeStructures = [
  { id: '1', name: 'Tuition Fee', amount: 1200, type: 'Monthly', grade: 'Grade 10', status: 'Active' },
  { id: '2', name: 'Lab Fee', amount: 150, type: 'Semester', grade: 'All Grades', status: 'Active' },
  { id: '3', name: 'Library Fee', amount: 50, type: 'Annual', grade: 'All Grades', status: 'Active' },
  { id: '4', name: 'Sports Fee', amount: 100, type: 'Annual', grade: 'All Grades', status: 'Active' }
]

// Mock student fees (for parents/students)
const mockStudentFees = [
  { id: '1', description: 'Tuition Fee - March 2024', amount: 1200, dueDate: '2024-03-15', status: 'Pending', type: 'Tuition' },
  { id: '2', description: 'Lab Fee - Spring Semester', amount: 150, dueDate: '2024-03-10', status: 'Paid', type: 'Lab' },
  { id: '3', description: 'Library Fee - Annual', amount: 50, dueDate: '2024-03-20', status: 'Overdue', type: 'Library' },
  { id: '4', description: 'Sports Fee - Annual', amount: 100, dueDate: '2024-03-25', status: 'Pending', type: 'Sports' }
]

// Mock fee collection data (for admin)
const mockFeeCollection = [
  { id: '1', studentName: 'John Smith', grade: 'Grade 10', totalDue: 1350, paid: 1200, outstanding: 150, lastPayment: '2024-03-08' },
  { id: '2', studentName: 'Sarah Johnson', grade: 'Grade 11', totalDue: 1400, paid: 1400, outstanding: 0, lastPayment: '2024-03-10' },
  { id: '3', studentName: 'Michael Brown', grade: 'Grade 9', totalDue: 1100, paid: 950, outstanding: 150, lastPayment: '2024-03-05' },
  { id: '4', studentName: 'Emma Davis', grade: 'Grade 12', totalDue: 1500, paid: 1050, outstanding: 450, lastPayment: '2024-03-01' }
]

export default function Fees() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(user?.role === 'admin' ? 'structure' : 'fees')
  const [isFeeStructureDialogOpen, setIsFeeStructureDialogOpen] = useState(false)

  const isAdmin = user?.role === 'admin'
  

  const renderAdminView = () => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList>
        <TabsTrigger value="structure">Fee Structure</TabsTrigger>
        <TabsTrigger value="collection">Fee Collection</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
      </TabsList>

      <TabsContent value="structure" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Fee Structure Management</h2>
            <p className="text-gray-600">Configure fee types and amounts for different grades</p>
          </div>
          
          <Dialog open={isFeeStructureDialogOpen} onOpenChange={setIsFeeStructureDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Fee Structure
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Fee Structure</DialogTitle>
                <DialogDescription>Create a new fee type for students</DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="feeName">Fee Name</Label>
                  <Input id="feeName" placeholder="e.g., Tuition Fee" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount ($)</Label>
                    <Input id="amount" type="number" placeholder="1200" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Payment Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="semester">Semester</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                        <SelectItem value="one-time">One-time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="applicable">Applicable To</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Grades</SelectItem>
                      <SelectItem value="grade-9">Grade 9</SelectItem>
                      <SelectItem value="grade-10">Grade 10</SelectItem>
                      <SelectItem value="grade-11">Grade 11</SelectItem>
                      <SelectItem value="grade-12">Grade 12</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsFeeStructureDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsFeeStructureDialogOpen(false)}>
                  Create Fee Structure
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {mockFeeStructures.map((fee) => (
            <Card key={fee.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{fee.name}</h3>
                      <p className="text-sm text-gray-600">{fee.grade} • {fee.type}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">${fee.amount}</p>
                      <p className="text-xs text-gray-500">{fee.type}</p>
                    </div>
                    
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      {fee.status}
                    </span>
                    
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="collection" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Fee Collection Overview</h2>
            <p className="text-gray-600">Track payment status for all students</p>
          </div>
          <Button>Generate Bulk Fees</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">$124,750</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">$18,250</div>
              <p className="text-xs text-muted-foreground">Overdue amounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">87%</div>
              <p className="text-xs text-muted-foreground">Current period</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input placeholder="Search students..." className="pl-10" />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>

        <div className="space-y-4">
          {mockFeeCollection.map((student) => (
            <Card key={student.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{student.studentName}</h3>
                    <p className="text-sm text-gray-600">{student.grade}</p>
                  </div>
                  
                  <div className="flex items-center space-x-8">
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-900">${student.totalDue}</p>
                      <p className="text-xs text-gray-500">Total Due</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-sm font-medium text-green-600">${student.paid}</p>
                      <p className="text-xs text-gray-500">Paid</p>
                    </div>
                    
                    <div className="text-center">
                      <p className={`text-sm font-medium ${student.outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ${student.outstanding}
                      </p>
                      <p className="text-xs text-gray-500">Outstanding</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-900">{student.lastPayment}</p>
                      <p className="text-xs text-gray-500">Last Payment</p>
                    </div>

                    <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/students/${student.id}`)}>
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="reports" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Fee Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-gray-500">
              <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Financial Reports</h3>
              <p>Generate detailed reports on fee collection and outstanding amounts</p>
              <Button className="mt-4">Generate Report</Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )

  const renderParentStudentView = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Fee Information</h1>
        <p className="text-gray-600">View and manage your fee payments</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">$450</div>
            <p className="text-xs text-muted-foreground">2 pending payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid This Year</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">$3,250</div>
            <p className="text-xs text-muted-foreground">8 payments made</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Due Date</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">Mar 15</div>
            <p className="text-xs text-muted-foreground">Tuition fee due</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fee Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockStudentFees.map((fee) => (
              <div key={fee.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    fee.status === 'Paid' ? 'bg-green-500' :
                    fee.status === 'Overdue' ? 'bg-red-500' :
                    'bg-yellow-500'
                  }`}></div>
                  <div>
                    <h4 className="font-medium">{fee.description}</h4>
                    <p className="text-sm text-gray-600">{fee.type} Fee</p>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-right">
                    <p className="font-semibold">${fee.amount}</p>
                    <p className="text-sm text-gray-500">Due: {fee.dueDate}</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    {fee.status === 'Paid' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : fee.status === 'Overdue' ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-500" />
                    )}
                    
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      fee.status === 'Paid' ? 'bg-green-100 text-green-800' :
                      fee.status === 'Overdue' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {fee.status}
                    </span>
                  </div>

                  {fee.status !== 'Paid' && (
                    <Button size="sm">Pay Now</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fees Management</h1>
          <p className="text-gray-600">
            {isAdmin ? 'Manage fee structures and track collections' : 'View and manage your fee payments'}
          </p>
        </div>
      </div>

      {isAdmin ? renderAdminView() : renderParentStudentView()}
    </div>
  )
}
