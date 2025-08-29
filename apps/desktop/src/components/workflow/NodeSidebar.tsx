import React from 'react';
import { 
  Play, 
  Square, 
  Globe, 
  FileText, 
  Mail, 
  Database, 
  Zap,
  Settings,
  GitBranch
} from 'lucide-react';

export interface NodeType {
  type: string;
  name: string;
  icon: React.ComponentType<any>;
  category: string;
  description: string;
  color: string;
}

export const NODE_TYPES: NodeType[] = [
  // Control nodes
  { 
    type: 'start', 
    name: 'Start', 
    icon: Play, 
    category: 'Control', 
    description: 'Workflow entry point',
    color: 'bg-green-100 text-green-700'
  },
  { 
    type: 'end', 
    name: 'End', 
    icon: Square, 
    category: 'Control', 
    description: 'Workflow completion',
    color: 'bg-red-100 text-red-700'
  },
  { 
    type: 'condition', 
    name: 'Condition', 
    icon: GitBranch, 
    category: 'Control', 
    description: 'Conditional logic',
    color: 'bg-purple-100 text-purple-700'
  },
  { 
    type: 'loop', 
    name: 'Loop', 
    icon: Settings, 
    category: 'Control', 
    description: 'Iterate over data',
    color: 'bg-indigo-100 text-indigo-700'
  },

  // Web automation nodes
  { 
    type: 'browser_open', 
    name: 'Open Browser', 
    icon: Globe, 
    category: 'Web', 
    description: 'Launch web browser',
    color: 'bg-blue-100 text-blue-700'
  },
  { 
    type: 'browser_navigate', 
    name: 'Navigate', 
    icon: Globe, 
    category: 'Web', 
    description: 'Navigate to URL',
    color: 'bg-blue-100 text-blue-700'
  },
  { 
    type: 'browser_extract', 
    name: 'Extract Data', 
    icon: Globe, 
    category: 'Web', 
    description: 'Extract page data',
    color: 'bg-blue-100 text-blue-700'
  },
  { 
    type: 'browser_close', 
    name: 'Close Browser', 
    icon: Globe, 
    category: 'Web', 
    description: 'Close web browser',
    color: 'bg-blue-100 text-blue-700'
  },

  // Data nodes
  { 
    type: 'excel_read', 
    name: 'Read Excel', 
    icon: FileText, 
    category: 'Data', 
    description: 'Read Excel file',
    color: 'bg-green-100 text-green-700'
  },
  { 
    type: 'excel_write', 
    name: 'Write Excel', 
    icon: FileText, 
    category: 'Data', 
    description: 'Write Excel file',
    color: 'bg-green-100 text-green-700'
  },
  { 
    type: 'database_query', 
    name: 'Database Query', 
    icon: Database, 
    category: 'Data', 
    description: 'Query database',
    color: 'bg-orange-100 text-orange-700'
  },
  { 
    type: 'file_scan', 
    name: 'Scan Files', 
    icon: FileText, 
    category: 'Data', 
    description: 'Scan directory for files',
    color: 'bg-green-100 text-green-700'
  },

  // Communication nodes
  { 
    type: 'email_send', 
    name: 'Send Email', 
    icon: Mail, 
    category: 'Communication', 
    description: 'Send email message',
    color: 'bg-yellow-100 text-yellow-700'
  },
  { 
    type: 'http_request', 
    name: 'HTTP Request', 
    icon: Globe, 
    category: 'Communication', 
    description: 'Make HTTP request',
    color: 'bg-teal-100 text-teal-700'
  },

  // Processing nodes
  { 
    type: 'python_script', 
    name: 'Python Script', 
    icon: Zap, 
    category: 'Processing', 
    description: 'Execute Python code',
    color: 'bg-indigo-100 text-indigo-700'
  },
  { 
    type: 'template_render', 
    name: 'Template', 
    icon: FileText, 
    category: 'Processing', 
    description: 'Render template',
    color: 'bg-gray-100 text-gray-700'
  },
];

interface NodeSidebarProps {
  onDragStart: (event: React.DragEvent<HTMLDivElement>, nodeType: string) => void;
}

export function NodeSidebar({ onDragStart }: NodeSidebarProps) {
  const categories = Array.from(new Set(NODE_TYPES.map(node => node.category)));

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 overflow-y-auto">
      <h3 className="font-semibold text-gray-900 mb-4">Node Library</h3>
      
      {categories.map(category => (
        <div key={category} className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">{category}</h4>
          <div className="space-y-2">
            {NODE_TYPES.filter(node => node.category === category).map(node => (
              <div
                key={node.type}
                className="flex items-center p-3 border border-gray-200 rounded-lg cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                draggable
                onDragStart={(event) => onDragStart(event, node.type)}
                title={node.description}
              >
                <div className={`p-2 rounded-lg mr-3 ${node.color}`}>
                  <node.icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{node.name}</div>
                  <div className="text-xs text-gray-500">{node.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default NodeSidebar;