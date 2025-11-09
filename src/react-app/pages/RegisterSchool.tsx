import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../contexts/AuthContext';

export default function RegisterSchool() {
  const [schoolName, setSchoolName] = useState('');
  const [curriculum, setCurriculum] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { setUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setIsLoading(false);
      return;
    }

    if (!curriculum) {
      setError('Please select the curriculum.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/register-school', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolName, curriculum, adminName, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to register school');
      }

      // Set the user in the auth context
      setUser({
        id: data.user.id.toString(),
        email: data.user.email,
        name: data.user.name,
        role: data.user.role as 'super_admin' | 'admin' | 'teacher' | 'parent' | 'student',
        schoolId: data.user.schoolId?.toString(),
        schoolName: data.school.name,
        schoolCurriculum: data.school.curriculum,
      });

      // React Router will automatically redirect to dashboard when user state changes

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Register Your School</CardTitle>
          <CardDescription>
            Create your school account to get started. You will be the first administrator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="schoolName">School Name</Label>
              <Input
                id="schoolName"
                placeholder="e.g., Summit Academy"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="curriculum">Curriculum</Label>
              <Select value={curriculum} onValueChange={setCurriculum}>
                <SelectTrigger id="curriculum">
                  <SelectValue placeholder="Select curriculum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cbc">Competency-Based Curriculum (CBC)</SelectItem>
                  <SelectItem value="844">8-4-4 Curriculum</SelectItem>
                  <SelectItem value="british">British National / Cambridge Curriculum</SelectItem>
                  <SelectItem value="american">American K-12 Curriculum</SelectItem>
                  <SelectItem value="ib">International Baccalaureate (IB)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminName">Your Full Name</Label>
              <Input
                id="adminName"
                placeholder="e.g., Jane Doe"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Your Admin Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@yourschool.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Create a Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm font-medium text-red-500">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create School & Log In'}
            </Button>

            <div className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <button
                onClick={() => window.location.href = '/login'}
                className="underline"
              >
                Log In
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}