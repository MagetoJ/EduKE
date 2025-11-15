import { useEffect, useState } from 'react'
import { AlertTriangle, Calendar, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { useApi, useAuth } from '../contexts/AuthContext'

type DisciplineRecord = {
  id: number
  student_id: number
  teacher_id: number | null
  type: string
  severity: string
  description: string
  date: string
  status: string
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const apiFetch = useApi()
  const [disciplineData, setDisciplineData] = useState<DisciplineRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDisciplineData = async () => {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const response = await apiFetch('/api/discipline')
        if (response.ok) {
          const data = await response.json()
          setDisciplineData(data.data || [])
        }
      } catch (error) {
        console.error('Error fetching discipline data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDisciplineData()
  }, [apiFetch, user])

  const displayData = disciplineData

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Minor':
        return 'bg-yellow-100 text-yellow-800'
      case 'Moderate':
        return 'bg-orange-100 text-orange-800'
      case 'Major':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Resolved':
        return 'bg-green-100 text-green-800'
      case 'Warning issued':
        return 'bg-blue-100 text-blue-800'
      case 'Parent notified':
        return 'bg-purple-100 text-purple-800'
      case 'Pending':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
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
              {displayData.filter((record) => record.status === 'Resolved').length}
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
              {displayData.filter((record) => record.status !== 'Resolved').length}
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
              <div key={record.id} className="space-y-3 rounded-lg border p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 text-orange-500" />
                    <div>
                      <h4 className="font-medium">{record.type}</h4>
                      <p className="text-sm text-gray-600">{record.description}</p>
                      <p className="mt-1 text-xs text-gray-500">Reported on {record.date}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <div className={`rounded-full px-2 py-1 text-xs font-medium ${getSeverityColor(record.severity)}`}>
                      {record.severity}
                    </div>
                    <div className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(record.status)}`}>
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
