import { Bell, Search, LogOut, User as UserIcon } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { useAuth } from '../../contexts/AuthContext'
import { ThemeToggle } from '../ThemeToggle'

export default function Header() {
  const { user, logout } = useAuth()

  if (!user) return null

  return (
    <header className="h-16 bg-slate-800 flex items-center justify-between px-8 shadow-sm z-10 shrink-0">
      <div className="flex items-center space-x-4 flex-1">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input
            placeholder="Search system..."
            className="pl-10 w-full bg-slate-700/50 border-slate-600 text-slate-100 placeholder:text-slate-400 focus-visible:ring-teal-500 focus-visible:border-teal-500"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white hover:bg-slate-700">
          <Bell className="w-5 h-5" />
        </Button>

        <ThemeToggle />

        <div className="h-8 w-[1px] bg-slate-600 mx-2" />

        <div className="flex items-center space-x-3 pl-2">
          <div className="flex flex-col items-end">
            <p className="text-sm font-medium text-white">{user.name}</p>
            <p className="text-xs text-slate-400 capitalize">
              {user.role.replace('_', ' ')}
            </p>
          </div>
          <div className="h-9 w-9 bg-teal-600 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-slate-700">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="h-full w-full rounded-full object-cover" />
            ) : (
              <UserIcon size={18} />
            )}
          </div>
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={logout}
          className="text-slate-300 hover:text-red-400 hover:bg-slate-700 ml-2"
        >
          <LogOut className="w-5 h-5" />
        </Button>
      </div>
    </header>
  )
}
