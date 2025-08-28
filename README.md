# ProcessIQ

ProcessIQ is the complete **Source → Target** data automation platform that scales from simple data collection to full enterprise BI solutions. Built with a plug-and-play architecture that evolves from traditional RPA to AI agents to future technologies.

## 🎯 **Core Value Proposition**

**Flexible Data Pipeline Solution:**
- **Basic Users**: "I need web data in Excel" → Done ✅
- **Power Users**: "I need multi-source data with transformations" → Handled 💪  
- **Enterprise**: "I need full BI stack with dashboards" → Complete Solution 🚀

## 🏗️ **Architecture Philosophy**

**1. Source → Processing → Target Flow**
- **Heterogeneous Sources**: Web, Desktop Apps, APIs, Databases, Files
- **Intelligent Processing**: Traditional + AI hybrid with smart fallback
- **Flexible Targets**: Excel, Databases, APIs, Cloud Storage, Reports

**2. Optional BI Extension Stack**
- **ETL Engine**: Complete data transformation pipelines
- **Data Warehouse**: Star schema, time series, analytics ready
- **Report Builder**: Drag & drop report creation
- **Dashboards**: Real-time KPIs and interactive visualizations
- **Advanced Analytics**: ML insights, forecasting, anomaly detection

**3. Evolution-Ready Design**
- **Plugin Architecture**: Add new automation methods without breaking existing flows
- **Desktop-First UX**: Rich visual interface for workflow design and monitoring  
- **Future-Proof**: Ready for whatever comes after AI agents

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

### 🤖 **AI Intelligence Layer**
- **Vision-Language Models**: Qwen2.5-VL (local), GPT-4V, Claude-3V (cloud)
- **Hybrid Automation**: Smart fallback between traditional and AI methods
- **Self-Learning Engine**: Pattern recognition and workflow optimization
- **Document AI**: OCR, NLP, multimodal document understanding

### 📤 **Data Targets (Flexible Output)**
- **📊 Files**: Excel, CSV, JSON, PDF reports with custom formatting
- **🗄️ Databases**: SQL/NoSQL with bulk operations and transactions  
- **🔗 APIs & Webhooks**: POST data to any endpoint with authentication
- **☁️ Cloud Storage**: S3, Azure Blob, Google Cloud with versioning
- **📧 Communications**: Email reports, Slack notifications, mobile alerts

### 📊 **Optional BI Extension Stack** 
*(When users need more than basic target delivery)*

- **🏪 Data Warehouse**: Star schema design with time series support
- **🔄 ETL Engine**: Complete transformation pipelines with scheduling
- **📈 Analytics Engine**: SQL processing, aggregations, KPI calculations
- **📋 Report Builder**: Drag & drop interface with templates
- **📊 Interactive Dashboards**: Real-time visualizations and drill-down
- **🔮 Advanced Analytics**: ML insights, forecasting, anomaly detection

### 🖥️ **Desktop Application (Primary Interface)**
- **Visual Workflow Designer**: Drag-and-drop process building
- **Real-time Monitoring**: Live dashboards and execution tracking
- **Plugin Management**: Install, configure, and manage connectors
- **Configuration Hub**: Environment settings and credential management
- **BI Interface**: Dashboard viewer and report designer (when BI stack enabled)

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
- **UI Components**: Radix UI + Tailwind CSS + Lucide Icons
- **State Management**: Zustand + TanStack Query
- **Data Visualization**: Recharts for charts and analytics
- **Form Handling**: React Hook Form + Zod validation
- **Build Tools**: Vite + Electron Builder

### **Infrastructure & DevOps**
- **Containerization**: Docker + Docker Compose
- **Development**: Concurrently + Hot reloading
- **Code Quality**: ESLint + Prettier + Black + MyPy
- **Testing**: Pytest + Vitest + React Testing Library
- **Deployment**: Kubernetes ready + Multi-platform builds

## 🎯 **Use Cases - From Simple to Enterprise**

### 💡 **Basic Automation** 
*"I just need data from A to B"*
```
Web Scraping → Excel File
API Data → CSV Export  
Database Query → Email Report
```

### 🔧 **Intermediate Workflows**
*"I need some processing and multiple sources"*
```
Multiple APIs → Data Transformation → Database
Web + Desktop → Data Merging → Cloud Storage
Scheduled Reports with Basic Analytics
```

### 🏢 **Advanced Automation**
*"I need complex workflows and some reporting"*
```
Multi-Source Data Pipeline → Processed Database → Dashboard
Desktop Apps + Web APIs → Data Warehouse → Scheduled Reports
AI-Powered Data Extraction → Analytics → Stakeholder Notifications
```

### 🚀 **Enterprise BI Solution**
*"I need complete business intelligence"*
```
All Sources → Data Warehouse → ETL → Analytics → Interactive Dashboards
Real-time KPI Monitoring → ML Insights → Predictive Analytics
Custom Report Builder → Advanced Visualizations → Executive Dashboards
```

## 🚀 **Quick Start**

### Option 1: Development Setup (Recommended)
```bash
# Clone the repository
git clone https://github.com/pesnik/ProcessIQ.git
cd ProcessIQ

# Install dependencies (Node.js + Python)
npm run setup

# Start development servers (Backend + Desktop app)
npm run dev

# Access desktop application at http://localhost:3000
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

## 📈 **Scaling Your Usage**

**Start Simple** → **Add Complexity As Needed**

1. **Begin**: Simple source-to-target automation
2. **Expand**: Add data transformation and multiple sources  
3. **Enhance**: Include AI-powered processing and learning
4. **Enterprise**: Enable full BI stack with warehousing and analytics

The beauty of ProcessIQ is you **only pay for what you use** - both in complexity and infrastructure.

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

### **🔌 Plugin Ecosystem**
ProcessIQ's plugin architecture makes it incredibly extensible:
- Create custom **Data Connectors** for new sources
- Build **AI Processors** with different models
- Develop **Export Handlers** for new target formats
- Add **UI Components** for the desktop application

See `CONTRIBUTING.md` for detailed plugin development guidelines.

## 📄 **License**

MIT License - Built for the community and enterprise adoption.

**ProcessIQ** is free to use, modify, and distribute. See [LICENSE](https://github.com/pesnik/ProcessIQ/blob/main/LICENSE) for details.

---

## ⭐ **Star the Repository**

If ProcessIQ is helpful for your automation needs, please ⭐ **star the repository** on GitHub to show your support and help others discover it!

**🔗 Repository**: [https://github.com/pesnik/ProcessIQ](https://github.com/pesnik/ProcessIQ)