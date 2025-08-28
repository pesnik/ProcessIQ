"""
Robot Framework Connector for ProcessIQ

Provides workflow execution capabilities using Robot Framework.
Supports test automation, RPA workflows, and keyword-driven automation.
"""

import asyncio
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime
import shlex
import json

try:
    import robot
    from robot import run
    from robot.api import get_model, get_tokens
    from robot.libraries import BuiltIn
    ROBOT_AVAILABLE = True
except ImportError:
    ROBOT_AVAILABLE = False

from .rpa_base import (
    WorkflowConnector,
    RPAConnectorConfig,
    RPAExecutionContext,
    RPAExecutionResult,
    RPATaskType
)
from ..core.events import EventBus
from ..core.exceptions import ProcessIQError

import logging
logger = logging.getLogger(__name__)


class RobotFrameworkConfig(RPAConnectorConfig):
    """Robot Framework specific configuration"""
    
    # Robot Framework settings
    robot_path: Optional[str] = None  # Path to robot executable
    library_paths: List[str] = []    # Additional library paths
    variable_files: List[str] = []   # Variable files to load
    resource_files: List[str] = []   # Resource files to load
    
    # Execution settings
    output_dir: Optional[Path] = None
    log_level: str = "INFO"          # TRACE, DEBUG, INFO, WARN, ERROR
    include_tags: List[str] = []     # Tags to include
    exclude_tags: List[str] = []     # Tags to exclude
    
    # Reporting
    generate_report: bool = True
    generate_log: bool = True
    generate_xunit: bool = False
    
    # Performance
    max_parallel_suites: int = 1
    timeout: int = 300              # Default timeout in seconds


class RobotFrameworkConnector(WorkflowConnector):
    """
    Robot Framework connector for ProcessIQ
    
    Executes Robot Framework test suites and provides RPA workflow capabilities.
    """
    
    def __init__(self, config: RobotFrameworkConfig, event_bus: EventBus):
        if not ROBOT_AVAILABLE:
            raise ImportError("robotframework package is required for RobotFrameworkConnector")
        
        super().__init__(config, event_bus)
        self.config: RobotFrameworkConfig = config
        
        # Set up output directory
        if not self.config.output_dir:
            self.config.output_dir = Path(tempfile.gettempdir()) / "processiq_robot"
        self.config.output_dir.mkdir(parents=True, exist_ok=True)
    
    @property
    def supported_formats(self) -> List[str]:
        return ["robot", "txt", "tsv", "rest", "resource"]
    
    async def connect(self) -> None:
        """Initialize Robot Framework connection"""
        try:
            await self.set_status(self.status.__class__.CONNECTING, "Initializing Robot Framework")
            
            # Verify Robot Framework is available
            try:
                import robot
                robot_version = robot.__version__
                logger.info(f"Robot Framework version: {robot_version}")
            except Exception as e:
                raise ProcessIQError(f"Robot Framework not properly installed: {e}")
            
            # Test basic functionality
            test_result = await self._test_robot_execution()
            if not test_result:
                raise ProcessIQError("Robot Framework basic test failed")
            
            await self.set_status(self.status.__class__.CONNECTED, "Robot Framework ready")
            
        except Exception as e:
            await self.handle_error(e, "Failed to initialize Robot Framework")
            raise
    
    async def disconnect(self) -> None:
        """Disconnect from Robot Framework"""
        await self.set_status(self.status.__class__.DISCONNECTED, "Robot Framework disconnected")
    
    async def execute_task(
        self,
        task_type: RPATaskType,
        parameters: Dict[str, Any],
        context: RPAExecutionContext
    ) -> RPAExecutionResult:
        """Execute Robot Framework task"""
        
        if task_type != RPATaskType.WORKFLOW_EXECUTION:
            return RPAExecutionResult(
                task_id=context.task_id,
                success=False,
                error_message=f"Unsupported task type: {task_type}"
            )
        
        workflow_path = parameters.get("workflow_path")
        variables = parameters.get("variables", {})
        
        if not workflow_path:
            return RPAExecutionResult(
                task_id=context.task_id,
                success=False,
                error_message="workflow_path is required"
            )
        
        return await self.execute_workflow(Path(workflow_path), variables, context)
    
    async def execute_workflow(
        self,
        workflow_path: Path,
        variables: Dict[str, Any],
        context: RPAExecutionContext
    ) -> RPAExecutionResult:
        """Execute a Robot Framework workflow"""
        start_time = datetime.utcnow()
        
        try:
            if not workflow_path.exists():
                raise FileNotFoundError(f"Workflow file not found: {workflow_path}")
            
            # Prepare execution directory
            execution_dir = self.config.output_dir / f"execution_{context.task_id}"
            execution_dir.mkdir(parents=True, exist_ok=True)
            
            # Build Robot Framework command options
            robot_options = self._build_robot_options(execution_dir, variables, context)
            
            # Execute workflow
            logger.info(f"Executing Robot Framework workflow: {workflow_path}")
            
            # Run Robot Framework
            return_code = robot.run(str(workflow_path), **robot_options)
            
            # Process results
            result_data = await self._process_execution_results(
                execution_dir, return_code, context
            )
            
            execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            return RPAExecutionResult(
                task_id=context.task_id,
                success=return_code == 0,
                data=result_data,
                execution_time_ms=execution_time,
                artifacts={
                    "output_dir": execution_dir,
                    "report_file": execution_dir / "report.html",
                    "log_file": execution_dir / "log.html",
                    "output_file": execution_dir / "output.xml"
                }
            )
            
        except Exception as e:
            execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            return RPAExecutionResult(
                task_id=context.task_id,
                success=False,
                error_message=str(e),
                execution_time_ms=execution_time
            )
    
    async def validate_workflow_syntax(self, workflow_path: Path) -> Dict[str, Any]:
        """Validate Robot Framework workflow syntax"""
        try:
            # Parse the workflow file
            model = get_model(str(workflow_path))
            
            validation_result = {
                "valid": True,
                "errors": [],
                "warnings": [],
                "info": {
                    "sections": len(model.sections),
                    "test_cases": len([s for s in model.sections if s.header and "Test Cases" in s.header.value]),
                    "keywords": len([s for s in model.sections if s.header and "Keywords" in s.header.value]),
                }
            }
            
            # Basic validation checks
            if not any(s.header for s in model.sections):
                validation_result["errors"].append("No valid sections found")
                validation_result["valid"] = False
            
            return validation_result
            
        except Exception as e:
            return {
                "valid": False,
                "errors": [str(e)],
                "warnings": [],
                "info": {}
            }
    
    async def list_workflow_keywords(self, workflow_path: Path) -> List[str]:
        """List keywords defined in the workflow"""
        try:
            model = get_model(str(workflow_path))
            keywords = []
            
            for section in model.sections:
                if section.header and "Keywords" in section.header.value:
                    for item in section.body:
                        if hasattr(item, 'header') and item.header:
                            keywords.append(item.header.value)
            
            return keywords
            
        except Exception as e:
            logger.error(f"Failed to list keywords from {workflow_path}: {e}")
            return []
    
    def _build_robot_options(
        self, 
        execution_dir: Path, 
        variables: Dict[str, Any],
        context: RPAExecutionContext
    ) -> Dict[str, Any]:
        """Build Robot Framework execution options"""
        
        options = {
            "outputdir": str(execution_dir),
            "loglevel": self.config.log_level,
            "report": "report.html" if self.config.generate_report else None,
            "log": "log.html" if self.config.generate_log else None,
            "output": "output.xml",
        }
        
        # Add variables
        if variables:
            options["variable"] = [f"{key}:{value}" for key, value in variables.items()]
        
        # Add context variables
        if context.variables:
            context_vars = [f"{key}:{value}" for key, value in context.variables.items()]
            if "variable" in options:
                options["variable"].extend(context_vars)
            else:
                options["variable"] = context_vars
        
        # Add tags
        if self.config.include_tags:
            options["include"] = self.config.include_tags
        
        if self.config.exclude_tags:
            options["exclude"] = self.config.exclude_tags
        
        # Add library paths
        if self.config.library_paths:
            options["pythonpath"] = self.config.library_paths
        
        # Add resource files
        if self.config.resource_files:
            options["resource"] = self.config.resource_files
        
        # Add variable files
        if self.config.variable_files:
            options["variablefile"] = self.config.variable_files
        
        # Timeout
        if hasattr(context, 'timeout_seconds'):
            options["elapsedtime"] = context.timeout_seconds
        
        return {k: v for k, v in options.items() if v is not None}
    
    async def _process_execution_results(
        self,
        execution_dir: Path,
        return_code: int,
        context: RPAExecutionContext
    ) -> Dict[str, Any]:
        """Process Robot Framework execution results"""
        
        result_data = {
            "return_code": return_code,
            "execution_dir": str(execution_dir),
            "files_generated": []
        }
        
        # Check for generated files
        expected_files = ["output.xml", "log.html", "report.html"]
        for filename in expected_files:
            file_path = execution_dir / filename
            if file_path.exists():
                result_data["files_generated"].append(str(file_path))
        
        # Parse output.xml for detailed results
        output_xml = execution_dir / "output.xml"
        if output_xml.exists():
            try:
                xml_data = await self._parse_output_xml(output_xml)
                result_data.update(xml_data)
            except Exception as e:
                logger.warning(f"Failed to parse output.xml: {e}")
        
        return result_data
    
    async def _parse_output_xml(self, output_xml_path: Path) -> Dict[str, Any]:
        """Parse Robot Framework output.xml file"""
        try:
            tree = ET.parse(output_xml_path)
            root = tree.getroot()
            
            # Extract suite information
            suite = root.find('suite')
            if suite is None:
                return {"error": "No suite found in output.xml"}
            
            # Suite statistics
            stats = {
                "suite_name": suite.get('name', 'Unknown'),
                "tests_total": 0,
                "tests_passed": 0,
                "tests_failed": 0,
                "keywords_total": 0,
                "keywords_passed": 0,
                "keywords_failed": 0,
                "start_time": suite.get('starttime', ''),
                "end_time": suite.get('endtime', ''),
            }
            
            # Count tests
            for test in suite.findall('.//test'):
                stats["tests_total"] += 1
                status = test.find('status')
                if status is not None and status.get('status') == 'PASS':
                    stats["tests_passed"] += 1
                else:
                    stats["tests_failed"] += 1
            
            # Count keywords
            for keyword in suite.findall('.//kw'):
                stats["keywords_total"] += 1
                status = keyword.find('status')
                if status is not None and status.get('status') == 'PASS':
                    stats["keywords_passed"] += 1
                else:
                    stats["keywords_failed"] += 1
            
            # Extract error messages
            errors = []
            for msg in root.findall('.//msg[@level="ERROR"]'):
                if msg.text:
                    errors.append(msg.text)
            
            stats["errors"] = errors
            return stats
            
        except Exception as e:
            logger.error(f"Error parsing output.xml: {e}")
            return {"parse_error": str(e)}
    
    async def _test_robot_execution(self) -> bool:
        """Test basic Robot Framework execution"""
        try:
            # Create a simple test file
            test_content = """
*** Test Cases ***
Simple Test
    Log    ProcessIQ Robot Framework Test
    Should Be Equal    ${True}    ${True}
"""
            
            test_file = self.config.output_dir / "test_execution.robot"
            with open(test_file, 'w') as f:
                f.write(test_content)
            
            # Execute the test
            options = {
                "outputdir": str(self.config.output_dir),
                "loglevel": "ERROR",  # Minimize output
                "report": None,
                "log": None,
                "output": "test_output.xml"
            }
            
            return_code = robot.run(str(test_file), **options)
            
            # Cleanup
            test_file.unlink(missing_ok=True)
            (self.config.output_dir / "test_output.xml").unlink(missing_ok=True)
            
            return return_code == 0
            
        except Exception as e:
            logger.error(f"Robot Framework test execution failed: {e}")
            return False
    
    # Base connector interface implementations
    
    async def fetch_data(
        self,
        query: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None
    ) -> List:
        """Fetch data from Robot Framework execution results"""
        if not query:
            return []
        
        workflow_path = query.get("workflow_path")
        if not workflow_path:
            return []
        
        # Execute workflow and return results
        context = RPAExecutionContext(
            task_id="fetch_data",
            task_type=RPATaskType.WORKFLOW_EXECUTION
        )
        
        result = await self.execute_workflow(Path(workflow_path), {}, context)
        
        return [result.data] if result.success else []
    
    async def fetch_data_stream(
        self,
        query: Optional[Dict[str, Any]] = None
    ):
        """Stream data from Robot Framework execution"""
        data = await self.fetch_data(query)
        for record in data:
            yield record
    
    async def get_schema(self) -> Dict[str, Any]:
        """Get schema information for Robot Framework connector"""
        return {
            "connector_type": "robotframework",
            "supported_file_formats": self.supported_formats,
            "capabilities": {
                "workflow_execution": True,
                "syntax_validation": True,
                "keyword_listing": True,
                "variable_support": True,
                "tag_filtering": True,
                "parallel_execution": False,  # Not implemented yet
                "real_time_monitoring": False
            },
            "configuration_options": [
                "library_paths",
                "variable_files", 
                "resource_files",
                "output_dir",
                "log_level",
                "include_tags",
                "exclude_tags"
            ]
        }


# Register the connector
from .rpa_base import RPAConnectorFactory
if ROBOT_AVAILABLE:
    RPAConnectorFactory.register("robotframework", RobotFrameworkConnector)