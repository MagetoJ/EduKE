import { useState } from 'react'
import { Plus, Send, MessageSquare, Megaphone, Calendar, Users, Search } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { useAuth } from '../contexts/AuthContext'

// Mock announcements data
const mockAnnouncements = [
  {
    id: '1',
    title: 'Parent-Teacher Conference Scheduled',
    content: 'Annual parent-teacher conferences will be held from March 15-17. Please schedule your appointments through the school portal.',
    author: 'Dr. Sarah Johnson',
    date: '2024-03-10',
    audience: 'Parents',
    priority: 'High'
  },
  {
    id: '2',
    title: 'Spring Break Schedule',
    content: 'School will be closed from March 25 to April 2 for spring break. Classes will resume on April 3.',
    author: 'Administration',
    date: '2024-03-08',
    audience: 'All',
    priority: 'Medium'
  },
  {
    id: '3',
    title: 'New Science Lab Equipment',
    content: 'We are excited to announce the arrival of new laboratory equipment for our science department.',
    author: 'Mr. James Anderson',
    date: '2024-03-05',
    audience: 'Students',
    priority: 'Low'
  }
]

// Mock messages data
const mockMessages = [
  {
    id: '1',
    from: 'Jennifer Davis',
    to: 'Dr. Sarah Johnson',
    subject: 'Question about Emma\'s homework',
    content: 'Hello, I wanted to ask about the math assignment Emma received yesterday...',
    date: '2024-03-10 14:30',
    read: false,
    type: 'received'
  },
  {
    id: '2',
    from: 'Dr. Sarah Johnson',
    to: 'Michael Brown',
    subject: 'Grade Report Available',
    content: 'Hi Mr. Brown, your child\'s quarterly grade report is now available in the portal.',
    date: '2024-03-09 10:15',
    read: true,
    type: 'sent'
  }
]

export default function Communications() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('announcements')
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false)
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false)

  const canCreateContent = user?.role === 'admin' || user?.role === 'teacher'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Communications</h1>
          <p className="text-gray-600">Manage announcements, messages, and school communications</p>
        </div>
        
        <div className="flex space-x-2">
          {canCreateContent && (
            <>
              <Dialog open={isAnnouncementDialogOpen} onOpenChange={setIsAnnouncementDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Megaphone className="w-4 h-4 mr-2" />
                    New Announcement
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Announcement</DialogTitle>
                    <DialogDescription>
                      Create a new announcement for the school community
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input id="title" placeholder="Enter announcement title" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="content">Content</Label>
                      <textarea 
                        id="content" 
                        className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                        placeholder="Enter announcement content..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="audience">Audience</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select audience" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="students">Students</SelectItem>
                            <SelectItem value="parents">Parents</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAnnouncementDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setIsAnnouncementDialogOpen(false)}>
                      Publish Announcement
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    New Message
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Compose Message</DialogTitle>
                    <DialogDescription>
                      Send a message to parents, students, or staff
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipient">Recipient</Label>
                      <Input id="recipient" placeholder="Search and select recipient..." />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input id="subject" placeholder="Enter message subject" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="messageContent">Message</Label>
                      <textarea 
                        id="messageContent" 
                        className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                        placeholder="Enter your message..."
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsMessageDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setIsMessageDialogOpen(false)}>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="announcements" className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search announcements..."
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-4">
            {mockAnnouncements.map((announcement) => (
              <Card key={announcement.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <CardTitle className="text-lg">{announcement.title}</CardTitle>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          announcement.priority === 'High' 
                            ? 'bg-red-100 text-red-800'
                            : announcement.priority === 'Medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {announcement.priority}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>By {announcement.author}</span>
                        <span>•</span>
                        <span>{announcement.date}</span>
                        <span>•</span>
                        <div className="flex items-center space-x-1">
                          <Users className="w-3 h-3" />
                          <span>{announcement.audience}</span>
                        </div>
                      </div>
                    </div>
                    <Megaphone className="w-5 h-5 text-gray-400" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-gray-700">{announcement.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="messages" className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search messages..."
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-4">
            {mockMessages.map((message) => (
              <Card key={message.id} className={`hover:shadow-md transition-shadow ${!message.read && message.type === 'received' ? 'border-l-4 border-l-blue-500' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium">{message.subject}</h4>
                        {!message.read && message.type === 'received' && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                        <span>{message.type === 'sent' ? 'To:' : 'From:'} {message.type === 'sent' ? message.to : message.from}</span>
                        <span>•</span>
                        <span>{message.date}</span>
                      </div>
                      <p className="text-gray-700 text-sm">{message.content}</p>
                    </div>
                    <MessageSquare className="w-5 h-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>School Events</CardTitle>
                {canCreateContent && (
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Event
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">School Events Calendar</h3>
                <p>Manage and view upcoming school events, meetings, and activities</p>
                {canCreateContent && (
                  <Button className="mt-4">Create First Event</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
