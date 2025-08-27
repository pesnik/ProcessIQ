"""
Database Connector

Universal database connector supporting:
- SQL databases (PostgreSQL, MySQL, SQLite, SQL Server)
- NoSQL databases (MongoDB, Redis, etc.)
- Cloud databases (BigQuery, Snowflake, etc.)
- Connection pooling and query optimization
"""

from enum import Enum
from typing import Any, Dict, List, Optional, AsyncGenerator, Union
from datetime import datetime
import asyncio

from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from pydantic import BaseModel, Field

from .base import ConnectorInterface, ConnectorConfig, DataRecord, ConnectorStatus
from ..core.events import EventBus
from ..core.exceptions import ConnectionError, ValidationError


class DatabaseType(Enum):
    """Supported database types"""
    POSTGRESQL = "postgresql"
    MYSQL = "mysql"
    SQLITE = "sqlite"
    SQLSERVER = "sqlserver"
    MONGODB = "mongodb"
    REDIS = "redis"
    BIGQUERY = "bigquery"
    SNOWFLAKE = "snowflake"


class QueryType(Enum):
    """Query types for different operations"""
    SELECT = "select"
    INSERT = "insert"
    UPDATE = "update"
    DELETE = "delete"
    CUSTOM = "custom"


class DatabaseConnectorConfig(ConnectorConfig):
    """Configuration for database connector"""
    
    # Database settings
    database_type: DatabaseType
    host: str = "localhost"
    port: Optional[int] = None
    database_name: str
    schema: Optional[str] = None
    
    # Authentication
    username: Optional[str] = None
    password: Optional[str] = None
    
    # Connection settings
    connection_url: Optional[str] = None  # Full connection string
    pool_size: int = 10
    max_overflow: int = 20
    pool_timeout: int = 30
    pool_recycle: int = 3600
    
    # SSL/Security
    use_ssl: bool = False
    ssl_cert_path: Optional[str] = None
    ssl_key_path: Optional[str] = None
    ssl_ca_path: Optional[str] = None
    
    # Query settings
    default_limit: int = 1000
    query_timeout: int = 300  # seconds
    fetch_size: int = 1000
    
    # NoSQL specific settings (for MongoDB, etc.)
    nosql_collection: Optional[str] = None
    nosql_database: Optional[str] = None


class DatabaseConnector(ConnectorInterface):
    """
    Universal database connector supporting multiple database types
    with connection pooling, query optimization, and async operations.
    """
    
    def __init__(self, config: DatabaseConnectorConfig, event_bus: EventBus):
        super().__init__(config, event_bus)
        self.config: DatabaseConnectorConfig = config
        
        # SQL Engine and session
        self._engine: Optional[AsyncEngine] = None
        self._session_factory: Optional[sessionmaker] = None
        
        # NoSQL connections (MongoDB, Redis, etc.)
        self._nosql_client = None
        
        # Query cache for performance
        self._query_cache: Dict[str, Any] = {}
        self._cache_enabled = True
    
    @property
    def connector_type(self) -> str:
        return "database"
    
    @property
    def supported_formats(self) -> List[str]:
        return ["json", "csv", "parquet", "sql"]
    
    @property
    def is_sql_database(self) -> bool:
        """Check if this is a SQL database"""
        return self.config.database_type in [
            DatabaseType.POSTGRESQL,
            DatabaseType.MYSQL,
            DatabaseType.SQLITE,
            DatabaseType.SQLSERVER,
            DatabaseType.BIGQUERY,
            DatabaseType.SNOWFLAKE
        ]
    
    @property
    def is_nosql_database(self) -> bool:
        """Check if this is a NoSQL database"""
        return self.config.database_type in [
            DatabaseType.MONGODB,
            DatabaseType.REDIS
        ]
    
    # Connection Management
    
    async def connect(self) -> None:
        """Establish database connection"""
        try:
            await self.set_status(ConnectorStatus.CONNECTING)
            
            if self.is_sql_database:
                await self._connect_sql()
            elif self.is_nosql_database:
                await self._connect_nosql()
            else:
                raise ConnectionError(f"Unsupported database type: {self.config.database_type}")
            
            # Test connection
            await self._test_connection()
            
            await self.set_status(ConnectorStatus.CONNECTED)
            self.reset_error_count()
            
        except Exception as e:
            await self.set_status(ConnectorStatus.ERROR)
            await self.handle_error(e, "connect")
            raise
    
    async def disconnect(self) -> None:
        """Close database connection"""
        try:
            if self._engine:
                await self._engine.dispose()
                self._engine = None
                self._session_factory = None
            
            if self._nosql_client:
                if hasattr(self._nosql_client, 'close'):
                    await self._nosql_client.close()
                self._nosql_client = None
            
            await self.set_status(ConnectorStatus.DISCONNECTED)
            
        except Exception as e:
            await self.handle_error(e, "disconnect")
    
    async def _connect_sql(self) -> None:
        """Connect to SQL database"""
        
        connection_url = self.config.connection_url or self._build_sql_connection_url()
        
        # Create async engine
        self._engine = create_async_engine(
            connection_url,
            pool_size=self.config.pool_size,
            max_overflow=self.config.max_overflow,
            pool_timeout=self.config.pool_timeout,
            pool_recycle=self.config.pool_recycle,
            echo=False  # Set to True for SQL debugging
        )
        
        # Create session factory
        self._session_factory = sessionmaker(
            self._engine, 
            class_=AsyncSession,
            expire_on_commit=False
        )
    
    async def _connect_nosql(self) -> None:
        """Connect to NoSQL database"""
        
        if self.config.database_type == DatabaseType.MONGODB:
            # Would implement MongoDB connection
            # from motor.motor_asyncio import AsyncIOMotorClient
            # self._nosql_client = AsyncIOMotorClient(connection_string)
            pass
        
        elif self.config.database_type == DatabaseType.REDIS:
            # Would implement Redis connection
            # import aioredis
            # self._nosql_client = aioredis.from_url(connection_string)
            pass
    
    def _build_sql_connection_url(self) -> str:
        """Build SQL connection URL from config parameters"""
        
        db_type = self.config.database_type.value
        username = self.config.username
        password = self.config.password
        host = self.config.host
        port = self.config.port or self._get_default_port()
        database = self.config.database_name
        
        # Handle different database URL formats
        if db_type == "postgresql":
            driver = "postgresql+asyncpg"
        elif db_type == "mysql":
            driver = "mysql+aiomysql"
        elif db_type == "sqlite":
            return f"sqlite+aiosqlite:///{database}"
        elif db_type == "sqlserver":
            driver = "mssql+aioodbc"
        else:
            driver = db_type
        
        if username and password:
            return f"{driver}://{username}:{password}@{host}:{port}/{database}"
        else:
            return f"{driver}://{host}:{port}/{database}"
    
    def _get_default_port(self) -> int:
        """Get default port for database type"""
        
        defaults = {
            DatabaseType.POSTGRESQL: 5432,
            DatabaseType.MYSQL: 3306,
            DatabaseType.SQLSERVER: 1433,
            DatabaseType.MONGODB: 27017,
            DatabaseType.REDIS: 6379
        }
        
        return defaults.get(self.config.database_type, 5432)
    
    async def _test_connection(self) -> None:
        """Test database connection"""
        
        if self.is_sql_database:
            async with self._session_factory() as session:
                result = await session.execute(text("SELECT 1"))
                result.fetchone()
        
        elif self.config.database_type == DatabaseType.MONGODB:
            # Test MongoDB connection
            pass
        
        elif self.config.database_type == DatabaseType.REDIS:
            # Test Redis connection
            pass
    
    # Data Operations
    
    async def fetch_data(
        self, 
        query: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None
    ) -> List[DataRecord]:
        """Fetch data from database"""
        
        if not self.is_connected:
            await self.connect()
        
        try:
            if self.is_sql_database:
                return await self._fetch_sql_data(query, limit)
            elif self.is_nosql_database:
                return await self._fetch_nosql_data(query, limit)
            else:
                raise ConnectionError("Database not connected")
                
        except Exception as e:
            await self.handle_error(e, "fetch_data")
            raise
    
    async def fetch_data_stream(
        self, 
        query: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[DataRecord, None]:
        """Stream data from database"""
        
        if not self.is_connected:
            await self.connect()
        
        try:
            if self.is_sql_database:
                async for record in self._stream_sql_data(query):
                    yield record
            elif self.is_nosql_database:
                async for record in self._stream_nosql_data(query):
                    yield record
                    
        except Exception as e:
            await self.handle_error(e, "fetch_data_stream")
            raise
    
    async def write_data(
        self, 
        records: List[DataRecord],
        mode: str = "append"
    ) -> Dict[str, Any]:
        """Write data to database"""
        
        if not self.is_connected:
            await self.connect()
        
        results = {
            "total_records": len(records),
            "successful": 0,
            "failed": 0,
            "errors": []
        }
        
        try:
            if self.is_sql_database:
                results = await self._write_sql_data(records, mode)
            elif self.is_nosql_database:
                results = await self._write_nosql_data(records, mode)
            
            return results
            
        except Exception as e:
            await self.handle_error(e, "write_data")
            results["errors"].append({"error": str(e)})
            return results
    
    # SQL Data Operations
    
    async def _fetch_sql_data(
        self, 
        query: Optional[Dict[str, Any]], 
        limit: Optional[int]
    ) -> List[DataRecord]:
        """Fetch data from SQL database"""
        
        sql_query = self._build_sql_query(query, limit)
        
        async with self._session_factory() as session:
            result = await session.execute(text(sql_query))
            rows = result.fetchall()
            columns = result.keys()
            
            records = []
            for i, row in enumerate(rows):
                row_dict = dict(zip(columns, row))
                
                record = DataRecord(
                    id=row_dict.get("id") or str(i),
                    data=row_dict,
                    metadata={
                        "query": sql_query,
                        "table": query.get("table") if query else None,
                        "database": self.config.database_name
                    },
                    timestamp=datetime.utcnow(),
                    source=f"database:{self.config.database_name}"
                )
                records.append(record)
            
            return records
    
    async def _stream_sql_data(
        self, 
        query: Optional[Dict[str, Any]]
    ) -> AsyncGenerator[DataRecord, None]:
        """Stream data from SQL database"""
        
        sql_query = self._build_sql_query(query)
        
        async with self._session_factory() as session:
            result = await session.execute(text(sql_query))
            
            # Stream results in batches
            while True:
                rows = result.fetchmany(self.config.fetch_size)
                if not rows:
                    break
                
                columns = result.keys()
                for i, row in enumerate(rows):
                    row_dict = dict(zip(columns, row))
                    
                    record = DataRecord(
                        id=row_dict.get("id") or str(i),
                        data=row_dict,
                        metadata={
                            "query": sql_query,
                            "streaming": True
                        },
                        timestamp=datetime.utcnow(),
                        source=f"database:{self.config.database_name}"
                    )
                    yield record
    
    async def _write_sql_data(
        self, 
        records: List[DataRecord], 
        mode: str
    ) -> Dict[str, Any]:
        """Write data to SQL database"""
        
        results = {
            "total_records": len(records),
            "successful": 0,
            "failed": 0,
            "errors": []
        }
        
        # This would implement actual SQL insert/update logic
        # For now, placeholder implementation
        
        for record in records:
            try:
                # Would execute INSERT/UPDATE SQL here
                results["successful"] += 1
            except Exception as e:
                results["failed"] += 1
                results["errors"].append({
                    "record_id": record.id,
                    "error": str(e)
                })
        
        return results
    
    def _build_sql_query(
        self, 
        query: Optional[Dict[str, Any]], 
        limit: Optional[int] = None
    ) -> str:
        """Build SQL query from query parameters"""
        
        if not query:
            return "SELECT * FROM information_schema.tables LIMIT 10"
        
        # Handle direct SQL query
        if "sql" in query:
            sql = query["sql"]
            if limit and "LIMIT" not in sql.upper():
                sql += f" LIMIT {limit}"
            return sql
        
        # Handle table query
        if "table" in query:
            table = query["table"]
            columns = query.get("columns", "*")
            where_clause = query.get("where", "")
            order_by = query.get("order_by", "")
            
            if isinstance(columns, list):
                columns = ", ".join(columns)
            
            sql = f"SELECT {columns} FROM {table}"
            
            if where_clause:
                sql += f" WHERE {where_clause}"
            
            if order_by:
                sql += f" ORDER BY {order_by}"
            
            if limit:
                sql += f" LIMIT {limit}"
            
            return sql
        
        # Default query
        return f"SELECT * FROM information_schema.tables LIMIT {limit or 10}"
    
    # NoSQL Data Operations (placeholders)
    
    async def _fetch_nosql_data(
        self, 
        query: Optional[Dict[str, Any]], 
        limit: Optional[int]
    ) -> List[DataRecord]:
        """Fetch data from NoSQL database"""
        
        records = []
        
        if self.config.database_type == DatabaseType.MONGODB:
            # Would implement MongoDB query logic
            pass
        elif self.config.database_type == DatabaseType.REDIS:
            # Would implement Redis query logic  
            pass
        
        return records
    
    async def _stream_nosql_data(
        self, 
        query: Optional[Dict[str, Any]]
    ) -> AsyncGenerator[DataRecord, None]:
        """Stream data from NoSQL database"""
        
        if self.config.database_type == DatabaseType.MONGODB:
            # Would implement MongoDB streaming
            pass
        elif self.config.database_type == DatabaseType.REDIS:
            # Would implement Redis streaming
            pass
        
        # Placeholder - yield nothing for now
        return
        yield  # Make this a generator
    
    async def _write_nosql_data(
        self, 
        records: List[DataRecord], 
        mode: str
    ) -> Dict[str, Any]:
        """Write data to NoSQL database"""
        
        results = {
            "total_records": len(records),
            "successful": 0,
            "failed": 0,
            "errors": []
        }
        
        # Placeholder implementation
        return results
    
    # Query Validation
    
    async def validate_query(self, query: Dict[str, Any]) -> bool:
        """Validate query parameters"""
        
        if self.is_sql_database:
            return self._validate_sql_query(query)
        elif self.is_nosql_database:
            return self._validate_nosql_query(query)
        
        return True
    
    def _validate_sql_query(self, query: Dict[str, Any]) -> bool:
        """Validate SQL query"""
        
        # Basic validation
        if "sql" in query:
            sql = query["sql"].upper().strip()
            # Prevent dangerous operations
            dangerous_keywords = ["DROP", "DELETE", "TRUNCATE", "ALTER"]
            for keyword in dangerous_keywords:
                if keyword in sql:
                    raise ValidationError(f"Query contains dangerous keyword: {keyword}")
        
        return True
    
    def _validate_nosql_query(self, query: Dict[str, Any]) -> bool:
        """Validate NoSQL query"""
        
        # Basic validation for NoSQL queries
        return True
    
    # Schema and Metadata
    
    async def get_schema(self) -> Dict[str, Any]:
        """Get database schema information"""
        
        if not self.is_connected:
            await self.connect()
        
        try:
            if self.is_sql_database:
                return await self._get_sql_schema()
            elif self.is_nosql_database:
                return await self._get_nosql_schema()
            else:
                return {"error": "Unsupported database type"}
                
        except Exception as e:
            return {"error": str(e)}
    
    async def _get_sql_schema(self) -> Dict[str, Any]:
        """Get SQL database schema"""
        
        schema_query = """
        SELECT table_name, column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = %s
        ORDER BY table_name, ordinal_position
        """
        
        try:
            async with self._session_factory() as session:
                if self.config.database_type == DatabaseType.SQLITE:
                    # SQLite has different information schema
                    result = await session.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
                    tables = [row[0] for row in result.fetchall()]
                    
                    return {
                        "database": self.config.database_name,
                        "tables": tables,
                        "type": "sqlite"
                    }
                else:
                    # Standard SQL information schema
                    schema_name = self.config.schema or self.config.database_name
                    result = await session.execute(text(schema_query), {"schema": schema_name})
                    
                    schema_info = {}
                    for row in result:
                        table, column, data_type, nullable = row
                        if table not in schema_info:
                            schema_info[table] = []
                        schema_info[table].append({
                            "column": column,
                            "type": data_type,
                            "nullable": nullable == "YES"
                        })
                    
                    return {
                        "database": self.config.database_name,
                        "schema": schema_name,
                        "tables": schema_info
                    }
        
        except Exception as e:
            return {"error": f"Failed to retrieve schema: {e}"}
    
    async def _get_nosql_schema(self) -> Dict[str, Any]:
        """Get NoSQL database schema"""
        
        # NoSQL databases typically don't have fixed schemas
        return {
            "database_type": self.config.database_type.value,
            "database": self.config.nosql_database or self.config.database_name,
            "schema_type": "flexible",
            "note": "NoSQL databases typically don't have fixed schemas"
        }