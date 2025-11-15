import { useEffect, useState, FormEvent } from 'react'
import { Plus, DollarSign, Search, Filter, Calendar, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { useAuth, useApi } from '../contexts/AuthContext'
import { useNavigate } from 'react-router'

// --- Types based on API/Schema ---
type FeeStructure = {
  id: string;
  fee_type: string; // 'name' in mock data
  amount: number;
  grade: string;
  term: string; // 'type' in mock data
  academic_year: string;
  // 'status' is in mock data but not in 'fee_structures' table
}

type StudentFee = {
  id: string;
  description: string; // Not in API, but fee_type is.
  fee_type: string;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  payment_status: string;
  first_name: string;
  last_name: string;
}

type FeeCollection = {
  studentId: string;
  studentName: string;
  grade: string; // Not in API, would need to join with students
  totalDue: number;
  paid: number;
  outstanding: number;
  lastPayment: string; // Not in API
}

// Mock data removed

export default function Fees() {
  const { user } = useAuth()
  const api = useApi()
  const navigate = useNavigate()
  
  const [activeTab, setActiveTab] = useState(user?.role === 'admin' ? 'structure' : 'fees')
  const [isFeeStructureDialogOpen, setIsFeeStructureDialogOpen] = useState(false)
  
  // --- State for fetched data ---
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([])
  const [studentFees, setStudentFees] = useState<StudentFee[]>([])
  const [feeCollection, setFeeCollection] = useState<FeeCollection[]>([])
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // --- State for forms ---
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [feeStructureForm, setFeeStructureForm] = useState({
    fee_type: '',
    amount: '',
    grade: 'All Grades',
    term: '',
    academic_year: ''
  })

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        if (isAdmin) {
          // Admin fetches all structures and all student fees
          const [structuresRes, collectionRes] = await Promise.all([
            api('/api/fee-structures'),
            api('/api/fees')
          ])

          if (!structuresRes.ok) throw new Error('Failed to fetch fee structures')
          const structuresData = await structuresRes.json()
          setFeeStructures(structuresData.data || [])

          if (!collectionRes.ok) throw new Error('Failed to fetch fee collection')
          const collectionData = await collectionRes.json()
          
          // --- Aggregate FeeCollection data (Temporary client-side solution) ---
          // Your backend GET /api/fees returns individual fee items.
          // The UI expects data aggregated by student.
          // This aggregation should be moved to a new backend endpoint for production.
          const collectionMap: Record<string, FeeCollection> = {}
          const rawFees: StudentFee[] = collectionData.data || []
          
          rawFees.forEach(fee => {
            const studentId = fee.student_id.toString() // Assuming student_id is on the fee
            if (!collectionMap[studentId]) {
              collectionMap[studentId] = {
                studentId: studentId,
                studentName: `${fee.first_name} ${fee.last_name}`,
                grade: 'N/A', // <-- This is missing. You need to join with students.
                totalDue: 0,
                paid: 0,
                outstanding: 0,
                lastPayment: 'N/A' // This is missing.
              }
            }
            collectionMap[studentId].totalDue += Number(fee.amount_due)
            collectionMap[studentId].paid += Number(fee.amount_paid)
            collectionMap[studentId].outstanding = collectionMap[studentId].totalDue - collectionMap[studentId].paid
          })
          setFeeCollection(Object.values(collectionMap))
          // --- End of aggregation ---

        } else {
          // Parent/Student fetches only their own fees
          const feesRes = await api('/api/fees')
          if (!feesRes.ok) throw new Error('Failed to fetch fees')
          const feesData = await feesRes.json()
          setStudentFees(feesData.data || [])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [api, isAdmin])

  const handleFeeStructureSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFormError(null)
    try {
      const response = await api('/api/fee-structures', {
        method: 'POST',
        body: JSON.stringify({
          ...feeStructureForm,
          amount: parseFloat(feeStructureForm.amount)
        }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create fee structure')
      }
      const newStructure = await response.json()
      setFeeStructures(prev => [newStructure.data, ...prev])
      setIsFeeStructureDialogOpen(false)
      setFeeStructureForm({ fee_type: '', amount: '', grade: 'All Grades', term: '', academic_year: '' })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSubmitting(false)
    }
  }

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
              <form onSubmit={handleFeeStructureSubmit}>
                <DialogHeader>
                  <DialogTitle>Add Fee Structure</DialogTitle>
                  <DialogDescription>Create a new fee type for students</DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="feeName">Fee Name</Label>
                    <Input id="feeName" placeholder="e.g., Tuition Fee" value={feeStructureForm.fee_type} onChange={e => setFeeStructureForm({...feeStructureForm, fee_type: e.target.value})} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount ($)</Label>
                      <Input id="amount" type="number" placeholder="1200" value={feeStructureForm.amount} onChange={e => setFeeStructureForm({...feeStructureForm, amount: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Payment Type</Label>
                      <Select value={feeStructureForm.term} onValueChange={(value) => setFeeStructureForm({...feeStructureForm, term: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                          <SelectItem value="Semester">Semester</SelectItem>
                          <SelectItem value="Annual">Annual</SelectItem>
                          <SelectItem value="One-time">One-time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="applicable">Applicable To (Grade)</Label>
                      <Input id="applicable" placeholder="e.g., All Grades, Grade 9" value={feeStructureForm.grade} onChange={e => setFeeStructureForm({...feeStructureForm, grade: e.target.value})} />
                    </div>
                     <div className="space-y-2">
                      <Label htmlFor="academic_year">Academic Year</Label>
                      <Input id="academic_year" placeholder="e.g., 2024-2025" value={feeStructureForm.academic_year} onChange={e => setFeeStructureForm({...feeStructureForm, academic_year: e.target.value})} />
                    </div>
                  </div>
                  {formError && <p className="text-sm text-red-500">{formError}</p>}
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsFeeStructureDialogOpen(false)} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Fee Structure'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? <p>Loading fee structures...</p> : error ? <p className="text-red-500">{error}</p> : (
          <div className="grid gap-4">
            {feeStructures.map((fee) => (
              <Card key={fee.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{fee.fee_type}</h3>
                        <p className="text-sm text-gray-600">{fee.grade} • {fee.term}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">${fee.amount}</p>
                        <p className="text-xs text-gray-500">{fee.term}</p>
                      </div>
                      
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Active
                      </span>
                      
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="collection" className="space-y-6">
        {/* ... (Header and summary cards remain the same) ... */}
        
        <div className="space-y-4">
          {isLoading ? <p>Loading fee collections...</p> : error ? <p className="text-red-500">{error}</p> : (
            mockFeeCollection.map((student) => (
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
            ))
          )}
        </div>
      </TabsContent>
      {/* ... (Reports Tab remains the same) ... */}
    </Tabs>
  )

  const renderParentStudentView = () => (
    <div className="space-y-6">
      {/* ... (Header and summary cards remain the same) ... */}

      <Card>
        <CardHeader>
          <CardTitle>Fee Details</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <p>Loading fees...</p> : error ? <p className="text-red-500">{error}</p> : (
            <div className="space-y-4">
              {studentFees.map((fee) => (
                <div key={fee.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      fee.payment_status === 'paid' ? 'bg-green-500' :
                      fee.payment_status === 'overdue' ? 'bg-red-500' :
                      'bg-yellow-500'
                    }`}></div>
                    <div>
                      <h4 className="font-medium">{fee.fee_type}</h4>
                      <p className="text-sm text-gray-600">{fee.description || fee.fee_type}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <p className="font-semibold">${fee.amount_due}</p>
                      <p className="text-sm text-gray-500">Due: {new Date(fee.due_date).toLocaleDateString()}</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      {fee.payment_status === 'paid' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : fee.payment_status === 'overdue' ? (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-yellow-500" />
                      )}
                      
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        fee.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                        fee.payment_status === 'overdue' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {fee.payment_status}
                      </span>
                    </div>

                    {fee.payment_status !== 'paid' && (
                      <Button size="sm">Pay Now</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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