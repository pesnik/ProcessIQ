"""
Configuration Management System

Centralized configuration handling for ProcessIQ:
- Environment-based configuration
- Plugin configurations
- Runtime settings
- Secrets management
"""

from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from functools import lru_cache

from pydantic import BaseSettings, Field
from pydantic.env_settings import SettingsSourceCallable


class DatabaseConfig(BaseSettings):
    """Database configuration"""
    url: str = Field(default="postgresql://user:pass@localhost/processiq")
    pool_size: int = Field(default=10)
    max_overflow: int = Field(default=20)
    echo: bool = Field(default=False)


class RedisConfig(BaseSettings):
    """Redis configuration for caching and task queue"""
    url: str = Field(default="redis://localhost:6379/0")
    max_connections: int = Field(default=10)


class AIConfig(BaseSettings):
    """AI/ML service configurations"""
    openai_api_key: Optional[str] = Field(default=None)
    anthropic_api_key: Optional[str] = Field(default=None)
    
    # Qwen2.5-VL settings
    qwen_model_path: Optional[str] = Field(default=None)
    qwen_model_size: str = Field(default="7B")  # 3B, 7B, 32B, 72B
    
    # Local model settings
    local_model_cache_dir: str = Field(default="./models")
    use_gpu: bool = Field(default=True)
    max_batch_size: int = Field(default=4)


class AutomationConfig(BaseSettings):
    """Web automation configuration"""
    default_timeout: int = Field(default=30)
    headless: bool = Field(default=True)
    browser_pool_size: int = Field(default=5)
    
    # Hybrid automation settings
    prefer_traditional: bool = Field(default=True)
    vision_fallback: bool = Field(default=True)
    learning_enabled: bool = Field(default=True)


class StorageConfig(BaseSettings):
    """Data storage configuration"""
    data_directory: str = Field(default="./data")
    max_file_size_mb: int = Field(default=100)
    
    # Vector database for AI features
    vector_db_url: Optional[str] = Field(default=None)
    vector_db_type: str = Field(default="pinecone")  # pinecone, weaviate, chroma


class APIConfig(BaseSettings):
    """API server configuration"""
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)
    workers: int = Field(default=4)
    reload: bool = Field(default=False)
    cors_origins: List[str] = Field(default=["*"])


class LoggingConfig(BaseSettings):
    """Logging configuration"""
    level: str = Field(default="INFO")
    format: str = Field(default="json")
    file: Optional[str] = Field(default=None)
    max_size: str = Field(default="10MB")
    backup_count: int = Field(default=5)


class SecurityConfig(BaseSettings):
    """Security and authentication settings"""
    secret_key: str = Field(default="dev-secret-key-change-in-production")
    jwt_algorithm: str = Field(default="HS256")
    jwt_expiration_hours: int = Field(default=24)
    
    # API rate limiting
    rate_limit_per_minute: int = Field(default=100)
    
    # Encryption for sensitive data
    encryption_key: Optional[str] = Field(default=None)


class Settings(BaseSettings):
    """Main settings class that combines all configurations"""
    
    # Environment
    environment: str = Field(default="development")
    debug: bool = Field(default=True)
    version: str = Field(default="0.1.0")
    
    # Sub-configurations
    database: DatabaseConfig = Field(default_factory=DatabaseConfig)
    redis: RedisConfig = Field(default_factory=RedisConfig)
    ai: AIConfig = Field(default_factory=AIConfig)
    automation: AutomationConfig = Field(default_factory=AutomationConfig)
    storage: StorageConfig = Field(default_factory=StorageConfig)
    api: APIConfig = Field(default_factory=APIConfig)
    logging: LoggingConfig = Field(default_factory=LoggingConfig)
    security: SecurityConfig = Field(default_factory=SecurityConfig)
    
    # Plugin configurations
    plugin_directory: str = Field(default="./plugins")
    plugin_configs: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        env_nested_delimiter = "__"
        case_sensitive = False
        
        # Load settings from multiple sources
        @classmethod
        def customise_sources(
            cls,
            init_settings: SettingsSourceCallable,
            env_settings: SettingsSourceCallable,
            file_secret_settings: SettingsSourceCallable,
        ) -> tuple[SettingsSourceCallable, ...]:
            return (
                init_settings,
                env_settings,
                file_secret_settings,
            )
    
    def is_development(self) -> bool:
        """Check if running in development mode"""
        return self.environment.lower() in ("dev", "development", "local")
    
    def is_production(self) -> bool:
        """Check if running in production mode"""
        return self.environment.lower() in ("prod", "production")
    
    def get_plugin_config(self, plugin_name: str) -> Dict[str, Any]:
        """Get configuration for a specific plugin"""
        return self.plugin_configs.get(plugin_name, {})
    
    def set_plugin_config(self, plugin_name: str, config: Dict[str, Any]) -> None:
        """Set configuration for a specific plugin"""
        self.plugin_configs[plugin_name] = config
    
    def validate_ai_setup(self) -> bool:
        """Validate AI configuration is properly set up"""
        has_api_key = (
            self.ai.openai_api_key is not None or 
            self.ai.anthropic_api_key is not None
        )
        has_local_model = (
            self.ai.qwen_model_path is not None and
            Path(self.ai.qwen_model_path).exists()
        )
        return has_api_key or has_local_model
    
    def get_model_config(self) -> Dict[str, Any]:
        """Get AI model configuration based on available options"""
        config = {
            "use_local": self.ai.qwen_model_path is not None,
            "use_openai": self.ai.openai_api_key is not None,
            "use_anthropic": self.ai.anthropic_api_key is not None,
        }
        
        if config["use_local"]:
            config["local_model_path"] = self.ai.qwen_model_path
            config["model_size"] = self.ai.qwen_model_size
        
        return config


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


def load_config_file(file_path: Union[str, Path]) -> Dict[str, Any]:
    """Load configuration from YAML or JSON file"""
    import yaml
    import json
    
    file_path = Path(file_path)
    if not file_path.exists():
        raise FileNotFoundError(f"Config file not found: {file_path}")
    
    content = file_path.read_text()
    
    if file_path.suffix.lower() in ('.yaml', '.yml'):
        return yaml.safe_load(content)
    elif file_path.suffix.lower() == '.json':
        return json.loads(content)
    else:
        raise ValueError(f"Unsupported config file format: {file_path.suffix}")


def create_default_config_file(file_path: Union[str, Path]) -> None:
    """Create a default configuration file"""
    import yaml
    
    default_config = {
        "environment": "development",
        "debug": True,
        "database": {
            "url": "postgresql://user:pass@localhost/processiq"
        },
        "ai": {
            "qwen_model_size": "7B",
            "use_gpu": True,
            "local_model_cache_dir": "./models"
        },
        "automation": {
            "headless": True,
            "prefer_traditional": True,
            "vision_fallback": True
        },
        "plugins": {
            "web_connector": {
                "enabled": True,
                "timeout": 30
            },
            "excel_exporter": {
                "enabled": True,
                "default_format": "xlsx"
            }
        }
    }
    
    file_path = Path(file_path)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    
    with file_path.open('w') as f:
        yaml.dump(default_config, f, default_flow_style=False, indent=2)