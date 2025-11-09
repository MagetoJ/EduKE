import React from 'react';
import { useParams } from 'react-router';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';

export function SchoolProfile() {
  const { id } = useParams();

  // In a real app, you would fetch school details here
  // using the `id` from the URL
  // const school = fetchSchoolById(id);

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">School Profile (ID: {id})</h1>
      <Card>
        <CardHeader>
          <CardTitle>School Name Here</CardTitle>
          <CardDescription>This is where you would show the school's address, phone, etc.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>More details about the school...</p>
        </CardContent>
      </Card>
    </div>
  );
}