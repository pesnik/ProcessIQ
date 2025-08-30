import React, { useState, useEffect } from 'react';
import { Info, Clock, Calendar, Star } from 'lucide-react';

interface CronBuilderProps {
  value: string;
  onChange: (expression: string) => void;
  onValidation: (validation: { valid: boolean; next_runs: string[]; error?: string }) => void;
}

interface CronParts {
  minute: string;
  hour: string;
  day: string;
  month: string;
  weekday: string;
}

const MINUTE_OPTIONS = [
  { label: 'Every minute', value: '*' },
  { label: 'At minute 0', value: '0' },
  { label: 'Every 5 minutes', value: '*/5' },
  { label: 'Every 10 minutes', value: '*/10' },
  { label: 'Every 15 minutes', value: '*/15' },
  { label: 'Every 30 minutes', value: '*/30' },
];

const HOUR_OPTIONS = [
  { label: 'Every hour', value: '*' },
  { label: '12 AM', value: '0' },
  { label: '6 AM', value: '6' },
  { label: '9 AM', value: '9' },
  { label: '12 PM', value: '12' },
  { label: '6 PM', value: '18' },
  { label: 'Every 6 hours', value: '*/6' },
  { label: 'Every 12 hours', value: '*/12' },
];

const DAY_OPTIONS = [
  { label: 'Every day', value: '*' },
  { label: '1st', value: '1' },
  { label: '15th', value: '15' },
  { label: 'Last day', value: 'L' },
  { label: 'Every 7 days', value: '*/7' },
];

const MONTH_OPTIONS = [
  { label: 'Every month', value: '*' },
  { label: 'January', value: '1' },
  { label: 'February', value: '2' },
  { label: 'March', value: '3' },
  { label: 'April', value: '4' },
  { label: 'May', value: '5' },
  { label: 'June', value: '6' },
  { label: 'July', value: '7' },
  { label: 'August', value: '8' },
  { label: 'September', value: '9' },
  { label: 'October', value: '10' },
  { label: 'November', value: '11' },
  { label: 'December', value: '12' },
];

const WEEKDAY_OPTIONS = [
  { label: 'Every day', value: '*' },
  { label: 'Sunday', value: '0' },
  { label: 'Monday', value: '1' },
  { label: 'Tuesday', value: '2' },
  { label: 'Wednesday', value: '3' },
  { label: 'Thursday', value: '4' },
  { label: 'Friday', value: '5' },
  { label: 'Saturday', value: '6' },
  { label: 'Weekdays', value: '1-5' },
  { label: 'Weekends', value: '0,6' },
];

const PRESET_EXPRESSIONS = [
  { label: '⭐ Every minute', value: '* * * * *', description: 'Runs every minute' },
  { label: '⭐ Every 5 minutes', value: '*/5 * * * *', description: 'Runs every 5 minutes' },
  { label: '⭐ Every hour', value: '0 * * * *', description: 'Runs at the top of every hour' },
  { label: '⭐ Daily at 9 AM', value: '0 9 * * *', description: 'Runs once a day at 9:00 AM' },
  { label: '⭐ Weekly on Monday', value: '0 9 * * 1', description: 'Runs every Monday at 9:00 AM' },
  { label: '⭐ Monthly on 1st', value: '0 9 1 * *', description: 'Runs on the 1st of every month at 9:00 AM' },
  { label: 'Every 15 minutes', value: '*/15 * * * *', description: 'Runs every 15 minutes' },
  { label: 'Every 30 minutes', value: '*/30 * * * *', description: 'Runs every 30 minutes' },
  { label: 'Every 6 hours', value: '0 */6 * * *', description: 'Runs every 6 hours' },
  { label: 'Every 12 hours', value: '0 */12 * * *', description: 'Runs every 12 hours' },
  { label: 'Daily at midnight', value: '0 0 * * *', description: 'Runs once a day at 12:00 AM' },
  { label: 'Daily at 6 AM', value: '0 6 * * *', description: 'Runs once a day at 6:00 AM' },
  { label: 'Daily at 6 PM', value: '0 18 * * *', description: 'Runs once a day at 6:00 PM' },
  { label: 'Weekdays at 9 AM', value: '0 9 * * 1-5', description: 'Runs Monday through Friday at 9:00 AM' },
  { label: 'Weekends at 10 AM', value: '0 10 * * 0,6', description: 'Runs Saturday and Sunday at 10:00 AM' },
];

export default function CronBuilder({ value, onChange, onValidation }: CronBuilderProps) {
  const [mode, setMode] = useState<'builder' | 'presets' | 'manual'>('presets');
  const [cronParts, setCronParts] = useState<CronParts>({
    minute: '0',
    hour: '9',
    day: '*',
    month: '*',
    weekday: '*'
  });

  // Parse existing cron expression into parts
  useEffect(() => {
    if (value && value.includes(' ')) {
      const parts = value.split(' ');
      if (parts.length === 5) {
        setCronParts({
          minute: parts[0],
          hour: parts[1],
          day: parts[2],
          month: parts[3],
          weekday: parts[4]
        });
      }
    }
  }, [value]);

  // Validate cron expression
  const validateCron = async (expression: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/scheduler/validate-cron/${encodeURIComponent(expression)}`);
      if (!response.ok) throw new Error('Failed to validate');
      const data = await response.json();
      onValidation(data);
    } catch (err) {
      onValidation({
        valid: false,
        next_runs: [],
        error: 'Failed to validate expression'
      });
    }
  };

  // Update cron expression when parts change
  useEffect(() => {
    if (mode === 'builder') {
      const expression = `${cronParts.minute} ${cronParts.hour} ${cronParts.day} ${cronParts.month} ${cronParts.weekday}`;
      onChange(expression);
      const debounce = setTimeout(() => validateCron(expression), 300);
      return () => clearTimeout(debounce);
    }
  }, [cronParts, mode, onChange]);

  const handlePartChange = (part: keyof CronParts, newValue: string) => {
    setCronParts(prev => ({ ...prev, [part]: newValue }));
  };

  const handlePresetSelect = (expression: string) => {
    onChange(expression);
    validateCron(expression);
  };

  const handleManualChange = (expression: string) => {
    onChange(expression);
    const debounce = setTimeout(() => validateCron(expression), 500);
    return () => clearTimeout(debounce);
  };

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        <button
          type="button"
          onClick={() => setMode('presets')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            mode === 'presets' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Star className="h-4 w-4 inline mr-1" />
          Presets
        </button>
        <button
          type="button"
          onClick={() => setMode('builder')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            mode === 'builder' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Clock className="h-4 w-4 inline mr-1" />
          Builder
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            mode === 'manual' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="h-4 w-4 inline mr-1" />
          Manual
        </button>
      </div>

      {/* Presets Mode */}
      {mode === 'presets' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Choose a preset schedule
          </label>
          <div className="grid gap-2 max-h-64 overflow-y-auto">
            {PRESET_EXPRESSIONS.map((preset, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handlePresetSelect(preset.value)}
                className={`text-left p-3 border rounded-lg hover:bg-accent transition-colors ${
                  value === preset.value 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-foreground">{preset.label}</div>
                    <div className="text-xs text-muted-foreground">{preset.description}</div>
                  </div>
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                    {preset.value}
                  </code>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Builder Mode */}
      {mode === 'builder' && (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-foreground">
            Build your schedule
          </label>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Minute (0-59)
              </label>
              <select
                className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
                value={cronParts.minute}
                onChange={(e) => handlePartChange('minute', e.target.value)}
              >
                {MINUTE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Hour (0-23)
              </label>
              <select
                className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
                value={cronParts.hour}
                onChange={(e) => handlePartChange('hour', e.target.value)}
              >
                {HOUR_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Day (1-31)
              </label>
              <select
                className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
                value={cronParts.day}
                onChange={(e) => handlePartChange('day', e.target.value)}
              >
                {DAY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Month (1-12)
              </label>
              <select
                className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
                value={cronParts.month}
                onChange={(e) => handlePartChange('month', e.target.value)}
              >
                {MONTH_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Weekday (0-6)
              </label>
              <select
                className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
                value={cronParts.weekday}
                onChange={(e) => handlePartChange('weekday', e.target.value)}
              >
                {WEEKDAY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground mb-2">Generated expression:</div>
            <code className="text-sm font-mono bg-background px-2 py-1 rounded border">
              {cronParts.minute} {cronParts.hour} {cronParts.day} {cronParts.month} {cronParts.weekday}
            </code>
          </div>
        </div>
      )}

      {/* Manual Mode */}
      {mode === 'manual' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Manual cron expression
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-border rounded-md bg-background font-mono"
            value={value}
            onChange={(e) => handleManualChange(e.target.value)}
            placeholder="0 9 * * *"
          />
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <div>
              Cron format: minute hour day month weekday
              <br />
              Use * for "any", */5 for "every 5", 1-5 for ranges, 0,6 for lists
            </div>
          </div>
        </div>
      )}
    </div>
  );
}