import { useMemo } from 'react'
import { useParams } from 'react-router'
import { Mail, Phone, CalendarDays, MapPin } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Badge } from '../components/ui/badge'

const staffProfiles = [
  {
    id: '1',
    name: 'Dr. Sarah Wilson',
    role: 'Teacher',
    department: 'Mathematics',
    email: 'sarah.wilson@school.edu',
    phone: '+1-555-0201',
    joinDate: 'August 15, 2019',
    status: 'Active',
    location: 'Main Campus, Room 204',
    summary: 'Senior mathematics teacher specializing in advanced curriculum and exam preparation.',
    teaching: {
      classes: [
        { id: 'class-1', name: 'Grade 10 - Section A', subject: 'Advanced Mathematics', schedule: 'Mon, Wed, Fri • 9:00 AM', students: 28 },
        { id: 'class-2', name: 'Grade 11 - Section A', subject: 'Calculus I', schedule: 'Tue, Thu • 11:00 AM', students: 26 }
      ],
      assessments: [
        { id: 'assess-1', title: 'Algebraic Equations Quiz', due: 'Mar 15, 2024', status: 'Grading' },
        { id: 'assess-2', title: 'Geometry Project', due: 'Mar 22, 2024', status: 'Assigned' }
      ]
    },
    leave: [
      { id: 'leave-1', type: 'Sick Leave', start: 'Mar 15, 2024', end: 'Mar 17, 2024', status: 'Pending' },
      { id: 'leave-2', type: 'Professional Development', start: 'Feb 5, 2024', end: 'Feb 7, 2024', status: 'Approved' }
    ],
    payroll: {
      salary: '$4,800',
      lastPaid: 'Mar 1, 2024',
      history: [
        { id: 'pay-1', period: 'March 2024', amount: '$4,800', status: 'Paid', date: 'Mar 1, 2024' },
        { id: 'pay-2', period: 'February 2024', amount: '$4,800', status: 'Paid', date: 'Feb 1, 2024' },
        { id: 'pay-3', period: 'January 2024', amount: '$4,800', status: 'Paid', date: 'Jan 2, 2024' }
      ]
    }
  },
  {
    id: '2',
    name: 'Mr. James Anderson',
    role: 'Teacher',
    department: 'Science',
    email: 'james.anderson@school.edu',
    phone: '+1-555-0202',
    joinDate: 'January 12, 2020',
    status: 'Active',
    location: 'Science Wing, Lab 3',
    summary: 'Biology teacher with focus on laboratory instruction and student research.',
    teaching: {
      classes: [
        { id: 'class-3', name: 'Grade 10 - Section B', subject: 'Biology', schedule: 'Tue, Thu • 10:30 AM', students: 25 },
        { id: 'class-4', name: 'Grade 11 - Section B', subject: 'Human Anatomy', schedule: 'Mon, Wed • 1:00 PM', students: 24 }
      ],
      assessments: [
        { id: 'assess-3', title: 'Cell Division Lab Report', due: 'Mar 18, 2024', status: 'Collecting' },
        { id: 'assess-4', title: 'Ecology Field Study', due: 'Mar 29, 2024', status: 'Assigned' }
      ]
    },
    leave: [
      { id: 'leave-3', type: 'Annual Leave', start: 'Mar 20, 2024', end: 'Mar 25, 2024', status: 'Pending' }
    ],
    payroll: {
      salary: '$4,500',
      lastPaid: 'Mar 1, 2024',
      history: [
        { id: 'pay-4', period: 'March 2024', amount: '$4,500', status: 'Paid', date: 'Mar 1, 2024' },
        { id: 'pay-5', period: 'February 2024', amount: '$4,500', status: 'Paid', date: 'Feb 1, 2024' }
      ]
    }
  },
  {
    id: '3',
    name: 'Ms. Lisa Thompson',
    role: 'Administrator',
    department: 'Administration',
    email: 'lisa.thompson@school.edu',
    phone: '+1-555-0203',
    joinDate: 'March 20, 2018',
    status: 'Active',
    location: 'Administration Block, Office 12',
    summary: 'School administrator overseeing operations, admissions, and parent communication.',
    teaching: {
      classes: [],
      assessments: []
    },
    leave: [
      { id: 'leave-4', type: 'Personal Leave', start: 'Jan 10, 2024', end: 'Jan 12, 2024', status: 'Approved' }
    ],
    payroll: {
      salary: '$5,200',
      lastPaid: 'Mar 1, 2024',
      history: [
        { id: 'pay-6', period: 'March 2024', amount: '$5,200', status: 'Paid', date: 'Mar 1, 2024' },
        { id: 'pay-7', period: 'February 2024', amount: '$5,200', status: 'Paid', date: 'Feb 1, 2024' }
      ]
    }
  }
]

export function StaffProfile() {
  const { id } = useParams()
  const staff = useMemo(() => staffProfiles.find((item) => item.id === id) ?? staffProfiles[0], [id])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{staff.name}</h1>
        <p className="text-gray-600">Staff ID: {staff.id}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Role</CardTitle>
            <CardDescription>Department assignment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-semibold text-gray-900">{staff.role}</div>
            <p className="text-sm text-gray-600">{staff.department}</p>
            <Badge variant="outline" className="w-fit">{staff.status}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tenure</CardTitle>
            <CardDescription>Employment timeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center space-x-2 text-gray-900">
              <CalendarDays className="w-4 h-4" />
              <span>Joined {staff.joinDate}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{staff.location}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payroll Summary</CardTitle>
            <CardDescription>Latest payment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-gray-600">Monthly Salary</p>
              <p className="text-lg font-semibold text-gray-900">{staff.payroll.salary}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Last Paid</p>
              <p className="text-lg font-semibold text-green-600">{staff.payroll.lastPaid}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Contact details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">Email</p>
              <div className="flex items-center space-x-2 text-gray-900">
                <Mail className="w-4 h-4" />
                <span>{staff.email}</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">Phone</p>
              <div className="flex items-center space-x-2 text-gray-900">
                <Phone className="w-4 h-4" />
                <span>{staff.phone}</span>
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <p className="text-sm font-medium text-gray-500">Overview</p>
              <p className="text-gray-700 leading-relaxed">{staff.summary}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="academics">Academic Info</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Assignments</CardTitle>
              <CardDescription>Schedule and responsibilities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {staff.teaching.classes.length === 0 ? (
                <p className="text-sm text-gray-600">No classroom assignments at this time.</p>
              ) : (
                staff.teaching.classes.map((cls) => (
                  <div key={cls.id} className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{cls.name}</p>
                      <p className="text-sm text-gray-600">{cls.subject}</p>
                    </div>
                    <div className="flex items-center gap-8 mt-3 md:mt-0">
                      <div className="text-center">
                        <p className="text-sm text-gray-500">Schedule</p>
                        <p className="text-sm font-semibold text-gray-900">{cls.schedule}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500">Students</p>
                        <p className="text-lg font-semibold text-blue-600">{cls.students}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="academics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Academic Planning</CardTitle>
              <CardDescription>Assessments and curriculum tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {staff.teaching.assessments.length === 0 ? (
                <p className="text-sm text-gray-600">No academic records available.</p>
              ) : (
                staff.teaching.assessments.map((item) => (
                  <div key={item.id} className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.title}</p>
                      <p className="text-sm text-gray-600">Due {item.due}</p>
                    </div>
                    <Badge variant={item.status === 'Grading' ? 'secondary' : 'outline'} className="mt-3 md:mt-0">{item.status}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Leave History</CardTitle>
              <CardDescription>Requests and status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {staff.leave.length === 0 ? (
                <p className="text-sm text-gray-600">No leave requests recorded.</p>
              ) : (
                staff.leave.map((request) => (
                  <div key={request.id} className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{request.type}</p>
                      <p className="text-sm text-gray-600">{request.start} • {request.end}</p>
                    </div>
                    <Badge variant={request.status === 'Approved' ? 'secondary' : request.status === 'Pending' ? 'outline' : 'destructive'} className="mt-3 md:mt-0">{request.status}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payroll History</CardTitle>
              <CardDescription>Monthly payments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {staff.payroll.history.map((entry) => (
                <div key={entry.id} className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{entry.period}</p>
                    <p className="text-sm text-gray-600">Processed {entry.date}</p>
                  </div>
                  <div className="flex items-center gap-8 mt-3 md:mt-0">
                    <p className="text-lg font-semibold text-gray-900">{entry.amount}</p>
                    <Badge variant={entry.status === 'Paid' ? 'secondary' : 'outline'}>{entry.status}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
