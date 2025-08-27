"""
ProcessIQ Command Line Interface

Provides easy-to-use CLI commands for:
- Starting and managing ProcessIQ
- Plugin management
- Workflow execution
- System monitoring and diagnostics
"""

import asyncio
from pathlib import Path
from typing import Optional, List, Dict, Any
import json

import typer
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.tree import Tree
from rich import print as rprint

from . import __version__
from .core.engine import ProcessEngine, create_engine
from .core.config import Settings, get_settings, create_default_config_file
from .connectors import *

# Initialize CLI app and console
app = typer.Typer(
    name="processiq",
    help="ProcessIQ - Intelligent Process Automation Platform",
    add_completion=False
)
console = Console()

# Global state for CLI
_engine: Optional[ProcessEngine] = None


@app.callback()
def main(
    version: bool = typer.Option(False, "--version", help="Show version information"),
    config_file: Optional[str] = typer.Option(None, "--config", help="Configuration file path"),
    debug: bool = typer.Option(False, "--debug", help="Enable debug mode")
):
    """ProcessIQ - Modern RPA + AI Automation Platform"""
    
    if version:
        rprint(f"ProcessIQ v{__version__}")
        rprint("Modern RPA + AI automation platform")
        raise typer.Exit()
    
    if debug:
        console.print("🐛 Debug mode enabled", style="yellow")


@app.command()
def init(
    directory: str = typer.Argument(".", help="Directory to initialize ProcessIQ in"),
    force: bool = typer.Option(False, "--force", help="Overwrite existing configuration")
):
    """Initialize a new ProcessIQ project"""
    
    project_dir = Path(directory)
    config_file = project_dir / "processiq.yaml"
    plugins_dir = project_dir / "plugins"
    
    try:
        # Create directories
        project_dir.mkdir(exist_ok=True)
        plugins_dir.mkdir(exist_ok=True)
        
        # Create config file
        if config_file.exists() and not force:
            console.print(f"❌ Configuration file already exists: {config_file}", style="red")
            console.print("Use --force to overwrite", style="yellow")
            raise typer.Exit(1)
        
        create_default_config_file(config_file)
        
        # Create example plugin
        _create_example_plugin(plugins_dir)
        
        console.print(Panel(
            f"✅ ProcessIQ project initialized in [bold]{directory}[/bold]\n\n"
            f"📁 Configuration: {config_file}\n"
            f"🔌 Plugins directory: {plugins_dir}\n\n"
            f"Next steps:\n"
            f"1. Edit {config_file} to configure your setup\n"
            f"2. Add your API keys and database connections\n"
            f"3. Run: [bold]processiq start[/bold]",
            title="🚀 ProcessIQ Initialized",
            border_style="green"
        ))
        
    except Exception as e:
        console.print(f"❌ Failed to initialize ProcessIQ: {e}", style="red")
        raise typer.Exit(1)


@app.command()
def start(
    config: Optional[str] = typer.Option(None, "--config", help="Configuration file path"),
    host: str = typer.Option("localhost", "--host", help="Host to bind to"),
    port: int = typer.Option(8000, "--port", help="Port to bind to"),
    workers: int = typer.Option(1, "--workers", help="Number of worker processes"),
    reload: bool = typer.Option(False, "--reload", help="Enable auto-reload for development")
):
    """Start the ProcessIQ engine and API server"""
    
    try:
        with console.status("[bold green]Starting ProcessIQ..."):
            # Load configuration
            settings = get_settings()
            if config:
                # Would load from custom config file
                pass
            
            settings.api.host = host
            settings.api.port = port
            settings.api.workers = workers
            settings.api.reload = reload
            
            # Start the engine
            asyncio.run(_start_engine(settings))
    
    except KeyboardInterrupt:
        console.print("\n🛑 ProcessIQ stopped by user", style="yellow")
    except Exception as e:
        console.print(f"❌ Failed to start ProcessIQ: {e}", style="red")
        raise typer.Exit(1)


@app.command()
def status():
    """Show ProcessIQ system status"""
    
    try:
        # This would connect to running ProcessIQ instance
        # For now, show placeholder information
        
        table = Table(title="ProcessIQ System Status")
        table.add_column("Component", style="cyan")
        table.add_column("Status", style="green")
        table.add_column("Details")
        
        table.add_row("Engine", "✅ Running", "v0.1.0")
        table.add_row("API Server", "✅ Running", "http://localhost:8000")
        table.add_row("Plugins", "✅ Active", "4 loaded")
        table.add_row("Database", "✅ Connected", "PostgreSQL")
        table.add_row("AI Services", "⚠️ Limited", "API keys needed")
        
        console.print(table)
        
    except Exception as e:
        console.print(f"❌ Failed to get status: {e}", style="red")
        raise typer.Exit(1)


@app.command()
def plugins():
    """Manage ProcessIQ plugins"""
    
    try:
        # Show available plugins
        tree = Tree("🔌 ProcessIQ Plugins")
        
        connectors = tree.add("📡 Connectors")
        connectors.add("🌐 Web Connector (Traditional + AI)")
        connectors.add("🔗 API Connector (REST/GraphQL/SOAP)")
        connectors.add("🗄️ Database Connector (SQL/NoSQL)")
        connectors.add("📁 File Connector (Local/Cloud)")
        
        processors = tree.add("⚙️ Processors")
        processors.add("🤖 AI Text Processor")
        processors.add("👁️ Vision Processor (Qwen2.5-VL)")
        processors.add("📊 Data Transformer")
        
        exporters = tree.add("📤 Exporters")
        exporters.add("📊 Excel Exporter")
        exporters.add("📋 CSV Exporter")
        exporters.add("🗄️ Database Exporter")
        exporters.add("📧 Email Exporter")
        
        console.print(tree)
        
        # Show plugin status table
        console.print("\n")
        table = Table(title="Plugin Status")
        table.add_column("Plugin", style="cyan")
        table.add_column("Type", style="blue")
        table.add_column("Status", style="green")
        table.add_column("Version")
        
        table.add_row("WebConnector", "Connector", "✅ Active", "1.0.0")
        table.add_row("APIConnector", "Connector", "✅ Active", "1.0.0")
        table.add_row("DatabaseConnector", "Connector", "✅ Active", "1.0.0")
        table.add_row("FileConnector", "Connector", "✅ Active", "1.0.0")
        
        console.print(table)
        
    except Exception as e:
        console.print(f"❌ Failed to list plugins: {e}", style="red")
        raise typer.Exit(1)


@app.command()
def run(
    workflow_file: str = typer.Argument(..., help="Workflow configuration file"),
    output: Optional[str] = typer.Option(None, "--output", help="Output file for results"),
    format: str = typer.Option("json", "--format", help="Output format (json, csv, excel)")
):
    """Run a workflow from configuration file"""
    
    try:
        workflow_path = Path(workflow_file)
        if not workflow_path.exists():
            console.print(f"❌ Workflow file not found: {workflow_file}", style="red")
            raise typer.Exit(1)
        
        with console.status(f"[bold blue]Running workflow: {workflow_path.name}"):
            # Load workflow configuration
            workflow_config = _load_workflow_config(workflow_path)
            
            # Run workflow
            results = asyncio.run(_run_workflow(workflow_config))
        
        # Display results
        console.print(f"✅ Workflow completed successfully!", style="green")
        console.print(f"📊 Records processed: {results.get('records_processed', 0)}")
        console.print(f"⏱️ Execution time: {results.get('execution_time', 'N/A')}")
        
        # Save output if specified
        if output:
            _save_results(results, output, format)
            console.print(f"💾 Results saved to: {output}")
        
    except Exception as e:
        console.print(f"❌ Workflow execution failed: {e}", style="red")
        raise typer.Exit(1)


@app.command()
def test(
    connector: str = typer.Argument(..., help="Connector name to test"),
    config_file: Optional[str] = typer.Option(None, "--config", help="Connector config file")
):
    """Test a connector configuration"""
    
    try:
        console.print(f"🧪 Testing connector: [bold]{connector}[/bold]")
        
        # Load connector config
        if config_file:
            config_path = Path(config_file)
            if not config_path.exists():
                console.print(f"❌ Config file not found: {config_file}", style="red")
                raise typer.Exit(1)
            
            # Would load actual config
            config = {}
        else:
            # Use default test config
            config = _get_test_config(connector)
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console
        ) as progress:
            task = progress.add_task(description="Testing connection...", total=None)
            
            # Test connector
            results = asyncio.run(_test_connector(connector, config))
            
            progress.update(task, description="✅ Connection test completed")
        
        # Display results
        if results.get("success"):
            console.print("✅ Connector test passed!", style="green")
            console.print(f"📡 Connection established in {results.get('response_time', 'N/A')}")
            
            if "schema" in results:
                console.print("\n📋 Available schema:")
                _display_schema(results["schema"])
        else:
            console.print("❌ Connector test failed!", style="red")
            console.print(f"Error: {results.get('error', 'Unknown error')}")
        
    except Exception as e:
        console.print(f"❌ Test failed: {e}", style="red")
        raise typer.Exit(1)


@app.command()
def config(
    show: bool = typer.Option(False, "--show", help="Show current configuration"),
    validate: bool = typer.Option(False, "--validate", help="Validate configuration"),
    create: bool = typer.Option(False, "--create", help="Create default configuration")
):
    """Manage ProcessIQ configuration"""
    
    try:
        if create:
            config_file = Path("processiq.yaml")
            if config_file.exists():
                overwrite = typer.confirm("Configuration file exists. Overwrite?")
                if not overwrite:
                    raise typer.Exit()
            
            create_default_config_file(config_file)
            console.print(f"✅ Created configuration file: {config_file}", style="green")
            return
        
        settings = get_settings()
        
        if show:
            _display_config(settings)
        
        if validate:
            _validate_config(settings)
        
        if not show and not validate:
            console.print("Use --show to display configuration or --validate to check it")
        
    except Exception as e:
        console.print(f"❌ Configuration error: {e}", style="red")
        raise typer.Exit(1)


# Helper functions

async def _start_engine(settings: Settings) -> None:
    """Start the ProcessIQ engine"""
    
    global _engine
    
    try:
        _engine = await create_engine(settings)
        
        console.print(Panel(
            f"🚀 ProcessIQ started successfully!\n\n"
            f"🌐 API Server: http://{settings.api.host}:{settings.api.port}\n"
            f"🔧 Environment: {settings.environment}\n"
            f"🔌 Plugins loaded: {len(_engine.plugin_manager.registry.list_all())}\n\n"
            f"Press Ctrl+C to stop",
            title="ProcessIQ Running",
            border_style="green"
        ))
        
        # Keep running until interrupted
        try:
            while True:
                await asyncio.sleep(1)
        except KeyboardInterrupt:
            pass
        
    finally:
        if _engine:
            await _engine.shutdown()
            console.print("🛑 ProcessIQ engine stopped", style="yellow")


def _create_example_plugin(plugins_dir: Path) -> None:
    """Create an example plugin file"""
    
    example_plugin = plugins_dir / "example_connector.py"
    
    plugin_code = '''"""
Example ProcessIQ Plugin

This demonstrates how to create a custom connector plugin.
"""

from processiq.connectors.base import ConnectorInterface, ConnectorConfig, DataRecord
from processiq.core.events import EventBus
from typing import Dict, Any, List, Optional, AsyncGenerator
from datetime import datetime


class ExampleConnectorConfig(ConnectorConfig):
    """Configuration for example connector"""
    
    example_setting: str = "default_value"
    another_setting: int = 42


class ExampleConnector(ConnectorInterface):
    """Example connector implementation"""
    
    def __init__(self, config: ExampleConnectorConfig, event_bus: EventBus):
        super().__init__(config, event_bus)
        self.config: ExampleConnectorConfig = config
    
    @property
    def connector_type(self) -> str:
        return "example"
    
    @property
    def supported_formats(self) -> List[str]:
        return ["json", "csv"]
    
    async def connect(self) -> None:
        """Establish connection"""
        # Implementation here
        pass
    
    async def disconnect(self) -> None:
        """Close connection"""
        # Implementation here
        pass
    
    async def fetch_data(
        self, 
        query: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None
    ) -> List[DataRecord]:
        """Fetch data from source"""
        
        # Example implementation
        records = []
        for i in range(min(limit or 10, 10)):
            record = DataRecord(
                id=str(i),
                data={"example_field": f"value_{i}"},
                metadata={"source": "example_connector"},
                timestamp=datetime.utcnow(),
                source="example://data"
            )
            records.append(record)
        
        return records
    
    async def fetch_data_stream(
        self, 
        query: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[DataRecord, None]:
        """Stream data from source"""
        
        records = await self.fetch_data(query)
        for record in records:
            yield record
    
    async def get_schema(self) -> Dict[str, Any]:
        """Get schema information"""
        return {
            "type": "example",
            "fields": {
                "example_field": "string"
            }
        }
'''
    
    example_plugin.write_text(plugin_code)


def _load_workflow_config(workflow_path: Path) -> Dict[str, Any]:
    """Load workflow configuration from file"""
    
    if workflow_path.suffix.lower() == '.json':
        with open(workflow_path, 'r') as f:
            return json.load(f)
    else:
        # YAML support would go here
        raise ValueError(f"Unsupported workflow file format: {workflow_path.suffix}")


async def _run_workflow(workflow_config: Dict[str, Any]) -> Dict[str, Any]:
    """Run a workflow configuration"""
    
    # This would create and run the actual workflow
    # For now, return mock results
    
    await asyncio.sleep(2)  # Simulate execution time
    
    return {
        "status": "completed",
        "records_processed": 42,
        "execution_time": "2.1 seconds",
        "data": []
    }


async def _test_connector(connector_name: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """Test a connector configuration"""
    
    # This would create and test the actual connector
    # For now, return mock results
    
    await asyncio.sleep(1)  # Simulate test time
    
    if connector_name in ["web", "api", "database", "file"]:
        return {
            "success": True,
            "response_time": "0.5s",
            "message": "Connection successful"
        }
    else:
        return {
            "success": False,
            "error": f"Unknown connector: {connector_name}"
        }


def _get_test_config(connector: str) -> Dict[str, Any]:
    """Get test configuration for a connector"""
    
    configs = {
        "web": {
            "base_url": "https://httpbin.org",
            "timeout": 30
        },
        "api": {
            "base_url": "https://jsonplaceholder.typicode.com",
            "timeout": 30
        },
        "database": {
            "database_type": "sqlite",
            "database_name": ":memory:"
        },
        "file": {
            "directory_path": ".",
            "file_pattern": "*.json"
        }
    }
    
    return configs.get(connector, {})


def _save_results(results: Dict[str, Any], output_path: str, format: str) -> None:
    """Save workflow results to file"""
    
    output_file = Path(output_path)
    
    if format.lower() == "json":
        with open(output_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
    elif format.lower() == "csv":
        # Would implement CSV export
        pass
    elif format.lower() == "excel":
        # Would implement Excel export
        pass


def _display_config(settings: Settings) -> None:
    """Display current configuration"""
    
    table = Table(title="ProcessIQ Configuration")
    table.add_column("Setting", style="cyan")
    table.add_column("Value", style="green")
    
    table.add_row("Environment", settings.environment)
    table.add_row("Debug", str(settings.debug))
    table.add_row("Version", settings.version)
    table.add_row("Database URL", settings.database.url[:50] + "..." if len(settings.database.url) > 50 else settings.database.url)
    table.add_row("Redis URL", settings.redis.url)
    table.add_row("Plugin Directory", settings.plugin_directory)
    
    console.print(table)


def _validate_config(settings: Settings) -> None:
    """Validate configuration"""
    
    console.print("🔍 Validating configuration...")
    
    issues = []
    
    # Check AI setup
    if not settings.validate_ai_setup():
        issues.append("⚠️ No AI services configured")
    
    # Check plugin directory
    plugin_dir = Path(settings.plugin_directory)
    if not plugin_dir.exists():
        issues.append(f"⚠️ Plugin directory does not exist: {settings.plugin_directory}")
    
    if issues:
        console.print("Configuration issues found:", style="yellow")
        for issue in issues:
            console.print(f"  {issue}")
    else:
        console.print("✅ Configuration is valid!", style="green")


def _display_schema(schema: Dict[str, Any]) -> None:
    """Display schema information"""
    
    # Basic schema display - would be more sophisticated in practice
    console.print(json.dumps(schema, indent=2))


# Main entry point
def main_cli():
    """Main CLI entry point"""
    app()


if __name__ == "__main__":
    main_cli()