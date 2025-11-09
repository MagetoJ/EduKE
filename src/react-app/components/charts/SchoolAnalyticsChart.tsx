import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

export function SchoolAnalyticsChart() {
  const [schoolData, setSchoolData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/reports/school-analytics');
        if (response.ok) {
          const data = await response.json();
          setSchoolData(data);
        }
      } catch (error) {
        console.error('Error fetching school analytics:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>School Analytics</CardTitle>
        <CardDescription>Growth and activity of schools using the system</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="growth" className="space-y-4">
          <TabsList>
            <TabsTrigger value="growth">School Growth</TabsTrigger>
            <TabsTrigger value="activity">School Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="growth" className="space-y-4">
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={schoolData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="totalSchools"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    name="Total Schools"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="newSchools"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="New Schools"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={schoolData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="activeSchools"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    name="Active Schools"
                  />
                  <Bar
                    dataKey="newSchools"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                    name="New This Month"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {schoolData.length > 0 ? schoolData[schoolData.length - 1].totalSchools : 0}
            </div>
            <div className="text-sm text-muted-foreground">Total Schools</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {schoolData.length > 0 ? schoolData[schoolData.length - 1].activeSchools : 0}
            </div>
            <div className="text-sm text-muted-foreground">Active Schools</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {schoolData.length > 0 ? schoolData[schoolData.length - 1].newSchools : 0}
            </div>
            <div className="text-sm text-muted-foreground">New This Month</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}