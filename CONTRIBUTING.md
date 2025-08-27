# Contributing to ProcessIQ

Thank you for your interest in contributing to ProcessIQ! We welcome contributions from the community and are excited to see how you can help make ProcessIQ better.

## Getting Started

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/pesnik/ProcessIQ.git
   cd ProcessIQ
   ```

2. **Set up development environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -e .[dev,vision]
   ```

3. **Install system dependencies**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install -y libpq-dev tesseract-ocr tesseract-ocr-eng

   # macOS
   brew install postgresql tesseract
   ```

4. **Install Playwright browsers**
   ```bash
   playwright install chromium firefox
   ```

5. **Run tests to verify setup**
   ```bash
   pytest tests/ -v
   ```

## Types of Contributions

### 🐛 Bug Reports
- Use the bug report template
- Include steps to reproduce
- Provide system information
- Include logs if applicable

### 💡 Feature Requests
- Use the feature request template  
- Describe the problem you're solving
- Propose a solution
- Consider backward compatibility

### 🔧 Plugin Development
ProcessIQ's plugin architecture makes it highly extensible:

#### Data Connectors
Create new connectors for data sources:
```python
from processiq.core.plugin_manager import PluginInterface

class MyConnector(PluginInterface):
    async def initialize(self) -> None:
        # Setup connection
        pass
    
    async def extract_data(self, config: dict) -> Any:
        # Implement data extraction
        pass
```

#### AI Processors
Add new AI/ML capabilities:
```python
from processiq.ai.base import AIProcessor

class MyAIProcessor(AIProcessor):
    async def process(self, data: Any, context: dict) -> Any:
        # Implement AI processing
        pass
```

#### Export Handlers
Create new output formats:
```python
from processiq.connectors.base import OutputConnector

class MyExporter(OutputConnector):
    async def export_data(self, data: Any, config: dict) -> None:
        # Implement data export
        pass
```

## Development Guidelines

### Code Style
- **Python**: Follow PEP 8, use Black formatter (line length 88)
- **Import sorting**: Use isort with Black profile
- **Type hints**: Required for all public APIs
- **Docstrings**: Use Google style for functions and classes

### Testing
- Write tests for all new features
- Maintain test coverage above 80%
- Use pytest for testing
- Include integration tests for connectors

### Commit Messages
Follow conventional commit format:
```
type(scope): description

[optional body]
[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat(web): add AI-powered element detection`
- `fix(desktop): handle window focus issues on Windows`
- `docs(api): update connector documentation`

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Make your changes**
   - Follow coding standards
   - Add tests
   - Update documentation

3. **Run quality checks**
   ```bash
   # Format code
   black src/
   isort src/
   
   # Run linting
   flake8 src/processiq --max-line-length=88
   
   # Type checking
   mypy src/processiq --ignore-missing-imports
   
   # Run tests
   pytest tests/ -v --cov=processiq
   ```

4. **Create pull request**
   - Use the PR template
   - Link related issues
   - Describe changes clearly
   - Include screenshots/videos for UI changes

5. **Code review process**
   - Address reviewer feedback
   - Keep commits clean and focused
   - Squash commits if needed

## Plugin Development Deep Dive

### Plugin Structure
```
my_plugin/
├── __init__.py
├── connector.py      # Main plugin code
├── config.yaml       # Plugin configuration
├── requirements.txt  # Additional dependencies
└── tests/
    └── test_connector.py
```

### Plugin Configuration
```yaml
# config.yaml
name: "My Awesome Connector"
version: "1.0.0"
description: "Connects to my awesome service"
author: "Your Name"
category: "connector"  # connector, processor, exporter
dependencies:
  - "requests>=2.25.0"
  - "beautifulsoup4>=4.9.0"
```

### Testing Plugins
```python
import pytest
from processiq.testing import PluginTestCase

class TestMyConnector(PluginTestCase):
    def test_connection(self):
        # Test plugin functionality
        pass
```

## Documentation

### API Documentation
- Use clear, descriptive docstrings
- Include examples in docstrings
- Document all parameters and return values

### User Documentation
- Create examples for new features
- Update README if needed
- Add configuration documentation

## Community Guidelines

### Code of Conduct
- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Report inappropriate behavior

### Communication
- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: General questions, ideas
- **Pull Requests**: Code changes, documentation

## Release Process

### Version Numbers
We follow Semantic Versioning (SemVer):
- **MAJOR**: Breaking changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

### Changelog
- All changes are documented in CHANGELOG.md
- Use Keep a Changelog format
- Include migration notes for breaking changes

## Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- Special mentions for significant contributions

Thank you for contributing to ProcessIQ! 🚀