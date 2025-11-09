import { useMemo } from 'react'
import { useParams } from 'react-router'
import { Mail, Phone, MapPin, CalendarDays, User } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Badge } from '../components/ui/badge'

const studentProfiles = [
  {
    id: '1',
    name: 'John Smith',
    grade: 'Grade 10',
    classGroup: '10A',
    status: 'Active',
    email: 'john.smith@email.com',
    phone: '+1-555-0101',
    dob: 'May 12, 2008',
    address: '123 Learning Avenue, Springfield',
    caregiver: {
      name: 'Robert Smith',
      email: 'robert.smith@email.com',
      phone: '+1-555-2001'
    },
    academics: {
      courses: [
        { id: 'math-401', name: 'Advanced Mathematics', teacher: 'Dr. Sarah Wilson', progress: '92%', grade: 'A' },
        { id: 'bio-301', name: 'Biology', teacher: 'Mr. James Anderson', progress: '88%', grade: 'B+' },
        { id: 'eng-201', name: 'English Literature', teacher: 'Ms. Emily Parker', progress: '95%', grade: 'A' }
      ],
      assessments: [
        { id: 'assess-1', title: 'Algebraic Equations Quiz', score: '45/50', date: 'Mar 10, 2024' },
        { id: 'assess-2', title: 'Cell Division Lab Report', score: '88%', date: 'Mar 6, 2024' }
      ]
    },
    finance: {
      totalDue: '$1,350',
      paid: '$1,200',
      outstanding: '$150',
      transactions: [
        { id: 'txn-1', label: 'Tuition Fee - March', amount: '$600', date: 'Mar 8, 2024', status: 'Paid' },
        { id: 'txn-2', label: 'Lab Fee - Spring', amount: '$150', date: 'Mar 5, 2024', status: 'Paid' },
        { id: 'txn-3', label: 'Library Fee', amount: '$50', date: 'Mar 1, 2024', status: 'Outstanding' }
      ]
    },
    attendance: [
      { id: 'att-1', date: 'Mar 11, 2024', status: 'Present' },
      { id: 'att-2', date: 'Mar 8, 2024', status: 'Present' },
      { id: 'att-3', date: 'Mar 7, 2024', status: 'Late' }
    ],
    discipline: [
      { id: 'disc-1', date: 'Feb 20, 2024', type: 'Commendation', notes: 'Volunteered at science fair' }
    ]
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    grade: 'Grade 11',
    classGroup: '11B',
    status: 'Active',
    email: 'sarah.j@email.com',
    phone: '+1-555-0102',
    dob: 'November 3, 2007',
    address: '89 Oak Street, Lakeside',
    caregiver: {
      name: 'Linda Johnson',
      email: 'linda.johnson@email.com',
      phone: '+1-555-2002'
    },
    academics: {
      courses: [
        { id: 'math-401', name: 'Advanced Mathematics', teacher: 'Dr. Sarah Wilson', progress: '90%', grade: 'A-' },
        { id: 'bio-301', name: 'Biology', teacher: 'Mr. James Anderson', progress: '94%', grade: 'A' },
        { id: 'eng-201', name: 'English Literature', teacher: 'Ms. Emily Parker', progress: '91%', grade: 'A-' }
      ],
      assessments: [
        { id: 'assess-3', title: 'Biology Lab Report', score: '93%', date: 'Mar 9, 2024' },
        { id: 'assess-4', title: 'Literature Essay', score: '47/50', date: 'Mar 4, 2024' }
      ]
    },
    finance: {
      totalDue: '$1,400',
      paid: '$1,400',
      outstanding: '$0',
      transactions: [
        { id: 'txn-4', label: 'Tuition Fee - March', amount: '$600', date: 'Mar 10, 2024', status: 'Paid' },
        { id: 'txn-5', label: 'Lab Fee - Spring', amount: '$150', date: 'Mar 8, 2024', status: 'Paid' },
        { id: 'txn-6', label: 'Library Fee', amount: '$50', date: 'Mar 2, 2024', status: 'Paid' }
      ]
    },
    attendance: [
      { id: 'att-4', date: 'Mar 11, 2024', status: 'Present' },
      { id: 'att-5', date: 'Mar 8, 2024', status: 'Present' },
      { id: 'att-6', date: 'Mar 7, 2024', status: 'Present' }
    ],
    discipline: []
  },
  {
    id: '3',
    name: 'Michael Brown',
    grade: 'Grade 9',
    classGroup: '9A',
    status: 'Active',
    email: 'michael.b@email.com',
    phone: '+1-555-0103',
    dob: 'August 18, 2009',
    address: '56 River Road, Meadowbrook',
    caregiver: {
      name: 'David Brown',
      email: 'david.brown@email.com',
      phone: '+1-555-2003'
    },
    academics: {
      courses: [
        { id: 'math-301', name: 'Geometry Foundations', teacher: 'Dr. Sarah Wilson', progress: '84%', grade: 'B' },
        { id: 'bio-201', name: 'General Biology', teacher: 'Mr. James Anderson', progress: '82%', grade: 'B-' },
        { id: 'eng-101', name: 'English Composition', teacher: 'Ms. Emily Parker', progress: '87%', grade: 'B+' }
      ],
      assessments: [
        { id: 'assess-5', title: 'Geometry Quiz', score: '38/50', date: 'Mar 6, 2024' },
        { id: 'assess-6', title: 'Biology Worksheet', score: '80%', date: 'Mar 2, 2024' }
      ]
    },
    finance: {
      totalDue: '$1,100',
      paid: '$950',
      outstanding: '$150',
      transactions: [
        { id: 'txn-7', label: 'Tuition Fee - March', amount: '$550', date: 'Mar 5, 2024', status: 'Paid' },
        { id: 'txn-8', label: 'Lab Fee - Spring', amount: '$150', date: 'Mar 3, 2024', status: 'Outstanding' },
        { id: 'txn-9', label: 'Library Fee', amount: '$50', date: 'Feb 28, 2024', status: 'Paid' }
      ]
    },
    attendance: [
      { id: 'att-7', date: 'Mar 11, 2024', status: 'Present' },
      { id: 'att-8', date: 'Mar 8, 2024', status: 'Absent' },
      { id: 'att-9', date: 'Mar 7, 2024', status: 'Present' }
    ],
    discipline: [
      { id: 'disc-2', date: 'Jan 12, 2024', type: 'Advisory', notes: 'Late submission of assignment' }
    ]
  },
  {
    id: '4',
    name: 'Emma Davis',
    grade: 'Grade 12',
    classGroup: '12A',
    status: 'Active',
    email: 'emma.d@email.com',
    phone: '+1-555-0104',
    dob: 'January 27, 2007',
    address: '742 Elm Street, Brookfield',
    caregiver: {
      name: 'Jennifer Davis',
      email: 'jennifer.davis@email.com',
      phone: '+1-555-2004'
    },
    academics: {
      courses: [
        { id: 'math-501', name: 'Calculus II', teacher: 'Dr. Sarah Wilson', progress: '96%', grade: 'A' },
        { id: 'bio-401', name: 'Human Anatomy', teacher: 'Mr. James Anderson', progress: '89%', grade: 'B+' },
        { id: 'eng-301', name: 'Modern Literature', teacher: 'Ms. Emily Parker', progress: '94%', grade: 'A-' }
      ],
      assessments: [
        { id: 'assess-7', title: 'Calculus Mock Exam', score: '94%', date: 'Mar 9, 2024' },
        { id: 'assess-8', title: 'Literature Presentation', score: '48/50', date: 'Mar 1, 2024' }
      ]
    },
    finance: {
      totalDue: '$1,500',
      paid: '$1,050',
      outstanding: '$450',
      transactions: [
        { id: 'txn-10', label: 'Tuition Fee - March', amount: '$650', date: 'Mar 4, 2024', status: 'Paid' },
        { id: 'txn-11', label: 'Lab Fee - Spring', amount: '$200', date: 'Mar 2, 2024', status: 'Outstanding' },
        { id: 'txn-12', label: 'Library Fee', amount: '$50', date: 'Feb 26, 2024', status: 'Paid' }
      ]
    },
    attendance: [
      { id: 'att-10', date: 'Mar 11, 2024', status: 'Present' },
      { id: 'att-11', date: 'Mar 8, 2024', status: 'Present' },
      { id: 'att-12', date: 'Mar 7, 2024', status: 'Present' }
    ],
    discipline: []
  }
]

export function StudentProfile() {
  const { id } = useParams()
  const student = useMemo(() => studentProfiles.find((item) => item.id === id) ?? studentProfiles[0], [id])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{student.name}</h1>
        <p className="text-gray-600">Student ID: {student.id}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Academic Standing</CardTitle>
            <CardDescription>Current grade and class</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-semibold text-gray-900">{student.grade}</div>
            <p className="text-sm text-gray-600">Class {student.classGroup}</p>
            <Badge variant="outline" className="w-fit">{student.status}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Primary Caregiver</CardTitle>
            <CardDescription>Contact information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center space-x-2 text-gray-900">
              <User className="w-4 h-4" />
              <span>{student.caregiver.name}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Mail className="w-4 h-4" />
              <span>{student.caregiver.email}</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Phone className="w-4 h-4" />
              <span>{student.caregiver.phone}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
            <CardDescription>Fee status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm text-gray-600">Total Due</p>
              <p className="text-lg font-semibold text-gray-900">{student.finance.totalDue}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Paid</p>
              <p className="text-lg font-semibold text-green-600">{student.finance.paid}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Outstanding</p>
              <p className="text-lg font-semibold text-red-600">{student.finance.outstanding}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Personal details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">Email</p>
              <div className="flex items-center space-x-2 text-gray-900">
                <Mail className="w-4 h-4" />
                <span>{student.email}</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">Phone</p>
              <div className="flex items-center space-x-2 text-gray-900">
                <Phone className="w-4 h-4" />
                <span>{student.phone}</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">Address</p>
              <div className="flex items-center space-x-2 text-gray-900">
                <MapPin className="w-4 h-4" />
                <span>{student.address}</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">Date of Birth</p>
              <div className="flex items-center space-x-2 text-gray-900">
                <CalendarDays className="w-4 h-4" />
                <span>{student.dob}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="academics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="academics">Academics</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="discipline">Discipline</TabsTrigger>
        </TabsList>

        <TabsContent value="academics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Enrolled Courses</CardTitle>
              <CardDescription>Current academic load</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {student.academics.courses.map((course) => (
                <div key={course.id} className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{course.name}</p>
                    <p className="text-sm text-gray-600">Instructor: {course.teacher}</p>
                  </div>
                  <div className="flex items-center gap-8 mt-3 md:mt-0">
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Progress</p>
                      <p className="text-lg font-semibold text-blue-600">{course.progress}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500">Grade</p>
                      <p className="text-lg font-semibold text-gray-900">{course.grade}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Assessments</CardTitle>
              <CardDescription>Latest performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {student.academics.assessments.map((assessment) => (
                <div key={assessment.id} className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{assessment.title}</p>
                    <p className="text-sm text-gray-600">{assessment.date}</p>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 mt-3 md:mt-0">{assessment.score}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="finance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>Recent payments and invoices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {student.finance.transactions.map((transaction) => (
                <div key={transaction.id} className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{transaction.label}</p>
                    <p className="text-sm text-gray-600">{transaction.date}</p>
                  </div>
                  <div className="flex items-center gap-8 mt-3 md:mt-0">
                    <p className="text-lg font-semibold text-gray-900">{transaction.amount}</p>
                    <Badge variant={transaction.status === 'Paid' ? 'secondary' : 'outline'}>{transaction.status}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Log</CardTitle>
              <CardDescription>Recent records</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {student.attendance.map((entry) => (
                <div key={entry.id} className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border rounded-lg">
                  <p className="font-medium text-gray-900">{entry.date}</p>
                  <Badge variant={entry.status === 'Present' ? 'secondary' : entry.status === 'Late' ? 'outline' : 'destructive'} className="mt-3 md:mt-0">{entry.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discipline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Discipline Records</CardTitle>
              <CardDescription>Commendations and advisories</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {student.discipline.length === 0 ? (
                <p className="text-sm text-gray-600">No records available.</p>
              ) : (
                student.discipline.map((record) => (
                  <div key={record.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">{record.type}</p>
                      <span className="text-sm text-gray-500">{record.date}</span>
                    </div>
                    <p className="text-sm text-gray-600">{record.notes}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
