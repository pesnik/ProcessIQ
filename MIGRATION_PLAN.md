# ProcessIQ v5 Architecture Migration Plan

## Current State (v2 Architecture)
- Custom FastAPI backend with direct RPA orchestration
- Electron React frontend with manual workflow UI
- Direct Playwright/automation tool integration
- Custom connectors and processors

## Target State (v5 n8n-Foundation Architecture)
Following the complete tech stack blueprint from `docs/architecture/processiq-architecture-v5-complete-stack.svg`

## Phase 1: n8n Integration Foundation (2-4 weeks)
- [ ] Add n8n core to Electron desktop app
- [ ] Create `@processiq/n8n-rpa-nodes` package
- [ ] Basic n8n node development setup
- [ ] Initial Playwright node implementation
- [ ] TypeScript support for n8n nodes

## Phase 2: Core RPA Nodes (4-6 weeks)
- [ ] Web Automation Nodes (Playwright, Selenium, Puppeteer)
- [ ] RPA Framework Nodes (Robot Framework, TagUI)
- [ ] Desktop Automation Nodes (PyAutoGUI, OpenCV)
- [ ] File Processing Nodes (Excel, PDF, CSV)
- [ ] Database Connector Nodes (PostgreSQL, MySQL, MongoDB)
- [ ] Python Bridge for existing backend integration

## Phase 3: Multi-Modal Input (3-4 weeks)
- [ ] Chat Interface with Socket.io
- [ ] Intent Recognition (Bot Framework or Rasa NLU)
- [ ] Document Processing (PyPDF2, python-docx, tesseract.js)
- [ ] Text Analysis (spaCy or NLTK)
- [ ] Template System for n8n workflows
- [ ] Workflow Generation (Chat/BRD → n8n JSON)

## Migration Strategy

### Parallel Development Approach
1. **Keep current system functional** - maintain existing APIs
2. **Build n8n integration alongside** - new package structure
3. **Gradual migration** - migrate workflows one by one
4. **Bridge phase** - n8n calls existing backend during transition

### Package Structure Changes
```
packages/
├── n8n-rpa-nodes/           # NEW: @processiq/n8n-rpa-nodes
│   ├── nodes/
│   │   ├── PlaywrightNode/
│   │   ├── RobotFrameworkNode/
│   │   └── ExcelNode/
│   └── package.json
├── n8n-integration/         # NEW: n8n core integration
└── shared-types/            # Existing types to share
```

### Apps Structure Evolution
```
apps/
├── backend/                 # EVOLVE: Bridge to n8n + API endpoints
├── desktop/                 # EVOLVE: Embed n8n editor + custom UI
└── n8n-server/             # NEW: Dedicated n8n server instance
```

## Key Dependencies (Phase 1)
- `n8n` - Core workflow engine
- `@n8n/n8n-nodes-base` - Base node types
- `electron` - Desktop app framework
- `@n8n/node-dev-template` - Node development template
- `@types/n8n` - TypeScript support
- `playwright` - Web automation (existing)

## Benefits of Migration
- **Standards-based**: Leverage n8n's mature workflow engine
- **Visual workflows**: Better UX than custom orchestration
- **Extensible**: Easy to add new automation nodes
- **Community**: Access to n8n ecosystem
- **Scalable**: Built-in workflow management features
- **Time savings**: 80% faster than building workflow engine from scratch

## Risk Mitigation
- **Incremental migration**: Phase-by-phase approach
- **Backward compatibility**: Bridge existing APIs during transition  
- **Feature parity**: Ensure all current functionality is preserved
- **Testing**: Comprehensive testing at each phase
- **Documentation**: Clear migration guides for users

## Timeline
- **Phase 1**: 2-4 weeks (Foundation)
- **Phase 2**: 4-6 weeks (Core RPA Nodes)  
- **Phase 3**: 3-4 weeks (Multi-Modal)
- **Total Core Migration**: 9-14 weeks
- **Optional Extensions**: Phases 4-5 (AI/Agents) can be added later

## Success Criteria
- [ ] n8n editor embedded in Electron app
- [ ] Basic RPA workflows working through n8n
- [ ] Feature parity with current RPA demo
- [ ] Performance equal to or better than current system
- [ ] Clear upgrade path for existing workflows