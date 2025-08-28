# ProcessIQ

ProcessIQ is an **extensible RPA orchestration platform** that transforms automation by leveraging proven tools rather than building from scratch. We provide a **layered architecture** where traditional RPA works perfectly without AI, and intelligent features are optional extensions you can add as needed.

> 📖 **[See Complete RPA Orchestration Overview](docs/RPA_ORCHESTRATION_OVERVIEW.md)** for detailed architecture, integrations, and capabilities.

## 🎯 **Core Value Proposition**

**Extensible Automation Platform:**
- **Basic Users**: "I need web data in Excel" → Traditional RPA ✅ (No GPU/AI costs)
- **Smart Users**: "I want AI to handle complex UI changes" → Add AI Extension 🧠 (Pay only when needed)
- **Enterprise**: "I need agent orchestration and custom bots" → Full Stack 🚀 (Complete solution)

**💰 Pay-as-you-grow pricing**: Start with traditional RPA, upgrade to AI/Agents only when you need them.

## 🏗️ **Architecture Philosophy**

![ProcessIQ Complete Tech Stack Architecture](docs/architecture/processiq-architecture-v5-complete-stack.svg)

> **🏆 Strategy**: Leverage n8n's battle-tested workflow engine + build custom RPA nodes = 80% less development time!

**🏗️ Workflow Engine Foundation Options**

ProcessIQ leverages **existing open-source workflow builders** instead of building from scratch:

### **🎯 Primary Options Analysis**

| Solution | Pros | Cons | Best For |
|----------|------|------|----------|
| **n8n** | 400+ integrations, visual editor, self-hosted | May be opinionated, requires customization | **Recommended** - Full-featured platform |
| **Node-RED** | Mature, extensive plugins, IBM-backed | Technical UI, older architecture | IoT/Industrial automation focus |
| **React Flow** | Pure React, highly customizable, modern | No execution engine, build everything | Custom UI with full control |
| **Blockly** | Visual programming, Google-backed | More for coding than workflows | Educational/visual programming |

### **🏆 Recommended: n8n Integration**
- **Visual Flow Editor**: Professional drag & drop interface (embedded n8n)
- **400+ Integrations**: APIs, databases, SaaS tools already built-in
- **Self-Hosted**: Complete data control, no vendor lock-in
- **Production-Ready**: Battle-tested by thousands of companies

**🔧 @processiq/n8n-rpa-nodes Package**
- **Custom RPA Nodes**: Playwright, Robot Framework, TagUI nodes for n8n
- **No AI/GPU Required**: Traditional automation works perfectly standalone
- **Easy Extension**: n8n's node development framework is excellent
- **TypeScript**: Professional development experience

**🚀 Multi-Modal Workflow Creation**
- **n8n Visual Editor**: Traditional drag & drop workflow building
- **Chat → n8n**: "Extract data from this website" → generates n8n workflow
- **BRD → n8n**: Upload business requirements → auto-creates workflow templates
- **Template Library**: Pre-built RPA workflow patterns

**💡 Optional Extensions (Pay-as-you-grow)**
- **AI Nodes**: Vision LLM, Smart Router, Learning nodes (optional n8n extensions)
- **Agent Nodes**: Multi-agent orchestration nodes (optional n8n extensions)
- **Advanced Analytics**: ML insights as additional workflow nodes

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
- **n8n Integration**: Embedded n8n editor via webview/iframe
- **UI Components**: Radix UI + Tailwind CSS + Lucide Icons (for extensions)
- **State Management**: Zustand + TanStack Query
- **Workflow Engine**: n8n (embedded) + @processiq/n8n-rpa-nodes
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

## 🛣️ **Implementation Roadmap & Alternatives**

### **🎯 Implementation Strategy Options**

#### **Option A: n8n Integration (Recommended)** 🏆
**Timeline**: 12-20 weeks total
```bash
Phase 1 (2-4 weeks): n8n Integration
├── npm install n8n
├── Embed n8n editor in Electron app
├── Create @processiq/n8n-rpa-nodes package structure
└── Build first RPA node (Playwright)
```

#### **Option B: Node-RED Integration** 
**Timeline**: 14-22 weeks total
```bash
Phase 1 (3-5 weeks): Node-RED Integration
├── npm install node-red
├── Embed Node-RED editor in Electron app
├── Create ProcessIQ Node-RED nodes
└── Build dashboard integration
```

#### **Option C: React Flow Custom** 
**Timeline**: 20-30 weeks total
```bash
Phase 1 (6-10 weeks): Custom Workflow Engine
├── npm install @xyflow/react
├── Build workflow execution engine from scratch
├── Create drag-drop node system
└── Implement scheduling and error handling
```

#### **Option D: Blockly + Custom Engine** 
**Timeline**: 16-24 weeks total
```bash
Phase 1 (4-6 weeks): Blockly Integration
├── npm install blockly
├── Create RPA block definitions
├── Build code generation system
└── Implement execution runtime
```

### **🏆 Why n8n is Recommended**
- **Fastest Time-to-Market**: 12-20 weeks vs 16-30 weeks for alternatives
- **Production-Ready**: Battle-tested with thousands of users
- **Rich Ecosystem**: 400+ existing integrations to leverage
- **Self-Hosted**: Perfect fit for desktop-first approach
- **Excellent Documentation**: Node development guides and APIs
- **Active Community**: Regular updates and community support

### **Phase 1: n8n Integration Foundation (2-4 weeks)** 🏆
```bash
# Core n8n Integration
npm install n8n @n8n/n8n-nodes-base
npm install @types/n8n

# Electron Integration  
npm install electron electron-builder
# Embed n8n editor via iframe/webview in Electron

# Basic Node Development Setup
mkdir packages/n8n-rpa-nodes
npm init @n8n/node-dev-template
# Create first Playwright node for web automation
```

### **Phase 2: Core RPA Nodes (4-6 weeks)**
```bash
# @processiq/n8n-rpa-nodes package with specific tools:

# Web Automation
npm install playwright puppeteer selenium-webdriver
├── PlaywrightNode.ts    # Modern web automation
├── SeleniumNode.ts      # Legacy web support

# RPA Frameworks  
pip install robotframework robotframework-seleniumlibrary
npm install tagui-node
├── RobotFrameworkNode.ts # Enterprise RPA workflows
├── TagUINode.ts         # Natural language RPA

# Desktop Automation
pip install pyautogui opencv-python pygetwindow
├── DesktopNode.ts       # UI automation via Python bridge

# File Processing
npm install xlsx pdf-parse csv-parser
├── ExcelNode.ts         # Excel read/write operations  
├── PDFNode.ts          # PDF extraction and processing
├── CSVNode.ts          # CSV data manipulation

# Database Connectors
npm install pg mysql2 mongodb sqlite3
├── PostgreSQLNode.ts    # Enterprise database
├── MySQLNode.ts        # Popular database
├── MongoDBNode.ts      # NoSQL database
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

# Install dependencies (Node.js + Python + n8n)
npm run setup

# Start development servers (Backend + Desktop app + n8n)
npm run dev

# Access desktop application at http://localhost:3000
# n8n editor embedded within the desktop app
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

### **🔌 Extensible Node/Plugin Ecosystem**

ProcessIQ supports multiple workflow engine integrations:

#### **n8n Node Development (Recommended)**
- **Custom RPA Nodes**: Use n8n's excellent node development framework
- **TypeScript Support**: Modern development experience with full typing
- **Rich APIs**: Well-documented node creation APIs
- **Community**: Access to 400+ existing n8n nodes
- **Documentation**: [n8n Node Development Guide](https://docs.n8n.io/integrations/creating-nodes/)

#### **Node-RED Node Development**
- **Custom Nodes**: Use Node-RED's mature node development system
- **JavaScript/HTML**: Traditional web development approach
- **Extensive Ecosystem**: Thousands of existing nodes
- **Documentation**: [Node-RED Node Development](https://nodered.org/docs/creating-nodes/)

#### **React Flow Custom Components**
- **Full Control**: Build completely custom workflow components
- **React Ecosystem**: Leverage entire React component ecosystem
- **Modern Development**: Latest React patterns and hooks
- **Documentation**: [React Flow Docs](https://reactflow.dev/docs/)

#### **Blockly Custom Blocks**
- **Visual Programming**: Create drag-drop code blocks
- **Code Generation**: Generate workflow code from blocks
- **Educational**: Great for non-technical users
- **Documentation**: [Blockly Developer Guides](https://developers.google.com/blockly/guides/overview)

### **🏆 Development Benefits Comparison**

| Approach | Dev Time | Learning Curve | Flexibility | Community |
|----------|----------|----------------|-------------|-----------|
| **n8n** | Fastest | Low | Medium | Large |
| **Node-RED** | Fast | Medium | Medium | Very Large |
| **React Flow** | Slowest | High | Highest | Medium |
| **Blockly** | Medium | Low | Low | Small |

**Recommendation**: Start with n8n for rapid development, consider React Flow for maximum customization needs.

## 📄 **License**

MIT License - Built for the community and enterprise adoption.

**ProcessIQ** is free to use, modify, and distribute. See [LICENSE](https://github.com/pesnik/ProcessIQ/blob/main/LICENSE) for details.

---

## ⭐ **Star the Repository**

If ProcessIQ is helpful for your automation needs, please ⭐ **star the repository** on GitHub to show your support and help others discover it!

**Key Technical Decisions:**
- **n8n Integration**: Embed proven workflow engine instead of building from scratch
- **Custom Node Development**: @processiq/n8n-rpa-nodes for specialized automation
- **Extensible Architecture**: AI and Agent features as optional n8n node packages
- **Desktop-First**: Electron app with embedded n8n for complete control

**🔗 Repository**: [https://github.com/pesnik/ProcessIQ](https://github.com/pesnik/ProcessIQ)