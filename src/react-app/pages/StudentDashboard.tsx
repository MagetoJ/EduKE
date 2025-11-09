import { useState, useEffect } from 'react'
import { AlertTriangle, Calendar, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { useAuth } from '../contexts/AuthContext'

export default function StudentDashboard() {
  const { user } = useAuth()
  const [disciplineData, setDisciplineData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDisciplineData = async () => {
      try {
        // In a real app, we'd get the student ID from the logged-in user
        // For now, using a mock student ID
        const response = await fetch('/api/discipline/1') // Mock student ID
        if (response.ok) {
          const data = await response.json()
          setDisciplineData(data)
        }
      } catch (error) {
        console.error('Error fetching discipline data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDisciplineData()
  }, [])

  // Mock data as fallback
  const mockDisciplineData = [
    {
      id: 1,
      date: '2024-01-15',
      type: 'Late to class',
      severity: 'Minor',
      status: 'Resolved',
      description: 'Arrived 10 minutes late to Mathematics class',
      teacher: 'Mr. Johnson'
    },
    {
      id: 2,
      date: '2024-01-20',
      type: 'Incomplete homework',
      severity: 'Minor',
      status: 'Warning issued',
      description: 'Failed to submit Science homework assignment',
      teacher: 'Ms. Davis'
    },
    {
      id: 3,
      date: '2024-02-05',
      type: 'Disruptive behavior',
      severity: 'Moderate',
      status: 'Parent notified',
      description: 'Talking during class time',
      teacher: 'Mr. Wilson'
    }
  ]

  const displayData = disciplineData.length > 0 ? disciplineData : mockDisciplineData

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Minor': return 'bg-yellow-100 text-yellow-800'
      case 'Moderate': return 'bg-orange-100 text-orange-800'
      case 'Major': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Resolved': return 'bg-green-100 text-green-800'
      case 'Warning issued': return 'bg-blue-100 text-blue-800'
      case 'Parent notified': return 'bg-purple-100 text-purple-800'
      case 'Pending': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Discipline Records</h1>
          <p className="text-gray-600">View your disciplinary history and current status</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayData.length}</div>
            <p className="text-xs text-muted-foreground">Disciplinary incidents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {displayData.filter(record => record.status === 'Resolved').length}
            </div>
            <p className="text-xs text-muted-foreground">Cases resolved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {displayData.filter(record => record.status !== 'Resolved').length}
            </div>
            <p className="text-xs text-muted-foreground">Pending cases</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Discipline History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {displayData.map((record) => (
              <div key={record.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">{record.type}</h4>
                      <p className="text-sm text-gray-600">{record.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Reported by: Teacher • {record.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(record.severity)}`}>
                      {record.severity}
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                      {record.status}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Important Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Disciplinary records are maintained for your academic development.</p>
            <p>• Parents are notified of moderate and major incidents.</p>
            <p>• Good behavior is recognized and rewarded by the school.</p>
            <p>• If you have questions about any record, please contact your class teacher.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}