import React, { useState } from 'react';
import { Shield, Users, Key, FileText, Download, Eye, EyeOff, Plus, Edit, Trash2, AlertTriangle, CheckCircle, Clock, Activity } from 'lucide-react';

export default function Security() {
  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'audit' | 'compliance'>('users');
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  const users = [
    {
      id: 1,
      name: 'John Smith',
      email: 'john.smith@company.com',
      role: 'Admin',
      status: 'active',
      lastLogin: '2 hours ago',
      permissions: ['workflow.create', 'workflow.execute', 'user.manage', 'system.configure']
    },
    {
      id: 2,
      name: 'Sarah Johnson',
      email: 'sarah.johnson@company.com',
      role: 'Workflow Designer',
      status: 'active',
      lastLogin: '1 day ago',
      permissions: ['workflow.create', 'workflow.execute', 'workflow.view']
    },
    {
      id: 3,
      name: 'Mike Chen',
      email: 'mike.chen@company.com',
      role: 'Operator',
      status: 'inactive',
      lastLogin: '1 week ago',
      permissions: ['workflow.execute', 'workflow.view']
    }
  ];

  const auditLogs = [
    {
      id: 1,
      timestamp: '2024-01-15 14:30:22',
      user: 'john.smith@company.com',
      action: 'Workflow Executed',
      resource: 'Customer Data Processing',
      result: 'success',
      ip: '192.168.1.100'
    },
    {
      id: 2,
      timestamp: '2024-01-15 13:45:10',
      user: 'sarah.johnson@company.com',
      action: 'User Created',
      resource: 'mike.chen@company.com',
      result: 'success',
      ip: '192.168.1.105'
    },
    {
      id: 3,
      timestamp: '2024-01-15 12:15:33',
      user: 'system',
      action: 'Failed Login Attempt',
      resource: 'admin@company.com',
      result: 'failed',
      ip: '203.0.113.45'
    }
  ];

  const complianceMetrics = {
    dataRetention: 'ISO 27001 Compliant',
    encryption: 'AES-256 Enabled',
    backups: '3 Daily Backups',
    monitoring: '24/7 Active',
    lastAudit: '2024-01-01',
    certifications: ['ISO 27001', 'SOC 2 Type II', 'GDPR Compliant']
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="flex items-center mb-2">
              <Shield className="w-6 h-6 text-primary mr-2" />
              <h1 className="text-2xl font-bold text-foreground">Security & Access Control</h1>
            </div>
            <p className="text-muted-foreground">Manage users, permissions, audit logs, and compliance</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors">
              <Download className="w-4 h-4 mr-2" />
              Export Audit Log
            </button>
            <button 
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </button>
          </div>
        </div>

        {/* Security Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-foreground">{users.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Sessions</p>
                <p className="text-2xl font-bold text-green-600">{users.filter(u => u.status === 'active').length}</p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed Logins</p>
                <p className="text-2xl font-bold text-red-600">3</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </div>
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Audit Events</p>
                <p className="text-2xl font-bold text-foreground">{auditLogs.length}</p>
              </div>
              <FileText className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg mb-6 w-fit">
          {[
            { key: 'users', label: 'Users & Teams', icon: Users },
            { key: 'permissions', label: 'Permissions', icon: Key },
            { key: 'audit', label: 'Audit Log', icon: FileText },
            { key: 'compliance', label: 'Compliance', icon: Shield }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.key 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            {users.map(user => (
              <div key={user.id} className="bg-card p-6 rounded-lg border border-border">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{user.name}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">{user.role}</span>
                        <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                          user.status === 'active' 
                            ? 'bg-green-500/10 text-green-500' 
                            : 'bg-gray-500/10 text-gray-500'
                        }`}>
                          {user.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {user.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Last login: {user.lastLogin}</span>
                    <button className="p-2 text-muted-foreground hover:text-foreground">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-muted-foreground hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-sm font-medium text-foreground mb-2">Permissions:</p>
                  <div className="flex flex-wrap gap-2">
                    {user.permissions.map(permission => (
                      <span key={permission} className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs">
                        {permission}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'permissions' && (
          <div className="bg-card p-6 rounded-lg border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Role-Based Access Control</h3>
            <div className="space-y-6">
              {['Admin', 'Workflow Designer', 'Operator', 'Viewer'].map(role => (
                <div key={role} className="border border-border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-foreground">{role}</h4>
                    <button className="text-primary hover:text-primary/80 text-sm">Edit</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['workflow.create', 'workflow.execute', 'workflow.view', 'user.manage', 'system.configure', 'audit.view'].map(permission => (
                      <label key={permission} className="flex items-center space-x-2 text-sm">
                        <input 
                          type="checkbox" 
                          defaultChecked={role === 'Admin' || (role === 'Workflow Designer' && !permission.includes('user')) || (role === 'Operator' && permission.includes('execute'))}
                          className="rounded border-border"
                        />
                        <span className="text-foreground">{permission}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="bg-card rounded-lg border border-border">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Audit Log</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left p-4 font-medium text-foreground">Timestamp</th>
                    <th className="text-left p-4 font-medium text-foreground">User</th>
                    <th className="text-left p-4 font-medium text-foreground">Action</th>
                    <th className="text-left p-4 font-medium text-foreground">Resource</th>
                    <th className="text-left p-4 font-medium text-foreground">Result</th>
                    <th className="text-left p-4 font-medium text-foreground">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-4 text-sm text-foreground">{log.timestamp}</td>
                      <td className="p-4 text-sm text-foreground">{log.user}</td>
                      <td className="p-4 text-sm text-foreground">{log.action}</td>
                      <td className="p-4 text-sm text-foreground">{log.resource}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          log.result === 'success' 
                            ? 'bg-green-500/10 text-green-500' 
                            : 'bg-red-500/10 text-red-500'
                        }`}>
                          {log.result}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{log.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'compliance' && (
          <div className="space-y-6">
            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Compliance Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">Data Retention Policy</span>
                    <span className="text-green-500">{complianceMetrics.dataRetention}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">Encryption Standard</span>
                    <span className="text-green-500">{complianceMetrics.encryption}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">Backup Policy</span>
                    <span className="text-green-500">{complianceMetrics.backups}</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">Security Monitoring</span>
                    <span className="text-green-500">{complianceMetrics.monitoring}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-foreground">Last Security Audit</span>
                    <span className="text-foreground">{complianceMetrics.lastAudit}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card p-6 rounded-lg border border-border">
              <h3 className="text-lg font-semibold text-foreground mb-4">Certifications & Standards</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {complianceMetrics.certifications.map(cert => (
                  <div key={cert} className="flex items-center space-x-2 p-3 bg-green-500/10 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-foreground font-medium">{cert}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Add User Modal */}
        {showAddUserModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-lg border border-border p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-foreground">Add New User</h3>
                <button 
                  onClick={() => setShowAddUserModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ×
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                  <input 
                    type="text" 
                    placeholder="John Doe"
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                  <input 
                    type="email" 
                    placeholder="john.doe@company.com"
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Role</label>
                  <select className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground">
                    <option>Viewer</option>
                    <option>Operator</option>
                    <option>Workflow Designer</option>
                    <option>Admin</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-4">
                  <button 
                    onClick={() => setShowAddUserModal(false)}
                    className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                    Create User
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}