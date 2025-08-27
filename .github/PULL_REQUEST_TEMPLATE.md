# Pull Request

## 📋 Summary
<!-- Provide a brief description of your changes -->

**What does this PR do?**
- 

**Related Issue(s):**
- Fixes #
- Closes #
- Related to #

## 🔍 Type of Change
<!-- Mark the relevant option -->
- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that causes existing functionality to change)
- [ ] 🔧 Refactoring (code change that neither fixes a bug nor adds a feature)
- [ ] 📚 Documentation update
- [ ] 🧪 Test update
- [ ] 🔌 Plugin/Connector addition
- [ ] 🏗️ Infrastructure/tooling change

## 🧪 Testing
<!-- Describe how you tested your changes -->

**Test Environment:**
- OS: 
- Python version: 
- ProcessIQ version: 

**Tests Added/Updated:**
- [ ] Unit tests
- [ ] Integration tests
- [ ] End-to-end tests
- [ ] Manual testing

**Test Results:**
```bash
# Paste test command output here
```

## 📝 Changes Made
<!-- List the key changes made in this PR -->

### Modified Files:
- `path/to/file.py` - Brief description of changes
- `path/to/another.py` - Brief description of changes

### New Files:
- `path/to/new_file.py` - Brief description of purpose

### Removed Files:
- `path/to/removed_file.py` - Reason for removal

## 🔄 Migration Guide
<!-- If this is a breaking change, provide migration instructions -->

### Before (if applicable):
```python
# Old way of doing things
```

### After:
```python
# New way of doing things
```

## 📸 Screenshots/Videos
<!-- If applicable, add screenshots or videos to demonstrate changes -->

### Before:
<!-- Screenshot of old behavior -->

### After:
<!-- Screenshot of new behavior -->

## 🔧 Configuration Changes
<!-- If configuration changes are required -->

### New Configuration Options:
```yaml
# Example configuration
```

### Environment Variables:
```bash
# Any new environment variables needed
export NEW_VAR=value
```

## 📚 Documentation
<!-- Check all that apply -->
- [ ] Updated README.md
- [ ] Updated CONTRIBUTING.md  
- [ ] Added/updated docstrings
- [ ] Added/updated type hints
- [ ] Updated configuration documentation
- [ ] Added examples/tutorials

## 🔍 Code Quality
<!-- Confirm you've run these checks -->
- [ ] Code follows style guidelines (Black, isort)
- [ ] Self-review of code completed
- [ ] Added comments for complex logic
- [ ] Removed debugging code and print statements
- [ ] No secrets or sensitive data in code

## ✅ Pre-submission Checklist
<!-- Check all items before submitting -->

### Required:
- [ ] Tests pass locally (`pytest tests/ -v`)
- [ ] Linting passes (`flake8 src/processiq`)
- [ ] Type checking passes (`mypy src/processiq --ignore-missing-imports`)
- [ ] Code is formatted (`black src/` and `isort src/`)
- [ ] Git history is clean (squashed/rebased if needed)
- [ ] PR targets the correct branch

### Plugin Development (if applicable):
- [ ] Plugin follows ProcessIQ plugin architecture
- [ ] Plugin includes proper error handling
- [ ] Plugin has configuration validation
- [ ] Plugin includes tests
- [ ] Plugin documentation added

### Security (if applicable):
- [ ] No hardcoded credentials or secrets
- [ ] Input validation implemented
- [ ] Proper error handling without information leakage
- [ ] Dependencies reviewed for vulnerabilities

## 🤝 Reviewer Notes
<!-- Any additional context for reviewers -->

### Areas of Focus:
<!-- What should reviewers pay special attention to? -->

### Questions/Concerns:
<!-- Any specific questions or areas you're unsure about -->

### Performance Impact:
<!-- Any performance considerations -->

---

**By submitting this PR, I confirm that:**
- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review of my own code
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing tests pass locally with my changes