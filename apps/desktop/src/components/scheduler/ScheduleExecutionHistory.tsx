import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Play, Calendar, AlertCircle } from 'lucide-react';

interface ScheduleExecution {
  id: string;
  schedule_id: string;
  schedule_name: string;
  workflow_name: string;
  status: 'completed' | 'failed' | 'running';
  started_at: string;
  completed_at?: string;
  duration?: number;
  trigger_type: 'scheduled' | 'manual';
  error_message?: string;
}

interface ScheduleExecutionHistoryProps {
  scheduleId?: string;
  limit?: number;
}

export default function ScheduleExecutionHistory({ scheduleId, limit = 10 }: ScheduleExecutionHistoryProps) {
  const [executions, setExecutions] = useState<ScheduleExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExecutions();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadExecutions, 30000);
    return () => clearInterval(interval);
  }, [scheduleId]);

  const loadExecutions = async () => {
    try {
      // This would be a real API endpoint in production
      // For now, we'll generate mock data
      const mockExecutions = generateMockExecutions(limit, scheduleId);
      setExecutions(mockExecutions);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load execution history');
    } finally {
      setLoading(false);
    }
  };

  const generateMockExecutions = (count: number, filterScheduleId?: string): ScheduleExecution[] => {
    const statuses: ('completed' | 'failed' | 'running')[] = ['completed', 'failed', 'running'];
    const scheduleNames = ['Daily Data Sync', 'Report Generation', 'Email Notifications', 'Backup Process'];
    const workflowNames = ['Customer Data Pipeline', 'Financial Reports', 'Marketing Automation', 'System Maintenance'];
    
    return Array.from({ length: count }, (_, i) => {
      const status = i === 0 ? 'running' : statuses[Math.floor(Math.random() * 2)]; // First one running, rest completed/failed
      const startedAt = new Date(Date.now() - (i * 3600000) - Math.random() * 3600000); // Random times in the past
      const duration = status === 'running' ? undefined : Math.floor(Math.random() * 600) + 30; // 30-630 seconds
      const completedAt = duration ? new Date(startedAt.getTime() + duration * 1000) : undefined;
      
      return {
        id: `exec_${i + 1}`,
        schedule_id: filterScheduleId || `schedule_${Math.floor(Math.random() * 4) + 1}`,
        schedule_name: scheduleNames[Math.floor(Math.random() * scheduleNames.length)],
        workflow_name: workflowNames[Math.floor(Math.random() * workflowNames.length)],
        status,
        started_at: startedAt.toISOString(),
        completed_at: completedAt?.toISOString(),
        duration,
        trigger_type: Math.random() > 0.8 ? 'manual' : 'scheduled',
        error_message: status === 'failed' ? 'Network timeout during data retrieval' : undefined
      };
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hrs ago`;
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg animate-pulse">
            <div className="w-4 h-4 bg-muted rounded-full" />
            <div className="flex-1">
              <div className="h-4 bg-muted rounded w-3/4 mb-1" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
            <div className="h-3 bg-muted rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-6">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div className="text-center py-6">
        <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground text-sm">No execution history found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {executions.map(execution => (
        <div 
          key={execution.id}
          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {getStatusIcon(execution.status)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground truncate">
                  {scheduleId ? execution.workflow_name : execution.schedule_name}
                </span>
                {execution.trigger_type === 'manual' && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                    <Play className="h-2.5 w-2.5" />
                    Manual
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatTimestamp(execution.started_at)}</span>
                {execution.duration && (
                  <>
                    <span>•</span>
                    <span>{formatDuration(execution.duration)}</span>
                  </>
                )}
              </div>
              {execution.status === 'failed' && execution.error_message && (
                <div className="text-xs text-red-600 mt-1 truncate">
                  {execution.error_message}
                </div>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <div className={`text-xs font-medium px-2 py-1 rounded-full ${
              execution.status === 'completed' ? 'bg-green-100 text-green-700' :
              execution.status === 'failed' ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {execution.status === 'running' ? 'Running...' : 
               execution.status === 'completed' ? 'Completed' : 'Failed'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}