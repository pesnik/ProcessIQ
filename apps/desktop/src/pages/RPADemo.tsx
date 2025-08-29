import React, { useState, useEffect } from 'react';
import { Play, Square, Eye, Download, Zap, Database, FileSpreadsheet, BarChart3 } from 'lucide-react';
import { rpaService, RPAExecutionResponse, RPAStepResult } from '@/services/rpaService';
import { useToast } from '@/hooks/use-toast';

interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  duration?: number;
  icon: React.ReactNode;
  output?: any;
}

interface DemoResult {
  stepId: string;
  status: 'success' | 'error';
  data?: any;
  screenshot?: string;
  duration: number;
}

export default function RPADemo() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [results, setResults] = useState<DemoResult[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<string[]>([]);
  const [useBackend, setUseBackend] = useState(true);
  const [headlessMode, setHeadlessMode] = useState(false);
  const { toast } = useToast();

  const workflowSteps: WorkflowStep[] = [
    {
      id: 'web_scraping',
      name: 'Kaggle Dataset Download',
      description: 'Download real customer segmentation dataset from Kaggle using browser automation',
      status: 'pending',
      icon: <Eye className="w-5 h-5" />
    },
    {
      id: 'data_processing',
      name: 'Data Processing & Analytics',
      description: 'Clean, segment, and analyze customer data using Pandas with business intelligence',
      status: 'pending',
      icon: <Database className="w-5 h-5" />
    },
    {
      id: 'excel_generation',
      name: 'Excel Automation with Macros',
      description: 'Generate professional Excel reports with charts, formulas, and business calculations',
      status: 'pending',
      icon: <FileSpreadsheet className="w-5 h-5" />
    },
    {
      id: 'analysis_report',
      name: 'Executive Business Analysis',
      description: 'Generate strategic insights, trends analysis, and actionable business recommendations',
      status: 'pending',
      icon: <BarChart3 className="w-5 h-5" />
    }
  ];

  const [steps, setSteps] = useState<WorkflowStep[]>(workflowSteps);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const runDemo = async () => {
    setIsRunning(true);
    setResults([]);
    setLogs([]);
    setProgress(0);
    setCurrentStep(null);
    
    // Reset all steps to pending
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending' as const, duration: undefined, output: undefined })));
    
    addLog('🚀 Initiating ProcessIQ RPA Workflow...');
    addLog(`🔧 Browser Mode: ${headlessMode ? 'Headless (hidden)' : 'Visible (head mode)'}`);
    addLog(`⚙️  Execution Mode: ${useBackend ? 'Backend API' : 'Simulation'}`);

    try {
      if (useBackend) {
        await runBackendDemo();
      } else {
        await runSimulatedDemo();
      }
    } catch (error) {
      addLog(`❌ Workflow failed: ${error}`);
      toast({
        title: "Execution Failed",
        description: useBackend ? "Switching to backup mode..." : "Workflow execution failed",
        variant: "destructive",
      });
      
      // If backend fails, fallback to simulation
      if (useBackend) {
        setUseBackend(false);
        await runSimulatedDemo();
      }
    }
  };

  const runBackendDemo = async () => {
    try {
      addLog('🔗 Connecting to ProcessIQ backend...');
      
      const response = await rpaService.startDemo({
        workflowType: 'kaggle_to_excel',
        steps: steps.map(s => s.id),
        options: {
          headless: headlessMode,
          outputDir: './demo_output',
          showBrowser: !headlessMode
        }
      });

      setExecutionId(response.executionId);
      addLog(`✅ Connected! Execution ID: ${response.executionId}`);

      // Subscribe to real-time updates
      const unsubscribe = rpaService.subscribeToProgress(
        handleProgressUpdate,
        (error) => {
          addLog(`❌ Connection error: ${error.message}`);
          setUseBackend(false);
        }
      );


      // Cleanup on unmount or completion
      return unsubscribe;

    } catch (error) {
      throw new Error(`Backend connection failed: ${error}`);
    }
  };

  const runSimulatedDemo = async () => {
    addLog('💫 Running in backup execution mode...');
    
    await rpaService.runSimulatedDemo(
      handleProgressUpdate,
      steps.map(s => s.id)
    );
  };

  const handleProgressUpdate = (data: RPAExecutionResponse) => {
    if (data.currentStep) {
      setCurrentStep(data.currentStep);
      const stepName = steps.find(s => s.id === data.currentStep)?.name || data.currentStep;
      addLog(`📊 Executing: ${stepName}`);
      
      // Update step to running
      setSteps(prev => prev.map(s => 
        s.id === data.currentStep 
          ? { ...s, status: 'running' as const }
          : s
      ));
    }

    if (data.results && data.results.length > 0) {
      data.results.forEach((stepResult: RPAStepResult) => {
        const existingResult = results.find(r => r.stepId === stepResult.stepId);
        if (!existingResult) {
          // Update step to completed/error
          setSteps(prev => prev.map(s => 
            s.id === stepResult.stepId 
              ? { 
                  ...s, 
                  status: stepResult.status === 'success' ? 'completed' as const : 'error' as const,
                  duration: stepResult.duration,
                  output: stepResult.data
                }
              : s
          ));

          const stepName = steps.find(s => s.id === stepResult.stepId)?.name || stepResult.stepId;
          
          if (stepResult.status === 'success') {
            addLog(`✅ Completed: ${stepName} ${stepResult.duration ? `(${stepResult.duration}ms)` : ''}`);
          } else {
            addLog(`❌ Failed: ${stepName} - ${stepResult.error || 'Unknown error'}`);
          }

          // Convert to DemoResult format
          const demoResult: DemoResult = {
            stepId: stepResult.stepId,
            status: stepResult.status === 'success' ? 'success' : 'error',
            data: stepResult.data,
            duration: stepResult.duration || 0,
            screenshot: stepResult.screenshot
          };

          setResults(prev => [...prev, demoResult]);
        }
      });
    }

    // Update progress
    if (data.status === 'completed') {
      setProgress(100);
      setCurrentStep(null);
      setIsRunning(false);
      addLog('🎉 ProcessIQ RPA Workflow completed successfully!');
      
      // Load artifacts
      if (data.artifacts) {
        const artifactList = [
          data.artifacts.excel_file,
          data.artifacts.summary_report,
          ...(data.artifacts.screenshots || [])
        ].filter(Boolean) as string[];
        
        setArtifacts(artifactList);
        addLog(`📦 Generated ${artifactList.length} artifacts`);
      }
      
      toast({
        title: "Workflow Completed",
        description: "RPA automation executed successfully!",
      });
    } else if (data.status === 'failed') {
      setIsRunning(false);
      setCurrentStep(null);
      addLog('❌ Workflow execution failed');
      
      toast({
        title: "Execution Failed",
        description: "RPA workflow execution failed",
        variant: "destructive",
      });
    } else {
      // Calculate progress based on completed steps
      const completedSteps = results.length;
      const totalSteps = steps.length;
      setProgress((completedSteps / totalSteps) * 100);
    }
  };


  const stopDemo = async () => {
    setIsRunning(false);
    setCurrentStep(null);
    addLog('⏹️ Workflow stopped by user');
    
    try {
      if (executionId) {
        await rpaService.stopDemo();
        addLog('🛑 Backend execution stopped');
      }
    } catch (error) {
      addLog(`⚠️ Failed to stop backend execution: ${error}`);
    }
    
    setExecutionId(null);
  };

  const downloadArtifact = async (filename: string) => {
    try {
      addLog(`📥 Downloading ${filename}...`);
      const blob = await rpaService.downloadArtifact(filename);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      addLog(`✅ Downloaded ${filename}`);
      
      toast({
        title: "Download Complete",
        description: `Successfully downloaded ${filename}`,
      });
    } catch (error) {
      addLog(`❌ Failed to download ${filename}: ${error}`);
      toast({
        title: "Download Failed",
        description: `Could not download ${filename}`,
        variant: "destructive",
      });
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop backend execution
      if (executionId) {
        rpaService.stopDemo().catch(console.error);
      }
    };
  }, [executionId]);

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500 bg-green-50';
      case 'running': return 'text-blue-500 bg-blue-50';
      case 'error': return 'text-red-500 bg-red-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'running': return '🔄';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  return (
    <div className="h-full bg-background overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 min-h-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Zap className="w-8 h-8 text-primary" />
                ProcessIQ RPA Platform
              </h1>
              <p className="text-muted-foreground mt-2">
                Intelligent Automation: Data Acquisition → Analytics → Report Generation → Business Intelligence
              </p>
              {executionId && (
                <div className="mt-2 text-xs text-blue-600 font-mono">
                  Execution ID: {executionId}
                </div>
              )}
            </div>
            
            <div className="flex gap-6 items-center">
              {/* Backend Mode Toggle */}
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  id="backend-mode"
                  checked={useBackend}
                  onChange={(e) => setUseBackend(e.target.checked)}
                  disabled={isRunning}
                  className="rounded"
                />
                <label htmlFor="backend-mode" className="text-muted-foreground">
                  Use Backend API
                </label>
              </div>

              {/* Browser Mode Toggle */}
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  id="headless-mode"
                  checked={headlessMode}
                  onChange={(e) => setHeadlessMode(e.target.checked)}
                  disabled={isRunning}
                  className="rounded"
                />
                <label htmlFor="headless-mode" className="text-muted-foreground">
                  Headless Mode
                </label>
                {!headlessMode && (
                  <span className="text-xs text-blue-600 font-medium">
                    🌐 Browser Visible
                  </span>
                )}
              </div>

              {!isRunning ? (
                <button
                  onClick={runDemo}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  <Play className="w-5 h-5" />
                  Execute Workflow
                </button>
              ) : (
                <button
                  onClick={stopDemo}
                  className="flex items-center gap-2 px-6 py-3 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors font-medium"
                >
                  <Square className="w-5 h-5" />
                  Stop Execution
                </button>
              )}
            </div>
          </div>
          
          {/* Progress Bar */}
          {isRunning && (
            <div className="mt-6">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Workflow Steps */}
          <div className="space-y-6">
            <div className="bg-card p-6 rounded-lg border flex flex-col max-h-[600px]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-foreground">RPA Workflow Steps</h2>
                <div className="text-xs text-muted-foreground">↕️ Scrollable</div>
              </div>
              
              <div className="space-y-4 overflow-y-auto flex-1 pr-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
                {steps.map((step) => (
                  <div 
                    key={step.id}
                    className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                      currentStep === step.id 
                        ? 'border-primary bg-primary/5 shadow-lg' 
                        : 'border-border'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${getStepStatusColor(step.status)}`}>
                        {step.icon}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{getStepStatusIcon(step.status)}</span>
                          <h3 className="font-medium text-foreground">{step.name}</h3>
                          {step.duration && (
                            <span className="text-xs text-muted-foreground">
                              ({step.duration}ms)
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {step.description}
                        </p>
                        
                        {step.output && (
                          <div className="mt-3 p-3 bg-background rounded border overflow-hidden">
                            <div className="text-xs text-muted-foreground mb-1">Output:</div>
                            <div className="text-sm font-mono max-h-32 overflow-y-auto overflow-x-hidden">
                              {Object.entries(step.output).map(([key, value]) => (
                                <div key={key} className="mb-1 w-full">
                                  <div className="w-full">
                                    <div className="text-xs font-semibold text-gray-600 mb-1">{key}:</div>
                                    <div className="text-primary text-xs break-all whitespace-pre-wrap word-break-break-all pl-2 pr-2 max-w-full overflow-hidden">
                                      {String(value)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Results Summary */}
            {results.length > 0 && (
              <div className="bg-card p-6 rounded-lg border">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-foreground">Execution Results</h2>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {results.filter(r => r.status === 'success').length}
                    </div>
                    <div className="text-sm text-green-600">Successful Steps</div>
                  </div>
                  
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {results.reduce((acc, r) => acc + r.duration, 0)}ms
                    </div>
                    <div className="text-sm text-blue-600">Total Execution Time</div>
                  </div>
                </div>
                
                <div>
                  {!isRunning && results.length > 0 && (
                    <>
                      {artifacts.length > 0 && (
                        <div className="mt-4">
                          <h3 className="text-sm font-medium text-foreground mb-2">Generated Artifacts:</h3>
                          <div className="space-y-1">
                          {artifacts.map((artifact, index) => (
                            <button
                              key={index}
                              onClick={() => downloadArtifact(artifact)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              {artifact}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-2 mt-4">
                      <button 
                        onClick={() => {
                          const excelArtifact = artifacts.find(a => a.includes('.xlsx'));
                          if (excelArtifact) downloadArtifact(excelArtifact);
                          else addLog('⚠️ No Excel report available');
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        Download Excel Report
                      </button>
                      
                      <button 
                        onClick={() => {
                          const screenshots = artifacts.filter(a => a.includes('.png'));
                          if (screenshots.length > 0) {
                            screenshots.forEach(s => downloadArtifact(s));
                          } else {
                            addLog('⚠️ No screenshots available');
                          }
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View Screenshots
                      </button>
                    </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Live Logs */}
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold text-foreground mb-4">Live Execution Logs</h2>
            
            <div className="bg-black text-green-400 p-4 rounded-lg h-96 overflow-y-auto font-mono text-sm">
              {logs.length === 0 ? (
                <div className="text-gray-500">
                  Click "Execute Workflow" to begin ProcessIQ RPA automation...
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              )}
              
              {isRunning && (
                <div className="text-yellow-400 animate-pulse">
                  ▋ Executing...
                </div>
              )}
            </div>
            
            <div className="mt-4 flex justify-between text-xs text-muted-foreground">
              <span>Real-time monitoring of RPA workflow execution</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${useBackend ? 'bg-blue-500' : 'bg-orange-500'}`} />
                <span>{useBackend ? 'Production Mode' : 'Backup Mode'}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Platform Capabilities */}
        <div className="mt-8 bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            🎯 Platform Capabilities
          </h3>
          <ul className="text-blue-800 space-y-1">
            <li>• <strong>Enterprise Data Integration</strong>: Automated data acquisition from external platforms and APIs</li>
            <li>• <strong>Intelligent Document Generation</strong>: Creates professional reports with charts, formulas & business calculations</li>
            <li>• <strong>Advanced Analytics Engine</strong>: Customer segmentation, predictive modeling, and business intelligence</li>
            <li>• <strong>{!headlessMode ? 'Transparent Process Execution' : 'Optimized Background Processing'}</strong>: 
                {!headlessMode ? ' Real-time visibility into automation processes for compliance and audit' : ' High-performance execution with comprehensive logging and monitoring'}
            </li>
            <li>• <strong>Executive Reporting & Insights</strong>: Automated generation of strategic insights and actionable recommendations</li>
            <li>• <strong>Enterprise-Grade Technology Stack</strong>: Modern automation framework with enterprise security and scalability</li>
          </ul>
        </div>

        {/* Browser Mode Info */}
        {!headlessMode && (
          <div className="mt-4 bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
            <div className="flex items-center gap-2">
              <span className="text-green-600 text-lg">🌐</span>
              <div>
                <h4 className="text-sm font-semibold text-green-900">Transparent Process Execution</h4>
                <p className="text-xs text-green-700 mt-1">
                  <strong>Visual Execution Mode:</strong> Real-time visibility into ProcessIQ's data acquisition, 
                  processing workflows, and document generation. Complete transparency for compliance, 
                  audit requirements, and stakeholder confidence in automated processes.
                </p>
                <p className="text-xs text-green-600 mt-1 italic">
                  Enterprise Note: Platform automatically optimizes execution mode based on environment 
                  capabilities while maintaining comprehensive audit trails and compliance documentation.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {headlessMode && (
          <div className="mt-4 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
            <div className="flex items-center gap-2">
              <span className="text-blue-600 text-lg">⚡</span>
              <div>
                <h4 className="text-sm font-semibold text-blue-900">Optimized Production Mode</h4>
                <p className="text-xs text-blue-700 mt-1">
                  Enterprise-optimized execution for maximum performance and resource efficiency. 
                  Maintains full data processing capabilities including advanced analytics, 
                  professional document generation, and comprehensive business intelligence reporting 
                  with complete audit trails and compliance documentation.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}