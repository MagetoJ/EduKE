import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Button } from "../ui/button";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export function StudentPerformanceChart() {
  const [performanceData, setPerformanceData] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/reports/performance-summary');
        if (response.ok) {
          const data = await response.json();
          setPerformanceData(data);
        }
      } catch (error) {
        console.error('Error fetching performance data:', error);
      }
    };

    fetchData();
  }, []);

  const handleBarClick = (data: { subject?: string }) => {
    if (data && data.subject) {
      setSelectedSubject(selectedSubject === data.subject ? null : data.subject);
    }
  };

  const filteredData = selectedSubject
    ? performanceData.filter((item: { subject: string }) => item.subject === selectedSubject)
    : performanceData;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Performance by Subject</CardTitle>
        <CardDescription>
          Average grades and student counts across subjects
          {selectedSubject && ` - Filtered to ${selectedSubject}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            variant={selectedSubject === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedSubject(null)}
          >
            All Subjects
          </Button>
          {performanceData.map((item: any) => (
            <Button
              key={item.subject}
              variant={selectedSubject === item.subject ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedSubject(item.subject)}
            >
              {item.subject}
            </Button>
          ))}
        </div>

        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <BarChart
              data={filteredData}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              onClick={handleBarClick}
            >
              <XAxis dataKey="subject" />
              <YAxis yAxisId="left" orientation="left" domain={[0, 100]} />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                formatter={(value, name) => [
                  name === 'average' ? `${value}%` : value,
                  name === 'average' ? 'Average Grade' : 'Students'
                ]}
              />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="average"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                name="Average Grade (%)"
              >
                {filteredData.map((entry: { subject: string; average: number; students: number }, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </Bar>
              <Bar
                yAxisId="right"
                dataKey="students"
                fill="hsl(var(--secondary-foreground))"
                radius={[4, 4, 0, 0]}
                name="Number of Students"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {selectedSubject && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold">{selectedSubject} Details</h4>
            {performanceData
              .filter((item: { subject: string; average: number; students: number }) => item.subject === selectedSubject)
              .map((item: { subject: string; average: number; students: number }) => (
                <div key={item.subject} className="mt-2">
                  <p>Average Grade: {item.average}%</p>
                  <p>Number of Students: {item.students}</p>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}