import { useState, useEffect } from 'react'
import { Plus, Send, MessageSquare, Megaphone, Calendar, Users, Search } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { useAuth, useApi } from '../contexts/AuthContext'

export default function Communications() {
  const { user } = useAuth()
  const api = useApi()
  const [activeTab, setActiveTab] = useState('announcements')
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false)
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false)
  const [announcements, setAnnouncements] = useState([])
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Announcement form state
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    audience: '',
    priority: ''
  })
  
  // Message form state
  const [messageForm, setMessageForm] = useState({
    recipient: '',
    subject: '',
    content: ''
  })

  const canCreateContent = user?.role === 'admin' || user?.role === 'teacher'

  // Fetch messages on component mount
  useEffect(() => {
    fetchMessages()
  }, [])

  const fetchMessages = async () => {
    try {
      setIsLoading(true)
      const response = await api('/api/messages')
      const data = await response.json()
      
      if (data.success) {
        setMessages(data.data)
      }
    } catch (err) {
      console.error('Error fetching messages:', err)
      setError('Failed to load messages')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnnouncementSubmit = async () => {
    if (!announcementForm.title || !announcementForm.content || !announcementForm.audience || !announcementForm.priority) {
      setError('Please fill in all fields')
      return
    }

    try {
      setIsLoading(true)
      setError('')

      const response = await api('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          title: announcementForm.title,
          content: announcementForm.content,
          recipient_type: announcementForm.audience.toLowerCase(),
          recipient_ids: [], // For announcements, this could be empty or all users of a type
          message_type: 'announcement',
          priority: announcementForm.priority.toLowerCase()
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Add the new announcement to the list
        setAnnouncements(prev => [data.data, ...prev])
        
        // Reset form
        setAnnouncementForm({
          title: '',
          content: '',
          audience: '',
          priority: ''
        })
        
        setIsAnnouncementDialogOpen(false)
        
        // Optionally refetch messages to ensure sync
        fetchMessages()
      } else {
        setError(data.error || 'Failed to create announcement')
      }
    } catch (err) {
      console.error('Error creating announcement:', err)
      setError('Failed to create announcement')
    } finally {
      setIsLoading(false)
    }
  }

  const handleMessageSubmit = async () => {
    if (!messageForm.recipient || !messageForm.subject || !messageForm.content) {
      setError('Please fill in all fields')
      return
    }

    try {
      setIsLoading(true)
      setError('')

      const response = await api('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          title: messageForm.subject,
          content: messageForm.content,
          recipient_type: 'individual',
          recipient_ids: [messageForm.recipient], // This should be an actual user ID
          message_type: 'message'
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Reset form
        setMessageForm({
          recipient: '',
          subject: '',
          content: ''
        })
        
        setIsMessageDialogOpen(false)
        
        // Refetch messages
        fetchMessages()
      } else {
        setError(data.error || 'Failed to send message')
      }
    } catch (err) {
      console.error('Error sending message:', err)
      setError('Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }

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
                      <Input 
                        id="title" 
                        placeholder="Enter announcement title"
                        value={announcementForm.title}
                        onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="content">Content</Label>
                      <textarea 
                        id="content" 
                        className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                        placeholder="Enter announcement content..."
                        value={announcementForm.content}
                        onChange={(e) => setAnnouncementForm(prev => ({ ...prev, content: e.target.value }))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="audience">Audience</Label>
                        <Select 
                          value={announcementForm.audience}
                          onValueChange={(value) => setAnnouncementForm(prev => ({ ...prev, audience: value }))}
                        >
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
                        <Select
                          value={announcementForm.priority}
                          onValueChange={(value) => setAnnouncementForm(prev => ({ ...prev, priority: value }))}
                        >
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

                    {error && <p className="text-sm text-red-500">{error}</p>}
                  </div>
                  
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsAnnouncementDialogOpen(false)
                        setError('')
                      }}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAnnouncementSubmit}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Publishing...' : 'Publish Announcement'}
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
                      <Input 
                        id="recipient" 
                        placeholder="Search and select recipient..."
                        value={messageForm.recipient}
                        onChange={(e) => setMessageForm(prev => ({ ...prev, recipient: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input 
                        id="subject" 
                        placeholder="Enter message subject"
                        value={messageForm.subject}
                        onChange={(e) => setMessageForm(prev => ({ ...prev, subject: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="messageContent">Message</Label>
                      <textarea 
                        id="messageContent" 
                        className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
                        placeholder="Enter your message..."
                        value={messageForm.content}
                        onChange={(e) => setMessageForm(prev => ({ ...prev, content: e.target.value }))}
                      />
                    </div>

                    {error && <p className="text-sm text-red-500">{error}</p>}
                  </div>
                  
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsMessageDialogOpen(false)
                        setError('')
                      }}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleMessageSubmit}
                      disabled={isLoading}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {isLoading ? 'Sending...' : 'Send Message'}
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
            {announcements.length === 0 && !isLoading && (
              <div className="text-center py-8 text-gray-500">
                No announcements yet
              </div>
            )}
            
            {announcements.map((announcement) => (
              <Card key={announcement.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <CardTitle className="text-lg">{announcement.title}</CardTitle>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          announcement.priority === 'high' 
                            ? 'bg-red-100 text-red-800'
                            : announcement.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {announcement.priority}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>By {announcement.sender_name || 'Admin'}</span>
                        <span>•</span>
                        <span>{new Date(announcement.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <div className="flex items-center space-x-1">
                          <Users className="w-3 h-3" />
                          <span>{announcement.recipient_type}</span>
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
            {messages.length === 0 && !isLoading && (
              <div className="text-center py-8 text-gray-500">
                No messages yet
              </div>
            )}
            
            {messages.map((message) => (
              <Card key={message.id} className={`hover:shadow-md transition-shadow ${!message.is_read ? 'border-l-4 border-l-blue-500' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium">{message.title}</h4>
                        {!message.is_read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                        <span>From: {message.sender_name}</span>
                        <span>•</span>
                        <span>{new Date(message.created_at).toLocaleString()}</span>
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