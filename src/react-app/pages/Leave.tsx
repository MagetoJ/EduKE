import { useState } from 'react'
import { Plus, Calendar, Clock, CheckCircle, XCircle, FileText } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Textarea } from '../components/ui/textarea'
import { useAuth } from '../contexts/AuthContext'

// Mock leave requests data
const mockLeaveRequests = [
  {
    id: '1',
    staffName: 'Dr. Sarah Wilson',
    type: 'Sick Leave',
    startDate: '2024-03-15',
    endDate: '2024-03-17',
    days: 3,
    reason: 'Medical appointment and recovery',
    status: 'Pending',
    submittedDate: '2024-03-10'
  },
  {
    id: '2',
    staffName: 'Mr. James Anderson',
    type: 'Annual Leave',
    startDate: '2024-03-20',
    endDate: '2024-03-25',
    days: 5,
    reason: 'Family vacation',
    status: 'Approved',
    submittedDate: '2024-03-08'
  },
  {
    id: '3',
    staffName: 'Ms. Lisa Thompson',
    type: 'Maternity Leave',
    startDate: '2024-04-01',
    endDate: '2024-06-30',
    days: 91,
    reason: 'Maternity leave',
    status: 'Approved',
    submittedDate: '2024-02-15'
  }
]

export default function Leave() {
  const { user } = useAuth()
  const [leaveRequests, setLeaveRequests] = useState(mockLeaveRequests)
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false)
  const [newRequest, setNewRequest] = useState({
    type: '',
    startDate: '',
    endDate: '',
    reason: ''
  })

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const isTeacher = user?.role === 'teacher'

  const handleLeaveAction = (requestId: string, action: 'approve' | 'deny') => {
    setLeaveRequests(prev =>
      prev.map(request =>
        request.id === requestId
          ? { ...request, status: action === 'approve' ? 'Approved' : 'Denied' }
          : request
      )
    )
  }

  const handleSubmitRequest = () => {
    if (!newRequest.type || !newRequest.startDate || !newRequest.endDate || !newRequest.reason) return

    const start = new Date(newRequest.startDate)
    const end = new Date(newRequest.endDate)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const request = {
      id: Date.now().toString(),
      staffName: user?.name || 'Unknown',
      type: newRequest.type,
      startDate: newRequest.startDate,
      endDate: newRequest.endDate,
      days,
      reason: newRequest.reason,
      status: 'Pending',
      submittedDate: new Date().toISOString().split('T')[0]
    }

    setLeaveRequests(prev => [request, ...prev])
    setNewRequest({ type: '', startDate: '', endDate: '', reason: '' })
    setIsRequestDialogOpen(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'text-green-600 bg-green-50'
      case 'Denied': return 'text-red-600 bg-red-50'
      default: return 'text-yellow-600 bg-yellow-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircle className="w-4 h-4" />
      case 'Denied': return <XCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leave Management</h1>
          <p className="text-muted-foreground">
            {isAdmin ? 'Manage leave requests from staff members' : 'Request and track your leave applications'}
          </p>
        </div>

        {isTeacher && (
          <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Request Leave
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Leave</DialogTitle>
                <DialogDescription>
                  Submit a new leave request. Your request will be reviewed by an administrator.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="type">Leave Type</Label>
                  <Select value={newRequest.type} onValueChange={(value) => setNewRequest(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Annual Leave">Annual Leave</SelectItem>
                      <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                      <SelectItem value="Maternity Leave">Maternity Leave</SelectItem>
                      <SelectItem value="Paternity Leave">Paternity Leave</SelectItem>
                      <SelectItem value="Emergency Leave">Emergency Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <input
                      type="date"
                      id="startDate"
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      value={newRequest.startDate}
                      onChange={(e) => setNewRequest(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <input
                      type="date"
                      id="endDate"
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      value={newRequest.endDate}
                      onChange={(e) => setNewRequest(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    placeholder="Please provide details about your leave request..."
                    value={newRequest.reason}
                    onChange={(e) => setNewRequest(prev => ({ ...prev, reason: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitRequest}>
                  Submit Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-6">
        {leaveRequests.map((request) => (
          <Card key={request.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{request.staffName}</CardTitle>
                    <p className="text-sm text-muted-foreground">{request.type}</p>
                  </div>
                </div>
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                  {getStatusIcon(request.status)}
                  <span>{request.status}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">
                    {request.startDate} to {request.endDate}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{request.days} days</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Submitted: {request.submittedDate}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                <strong>Reason:</strong> {request.reason}
              </p>

              {isAdmin && request.status === 'Pending' && (
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => handleLeaveAction(request.id, 'approve')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleLeaveAction(request.id, 'deny')}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Deny
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}