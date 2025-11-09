import { useState } from 'react'
import { Calendar, Clock, MapPin, User, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { useAuth } from '../contexts/AuthContext'

// Mock timetable data
const mockTimetable = {
  'Monday': [
    { time: '8:00-9:00', subject: 'Mathematics', teacher: 'Dr. Sarah Wilson', room: 'Room 101' },
    { time: '9:00-10:00', subject: 'English', teacher: 'Ms. Emily Parker', room: 'Room 205' },
    { time: '10:30-11:30', subject: 'Science', teacher: 'Mr. James Anderson', room: 'Lab 1' },
    { time: '11:30-12:30', subject: 'History', teacher: 'Dr. Michael Brown', room: 'Room 302' },
    { time: '1:30-2:30', subject: 'Art', teacher: 'Ms. Lisa Thompson', room: 'Art Studio' }
  ],
  'Tuesday': [
    { time: '8:00-9:00', subject: 'Science', teacher: 'Mr. James Anderson', room: 'Lab 1' },
    { time: '9:00-10:00', subject: 'Mathematics', teacher: 'Dr. Sarah Wilson', room: 'Room 101' },
    { time: '10:30-11:30', subject: 'Physical Education', teacher: 'Coach Robert', room: 'Gymnasium' },
    { time: '11:30-12:30', subject: 'English', teacher: 'Ms. Emily Parker', room: 'Room 205' },
    { time: '1:30-2:30', subject: 'Computer Science', teacher: 'Mr. David Kim', room: 'Computer Lab' }
  ],
  'Wednesday': [
    { time: '8:00-9:00', subject: 'History', teacher: 'Dr. Michael Brown', room: 'Room 302' },
    { time: '9:00-10:00', subject: 'Mathematics', teacher: 'Dr. Sarah Wilson', room: 'Room 101' },
    { time: '10:30-11:30', subject: 'English', teacher: 'Ms. Emily Parker', room: 'Room 205' },
    { time: '11:30-12:30', subject: 'Science', teacher: 'Mr. James Anderson', room: 'Lab 1' },
    { time: '1:30-2:30', subject: 'Music', teacher: 'Ms. Jennifer Lee', room: 'Music Room' }
  ],
  'Thursday': [
    { time: '8:00-9:00', subject: 'English', teacher: 'Ms. Emily Parker', room: 'Room 205' },
    { time: '9:00-10:00', subject: 'Science', teacher: 'Mr. James Anderson', room: 'Lab 1' },
    { time: '10:30-11:30', subject: 'Mathematics', teacher: 'Dr. Sarah Wilson', room: 'Room 101' },
    { time: '11:30-12:30', subject: 'Geography', teacher: 'Ms. Anna Clark', room: 'Room 203' },
    { time: '1:30-2:30', subject: 'Physical Education', teacher: 'Coach Robert', room: 'Gymnasium' }
  ],
  'Friday': [
    { time: '8:00-9:00', subject: 'Mathematics', teacher: 'Dr. Sarah Wilson', room: 'Room 101' },
    { time: '9:00-10:00', subject: 'Art', teacher: 'Ms. Lisa Thompson', room: 'Art Studio' },
    { time: '10:30-11:30', subject: 'Science', teacher: 'Mr. James Anderson', room: 'Lab 1' },
    { time: '11:30-12:30', subject: 'English', teacher: 'Ms. Emily Parker', room: 'Room 205' },
    { time: '1:30-2:30', subject: 'Library Period', teacher: 'Ms. Maria Garcia', room: 'Library' }
  ]
}

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const timeSlots = ['8:00-9:00', '9:00-10:00', '10:30-11:30', '11:30-12:30', '1:30-2:30']

export default function Timetable() {
  const { user } = useAuth()
  const [selectedGrade, setSelectedGrade] = useState('grade-10')
  const [selectedClass, setSelectedClass] = useState('10A')

  const canManage = user?.role === 'admin'

  const getSubjectColor = (subject: string) => {
    const colors = {
      'Mathematics': 'bg-blue-100 text-blue-800 border-blue-200',
      'English': 'bg-green-100 text-green-800 border-green-200',
      'Science': 'bg-purple-100 text-purple-800 border-purple-200',
      'History': 'bg-orange-100 text-orange-800 border-orange-200',
      'Art': 'bg-pink-100 text-pink-800 border-pink-200',
      'Physical Education': 'bg-red-100 text-red-800 border-red-200',
      'Computer Science': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Music': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Geography': 'bg-teal-100 text-teal-800 border-teal-200',
      'Library Period': 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[subject as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Timetable</h1>
          <p className="text-gray-600">View and manage class schedules</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {canManage && (
            <>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grade-9">Grade 9</SelectItem>
                  <SelectItem value="grade-10">Grade 10</SelectItem>
                  <SelectItem value="grade-11">Grade 11</SelectItem>
                  <SelectItem value="grade-12">Grade 12</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10A">10A</SelectItem>
                  <SelectItem value="10B">10B</SelectItem>
                  <SelectItem value="10C">10C</SelectItem>
                </SelectContent>
              </Select>

              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Edit Schedule
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Weekly Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">25</div>
            <p className="text-xs text-muted-foreground">Per week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Classes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">Monday schedule</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Free Periods</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>
      </div>

      {/* Timetable Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule - {selectedClass}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Header */}
              <div className="grid grid-cols-6 gap-2 mb-4">
                <div className="font-medium text-gray-900 text-center py-2">Time</div>
                {weekDays.map(day => (
                  <div key={day} className="font-medium text-gray-900 text-center py-2 border-b-2 border-gray-200">
                    {day}
                  </div>
                ))}
              </div>

              {/* Timetable Body */}
              {timeSlots.map((timeSlot, index) => (
                <div key={timeSlot} className="grid grid-cols-6 gap-2 mb-2">
                  {/* Time Slot */}
                  <div className="flex items-center justify-center py-4 text-sm font-medium text-gray-600 border-r border-gray-200">
                    {timeSlot}
                  </div>
                  
                  {/* Classes for each day */}
                  {weekDays.map(day => {
                    const classInfo = mockTimetable[day as keyof typeof mockTimetable][index]
                    
                    return (
                      <div key={`${day}-${timeSlot}`} className="min-h-[80px]">
                        {classInfo && (
                          <div className={`p-3 rounded-lg border ${getSubjectColor(classInfo.subject)} h-full flex flex-col justify-between`}>
                            <div>
                              <h4 className="font-semibold text-sm truncate">{classInfo.subject}</h4>
                              <div className="flex items-center text-xs opacity-75 mt-1">
                                <User className="w-3 h-3 mr-1" />
                                <span className="truncate">{classInfo.teacher}</span>
                              </div>
                            </div>
                            <div className="flex items-center text-xs opacity-75 mt-2">
                              <MapPin className="w-3 h-3 mr-1" />
                              <span>{classInfo.room}</span>
                            </div>
                          </div>
                        )}
                        
                        {!classInfo && index === 1 && (
                          <div className="h-full flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                            <div className="text-center">
                              <Clock className="w-6 h-6 mx-auto mb-1" />
                              <span>Break</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockTimetable.Monday.map((classInfo, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="text-sm font-medium">{classInfo.time.split('-')[0]}</div>
                    <div className="text-xs text-gray-500">{classInfo.time.split('-')[1]}</div>
                  </div>
                  
                  <div className="w-px h-12 bg-gray-300"></div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900">{classInfo.subject}</h4>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-1" />
                        {classInfo.teacher}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {classInfo.room}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${getSubjectColor(classInfo.subject)}`}>
                  {classInfo.subject}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
