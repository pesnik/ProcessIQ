# ProcessIQ Enterprise RPA Platform

ProcessIQ is an **enterprise-grade RPA platform** built on proven open-source automation frameworks. We combine **Microsoft Workflow Foundation architectural patterns** with modern automation tools like **TagUI** and **RPA Framework** to deliver professional-grade business process automation without vendor lock-in.

> 📖 **[See Complete RPA Platform Overview](docs/RPA_ORCHESTRATION_OVERVIEW.md)** for detailed architecture, integrations, and capabilities.

## 🎯 **Core Value Proposition**

**Professional RPA Platform:**
- **Business Users**: "I need web data in Excel" → Visual workflow designer with real automation ✅
- **IT Professionals**: "I want robust enterprise automation" → Professional toolkit with full control 🔧
- **Enterprise**: "I need scalable automation with compliance" → Complete platform with audit trails 🏢

**💰 Enterprise-Ready**: Professional automation platform with transparent pricing and no vendor dependencies.

## 🏗️ **Architecture Philosophy**

![ProcessIQ Complete Tech Stack Architecture](docs/architecture/processiq-architecture-v5-complete-stack.svg)

> **🏆 Strategy**: Build custom ProcessIQ workflow engine on proven open-source automation frameworks = Complete control + Enterprise features!

## 🌿 **Branch Strategy & Development Approach**

ProcessIQ development follows a **dual-track approach** to explore the best architectural foundation:

### **📦 Current Branch Structure**

| Branch | Purpose | Status | Focus |
|--------|---------|---------|-------|
| **`main`** | Production Platform | ✅ **Active** | Enterprise-ready RPA platform with professional UI |
| **`custom-rpa-platform`** | R&D Branch | 🔬 **Research** | Custom workflow engine built on TagUI + RPA Framework |
| **`n8n-integration`** | Alternative Approach | 📋 **Planned** | n8n-based workflow engine exploration |

### **🎯 Custom RPA Platform Approach (Primary Focus)**

**Built on Microsoft Workflow Foundation Patterns:**
- **Inspired by UiPath Architecture**: Visual workflow designer with enterprise execution engine
- **Open Source Foundation**: TagUI + RPA Framework + Custom orchestration layer
- **Complete Control**: No third-party branding or licensing constraints
- **Enterprise Features**: Built-in compliance, audit trails, and role-based access

**🔧 Core Technology Stack**
- **Workflow Engine**: Custom React-based visual designer inspired by WF patterns
- **Automation Layer**: TagUI for web automation, RPA Framework for desktop/enterprise systems
- **Execution Runtime**: Python-based orchestration with state management
- **Professional UI**: ProcessIQ-branded interface suitable for enterprise demonstrations

### **🏗️ Workflow Engine Foundation Options**

| Solution | ProcessIQ Assessment | Decision |
|----------|---------------------|----------|
| **Custom Engine** | Complete control, ProcessIQ branding, enterprise features | **🏆 Primary Focus** |
| **n8n Integration** | Fast development, existing integrations, third-party branding | **📋 Research Alternative** |
| **TagUI + RPA Framework** | Battle-tested automation, flexible integration | **✅ Core Automation Layer** |
| **Microsoft WF Patterns** | Enterprise-proven architecture, scalable design | **✅ Architectural Foundation** |

### **🚀 Custom ProcessIQ Platform Benefits**
- **Pure Branding**: Complete ProcessIQ identity without third-party logos
- **Enterprise Architecture**: Built specifically for professional demonstrations
- **Flexible Integration**: Direct integration with TagUI, RPA Framework, and custom connectors
- **Competitive Advantage**: Unique value proposition not constrained by existing platforms
- **Professional Presentation**: Suitable for C-suite and enterprise sales demonstrations

## 🔧 **Complete Solution Stack**

### 📥 **Data Sources (Heterogeneous Input)**
- **🌐 Web Scraping**: Traditional + AI-powered with Playwright/Selenium + Vision LLMs
- **🖥️ Desktop Applications**: Native app control (Office, ERP, any desktop software)
- **🔗 API Integration**: REST, GraphQL, SOAP with rate limiting and auth
- **🗄️ Database Connectors**: SQL, NoSQL, Cloud databases with connection pooling
- **📁 File Processing**: Local/Cloud files (Excel, CSV, JSON, PDF, Images)
- **📧 Email & Documents**: IMAP, POP3, Exchange, SharePoint integration

### ⚙️ **Processing Engine (Core Intelligence)**
- **Plugin Manager**: Dynamic loading of connectors and processors
- **Event System**: Pub/sub architecture for loose coupling  
- **Task Queue**: Background processing with Celery + Redis
- **Data Transformation**: ETL pipelines with validation and error handling
- **AI Integration**: Traditional RPA + Vision LLMs + Future tech ready

### 🤖 **AI Intelligence Layer** *(Optional Extension)*
- **Vision-Language Models**: Qwen2.5-VL (local), GPT-4V, Claude-3V (cloud)
- **Hybrid Automation**: Smart fallback between traditional and AI methods
- **Self-Learning Engine**: Pattern recognition and workflow optimization
- **Document AI**: OCR, NLP, multimodal document understanding
- **🏷️ Requires**: GPU resources or cloud API credits

### 📤 **Data Targets (Flexible Output)**
- **📊 Files**: Excel, CSV, JSON, PDF reports with custom formatting
- **🗄️ Databases**: SQL/NoSQL with bulk operations and transactions  
- **🔗 APIs & Webhooks**: POST data to any endpoint with authentication
- **☁️ Cloud Storage**: S3, Azure Blob, Google Cloud with versioning
- **📧 Communications**: Email reports, Slack notifications, mobile alerts

### 🤖 **Distributed Agents Extension** *(Optional Extension)*
- **Execution Agents**: Specialized bots (SAP, Email, Excel, Web)
- **Monitor Agents**: Health checks, auto-healing, performance tracking
- **Security Agents**: Access control, audit trails, compliance
- **Learning Agents**: Usage analytics, workflow optimization
- **🏷️ Requires**: Additional infrastructure and compute resources

### 📊 **Business Intelligence Stack** *(Optional Extension)*
*(When users need more than basic target delivery)*

- **🏪 Data Warehouse**: Star schema design with time series support
- **🔄 ETL Engine**: Complete transformation pipelines with scheduling
- **📈 Analytics Engine**: SQL processing, aggregations, KPI calculations
- **📋 Report Builder**: Drag & drop interface with templates
- **📊 Interactive Dashboards**: Real-time visualizations and drill-down
- **🔮 Advanced Analytics**: ML insights, forecasting, anomaly detection

### 🖥️ **Desktop Application (Primary Interface)**
- **Embedded n8n Editor**: Professional workflow builder in Electron webview
- **Multi-Channel Workflow Creation**:
  - **Visual Builder**: Full n8n drag & drop editor with custom RPA nodes
  - **Chat Interface**: "Extract data from this website" → generates n8n workflow
  - **BRD Upload**: Business requirements → auto-creates n8n workflow templates
- **n8n Integration Features**:
  - **Node Management**: Install @processiq/n8n-rpa-nodes package
  - **Execution Monitor**: Built-in n8n execution history and logs
  - **Credential Store**: Leverage n8n's secure credential management
  - **Template Library**: Import/export n8n workflow templates
- **Extension Control**: Enable/disable AI and Agent node packages as needed

## 🏛️ **Project Structure**

ProcessIQ is organized as a modern **monorepo** with clearly separated concerns:

```
ProcessIQ/
├── apps/
│   ├── backend/           # Python FastAPI backend
│   │   └── src/processiq/
│   │       ├── api/       # REST API endpoints
│   │       ├── connectors/ # Data source integrations
│   │       ├── core/      # Engine, events, plugins
│   │       ├── agents/    # AI automation agents
│   │       └── processors/ # Data transformation
│   └── desktop/           # Electron + React frontend
│       ├── src/
│       │   ├── components/ # UI components
│       │   ├── pages/     # Application screens
│       │   ├── store/     # State management
│       │   └── hooks/     # Custom React hooks
│       └── electron/      # Electron main process
├── packages/              # Shared libraries
├── plugins/               # Plugin ecosystem
├── config/                # Environment configurations
├── docs/                  # Documentation & architecture
└── examples/              # Sample workflows
```

## 💻 **Technology Stack**

### **Backend (Python)**
- **Core Framework**: FastAPI + Uvicorn + SQLAlchemy + Alembic
- **Task Processing**: Celery + Redis for background jobs
- **Web Automation**: Playwright + Selenium + Browser-use
- **AI/ML**: OpenAI + Anthropic + Transformers + PyTorch
- **Data Processing**: Pandas + Polars + OpenPyXL
- **Desktop Automation**: PyAutoGUI + OpenCV + PyGetWindow
- **Document Processing**: PyTesseract + PDF2Image + PDFPlumber
- **Database**: PostgreSQL + MongoDB drivers

### **Desktop App (TypeScript)**
- **Framework**: Electron + React 18 + TypeScript
- **Workflow Engine**: Custom React Flow-based visual designer
- **UI Components**: Radix UI + Tailwind CSS + Lucide Icons
- **State Management**: Zustand + Immer for workflow state
- **Visual Editor**: React Flow + Custom ProcessIQ nodes
- **Build Tools**: Vite + Electron Builder

### **Infrastructure & DevOps**
- **Containerization**: Docker + Docker Compose
- **Development**: Concurrently + Hot reloading
- **Code Quality**: ESLint + Prettier + Black + MyPy
- **Testing**: Pytest + Vitest + React Testing Library
- **Deployment**: Kubernetes ready + Multi-platform builds

## 🎯 **Use Cases & Pricing Tiers**

### 💙 **STARTER - Core RPA Only** 
*"I need traditional automation without AI costs"*
```
✅ Web Scraping → Excel File (Playwright)
✅ API Data → CSV Export (REST connectors)
✅ Desktop Apps → Database (Robot Framework)
✅ Scheduled automation with error handling
```
**💰 Cost**: Base subscription only - No GPU/AI fees

### 🧡 **SMART - Core + AI Extensions**
*"I want AI to handle complex scenarios"*
```
✅ Everything in Starter +
🧠 Vision LLMs for dynamic UI handling
🧠 Chat interface for workflow creation
🧠 BRD document processing and auto-generation
🧠 Smart fallback when traditional RPA fails
```
**💰 Cost**: Base + AI usage fees (GPU time or API calls)

### 💚 **PRO - Core + AI + Agents**
*"I need distributed automation with specialized bots"*
```
✅ Everything in Smart +
🤖 Specialized execution agents (SAP Bot, Email Bot)
🤖 Auto-healing and performance optimization
🤖 Advanced orchestration and task distribution
🤖 Multi-agent workflow coordination
```
**💰 Cost**: Base + AI + Agent infrastructure fees

### 💜 **ENTERPRISE - Full Custom Stack**
*"I need white-label solution with custom features"*
```
✅ Everything in Pro +
🏢 On-premise deployment options
🏢 Custom agent development
🏢 White-label branding
🏢 Dedicated support and SLA
```
**💰 Cost**: Custom pricing based on requirements

## 🛣️ **Implementation Roadmap & Strategy**

### **🎯 Custom ProcessIQ Platform Development**

#### **🏆 Primary Approach: Custom Workflow Engine** 
**Timeline**: 16-24 weeks total
```bash
Phase 1 (4-6 weeks): Custom Workflow Designer
├── React Flow visual editor with ProcessIQ branding
├── Custom workflow definition format (JSON-based)
├── Drag-drop interface with professional UI components
└── Workflow validation and preview functionality

Phase 2 (4-6 weeks): Automation Layer Integration  
├── TagUI connector for web automation
├── RPA Framework bridge for desktop/enterprise automation
├── Custom action library for business processes
└── Execution runtime with state management

Phase 3 (4-6 weeks): Enterprise Features
├── Role-based access control and user management
├── Workflow scheduling and orchestration
├── Audit trails and compliance reporting
└── Performance monitoring and analytics

Phase 4 (4-6 weeks): Professional Polish
├── Advanced debugging and troubleshooting tools
├── Template library and workflow marketplace
├── Integration APIs and webhook support
└── Documentation and training materials
```

### **📋 Research Alternatives (Parallel Development)**

#### **Alternative: n8n Integration Study**
**Timeline**: 8-12 weeks (research branch)
```bash
Research Phase: n8n Evaluation
├── Embed n8n editor and assess branding constraints
├── Develop custom @processiq/n8n-rpa-nodes package
├── Evaluate integration complexity and limitations
└── Compare development effort vs custom approach
```

### **🏆 Why Custom Engine is Preferred**
- **Complete Control**: ProcessIQ branding and user experience without constraints
- **Enterprise Architecture**: Built specifically for professional business presentations
- **Competitive Differentiation**: Unique value proposition not available in existing platforms
- **Flexible Integration**: Direct control over TagUI and RPA Framework integration
- **Professional Presentation**: Suitable for C-suite demonstrations and enterprise sales
- **No Vendor Lock-in**: Complete independence from third-party platform decisions

### **Phase 1: Custom Workflow Foundation (4-6 weeks)** 🏆
```bash
# Core ProcessIQ Workflow Engine
npm install @xyflow/react @xyflow/node-resizer
npm install zustand immer
npm install lucide-react @radix-ui/react-dialog

# Visual Workflow Designer
├── WorkflowDesigner.tsx     # Main visual editor component
├── NodeLibrary.tsx          # Draggable node palette
├── PropertyPanel.tsx        # Node configuration interface
└── WorkflowValidation.tsx   # Flow validation and preview

# Custom Workflow Definition Format
├── workflow.schema.json     # JSON schema for workflow definition
├── WorkflowEngine.ts        # Core execution engine
├── NodeTypes.ts            # TypeScript definitions for all node types
└── WorkflowSerializer.ts    # Save/load workflow configurations

# ProcessIQ Professional UI Components
├── ProcessIQTheme.tsx      # Custom design system
├── EnterpriseLayout.tsx    # Professional application shell
├── WorkflowToolbar.tsx     # Workflow management controls
└── StatusIndicators.tsx    # Real-time execution feedback
```

### **Phase 2: Automation Layer Integration (4-6 weeks)**
```bash
# Core Automation Frameworks
pip install tagui rpaframework
pip install robotframework robotframework-seleniumlibrary
npm install playwright puppeteer

# ProcessIQ Custom Connectors
├── TagUIConnector.py       # Web automation via TagUI
├── RPAFrameworkBridge.py   # Desktop automation bridge
├── PlaywrightConnector.py  # Modern web automation
└── CustomActionLibrary.py  # Business-specific actions

# Workflow Node Types
├── WebAutomationNode.tsx   # Web scraping and interaction
├── DesktopActionNode.tsx   # Desktop application control
├── DataProcessingNode.tsx  # File and data manipulation
├── DatabaseNode.tsx        # Database operations
└── BusinessLogicNode.tsx   # Custom business rules

# Execution Runtime
├── WorkflowExecutor.py     # Python-based execution engine
├── StateManager.py         # Workflow state persistence
├── ErrorHandler.py         # Comprehensive error handling
└── SchedulingEngine.py     # Workflow scheduling and triggers
```

### **Phase 3: Multi-Modal Input (3-4 weeks)**
```bash
# Chat Interface Components
npm install @microsoft/bot-framework-sdk
npm install socket.io express
├── Chat UI: React + Socket.IO for real-time chat
├── Intent Recognition: Microsoft Bot Framework or Rasa
├── Workflow Generation: Custom chat → n8n JSON converter

# BRD Document Processing
pip install pypdf2 python-docx pdfplumber
npm install mammoth pdf2pic tesseract.js
├── Document Parsing: PyPDF2, python-docx, mammoth.js
├── OCR Processing: Tesseract.js for scanned documents  
├── Text Analysis: spaCy or NLTK for requirement extraction
├── Template Generation: Custom BRD → n8n workflow templates

# Workflow Template System
├── Template Storage: JSON-based n8n workflow templates
├── Template Library: Pre-built RPA pattern templates
├── Import/Export: n8n workflow JSON manipulation
```

### **Phase 4: AI Extensions (Optional - 4-6 weeks)**
```bash
# Vision LLM Integration
pip install transformers torch pillow
npm install openai @anthropic-ai/sdk
├── Local Models: Hugging Face Transformers (Qwen2.5-VL)
├── Cloud APIs: OpenAI GPT-4V, Anthropic Claude-3V
├── Image Processing: PIL/Pillow for screenshot analysis

# Natural Language Processing  
pip install langchain langchain-community
npm install @langchain/core @langchain/community
├── LangChain: Document processing and chain orchestration
├── Chat Processing: Intent recognition and workflow generation
├── BRD Analysis: Document understanding and requirement extraction

# Smart Routing & Learning
pip install scikit-learn pandas numpy
├── Decision Engine: Scikit-learn for routing decisions
├── Pattern Recognition: ML models for workflow optimization
├── Performance Analytics: Data collection and analysis

# AI Node Package:
├── VisionLLMNode.ts     # Screenshot → UI understanding
├── SmartRouterNode.ts   # AI vs Traditional routing logic  
├── LearningNode.ts      # Pattern analysis and optimization
├── ChatProcessorNode.ts # Natural language → workflow
└── BRDAnalyzerNode.ts   # Document → requirements extraction
```

### **Phase 5: Agent Extensions (Optional - 6-8 weeks)**
```bash
# Agent Orchestration Framework
pip install celery redis dramatiq
npm install bull agenda
├── Task Queue: Celery (Python) or Bull (Node.js)
├── Message Broker: Redis for inter-agent communication
├── Distributed Processing: Multiple worker processes

# Multi-Agent Coordination
pip install pydantic fastapi
npm install zod express
├── Agent Communication: REST APIs with FastAPI/Express
├── Schema Validation: Pydantic (Python) or Zod (TypeScript)
├── Service Discovery: Simple registry or Consul/etcd

# Monitoring & Health Checks  
pip install prometheus-client grafana-api
npm install prom-client
├── Metrics Collection: Prometheus client libraries
├── Health Monitoring: Custom health check endpoints
├── Auto-Healing: Process monitoring and restart logic
├── Dashboard: Grafana for agent performance monitoring

# Security & Access Control
pip install python-jose passlib
npm install jsonwebtoken bcryptjs  
├── Authentication: JWT tokens for agent-to-agent auth
├── Authorization: Role-based access control (RBAC)
├── Audit Logging: Structured logging with correlation IDs

# Agent Node Package:
├── AgentExecutionNode.ts    # Delegate tasks to specialized bots
├── AgentMonitorNode.ts      # Health checks and auto-healing
├── AgentCoordinatorNode.ts  # Multi-agent workflow orchestration  
├── AgentSecurityNode.ts     # Access control and audit trails
└── AgentCommunicationNode.ts # Inter-agent messaging and coordination
```

## 🚀 **Quick Start**

### Option 1: Development Setup (Recommended)
```bash
# Clone the repository
git clone https://github.com/pesnik/ProcessIQ.git
cd ProcessIQ

# Switch to custom RPA platform branch
git checkout custom-rpa-platform

# Install dependencies (Node.js + Python + RPA frameworks)
npm run setup

# Start development servers (Backend + Desktop app + Custom workflow engine)
npm run dev

# Access ProcessIQ platform at http://localhost:3000
# Custom workflow designer with ProcessIQ branding
# Backend API available at http://localhost:8000
```

### Option 2: Production Desktop App
```bash
# Install backend
cd apps/backend
pip install -e .[vision]

# Build and run desktop application
cd ../desktop
npm install
npm run build
npm run dev:electron
```

### Option 3: Docker Deployment
```bash
# Full stack deployment
docker-compose up -d

# Access services:
# - Desktop app: http://localhost:3000
# - Backend API: http://localhost:8000
# - Redis: localhost:6379
```

### Option 4: Backend Only (API Mode)
```bash
# Install and start backend
cd apps/backend
pip install -e .[dev,vision]
python -m uvicorn processiq.main:app --reload

# API documentation: http://localhost:8000/docs
```

## 📈 **Evolution Path - Start Simple, Scale Smart**

**🔄 Pay-as-you-grow Architecture**

1. **🔧 Start with Core RPA**: Traditional automation handles 90% of use cases
2. **🧠 Add AI When Needed**: Enable AI extensions for complex scenarios  
3. **🤖 Scale with Agents**: Add specialized bots for enterprise orchestration
4. **🏢 Customize for Enterprise**: White-label and custom features

**💡 Key Benefits:**
- **No Vendor Lock-in**: Core RPA works without AI dependencies
- **Cost Effective**: Pay only for advanced features you actually use
- **Risk Mitigation**: Traditional RPA provides reliable fallback
- **Future Proof**: Architecture adapts to any new automation technology

## 🌟 **Community & Contributing**

ProcessIQ is an open-source project built for the community. We welcome contributions of all kinds!

### **📋 Ways to Contribute**
- 🐛 **Bug Reports**: Found an issue? [Report it here](https://github.com/pesnik/ProcessIQ/issues)
- 💡 **Feature Requests**: Have an idea? [Suggest it here](https://github.com/pesnik/ProcessIQ/issues)
- 🔧 **Plugin Development**: Create new connectors and processors
- 📖 **Documentation**: Help improve our docs and examples
- 🧪 **Testing**: Test new features and report feedback

### **🚀 Getting Started with Development**
```bash
# Fork and clone the repository
git clone https://github.com/pesnik/ProcessIQ.git
cd ProcessIQ

# Set up development environment (installs both Node.js and Python deps)
npm run setup

# Development workflow commands:
npm run dev          # Start both backend and desktop app
npm run test         # Run all tests (backend + desktop)
npm run lint         # Lint all code (Python + TypeScript)  
npm run format       # Format all code
npm run build        # Build both applications

# Individual app development:
npm run dev:backend  # Backend only (FastAPI)
npm run dev:desktop  # Desktop app only (Electron + React)

# Clean build artifacts
npm run clean
```

### **📚 Documentation & Support**
- **📖 Documentation**: [Coming Soon] - Comprehensive guides and API docs
- **💬 Discussions**: [GitHub Discussions](https://github.com/pesnik/ProcessIQ/discussions)
- **🐛 Issues**: [GitHub Issues](https://github.com/pesnik/ProcessIQ/issues)
- **📧 Contact**: [Create an issue](https://github.com/pesnik/ProcessIQ/issues) for questions

### **🔌 Custom ProcessIQ Node Development**

ProcessIQ uses a custom workflow engine built specifically for enterprise RPA:

#### **ProcessIQ Custom Nodes (Primary)**
- **Complete Control**: Build nodes with full ProcessIQ branding and functionality
- **TypeScript Support**: Modern development experience with enterprise-grade typing
- **Automation Integration**: Direct integration with TagUI, RPA Framework, and Playwright
- **Enterprise Features**: Built-in audit trails, error handling, and compliance features
- **Documentation**: [ProcessIQ Node Development Guide](docs/development/custom-nodes.md)

#### **Automation Framework Integration**
- **TagUI Integration**: Natural language web automation with visual debugging
- **RPA Framework**: Enterprise desktop automation with comprehensive reporting
- **Playwright Connector**: Modern web automation with advanced capabilities
- **Custom Actions**: Business-specific automation actions and workflows

#### **Professional Development Experience**
- **Visual Debugger**: Real-time workflow execution monitoring and debugging
- **Template System**: Pre-built workflow templates for common business processes
- **Version Control**: Git-based workflow version management and collaboration
- **Testing Framework**: Automated testing and validation for workflow reliability

### **🏆 ProcessIQ Platform Advantages**

| Feature | ProcessIQ Custom | Third-Party Integration |
|---------|------------------|------------------------|
| **Branding** | Complete ProcessIQ identity | Third-party logos and constraints |
| **Enterprise Features** | Built-in compliance and audit | Add-on or missing features |
| **Customization** | Unlimited flexibility | Limited by platform constraints |
| **Professional Presentation** | C-suite ready interface | Generic workflow appearance |
| **Automation Integration** | Direct TagUI/RPA Framework control | Limited to platform capabilities |
| **Competitive Advantage** | Unique value proposition | Commodity workflow builder |

**Strategy**: Custom ProcessIQ platform provides complete control and professional presentation suitable for enterprise demonstrations and sales.

## 📄 **License**

MIT License - Built for the community and enterprise adoption.

**ProcessIQ** is free to use, modify, and distribute. See [LICENSE](https://github.com/pesnik/ProcessIQ/blob/main/LICENSE) for details.

---

## ⭐ **Star the Repository**

If ProcessIQ is helpful for your automation needs, please ⭐ **star the repository** on GitHub to show your support and help others discover it!

**Key Technical Decisions:**
- **Custom Workflow Engine**: Built specifically for ProcessIQ with complete branding control
- **Microsoft WF Patterns**: Enterprise-proven architecture inspired by UiPath's success
- **Open Source Foundation**: TagUI + RPA Framework for battle-tested automation capabilities
- **Professional Presentation**: C-suite ready interface without third-party constraints
- **React Flow Integration**: Modern visual workflow designer with unlimited customization
- **Desktop-First**: Electron app with custom ProcessIQ workflow engine for enterprise demonstrations

**🔗 Repository**: [https://github.com/pesnik/ProcessIQ](https://github.com/pesnik/ProcessIQ)