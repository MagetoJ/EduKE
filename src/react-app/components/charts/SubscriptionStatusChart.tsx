import React, { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Badge } from "../ui/badge";

const STATUS_COLORS = {
  Active: '#10B981',
  Trial: '#F59E0B',
  Expired: '#EF4444',
};

const PLAN_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function SubscriptionStatusChart() {
  const [subscriptionData, setSubscriptionData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/reports/subscription-status');
        if (response.ok) {
          const data = await response.json();
          setSubscriptionData(data);
        }
      } catch (error) {
        console.error('Error fetching subscription data:', error);
      }
    };

    fetchData();
  }, []);

  const statusData = subscriptionData.reduce((acc: Array<{ status: string; subscribers: number; revenue: number }>, item: { status: string; subscribers: number; revenue: number }) => {
    const existing = acc.find(s => s.status === item.status);
    if (existing) {
      existing.subscribers += item.subscribers;
      existing.revenue += item.revenue;
    } else {
      acc.push({
        status: item.status,
        subscribers: item.subscribers,
        revenue: item.revenue,
      });
    }
    return acc;
  }, []);

  const totalRevenue = subscriptionData.reduce((sum: number, item: { revenue: number }) => sum + item.revenue, 0);
  const totalSubscribers = subscriptionData.reduce((sum: number, item: { subscribers: number }) => sum + item.subscribers, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription & Payment Status</CardTitle>
        <CardDescription>Revenue and subscriber analytics by plan and status</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="plans" className="space-y-4">
          <TabsList>
            <TabsTrigger value="plans">By Plan</TabsTrigger>
            <TabsTrigger value="status">By Status</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-4">
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={subscriptionData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <XAxis dataKey="plan" />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                    formatter={(value, name) => [
                      name === 'revenue' ? `$${value}` : value,
                      name === 'revenue' ? 'Revenue' : 'Subscribers'
                    ]}
                  />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="subscribers"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    name="Subscribers"
                  >
                    {subscriptionData.map((entry: any, index: number) => (
                      <Cell key={`subscribers-${index}`} fill={PLAN_COLORS[index % PLAN_COLORS.length]} />
                    ))}
                  </Bar>
                  <Bar
                    yAxisId="right"
                    dataKey="revenue"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                    name="Revenue ($)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="status" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium mb-4">Subscriber Distribution</h4>
                <div style={{ width: "100%", height: 250 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ status, subscribers }) => `${status}: ${subscribers}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="subscribers"
                      >
                        {statusData.map((entry: { status: string; subscribers: number; revenue: number }, index: number) => (
                          <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || '#8884d8'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-4">Revenue by Status</h4>
                <div style={{ width: "100%", height: 250 }}>
                  <ResponsiveContainer>
                    <BarChart data={statusData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <XAxis dataKey="status" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => [`$${value}`, 'Revenue']}
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "var(--radius)",
                        }}
                      />
                      <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                        {statusData.map((entry: { status: string; subscribers: number; revenue: number }, index: number) => (
                          <Cell key={`revenue-${index}`} fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || '#8884d8'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-primary">${totalRevenue.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">Total Revenue</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-green-600">{totalSubscribers}</div>
            <div className="text-sm text-muted-foreground">Total Subscribers</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {subscriptionData.filter((item: { status: string; subscribers: number }) => item.status === 'Active').reduce((sum: number, item: { subscribers: number }) => sum + item.subscribers, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Active Subscribers</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {subscriptionData.filter((item: { status: string; subscribers: number }) => item.status === 'Trial').reduce((sum: number, item: { subscribers: number }) => sum + item.subscribers, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Trial Users</div>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Plan Details</h4>
          <div className="grid gap-2">
            {subscriptionData.map((plan: { plan: string; status: string; subscribers: number; revenue: number }) => (
              <div key={plan.plan} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{plan.plan}</span>
                  <Badge variant={plan.status === 'Active' ? 'default' : plan.status === 'Trial' ? 'secondary' : 'destructive'}>
                    {plan.status}
                  </Badge>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{plan.subscribers} subscribers</div>
                  <div className="text-sm text-muted-foreground">${plan.revenue.toLocaleString()} revenue</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}