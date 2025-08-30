import React, { useState, useEffect } from 'react';
import { Clock, Play, Pause, AlertCircle, CheckCircle, XCircle, Plus, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Schedule {
  id: string;
  workflow_name: string;
  name: string;
  enabled: boolean;
  next_run?: string;
  last_status?: string;
  cron_expression?: string;
}

export default function SchedulerWidget() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadSchedules();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadSchedules, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSchedules = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/scheduler/');
      if (!response.ok) {
        throw new Error('Failed to load schedules');
      }
      const data = await response.json();
      setSchedules(data.schedules || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (schedule: Schedule) => {
    if (!schedule.enabled) return <Pause className="h-3 w-3 text-muted-foreground" />;
    if (schedule.last_status === 'completed') return <CheckCircle className="h-3 w-3 text-green-500" />;
    if (schedule.last_status === 'failed') return <XCircle className="h-3 w-3 text-red-500" />;
    return <Clock className="h-3 w-3 text-blue-500" />;
  };

  const formatNextRun = (nextRun: string | undefined) => {
    if (!nextRun) return 'Not scheduled';
    const date = new Date(nextRun);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff < 0) return 'Overdue';
    if (diff < 60000) return 'In < 1 min';
    if (diff < 3600000) return `In ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `In ${Math.floor(diff / 3600000)} hrs`;
    return `In ${Math.floor(diff / 86400000)} days`;
  };

  const enabledSchedules = schedules.filter(s => s.enabled);
  const upcomingSchedules = enabledSchedules
    .filter(s => s.next_run)
    .sort((a, b) => new Date(a.next_run!).getTime() - new Date(b.next_run!).getTime());

  const stats = {
    total: schedules.length,
    enabled: enabledSchedules.length,
    disabled: schedules.length - enabledSchedules.length,
    recent_failures: schedules.filter(s => s.last_status === 'failed').length
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Scheduler</h3>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Loading schedules...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Scheduler</h3>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <div className="text-red-600 text-sm">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Scheduler</h3>
        </div>
        <button
          onClick={() => navigate('/scheduler')}
          className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1"
        >
          View All
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {schedules.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground text-sm mb-3">No schedules configured</p>
          <button
            onClick={() => navigate('/scheduler')}
            className="text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1 mx-auto"
          >
            <Plus className="h-3 w-3" />
            Create First Schedule
          </button>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.enabled}</div>
              <div className="text-xs text-muted-foreground">Enabled</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground">{stats.disabled}</div>
              <div className="text-xs text-muted-foreground">Disabled</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.recent_failures}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
          </div>

          {/* Upcoming Schedules */}
          {upcomingSchedules.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3">Upcoming Runs</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                {upcomingSchedules.map(schedule => (
                  <div 
                    key={schedule.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getStatusIcon(schedule)}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {schedule.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {schedule.workflow_name}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-foreground">
                        {formatNextRun(schedule.next_run)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {schedule.cron_expression}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="mt-4 pt-4 border-t border-border">
            <button
              onClick={() => navigate('/scheduler')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              Create New Schedule
            </button>
          </div>
        </>
      )}
    </div>
  );
}