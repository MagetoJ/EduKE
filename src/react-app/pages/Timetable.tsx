import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { useAuth, useApi } from '../contexts/AuthContext'
import { Input } from '../components/ui/input'
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

// --- Type Definitions ---
type TimetableEntry = {
  id: string;
  day_of_week: string;
  grade: string;
  room: string;
  course_name: string;
  teacher_name: string;
  period_name: string; // From join
  start_time: string; // From join
  end_time: string; // From join
  // Fields needed for forms
  course_id: string;
  period_id: string;
};

type Course = {
  id: string;
  name: string;
};

type TimePeriod = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
};

type FormData = {
  id?: string;
  course_id: string;
  period_id: string;
  day_of_week: string;
  grade: string;
  room: string;
};

const EMPTY_FORM: FormData = {
  course_id: '',
  period_id: '',
  day_of_week: 'Monday',
  grade: '',
  room: ''
};

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function Timetable() {
  const { user } = useAuth()
  const api = useApi()

  // --- State for Data ---
  const [timetableData, setTimetableData] = useState<TimetableEntry[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [periods, setPeriods] = useState<TimePeriod[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // --- State for Dialogs ---
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const [formData, setFormData] = useState<FormData>(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // --- Data Fetching ---
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [tableRes, courseRes, periodRes] = await Promise.all([
          api('/api/timetable'),
          api('/api/courses'),
          api('/api/timetable-periods')
        ])

        if (!tableRes.ok) throw new Error('Failed to fetch timetable')
        if (!courseRes.ok) throw new Error('Failed to fetch courses')
        if (!periodRes.ok) throw new Error('Failed to fetch time periods')

        const tableData = await tableRes.json()
        const courseData = await courseRes.json()
        const periodData = await periodRes.json()

        setTimetableData(tableData.data || [])
        setCourses(courseData.data || [])
        setPeriods(periodData.data || [])

      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [api])

  const handleFormChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // --- Add Entry ---
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFormError(null)

    try {
      const res = await api('/api/timetable', {
        method: 'POST',
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create entry')

      // Add new entry to state (manually joining names)
      const course = courses.find(c => c.id === data.data.course_id)
      const period = periods.find(p => p.id === data.data.period_id)

      const newEntry: TimetableEntry = {
        ...data.data,
        course_name: course?.name || 'Unknown',
        teacher_name: 'N/A', // POST route doesn't join this, fine for now
        period_name: period?.name || 'Unknown',
        start_time: period?.start_time || '',
        end_time: period?.end_time || '',
      }

      setTimetableData(prev => [newEntry, ...prev])
      setIsAddDialogOpen(false)
      setFormData(EMPTY_FORM)

    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Edit Entry ---
  const handleOpenEditDialog = (entry: TimetableEntry) => {
    setFormError(null)
    setFormData({
      id: entry.id,
      course_id: entry.course_id,
      period_id: entry.period_id,
      day_of_week: entry.day_of_week,
      grade: entry.grade,
      room: entry.room,
    })
    setIsEditDialogOpen(true)
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFormError(null)

    if (!formData.id) {
      setFormError('No ID found, cannot update.')
      return;
    }

    try {
      const res = await api(`/api/timetable/${formData.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update entry')

      // Update entry in state (manually joining names)
      const course = courses.find(c => c.id === data.data.course_id)
      const period = periods.find(p => p.id === data.data.period_id)

      const updatedEntry: TimetableEntry = {
        ...data.data,
        course_name: course?.name || 'Unknown',
        teacher_name: 'N/A', // PUT route doesn't join this
        period_name: period?.name || 'Unknown',
        start_time: period?.start_time || '',
        end_time: period?.end_time || '',
      }

      setTimetableData(prev => prev.map(item => item.id === updatedEntry.id ? updatedEntry : item))
      setIsEditDialogOpen(false)
      setFormData(EMPTY_FORM)

    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSubmitting(false)
    }
  }

  // --- Delete Entry ---
  const handleDelete = async (id: string) => {
    try {
      const res = await api(`/api/timetable/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete entry')
      }
      setTimetableData(prev => prev.filter(entry => entry.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  // Group data by day
  const groupedTimetable = timetableData.reduce((acc, entry) => {
    const day = entry.day_of_week;
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(entry);
    return acc;
  }, {} as Record<string, TimetableEntry[]>);

  const renderLoading = () => (
    <div className="flex items-center justify-center p-8 text-gray-600">
      <Loader2 className="w-6 h-6 animate-spin mr-2" />
      Loading timetable...
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

  const canManage = user?.role === 'admin'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Class Timetable</h1>
          <p className="text-gray-600">View and manage class schedules</p>
        </div>
        {canManage && (
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); setFormData(EMPTY_FORM); setFormError(null); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleAddSubmit}>
                <DialogHeader>
                  <DialogTitle>Add Timetable Entry</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  {/* Form fields... */}
                  <div className="space-y-2">
                    <Label htmlFor="day_of_week">Day of Week</Label>
                    <Select value={formData.day_of_week} onValueChange={(val) => handleFormChange('day_of_week', val)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="period_id">Time Period</Label>
                    <Select value={formData.period_id} onValueChange={(val) => handleFormChange('period_id', val)}>
                      <SelectTrigger><SelectValue placeholder="Select period" /></SelectTrigger>
                      <SelectContent>
                        {periods.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.start_time} - {p.end_time})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="course_id">Course</Label>
                    <Select value={formData.course_id} onValueChange={(val) => handleFormChange('course_id', val)}>
                      <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                      <SelectContent>
                        {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="grade">Grade</Label>
                    <Input
                      id="grade"
                      value={formData.grade}
                      onChange={(e) => handleFormChange('grade', e.target.value)}
                      placeholder="e.g., Grade 10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="room">Room</Label>
                    <Input
                      id="room"
                      value={formData.room}
                      onChange={(e) => handleFormChange('room', e.target.value)}
                      placeholder="e.g., Room 101"
                    />
                  </div>
                  {renderFormError(formError)}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Add Entry
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {renderError(error)}

      {isLoading ? renderLoading() : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {DAYS_OF_WEEK.map(day => (
            <Card key={day}>
              <CardHeader>
                <CardTitle className="text-lg">{day}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(groupedTimetable[day] || []).map(entry => (
                    <div key={entry.id} className="p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm text-gray-900">{entry.course_name}</h4>
                          <div className="text-xs text-gray-600 space-y-1 mt-1">
                            <div>{entry.period_name} ({entry.start_time} - {entry.end_time})</div>
                            <div>Grade: {entry.grade}</div>
                            <div>Room: {entry.room}</div>
                            {entry.teacher_name && <div>Teacher: {entry.teacher_name}</div>}
                          </div>
                        </div>
                        {canManage && (
                          <div className="flex gap-1 ml-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenEditDialog(entry)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:text-red-700">
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Timetable Entry</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this timetable entry? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(entry.id)} className="bg-red-600 hover:bg-red-700">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {(groupedTimetable[day] || []).length === 0 && (
                    <div className="text-center text-gray-500 text-sm py-4">
                      No classes scheduled
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      {canManage && (
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); setFormData(EMPTY_FORM); setFormError(null); }}>
          <DialogContent>
            <form onSubmit={handleEditSubmit}>
              <DialogHeader>
                <DialogTitle>Edit Timetable Entry</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_day_of_week">Day of Week</Label>
                  <Select value={formData.day_of_week} onValueChange={(val) => handleFormChange('day_of_week', val)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_period_id">Time Period</Label>
                  <Select value={formData.period_id} onValueChange={(val) => handleFormChange('period_id', val)}>
                    <SelectTrigger><SelectValue placeholder="Select period" /></SelectTrigger>
                    <SelectContent>
                      {periods.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.start_time} - {p.end_time})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_course_id">Course</Label>
                  <Select value={formData.course_id} onValueChange={(val) => handleFormChange('course_id', val)}>
                    <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                    <SelectContent>
                      {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_grade">Grade</Label>
                  <Input
                    id="edit_grade"
                    value={formData.grade}
                    onChange={(e) => handleFormChange('grade', e.target.value)}
                    placeholder="e.g., Grade 10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_room">Room</Label>
                  <Input
                    id="edit_room"
                    value={formData.room}
                    onChange={(e) => handleFormChange('room', e.target.value)}
                    placeholder="e.g., Room 101"
                  />
                </div>
                {renderFormError(formError)}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Update Entry
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}