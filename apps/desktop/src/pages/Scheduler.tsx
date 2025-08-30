import React, { useState, useEffect } from 'react';
import {
  Plus,
  Clock,
  Play,
  Pause,
  Trash2,
  Calendar,
  Search,
  Filter,
  Edit,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  Globe
} from 'lucide-react';
import CronBuilder from '@/components/scheduler/CronBuilder';

interface Schedule {
  id: string;
  workflow_id: string;
  workflow_name: string;
  name: string;
  description: string;
  trigger_type: string;
  cron_expression?: string;
  timezone: string;
  interval_seconds?: number;
  event_type?: string;
  enabled: boolean;
  last_run?: string;
  next_run?: string;
  last_status?: string;
  consecutive_failures: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
}

interface ScheduleFormData {
  workflow_id: string;
  name: string;
  description: string;
  trigger_type: 'cron' | 'interval' | 'event';
  cron_expression: string;
  timezone: string;
  interval_seconds: number;
  enabled: boolean;
  tags: string[];
}

const COMMON_CRON_EXPRESSIONS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Every 12 hours', value: '0 */12 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Daily at 6 AM', value: '0 6 * * *' },
  { label: 'Daily at 9 AM', value: '0 9 * * *' },
  { label: 'Weekly (Sunday)', value: '0 0 * * 0' },
  { label: 'Monthly (1st)', value: '0 0 1 * *' },
];

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Shanghai',
  'Asia/Kolkata', 'Australia/Sydney'
];

export default function Scheduler() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [triggerFilter, setTriggerFilter] = useState<'all' | 'cron' | 'interval' | 'event'>('all');

  const [formData, setFormData] = useState<ScheduleFormData>({
    workflow_id: '',
    name: '',
    description: '',
    trigger_type: 'cron',
    cron_expression: '0 9 * * *',
    timezone: 'UTC',
    interval_seconds: 3600,
    enabled: true,
    tags: []
  });

  const [cronValidation, setCronValidation] = useState<{
    valid: boolean;
    next_runs: string[];
    error?: string;
  }>({ valid: true, next_runs: [] });

  useEffect(() => {
    loadSchedules();
    loadWorkflows();
  }, []);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/v1/scheduler/');
      if (!response.ok) {
        throw new Error('Failed to load schedules');
      }
      const data = await response.json();
      setSchedules(data.schedules || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const loadWorkflows = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/workflows/');
      if (!response.ok) {
        throw new Error('Failed to load workflows');
      }
      const data = await response.json();
      setWorkflows(data.workflows || []);
    } catch (err) {
      console.error('Failed to load workflows:', err);
    }
  };

  const validateCronExpression = async (expression: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/scheduler/validate-cron/${encodeURIComponent(expression)}`);
      if (!response.ok) {
        throw new Error('Failed to validate cron expression');
      }
      const data = await response.json();
      setCronValidation(data);
    } catch (err) {
      setCronValidation({
        valid: false,
        next_runs: [],
        error: 'Failed to validate expression'
      });
    }
  };

  useEffect(() => {
    if (formData.trigger_type === 'cron' && formData.cron_expression) {
      const debounce = setTimeout(() => {
        validateCronExpression(formData.cron_expression);
      }, 500);
      return () => clearTimeout(debounce);
    }
  }, [formData.cron_expression, formData.trigger_type]);

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.trigger_type === 'cron' && !cronValidation.valid) {
      setError('Please fix the cron expression before creating the schedule');
      return;
    }

    try {
      const payload = {
        ...formData,
        cron_expression: formData.trigger_type === 'cron' ? formData.cron_expression : null,
        interval_seconds: formData.trigger_type === 'interval' ? formData.interval_seconds : null,
      };

      const response = await fetch('http://localhost:8000/api/v1/scheduler/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to create schedule');
      }

      await loadSchedules();
      setShowCreateForm(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create schedule');
    }
  };

  const toggleSchedule = async (scheduleId: string, enabled: boolean) => {
    try {
      const endpoint = enabled ? 'enable' : 'disable';
      const response = await fetch(`http://localhost:8000/api/v1/scheduler/${scheduleId}/${endpoint}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to ${endpoint} schedule`);
      }

      await loadSchedules();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to toggle schedule`);
    }
  };

  const triggerSchedule = async (scheduleId: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/scheduler/${scheduleId}/trigger`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to trigger schedule');
      }

      const data = await response.json();
      alert(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger schedule');
    }
  };

  const deleteSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/v1/scheduler/${scheduleId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete schedule');
      }

      await loadSchedules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete schedule');
    }
  };

  const resetForm = () => {
    setFormData({
      workflow_id: '',
      name: '',
      description: '',
      trigger_type: 'cron',
      cron_expression: '0 9 * * *',
      timezone: 'UTC',
      interval_seconds: 3600,
      enabled: true,
      tags: []
    });
    setEditingSchedule(null);
  };

  const formatNextRun = (nextRun: string | undefined) => {
    if (!nextRun) return 'Not scheduled';
    return new Date(nextRun).toLocaleString();
  };

  const getStatusIcon = (schedule: Schedule) => {
    if (!schedule.enabled) return <Pause className="h-4 w-4 text-muted-foreground" />;
    if (schedule.last_status === 'completed') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (schedule.last_status === 'failed') return <XCircle className="h-4 w-4 text-red-500" />;
    return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  };

  const filteredSchedules = schedules.filter(schedule => {
    const matchesSearch = schedule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         schedule.workflow_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'enabled' && schedule.enabled) ||
                         (statusFilter === 'disabled' && !schedule.enabled);
    
    const matchesTrigger = triggerFilter === 'all' || schedule.trigger_type === triggerFilter;
    
    return matchesSearch && matchesStatus && matchesTrigger;
  });

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border bg-card">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Workflow Scheduler</h1>
              <p className="text-muted-foreground mt-1">
                Automate workflow execution with cron-based scheduling
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex-shrink-0 p-4 border-b border-border bg-card">
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search schedules..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            className="px-3 py-2 border border-border rounded-md bg-background"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            <option value="all">All Status</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
          
          <select
            className="px-3 py-2 border border-border rounded-md bg-background"
            value={triggerFilter}
            onChange={(e) => setTriggerFilter(e.target.value as typeof triggerFilter)}
          >
            <option value="all">All Triggers</option>
            <option value="cron">Cron</option>
            <option value="interval">Interval</option>
            <option value="event">Event</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading schedules...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-red-500">{error}</div>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid gap-4">
              {filteredSchedules.map(schedule => (
                <div key={schedule.id} className="bg-card border border-border rounded-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(schedule)}
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{schedule.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Workflow: {schedule.workflow_name}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Type:</span>
                          <p className="font-medium capitalize">{schedule.trigger_type}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Schedule:</span>
                          <p className="font-medium font-mono">
                            {schedule.cron_expression || `Every ${schedule.interval_seconds}s`}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Next Run:</span>
                          <p className="font-medium">{formatNextRun(schedule.next_run)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Timezone:</span>
                          <p className="font-medium">{schedule.timezone}</p>
                        </div>
                      </div>
                      
                      {schedule.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {schedule.tags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => triggerSchedule(schedule.id)}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md"
                        title="Trigger now"
                      >
                        <Play className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => toggleSchedule(schedule.id, !schedule.enabled)}
                        className={`p-2 rounded-md ${
                          schedule.enabled
                            ? 'text-red-500 hover:bg-red-50 hover:text-red-600'
                            : 'text-green-500 hover:bg-green-50 hover:text-green-600'
                        }`}
                        title={schedule.enabled ? 'Disable' : 'Enable'}
                      >
                        {schedule.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </button>
                      
                      <button
                        onClick={() => deleteSchedule(schedule.id)}
                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-md"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {filteredSchedules.length === 0 && (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No schedules found</h3>
                <p className="text-muted-foreground mb-4">
                  {schedules.length === 0 
                    ? "Create your first workflow schedule to get started"
                    : "No schedules match your current filters"
                  }
                </p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  Create Schedule
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Schedule Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-foreground mb-4">Create Schedule</h2>
            
            <form onSubmit={handleCreateSchedule} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Workflow
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                    value={formData.workflow_id}
                    onChange={(e) => setFormData({ ...formData, workflow_id: e.target.value })}
                    required
                  >
                    <option value="">Select a workflow</option>
                    {workflows.map(workflow => (
                      <option key={workflow.id} value={workflow.id}>
                        {workflow.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Schedule Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Trigger Type
                </label>
                <select
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  value={formData.trigger_type}
                  onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value as 'cron' | 'interval' | 'event' })}
                >
                  <option value="cron">Cron Expression</option>
                  <option value="interval">Fixed Interval</option>
                  <option value="event">Event-based</option>
                </select>
              </div>
              
              {formData.trigger_type === 'cron' && (
                <>
                  <CronBuilder
                    value={formData.cron_expression}
                    onChange={(expression) => setFormData({ ...formData, cron_expression: expression })}
                    onValidation={setCronValidation}
                  />
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      <Globe className="inline h-4 w-4 mr-1" />
                      Timezone
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-border rounded-md bg-background"
                      value={formData.timezone}
                      onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    >
                      {TIMEZONES.map(tz => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                  </div>
                  
                  {!cronValidation.valid && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-red-600 text-sm">
                        {cronValidation.error || 'Invalid cron expression'}
                      </p>
                    </div>
                  )}
                  
                  {cronValidation.valid && cronValidation.next_runs.length > 0 && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-green-700 text-sm font-medium mb-2">Next 5 runs:</p>
                      <ul className="text-green-600 text-xs space-y-1">
                        {cronValidation.next_runs.map((run, i) => (
                          <li key={i}>{new Date(run).toLocaleString()}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
              
              {formData.trigger_type === 'interval' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Interval (seconds)
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-border rounded-md bg-background"
                    value={formData.interval_seconds}
                    onChange={(e) => setFormData({ ...formData, interval_seconds: parseInt(e.target.value) || 0 })}
                    min="1"
                    required
                  />
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                />
                <label htmlFor="enabled" className="text-sm font-medium text-foreground">
                  Enable schedule immediately
                </label>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  disabled={formData.trigger_type === 'cron' && !cronValidation.valid}
                >
                  Create Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}