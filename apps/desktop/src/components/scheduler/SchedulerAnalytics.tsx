import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  Zap,
  Activity,
  AlertTriangle
} from 'lucide-react';

interface SchedulerAnalyticsProps {
  scheduleId?: string;
  timeRange?: 'day' | 'week' | 'month';
}

interface AnalyticsData {
  execution_stats: {
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
    average_duration: number;
    success_rate: number;
  };
  daily_stats: Array<{
    date: string;
    executions: number;
    successes: number;
    failures: number;
    avg_duration: number;
  }>;
  failure_reasons: Array<{
    reason: string;
    count: number;
  }>;
  schedule_performance: Array<{
    schedule_name: string;
    executions: number;
    success_rate: number;
    avg_duration: number;
  }>;
}

const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6'];

export default function SchedulerAnalytics({ scheduleId, timeRange = 'week' }: SchedulerAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
    
    // Refresh every 5 minutes
    const interval = setInterval(loadAnalytics, 300000);
    return () => clearInterval(interval);
  }, [scheduleId, timeRange]);

  const loadAnalytics = async () => {
    try {
      // In a real implementation, this would fetch from the backend
      // For now, generate mock data
      const mockData = generateMockAnalytics(timeRange, scheduleId);
      setAnalytics(mockData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const generateMockAnalytics = (range: string, filterScheduleId?: string): AnalyticsData => {
    const days = range === 'day' ? 1 : range === 'week' ? 7 : 30;
    
    // Generate daily stats
    const dailyStats = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const executions = Math.floor(Math.random() * 20) + 5;
      const failures = Math.floor(executions * (Math.random() * 0.3)); // 0-30% failure rate
      const successes = executions - failures;
      
      dailyStats.push({
        date: date.toISOString().split('T')[0],
        executions,
        successes,
        failures,
        avg_duration: Math.floor(Math.random() * 300) + 30 // 30-330 seconds
      });
    }
    
    // Calculate totals
    const totalExecutions = dailyStats.reduce((sum, day) => sum + day.executions, 0);
    const totalSuccesses = dailyStats.reduce((sum, day) => sum + day.successes, 0);
    const totalFailures = dailyStats.reduce((sum, day) => sum + day.failures, 0);
    const avgDuration = Math.floor(dailyStats.reduce((sum, day) => sum + day.avg_duration, 0) / dailyStats.length);
    const successRate = totalExecutions > 0 ? (totalSuccesses / totalExecutions) * 100 : 0;
    
    return {
      execution_stats: {
        total_executions: totalExecutions,
        successful_executions: totalSuccesses,
        failed_executions: totalFailures,
        average_duration: avgDuration,
        success_rate: successRate
      },
      daily_stats: dailyStats,
      failure_reasons: [
        { reason: 'Network timeout', count: Math.floor(totalFailures * 0.4) },
        { reason: 'Resource unavailable', count: Math.floor(totalFailures * 0.3) },
        { reason: 'Script error', count: Math.floor(totalFailures * 0.2) },
        { reason: 'System overload', count: Math.floor(totalFailures * 0.1) }
      ].filter(item => item.count > 0),
      schedule_performance: [
        { schedule_name: 'Daily Reports', executions: 42, success_rate: 95.2, avg_duration: 120 },
        { schedule_name: 'Data Sync', executions: 28, success_rate: 89.3, avg_duration: 85 },
        { schedule_name: 'Notifications', executions: 156, success_rate: 98.7, avg_duration: 15 },
        { schedule_name: 'Backup Process', executions: 7, success_rate: 100, avg_duration: 450 }
      ]
    };
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusColor = (successRate: number) => {
    if (successRate >= 95) return 'text-green-600';
    if (successRate >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-1/4 mb-4" />
              <div className="h-32 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="text-center text-muted-foreground">
          No analytics data available
        </div>
      </div>
    );
  }

  const { execution_stats, daily_stats, failure_reasons, schedule_performance } = analytics;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Executions</p>
              <p className="text-2xl font-bold text-foreground">{execution_stats.total_executions}</p>
            </div>
            <Activity className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Success Rate</p>
              <p className={`text-2xl font-bold ${getStatusColor(execution_stats.success_rate)}`}>
                {execution_stats.success_rate.toFixed(1)}%
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Duration</p>
              <p className="text-2xl font-bold text-foreground">
                {formatDuration(execution_stats.average_duration)}
              </p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Failures</p>
              <p className="text-2xl font-bold text-red-500">{execution_stats.failed_executions}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Execution Trend Chart */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Execution Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={daily_stats}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={formatDate}
              className="text-xs"
            />
            <YAxis className="text-xs" />
            <Tooltip 
              labelFormatter={formatDate}
              formatter={(value, name) => [
                value,
                name === 'successes' ? 'Successes' : name === 'failures' ? 'Failures' : 'Total'
              ]}
            />
            <Area
              type="monotone"
              dataKey="successes"
              stackId="1"
              stroke="#10B981"
              fill="#10B981"
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="failures"
              stackId="1"
              stroke="#EF4444"
              fill="#EF4444"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Success vs Failure Distribution */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Success Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Success', value: execution_stats.successful_executions, color: '#10B981' },
                  { name: 'Failed', value: execution_stats.failed_executions, color: '#EF4444' }
                ]}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                <Cell fill="#10B981" />
                <Cell fill="#EF4444" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Failure Reasons */}
        {failure_reasons.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Common Failure Reasons</h3>
            <div className="space-y-3">
              {failure_reasons.map((reason, index) => (
                <div key={reason.reason} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-foreground">{reason.reason}</span>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{reason.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Schedule Performance Table */}
      {!scheduleId && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Schedule Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Schedule</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Executions</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Success Rate</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Avg Duration</th>
                </tr>
              </thead>
              <tbody>
                {schedule_performance.map((schedule, index) => (
                  <tr key={index} className="border-b border-border last:border-b-0">
                    <td className="py-3 px-4 text-foreground font-medium">{schedule.schedule_name}</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">{schedule.executions}</td>
                    <td className={`py-3 px-4 text-right font-medium ${getStatusColor(schedule.success_rate)}`}>
                      {schedule.success_rate.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground">
                      {formatDuration(schedule.avg_duration)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}