import { Link, useLocation } from 'react-router'
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  MessageSquare,
  DollarSign,
  Settings,
  School,
  BarChart3,
  UserCheck,
  FileText,
  Clock,
  CreditCard,
  Menu,
  X,
  Zap,
  Bus,
  Home,
  TrendingUp
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../contexts/AuthContext'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['super_admin', 'admin', 'teacher', 'parent', 'student', 'registrar', 'exam_officer', 'hod', 'timetable_manager', 'transport_manager', 'class_teacher', 'boarding_master', 'cbc_coordinator', 'hr_manager', 'admission_officer', 'nurse']
  },
  {
    title: 'Schools',
    href: '/dashboard/schools',
    icon: School,
    roles: ['super_admin']
  },
  {
    title: 'School Admins',
    href: '/dashboard/school-admins',
    icon: UserCheck,
    roles: ['super_admin']
  },
  {
    title: 'Subscriptions',
    href: '/dashboard/subscriptions',
    icon: CreditCard,
    roles: ['super_admin']
  },
  {
    title: 'Students',
    href: '/dashboard/students',
    icon: Users,
    roles: ['admin', 'teacher', 'registrar', 'exam_officer', 'hod', 'admission_officer', 'class_teacher']
  },
  {
    title: 'Staff',
    href: '/dashboard/staff',
    icon: UserCheck,
    roles: ['admin', 'registrar', 'hod', 'hr_manager']
  },
  {
    title: 'Academics',
    href: '/dashboard/academics',
    icon: BookOpen,
    roles: ['admin', 'teacher', 'exam_officer', 'hod', 'cbc_coordinator', 'class_teacher']
  },
  {
    title: 'My Progress',
    href: '/dashboard/progress',
    icon: BarChart3,
    roles: ['parent', 'student']
  },
  {
    title: 'Parent Portal',
    href: '/dashboard/parent',
    icon: Users,
    roles: ['parent']
  },
  {
    title: 'My Discipline',
    href: '/dashboard/student-dashboard',
    icon: FileText,
    roles: ['student']
  },
  {
    title: 'Teacher Portal',
    href: '/dashboard/teacher-dashboard',
    icon: BookOpen,
    roles: ['teacher', 'hod', 'class_teacher']
  },
  {
    title: 'Timetable',
    href: '/dashboard/timetable',
    icon: Calendar,
    roles: ['admin', 'teacher', 'parent', 'student', 'timetable_manager', 'registrar', 'hod']
  },
  {
    title: 'Communications',
    href: '/dashboard/communications',
    icon: MessageSquare,
    roles: ['admin', 'teacher', 'parent', 'registrar', 'hod', 'hr_manager', 'admission_officer', 'nurse']
  },
  {
    title: 'Fees',
    href: '/dashboard/fees',
    icon: DollarSign,
    roles: ['admin', 'parent', 'student', 'registrar', 'super_admin']
  },
  {
    title: 'Leave Management',
    href: '/dashboard/leave',
    icon: Clock,
    roles: ['admin', 'teacher', 'hod', 'hr_manager']
  },
  {
    title: 'Reports',
    href: '/dashboard/reports',
    icon: BarChart3,
    roles: ['admin', 'super_admin', 'registrar', 'exam_officer', 'hod', 'hr_manager']
  },
  {
    title: 'CBC',
    href: '/dashboard/cbc',
    icon: Zap,
    roles: ['admin', 'teacher', 'hod', 'cbc_coordinator']
  },
  {
    title: 'Transport',
    href: '/dashboard/transport',
    icon: Bus,
    roles: ['admin', 'transport_manager']
  },
  {
    title: 'Boarding',
    href: '/dashboard/boarding',
    icon: Home,
    roles: ['admin', 'registrar', 'boarding_master']
  },
  {
    title: 'Curriculum Assessment',
    href: '/dashboard/curriculum-assessment',
    icon: TrendingUp,
    roles: ['admin', 'teacher', 'exam_officer', 'hod', 'cbc_coordinator']
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    roles: ['admin', 'super_admin']
  }
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const location = useLocation()
  const { user } = useAuth()

  if (!user) return null

  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(user.role)
  )

  const NavContent = () => (
    <>
      <div className="h-16 flex items-center px-6 border-b border-slate-100 bg-white">
        <div className="h-8 w-8 bg-slate-900 rounded-md flex items-center justify-center mr-3 shadow-sm">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-bold text-slate-800 text-lg tracking-tight">EduKE</span>
        </div>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const Icon = item.icon
          const isActive = item.href === '/dashboard' 
            ? location.pathname === '/dashboard'
            : location.pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 text-sm font-medium group',
                isActive 
                  ? 'bg-teal-50 text-teal-700 shadow-sm border border-teal-100' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              )}
            >
              <Icon className={cn(
                'w-5 h-5 transition-colors',
                isActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'
              )} />
              {item.title}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        {user.schoolName && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <School className="w-3 h-3" />
            <span className="truncate font-medium">{user.schoolName}</span>
          </div>
        )}
      </div>
    </>
  )

  return (
    <>
      <aside className="w-64 bg-white border-r border-slate-200 flex-col hidden md:flex shadow-sm">
        <NavContent />
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div 
            className="absolute inset-0 bg-black/50 transition-opacity duration-300"
            onClick={onClose}
          />
        </div>
      )}

      <div 
        className={cn(
          'fixed left-0 top-0 h-full w-64 bg-white flex flex-col shadow-lg z-50 md:hidden transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <NavContent />
      </div>
    </>
  )
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-slate-700 hover:bg-slate-100 transition-colors"
      aria-label="Toggle menu"
    >
      <Menu className="w-6 h-6" />
    </button>
  )
}

export function MobileMenuClose({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center p-2 rounded-md text-slate-700 hover:bg-slate-100 transition-colors"
      aria-label="Close menu"
    >
      <X className="w-6 h-6" />
    </button>
  )
}
