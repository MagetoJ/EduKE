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

export function FinancialSummaryChart() {
  const [financialData, setFinancialData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/reports/financial-summary');
        if (response.ok) {
          const data = await response.json();
          setFinancialData(data);
        }
      } catch (error) {
        console.error('Error fetching financial data:', error);
      }
    };

    fetchData();
  }, []);

  const handleBarClick = (data: { name?: string }) => {
    if (data && data.name) {
      setSelectedMonth(selectedMonth === data.name ? null : data.name);
    }
  };

  const filteredData = selectedMonth
    ? financialData.filter((item: { name: string }) => item.name === selectedMonth)
    : financialData;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Status</CardTitle>
        <CardDescription>
          Collected vs. Pending Fees
          {selectedMonth ? ` - ${selectedMonth}` : ' (Last 6 Months)'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            variant={selectedMonth === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedMonth(null)}
          >
            All Months
          </Button>
          {financialData.map((item: any) => (
            <Button
              key={item.name}
              variant={selectedMonth === item.name ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedMonth(item.name)}
            >
              {item.name}
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
              <XAxis dataKey="name" />
              <YAxis unit="$" />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))" }}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
                formatter={(value) => [`$${value}`, '']}
              />
              <Legend />
              <Bar
                dataKey="Collected"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                name="Collected ($)"
              >
                {filteredData.map((entry: { name: string; Collected: number; Pending: number }, index: number) => (
                  <Cell
                    key={`collected-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </Bar>
              <Bar
                dataKey="Pending"
                fill="hsl(var(--secondary-foreground))"
                radius={[4, 4, 0, 0]}
                name="Pending ($)"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {selectedMonth && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold">{selectedMonth} Financial Details</h4>
            {financialData
              .filter((item: { name: string; Collected: number; Pending: number }) => item.name === selectedMonth)
              .map((item: { name: string; Collected: number; Pending: number }) => (
                <div key={item.name} className="mt-2 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Collected</p>
                    <p className="text-lg font-semibold text-green-600">${item.Collected}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-lg font-semibold text-orange-600">${item.Pending}</p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}