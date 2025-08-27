"""
API Connector

Pluggable API connector supporting:
- REST APIs with various authentication methods
- GraphQL APIs
- SOAP/XML services
- Rate limiting and retry logic
- Response parsing and transformation
"""

import asyncio
from enum import Enum
from typing import Any, Dict, List, Optional, AsyncGenerator, Union
from datetime import datetime
import json

import httpx
from pydantic import BaseModel, Field

from .base import ConnectorInterface, ConnectorConfig, DataRecord, ConnectorStatus
from ..core.events import EventBus
from ..core.exceptions import ConnectionError, AuthenticationError, ValidationError


class APIType(Enum):
    """Supported API types"""
    REST = "rest"
    GRAPHQL = "graphql"
    SOAP = "soap"


class AuthType(Enum):
    """Authentication types"""
    NONE = "none"
    API_KEY = "api_key"
    BEARER_TOKEN = "bearer_token"
    BASIC_AUTH = "basic_auth"
    OAUTH2 = "oauth2"
    CUSTOM_HEADER = "custom_header"


class APIConnectorConfig(ConnectorConfig):
    """Configuration for API connector"""
    
    # API settings
    base_url: str
    api_type: APIType = APIType.REST
    api_version: Optional[str] = None
    
    # Authentication
    auth_type: AuthType = AuthType.NONE
    api_key: Optional[str] = None
    api_key_header: str = "X-API-Key"
    bearer_token: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    oauth2_config: Dict[str, Any] = Field(default_factory=dict)
    custom_headers: Dict[str, str] = Field(default_factory=dict)
    
    # Request settings
    default_headers: Dict[str, str] = Field(default_factory=lambda: {
        "Content-Type": "application/json",
        "Accept": "application/json"
    })
    timeout: int = 30
    max_retries: int = 3
    retry_backoff: float = 1.0
    
    # Rate limiting
    rate_limit_per_second: Optional[int] = None
    rate_limit_per_minute: Optional[int] = None
    rate_limit_per_hour: Optional[int] = None
    
    # Response handling
    response_format: str = "json"  # json, xml, csv, text
    pagination_type: str = "none"  # none, offset, cursor, page
    pagination_params: Dict[str, str] = Field(default_factory=dict)
    
    # Data transformation
    data_path: Optional[str] = None  # JSONPath to extract data from response
    field_mapping: Dict[str, str] = Field(default_factory=dict)


class APIConnector(ConnectorInterface):
    """
    Universal API connector supporting REST, GraphQL, and SOAP APIs
    with authentication, rate limiting, and intelligent response parsing.
    """
    
    def __init__(self, config: APIConnectorConfig, event_bus: EventBus):
        super().__init__(config, event_bus)
        self.config: APIConnectorConfig = config
        
        # HTTP client
        self._client: Optional[httpx.AsyncClient] = None
        
        # Rate limiting
        self._rate_limiter = RateLimiter(
            per_second=config.rate_limit_per_second,
            per_minute=config.rate_limit_per_minute,
            per_hour=config.rate_limit_per_hour
        )
        
        # Authentication handler
        self._auth_handler = self._create_auth_handler()
    
    @property
    def connector_type(self) -> str:
        return "api"
    
    @property
    def supported_formats(self) -> List[str]:
        return ["json", "xml", "csv", "text"]
    
    # Connection Management
    
    async def connect(self) -> None:
        """Initialize HTTP client and test connection"""
        try:
            await self.set_status(ConnectorStatus.CONNECTING)
            
            # Create HTTP client with configuration
            self._client = httpx.AsyncClient(
                base_url=self.config.base_url,
                headers=self._build_headers(),
                timeout=httpx.Timeout(self.config.timeout),
                follow_redirects=True
            )
            
            # Test connection with a simple request
            await self._test_connection()
            
            await self.set_status(ConnectorStatus.CONNECTED)
            self.reset_error_count()
            
        except Exception as e:
            await self.set_status(ConnectorStatus.ERROR)
            await self.handle_error(e, "connect")
            raise
    
    async def disconnect(self) -> None:
        """Close HTTP client"""
        try:
            if self._client:
                await self._client.aclose()
                self._client = None
            
            await self.set_status(ConnectorStatus.DISCONNECTED)
            
        except Exception as e:
            await self.handle_error(e, "disconnect")
    
    # Data Operations
    
    async def fetch_data(
        self, 
        query: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None
    ) -> List[DataRecord]:
        """Fetch data from API endpoint"""
        
        if not self.is_connected:
            await self.connect()
        
        try:
            endpoint = query.get("endpoint", "/") if query else "/"
            method = query.get("method", "GET").upper() if query else "GET"
            params = query.get("params", {}) if query else {}
            body = query.get("body", {}) if query else {}
            
            # Apply rate limiting
            await self._rate_limiter.acquire()
            
            # Make request
            response = await self._make_request(
                method=method,
                endpoint=endpoint,
                params=params,
                body=body
            )
            
            # Parse response
            data = await self._parse_response(response)
            
            # Apply pagination if needed
            all_data = data
            if self.config.pagination_type != "none" and limit != 1:
                all_data = await self._handle_pagination(
                    initial_data=data,
                    endpoint=endpoint,
                    method=method,
                    params=params,
                    body=body,
                    limit=limit
                )
            
            # Convert to DataRecord format
            records = []
            data_items = self._extract_data_items(all_data)
            
            for i, item in enumerate(data_items):
                if limit and i >= limit:
                    break
                
                # Apply field mapping if configured
                if self.config.field_mapping:
                    item = self._apply_field_mapping(item)
                
                record = DataRecord(
                    id=item.get("id") or str(i),
                    data=item,
                    metadata={
                        "endpoint": endpoint,
                        "method": method,
                        "response_status": response.status_code,
                        "request_time": datetime.utcnow()
                    },
                    timestamp=datetime.utcnow(),
                    source=f"api:{self.config.base_url}{endpoint}"
                )
                records.append(record)
            
            return records
            
        except Exception as e:
            await self.handle_error(e, "fetch_data")
            raise
    
    async def fetch_data_stream(
        self, 
        query: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[DataRecord, None]:
        """Stream data from API (useful for webhooks or polling)"""
        
        # For polling-based streaming
        interval = query.get("interval", 60) if query else 60
        
        while True:
            try:
                records = await self.fetch_data(query)
                
                for record in records:
                    yield record
                
                await asyncio.sleep(interval)
                
            except Exception as e:
                await self.handle_error(e, "fetch_data_stream")
                await asyncio.sleep(interval)
    
    async def write_data(
        self, 
        records: List[DataRecord],
        mode: str = "append"
    ) -> Dict[str, Any]:
        """Write data to API endpoint"""
        
        if not self.is_connected:
            await self.connect()
        
        results = {
            "total_records": len(records),
            "successful": 0,
            "failed": 0,
            "errors": []
        }
        
        for record in records:
            try:
                # Apply rate limiting
                await self._rate_limiter.acquire()
                
                # Determine endpoint and method based on mode
                if mode == "append":
                    method = "POST"
                    endpoint = "/create"  # Default, should be configurable
                elif mode == "update":
                    method = "PUT"
                    endpoint = f"/update/{record.id}"
                else:
                    method = "POST"
                    endpoint = "/"
                
                # Make request
                response = await self._make_request(
                    method=method,
                    endpoint=endpoint,
                    body=record.data
                )
                
                if response.is_success:
                    results["successful"] += 1
                else:
                    results["failed"] += 1
                    results["errors"].append({
                        "record_id": record.id,
                        "status_code": response.status_code,
                        "error": response.text
                    })
                
            except Exception as e:
                results["failed"] += 1
                results["errors"].append({
                    "record_id": record.id,
                    "error": str(e)
                })
        
        return results
    
    # Request Methods
    
    async def _make_request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict] = None,
        body: Optional[Dict] = None,
        headers: Optional[Dict] = None
    ) -> httpx.Response:
        """Make HTTP request with retry logic"""
        
        request_headers = self._build_headers()
        if headers:
            request_headers.update(headers)
        
        for attempt in range(self.config.max_retries + 1):
            try:
                if self.config.api_type == APIType.GRAPHQL:
                    # Handle GraphQL requests
                    response = await self._client.post(
                        endpoint,
                        json={"query": body.get("query"), "variables": body.get("variables", {})},
                        params=params,
                        headers=request_headers
                    )
                else:
                    # Handle REST requests
                    response = await self._client.request(
                        method=method,
                        url=endpoint,
                        params=params,
                        json=body if body else None,
                        headers=request_headers
                    )
                
                # Check for authentication errors
                if response.status_code == 401:
                    raise AuthenticationError("API authentication failed")
                
                # Check for other client/server errors
                if response.status_code >= 400:
                    error_msg = f"API request failed: {response.status_code} - {response.text}"
                    if response.status_code < 500:  # Client error, don't retry
                        raise ConnectionError(error_msg)
                    else:  # Server error, might retry
                        if attempt == self.config.max_retries:
                            raise ConnectionError(error_msg)
                        continue
                
                return response
                
            except (httpx.ConnectTimeout, httpx.ReadTimeout) as e:
                if attempt == self.config.max_retries:
                    raise ConnectionError(f"Request timeout after {attempt + 1} attempts")
                
                # Wait before retry
                await asyncio.sleep(self.config.retry_backoff * (attempt + 1))
                continue
            
            except Exception as e:
                if attempt == self.config.max_retries:
                    raise
                
                await asyncio.sleep(self.config.retry_backoff * (attempt + 1))
                continue
        
        raise ConnectionError("Max retries exceeded")
    
    async def _parse_response(self, response: httpx.Response) -> Any:
        """Parse HTTP response based on content type"""
        
        content_type = response.headers.get("content-type", "").lower()
        
        try:
            if "json" in content_type or self.config.response_format == "json":
                return response.json()
            elif "xml" in content_type or self.config.response_format == "xml":
                # Would need XML parsing library
                return {"raw_xml": response.text}
            elif "csv" in content_type or self.config.response_format == "csv":
                # Would need CSV parsing
                return {"raw_csv": response.text}
            else:
                return {"raw_text": response.text}
                
        except Exception as e:
            # Fallback to text if parsing fails
            return {"raw_text": response.text, "parse_error": str(e)}
    
    def _extract_data_items(self, response_data: Any) -> List[Dict[str, Any]]:
        """Extract data items from response using configured data path"""
        
        if isinstance(response_data, list):
            return response_data
        
        if isinstance(response_data, dict):
            if self.config.data_path:
                # Simple JSONPath-like extraction
                keys = self.config.data_path.split(".")
                current = response_data
                
                for key in keys:
                    if isinstance(current, dict) and key in current:
                        current = current[key]
                    else:
                        return []
                
                if isinstance(current, list):
                    return current
                else:
                    return [current]
            else:
                # Return the whole response as single item
                return [response_data]
        
        return []
    
    def _apply_field_mapping(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Apply field mapping to transform response fields"""
        
        mapped_item = {}
        
        for target_field, source_field in self.config.field_mapping.items():
            if source_field in item:
                mapped_item[target_field] = item[source_field]
        
        # Keep unmapped fields
        for field, value in item.items():
            if field not in self.config.field_mapping.values():
                mapped_item[field] = value
        
        return mapped_item
    
    async def _handle_pagination(
        self,
        initial_data: Any,
        endpoint: str,
        method: str,
        params: Dict,
        body: Dict,
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Handle API pagination"""
        
        all_items = self._extract_data_items(initial_data)
        
        if self.config.pagination_type == "offset":
            offset = len(all_items)
            
            while True:
                if limit and len(all_items) >= limit:
                    break
                
                paginated_params = params.copy()
                paginated_params[self.config.pagination_params.get("offset", "offset")] = offset
                paginated_params[self.config.pagination_params.get("limit", "limit")] = min(
                    100, limit - len(all_items) if limit else 100
                )
                
                response = await self._make_request(method, endpoint, paginated_params, body)
                data = await self._parse_response(response)
                items = self._extract_data_items(data)
                
                if not items:
                    break
                
                all_items.extend(items)
                offset += len(items)
        
        # Add support for cursor and page pagination here
        
        return all_items[:limit] if limit else all_items
    
    # Helper Methods
    
    def _build_headers(self) -> Dict[str, str]:
        """Build request headers with authentication"""
        
        headers = self.config.default_headers.copy()
        headers.update(self.config.custom_headers)
        
        # Add authentication headers
        if self.config.auth_type == AuthType.API_KEY and self.config.api_key:
            headers[self.config.api_key_header] = self.config.api_key
        
        elif self.config.auth_type == AuthType.BEARER_TOKEN and self.config.bearer_token:
            headers["Authorization"] = f"Bearer {self.config.bearer_token}"
        
        return headers
    
    def _create_auth_handler(self):
        """Create authentication handler based on config"""
        
        if self.config.auth_type == AuthType.BASIC_AUTH:
            return httpx.BasicAuth(self.config.username, self.config.password)
        elif self.config.auth_type == AuthType.OAUTH2:
            # Would implement OAuth2 flow
            return None
        else:
            return None
    
    async def _test_connection(self) -> None:
        """Test API connection"""
        
        try:
            # Try to make a simple request to test connectivity
            response = await self._client.get("/", timeout=10.0)
            # Don't require success status, just connectivity
            
        except Exception as e:
            raise ConnectionError(f"Failed to connect to API: {e}")
    
    # Schema and Metadata
    
    async def get_schema(self) -> Dict[str, Any]:
        """Get API schema information"""
        
        try:
            # Try common schema endpoints
            schema_endpoints = [
                "/schema",
                "/swagger.json",
                "/openapi.json",
                "/.well-known/schema"
            ]
            
            for endpoint in schema_endpoints:
                try:
                    response = await self._client.get(endpoint)
                    if response.is_success:
                        return {
                            "schema_source": endpoint,
                            "schema": response.json()
                        }
                except:
                    continue
            
            # If no schema endpoint found, return basic info
            return {
                "base_url": self.config.base_url,
                "api_type": self.config.api_type.value,
                "authentication": self.config.auth_type.value,
                "supported_methods": ["GET", "POST", "PUT", "DELETE"],
                "schema_available": False
            }
            
        except Exception as e:
            return {"error": str(e)}


class RateLimiter:
    """Simple rate limiter for API requests"""
    
    def __init__(
        self, 
        per_second: Optional[int] = None,
        per_minute: Optional[int] = None,
        per_hour: Optional[int] = None
    ):
        self.per_second = per_second
        self.per_minute = per_minute
        self.per_hour = per_hour
        
        self.last_request_time = 0.0
        self.request_count_minute = 0
        self.request_count_hour = 0
        self.minute_start = datetime.utcnow()
        self.hour_start = datetime.utcnow()
    
    async def acquire(self) -> None:
        """Wait if necessary to respect rate limits"""
        
        now = datetime.utcnow()
        
        # Check per-second limit
        if self.per_second:
            time_since_last = (now.timestamp() - self.last_request_time)
            min_interval = 1.0 / self.per_second
            
            if time_since_last < min_interval:
                await asyncio.sleep(min_interval - time_since_last)
        
        # Check per-minute limit
        if self.per_minute:
            if (now - self.minute_start).total_seconds() >= 60:
                self.request_count_minute = 0
                self.minute_start = now
            
            if self.request_count_minute >= self.per_minute:
                sleep_time = 60 - (now - self.minute_start).total_seconds()
                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)
                    self.request_count_minute = 0
                    self.minute_start = datetime.utcnow()
        
        # Check per-hour limit
        if self.per_hour:
            if (now - self.hour_start).total_seconds() >= 3600:
                self.request_count_hour = 0
                self.hour_start = now
            
            if self.request_count_hour >= self.per_hour:
                sleep_time = 3600 - (now - self.hour_start).total_seconds()
                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)
                    self.request_count_hour = 0
                    self.hour_start = datetime.utcnow()
        
        # Update counters
        self.last_request_time = datetime.utcnow().timestamp()
        self.request_count_minute += 1
        self.request_count_hour += 1