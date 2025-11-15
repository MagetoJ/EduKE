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
  CreditCard
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
    roles: ['super_admin', 'admin', 'teacher', 'parent', 'student']
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
    roles: ['admin', 'teacher']
  },
  {
    title: 'Staff',
    href: '/dashboard/staff',
    icon: UserCheck,
    roles: ['admin']
  },
  {
    title: 'Academics',
    href: '/dashboard/academics',
    icon: BookOpen,
    roles: ['admin', 'teacher']
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
    roles: ['teacher']
  },
  {
    title: 'Timetable',
    href: '/dashboard/timetable',
    icon: Calendar,
    roles: ['admin', 'teacher', 'parent', 'student']
  },
  {
    title: 'Communications',
    href: '/dashboard/communications',
    icon: MessageSquare,
    roles: ['admin', 'teacher', 'parent']
  },
  {
    title: 'Fees',
    href: '/dashboard/fees',
    icon: DollarSign,
    roles: ['admin', 'parent', 'student']
  },
  {
    title: 'Leave Management',
    href: '/dashboard/leave',
    icon: Clock,
    roles: ['admin', 'teacher']
  },
  {
    title: 'Reports',
    href: '/dashboard/reports',
    icon: BarChart3,
    roles: ['admin', 'super_admin']
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    roles: ['admin', 'super_admin']
  }
]

export default function Sidebar() {
  const location = useLocation()
  const { user } = useAuth()

  if (!user) return null

  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(user.role)
  )

  return (
    <div className="w-64 bg-card border-r border-border h-screen flex flex-col">
      <div className="p-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-card-foreground">EduKE</h1>
            {user.schoolName && (
              <p className="text-sm text-muted-foreground">{user.schoolName}</p>
            )}
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {filteredNavItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.href || 
            (item.href !== '/dashboard' && location.pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground border-r-2 border-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className={cn(
                'mr-3 h-4 w-4',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )} />
              {item.title}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <img
            src={user.avatar}
            alt={user.name}
            className="w-8 h-8 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-card-foreground truncate">
              {user.name}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {user.role.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
