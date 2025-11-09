import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { FinancialSummaryChart } from '../components/charts/FinancialSummaryChart';
import { StudentPerformanceChart } from '../components/charts/StudentPerformanceChart';
import { SchoolAnalyticsChart } from '../components/charts/SchoolAnalyticsChart';
import { SubscriptionStatusChart } from '../components/charts/SubscriptionStatusChart';
import { useAuth } from '../contexts/AuthContext';

export function Reports() {
  const { user } = useAuth();

  const isSuperAdmin = user?.role === 'super_admin';
  const canViewFinancial = user?.role === 'admin';
  const canViewPerformance = user?.role === 'admin' || user?.role === 'teacher';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600">
          {isSuperAdmin ? 'System-wide analytics and subscription insights' : 'Analytics and insights for your school'}
        </p>
      </div>

      <div className="grid gap-6">
        {isSuperAdmin && (
          <>
            <SchoolAnalyticsChart />
            <SubscriptionStatusChart />
          </>
        )}

        {canViewFinancial && <FinancialSummaryChart />}

        {canViewPerformance && <StudentPerformanceChart />}

        {!isSuperAdmin && !canViewFinancial && !canViewPerformance && (
          <Card>
            <CardHeader>
              <CardTitle>Access Restricted</CardTitle>
            </CardHeader>
            <CardContent>
              <p>You don't have permission to view reports. Only school administrators can access financial and performance data.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}