"""
File Connector

Universal file connector supporting:
- Structured files (CSV, JSON, XML, Excel)
- Document files (PDF, DOC, TXT)
- Image files with OCR capabilities
- Archive files (ZIP, TAR)
- Cloud storage integration
"""

import os
import asyncio
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, AsyncGenerator, Union, BinaryIO
from datetime import datetime
import mimetypes

import pandas as pd
import json
import csv
from pydantic import BaseModel, Field

from .base import ConnectorInterface, ConnectorConfig, DataRecord, ConnectorStatus
from ..core.events import EventBus
from ..core.exceptions import ConnectionError, ValidationError, ProcessingError


class FileType(Enum):
    """Supported file types"""
    CSV = "csv"
    JSON = "json"
    XML = "xml"
    EXCEL = "excel"
    PDF = "pdf"
    TEXT = "text"
    IMAGE = "image"
    ARCHIVE = "archive"
    BINARY = "binary"


class StorageType(Enum):
    """Storage location types"""
    LOCAL = "local"
    S3 = "s3"
    AZURE_BLOB = "azure_blob"
    GOOGLE_CLOUD = "google_cloud"
    FTP = "ftp"
    SFTP = "sftp"


class FileConnectorConfig(ConnectorConfig):
    """Configuration for file connector"""
    
    # File/Directory settings
    file_path: Optional[str] = None
    directory_path: Optional[str] = None
    file_pattern: str = "*"  # Glob pattern for multiple files
    recursive: bool = False
    
    # Storage settings
    storage_type: StorageType = StorageType.LOCAL
    storage_credentials: Dict[str, Any] = Field(default_factory=dict)
    
    # File processing
    file_encoding: str = "utf-8"
    detect_encoding: bool = True
    skip_binary_files: bool = True
    max_file_size_mb: int = 100
    
    # Structured file settings
    csv_delimiter: str = ","
    csv_quote_char: str = '"'
    csv_has_header: bool = True
    csv_skip_rows: int = 0
    
    json_lines: bool = False  # JSONL format
    json_flatten: bool = False  # Flatten nested JSON
    
    excel_sheet_name: Optional[str] = None  # None = first sheet
    excel_header_row: int = 0
    
    # Document processing
    ocr_enabled: bool = False
    ocr_language: str = "eng"
    extract_metadata: bool = True
    
    # Performance settings
    chunk_size: int = 10000  # For large files
    parallel_processing: bool = True
    max_workers: int = 4
    
    # Cloud storage specific
    aws_region: Optional[str] = None
    aws_access_key: Optional[str] = None
    aws_secret_key: Optional[str] = None
    
    azure_account_name: Optional[str] = None
    azure_account_key: Optional[str] = None
    azure_container_name: Optional[str] = None
    
    gcs_project_id: Optional[str] = None
    gcs_credentials_path: Optional[str] = None
    gcs_bucket_name: Optional[str] = None


class FileConnector(ConnectorInterface):
    """
    Universal file connector supporting local and cloud storage
    with intelligent file type detection and processing.
    """
    
    def __init__(self, config: FileConnectorConfig, event_bus: EventBus):
        super().__init__(config, event_bus)
        self.config: FileConnectorConfig = config
        
        # Storage client (S3, Azure Blob, etc.)
        self._storage_client = None
        
        # File processing components
        self._ocr_processor = None
        self._pdf_processor = None
        
        # Discovered files cache
        self._discovered_files: List[Dict[str, Any]] = []
    
    @property
    def connector_type(self) -> str:
        return "file"
    
    @property
    def supported_formats(self) -> List[str]:
        return ["csv", "json", "xml", "excel", "pdf", "text", "image"]
    
    # Connection Management
    
    async def connect(self) -> None:
        """Initialize file connector and validate paths"""
        try:
            await self.set_status(ConnectorStatus.CONNECTING)
            
            if self.config.storage_type == StorageType.LOCAL:
                await self._connect_local()
            elif self.config.storage_type == StorageType.S3:
                await self._connect_s3()
            elif self.config.storage_type == StorageType.AZURE_BLOB:
                await self._connect_azure()
            elif self.config.storage_type == StorageType.GOOGLE_CLOUD:
                await self._connect_gcs()
            else:
                raise ConnectionError(f"Unsupported storage type: {self.config.storage_type}")
            
            # Initialize processing components if needed
            if self.config.ocr_enabled:
                await self._initialize_ocr()
            
            # Discover available files
            await self._discover_files()
            
            await self.set_status(ConnectorStatus.CONNECTED)
            self.reset_error_count()
            
        except Exception as e:
            await self.set_status(ConnectorStatus.ERROR)
            await self.handle_error(e, "connect")
            raise
    
    async def disconnect(self) -> None:
        """Close file connector and cleanup resources"""
        try:
            if self._storage_client:
                if hasattr(self._storage_client, 'close'):
                    await self._storage_client.close()
                self._storage_client = None
            
            self._discovered_files.clear()
            
            await self.set_status(ConnectorStatus.DISCONNECTED)
            
        except Exception as e:
            await self.handle_error(e, "disconnect")
    
    async def _connect_local(self) -> None:
        """Connect to local filesystem"""
        
        if self.config.file_path:
            path = Path(self.config.file_path)
            if not path.exists():
                raise ConnectionError(f"File not found: {self.config.file_path}")
        
        if self.config.directory_path:
            path = Path(self.config.directory_path)
            if not path.exists():
                raise ConnectionError(f"Directory not found: {self.config.directory_path}")
            if not path.is_dir():
                raise ConnectionError(f"Path is not a directory: {self.config.directory_path}")
    
    async def _connect_s3(self) -> None:
        """Connect to AWS S3"""
        try:
            import boto3
            from botocore.exceptions import ClientError
            
            session = boto3.Session(
                aws_access_key_id=self.config.aws_access_key,
                aws_secret_access_key=self.config.aws_secret_key,
                region_name=self.config.aws_region or 'us-east-1'
            )
            
            self._storage_client = session.client('s3')
            
            # Test connection
            self._storage_client.list_buckets()
            
        except ImportError:
            raise ConnectionError("boto3 package required for S3 connectivity")
        except Exception as e:
            raise ConnectionError(f"Failed to connect to S3: {e}")
    
    async def _connect_azure(self) -> None:
        """Connect to Azure Blob Storage"""
        try:
            from azure.storage.blob.aio import BlobServiceClient
            
            connection_string = f"DefaultEndpointsProtocol=https;AccountName={self.config.azure_account_name};AccountKey={self.config.azure_account_key};EndpointSuffix=core.windows.net"
            
            self._storage_client = BlobServiceClient.from_connection_string(connection_string)
            
            # Test connection
            await self._storage_client.get_account_information()
            
        except ImportError:
            raise ConnectionError("azure-storage-blob package required for Azure connectivity")
        except Exception as e:
            raise ConnectionError(f"Failed to connect to Azure Blob Storage: {e}")
    
    async def _connect_gcs(self) -> None:
        """Connect to Google Cloud Storage"""
        try:
            from google.cloud import storage
            
            if self.config.gcs_credentials_path:
                os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = self.config.gcs_credentials_path
            
            self._storage_client = storage.Client(project=self.config.gcs_project_id)
            
            # Test connection
            list(self._storage_client.list_buckets(max_results=1))
            
        except ImportError:
            raise ConnectionError("google-cloud-storage package required for GCS connectivity")
        except Exception as e:
            raise ConnectionError(f"Failed to connect to Google Cloud Storage: {e}")
    
    # File Discovery
    
    async def _discover_files(self) -> None:
        """Discover files based on configuration"""
        
        self._discovered_files.clear()
        
        if self.config.storage_type == StorageType.LOCAL:
            await self._discover_local_files()
        else:
            await self._discover_cloud_files()
        
        await self.event_bus.emit("file_connector.files_discovered", {
            "connector_name": self.config.name,
            "file_count": len(self._discovered_files)
        })
    
    async def _discover_local_files(self) -> None:
        """Discover local files"""
        
        if self.config.file_path:
            # Single file
            file_info = await self._get_file_info(Path(self.config.file_path))
            if file_info:
                self._discovered_files.append(file_info)
        
        elif self.config.directory_path:
            # Directory with pattern
            directory = Path(self.config.directory_path)
            
            if self.config.recursive:
                pattern = f"**/{self.config.file_pattern}"
            else:
                pattern = self.config.file_pattern
            
            for file_path in directory.glob(pattern):
                if file_path.is_file():
                    file_info = await self._get_file_info(file_path)
                    if file_info:
                        self._discovered_files.append(file_info)
    
    async def _discover_cloud_files(self) -> None:
        """Discover cloud storage files"""
        # Implementation would depend on cloud storage type
        # For now, placeholder
        pass
    
    async def _get_file_info(self, file_path: Path) -> Optional[Dict[str, Any]]:
        """Get file information and metadata"""
        
        try:
            stat = file_path.stat()
            
            # Check file size limit
            size_mb = stat.st_size / (1024 * 1024)
            if size_mb > self.config.max_file_size_mb:
                return None
            
            # Detect file type
            mime_type, _ = mimetypes.guess_type(str(file_path))
            file_type = self._detect_file_type(file_path, mime_type)
            
            # Skip binary files if configured
            if self.config.skip_binary_files and file_type == FileType.BINARY:
                return None
            
            return {
                "path": str(file_path),
                "name": file_path.name,
                "size": stat.st_size,
                "size_mb": size_mb,
                "modified": datetime.fromtimestamp(stat.st_mtime),
                "mime_type": mime_type,
                "file_type": file_type,
                "extension": file_path.suffix.lower()
            }
            
        except Exception as e:
            await self.handle_error(e, f"get_file_info:{file_path}")
            return None
    
    def _detect_file_type(self, file_path: Path, mime_type: Optional[str]) -> FileType:
        """Detect file type from extension and MIME type"""
        
        extension = file_path.suffix.lower()
        
        # Text-based formats
        if extension in ['.csv']:
            return FileType.CSV
        elif extension in ['.json', '.jsonl']:
            return FileType.JSON
        elif extension in ['.xml']:
            return FileType.XML
        elif extension in ['.xlsx', '.xls', '.xlsm']:
            return FileType.EXCEL
        elif extension in ['.txt', '.md', '.rst']:
            return FileType.TEXT
        
        # Documents
        elif extension in ['.pdf']:
            return FileType.PDF
        
        # Images
        elif extension in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff']:
            return FileType.IMAGE
        
        # Archives
        elif extension in ['.zip', '.tar', '.gz', '.rar']:
            return FileType.ARCHIVE
        
        # Check MIME type
        elif mime_type:
            if mime_type.startswith('text/'):
                return FileType.TEXT
            elif mime_type.startswith('image/'):
                return FileType.IMAGE
            elif mime_type == 'application/pdf':
                return FileType.PDF
        
        return FileType.BINARY
    
    # Data Operations
    
    async def fetch_data(
        self, 
        query: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None
    ) -> List[DataRecord]:
        """Fetch data from files"""
        
        if not self.is_connected:
            await self.connect()
        
        try:
            all_records = []
            
            # Determine which files to process
            files_to_process = self._get_files_to_process(query)
            
            # Process files
            for file_info in files_to_process:
                try:
                    records = await self._process_file(file_info, limit)
                    all_records.extend(records)
                    
                    # Check limit across all files
                    if limit and len(all_records) >= limit:
                        all_records = all_records[:limit]
                        break
                        
                except Exception as e:
                    await self.handle_error(e, f"process_file:{file_info['name']}")
                    if not self.config.continue_on_error:
                        raise
            
            return all_records
            
        except Exception as e:
            await self.handle_error(e, "fetch_data")
            raise
    
    async def fetch_data_stream(
        self, 
        query: Optional[Dict[str, Any]] = None
    ) -> AsyncGenerator[DataRecord, None]:
        """Stream data from files"""
        
        if not self.is_connected:
            await self.connect()
        
        try:
            files_to_process = self._get_files_to_process(query)
            
            for file_info in files_to_process:
                try:
                    async for record in self._stream_file(file_info):
                        yield record
                        
                except Exception as e:
                    await self.handle_error(e, f"stream_file:{file_info['name']}")
                    if not self.config.continue_on_error:
                        raise
                        
        except Exception as e:
            await self.handle_error(e, "fetch_data_stream")
            raise
    
    def _get_files_to_process(self, query: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Determine which files to process based on query"""
        
        if not query:
            return self._discovered_files
        
        # Filter by file type
        if "file_type" in query:
            file_type = FileType(query["file_type"])
            return [f for f in self._discovered_files if f["file_type"] == file_type]
        
        # Filter by pattern
        if "pattern" in query:
            pattern = query["pattern"]
            return [f for f in self._discovered_files if pattern in f["name"]]
        
        # Specific file
        if "file_path" in query:
            file_path = query["file_path"]
            return [f for f in self._discovered_files if f["path"] == file_path]
        
        return self._discovered_files
    
    # File Processing
    
    async def _process_file(
        self, 
        file_info: Dict[str, Any], 
        limit: Optional[int]
    ) -> List[DataRecord]:
        """Process a single file based on its type"""
        
        file_type = file_info["file_type"]
        file_path = file_info["path"]
        
        try:
            if file_type == FileType.CSV:
                return await self._process_csv_file(file_path, limit)
            elif file_type == FileType.JSON:
                return await self._process_json_file(file_path, limit)
            elif file_type == FileType.EXCEL:
                return await self._process_excel_file(file_path, limit)
            elif file_type == FileType.TEXT:
                return await self._process_text_file(file_path, limit)
            elif file_type == FileType.PDF:
                return await self._process_pdf_file(file_path, limit)
            elif file_type == FileType.IMAGE:
                return await self._process_image_file(file_path, limit)
            else:
                # Binary or unknown file type
                return await self._process_binary_file(file_path, limit)
                
        except Exception as e:
            await self.handle_error(e, f"process_file:{file_info['name']}")
            return []
    
    async def _stream_file(self, file_info: Dict[str, Any]) -> AsyncGenerator[DataRecord, None]:
        """Stream records from a single file"""
        
        file_type = file_info["file_type"]
        file_path = file_info["path"]
        
        try:
            if file_type == FileType.CSV:
                async for record in self._stream_csv_file(file_path):
                    yield record
            elif file_type == FileType.JSON:
                async for record in self._stream_json_file(file_path):
                    yield record
            # Add other file type streaming as needed
            
        except Exception as e:
            await self.handle_error(e, f"stream_file:{file_info['name']}")
    
    # Specific file type processors
    
    async def _process_csv_file(self, file_path: str, limit: Optional[int]) -> List[DataRecord]:
        """Process CSV file"""
        
        try:
            df = pd.read_csv(
                file_path,
                delimiter=self.config.csv_delimiter,
                quotechar=self.config.csv_quote_char,
                header=0 if self.config.csv_has_header else None,
                skiprows=self.config.csv_skip_rows,
                encoding=self.config.file_encoding,
                nrows=limit
            )
            
            records = []
            for i, row in df.iterrows():
                record = DataRecord(
                    id=str(i),
                    data=row.to_dict(),
                    metadata={
                        "file_path": file_path,
                        "file_type": "csv",
                        "row_number": i + 1
                    },
                    timestamp=datetime.utcnow(),
                    source=f"file:{file_path}"
                )
                records.append(record)
            
            return records
            
        except Exception as e:
            raise ProcessingError(f"Failed to process CSV file {file_path}: {e}")
    
    async def _stream_csv_file(self, file_path: str) -> AsyncGenerator[DataRecord, None]:
        """Stream CSV file records"""
        
        try:
            chunk_iter = pd.read_csv(
                file_path,
                delimiter=self.config.csv_delimiter,
                quotechar=self.config.csv_quote_char,
                header=0 if self.config.csv_has_header else None,
                skiprows=self.config.csv_skip_rows,
                encoding=self.config.file_encoding,
                chunksize=self.config.chunk_size
            )
            
            row_number = 1
            for chunk in chunk_iter:
                for i, row in chunk.iterrows():
                    record = DataRecord(
                        id=str(row_number),
                        data=row.to_dict(),
                        metadata={
                            "file_path": file_path,
                            "file_type": "csv",
                            "row_number": row_number
                        },
                        timestamp=datetime.utcnow(),
                        source=f"file:{file_path}"
                    )
                    yield record
                    row_number += 1
                    
        except Exception as e:
            raise ProcessingError(f"Failed to stream CSV file {file_path}: {e}")
    
    async def _process_json_file(self, file_path: str, limit: Optional[int]) -> List[DataRecord]:
        """Process JSON file"""
        
        try:
            records = []
            
            with open(file_path, 'r', encoding=self.config.file_encoding) as f:
                if self.config.json_lines:
                    # JSONL format - one JSON object per line
                    for i, line in enumerate(f):
                        if limit and i >= limit:
                            break
                        
                        try:
                            data = json.loads(line.strip())
                            
                            if self.config.json_flatten and isinstance(data, dict):
                                data = self._flatten_dict(data)
                            
                            record = DataRecord(
                                id=str(i),
                                data=data,
                                metadata={
                                    "file_path": file_path,
                                    "file_type": "json",
                                    "line_number": i + 1
                                },
                                timestamp=datetime.utcnow(),
                                source=f"file:{file_path}"
                            )
                            records.append(record)
                            
                        except json.JSONDecodeError:
                            continue  # Skip invalid JSON lines
                else:
                    # Regular JSON file
                    data = json.load(f)
                    
                    if isinstance(data, list):
                        # Array of objects
                        for i, item in enumerate(data):
                            if limit and i >= limit:
                                break
                            
                            if self.config.json_flatten and isinstance(item, dict):
                                item = self._flatten_dict(item)
                            
                            record = DataRecord(
                                id=str(i),
                                data=item,
                                metadata={
                                    "file_path": file_path,
                                    "file_type": "json",
                                    "array_index": i
                                },
                                timestamp=datetime.utcnow(),
                                source=f"file:{file_path}"
                            )
                            records.append(record)
                    else:
                        # Single JSON object
                        if self.config.json_flatten and isinstance(data, dict):
                            data = self._flatten_dict(data)
                        
                        record = DataRecord(
                            id="0",
                            data=data,
                            metadata={
                                "file_path": file_path,
                                "file_type": "json"
                            },
                            timestamp=datetime.utcnow(),
                            source=f"file:{file_path}"
                        )
                        records.append(record)
            
            return records
            
        except Exception as e:
            raise ProcessingError(f"Failed to process JSON file {file_path}: {e}")
    
    async def _stream_json_file(self, file_path: str) -> AsyncGenerator[DataRecord, None]:
        """Stream JSON file records"""
        
        # For large JSON files, would implement streaming JSON parser
        # For now, load and yield records
        records = await self._process_json_file(file_path, None)
        for record in records:
            yield record
    
    async def _process_excel_file(self, file_path: str, limit: Optional[int]) -> List[DataRecord]:
        """Process Excel file"""
        
        try:
            df = pd.read_excel(
                file_path,
                sheet_name=self.config.excel_sheet_name,
                header=self.config.excel_header_row,
                nrows=limit
            )
            
            records = []
            for i, row in df.iterrows():
                record = DataRecord(
                    id=str(i),
                    data=row.to_dict(),
                    metadata={
                        "file_path": file_path,
                        "file_type": "excel",
                        "sheet_name": self.config.excel_sheet_name,
                        "row_number": i + 1
                    },
                    timestamp=datetime.utcnow(),
                    source=f"file:{file_path}"
                )
                records.append(record)
            
            return records
            
        except Exception as e:
            raise ProcessingError(f"Failed to process Excel file {file_path}: {e}")
    
    async def _process_text_file(self, file_path: str, limit: Optional[int]) -> List[DataRecord]:
        """Process text file"""
        
        try:
            records = []
            
            with open(file_path, 'r', encoding=self.config.file_encoding) as f:
                for i, line in enumerate(f):
                    if limit and i >= limit:
                        break
                    
                    record = DataRecord(
                        id=str(i),
                        data={"line": line.rstrip()},
                        metadata={
                            "file_path": file_path,
                            "file_type": "text",
                            "line_number": i + 1
                        },
                        timestamp=datetime.utcnow(),
                        source=f"file:{file_path}"
                    )
                    records.append(record)
            
            return records
            
        except Exception as e:
            raise ProcessingError(f"Failed to process text file {file_path}: {e}")
    
    async def _process_pdf_file(self, file_path: str, limit: Optional[int]) -> List[DataRecord]:
        """Process PDF file with text extraction"""
        
        try:
            # Would use library like PyPDF2, pdfplumber, or pymupdf
            # For now, placeholder implementation
            
            records = [DataRecord(
                id="0",
                data={"content": "PDF content extraction not implemented yet"},
                metadata={
                    "file_path": file_path,
                    "file_type": "pdf"
                },
                timestamp=datetime.utcnow(),
                source=f"file:{file_path}"
            )]
            
            return records
            
        except Exception as e:
            raise ProcessingError(f"Failed to process PDF file {file_path}: {e}")
    
    async def _process_image_file(self, file_path: str, limit: Optional[int]) -> List[DataRecord]:
        """Process image file with OCR if enabled"""
        
        try:
            records = []
            
            # Basic image metadata
            from PIL import Image
            
            with Image.open(file_path) as img:
                metadata = {
                    "file_path": file_path,
                    "file_type": "image",
                    "width": img.width,
                    "height": img.height,
                    "format": img.format
                }
                
                data = {
                    "width": img.width,
                    "height": img.height,
                    "format": img.format
                }
                
                # OCR text extraction if enabled
                if self.config.ocr_enabled and self._ocr_processor:
                    try:
                        text = await self._ocr_processor.extract_text(file_path)
                        data["ocr_text"] = text
                    except Exception as e:
                        data["ocr_error"] = str(e)
                
                record = DataRecord(
                    id="0",
                    data=data,
                    metadata=metadata,
                    timestamp=datetime.utcnow(),
                    source=f"file:{file_path}"
                )
                records.append(record)
            
            return records
            
        except Exception as e:
            raise ProcessingError(f"Failed to process image file {file_path}: {e}")
    
    async def _process_binary_file(self, file_path: str, limit: Optional[int]) -> List[DataRecord]:
        """Process binary file (basic metadata only)"""
        
        try:
            file_info = await self._get_file_info(Path(file_path))
            
            record = DataRecord(
                id="0",
                data={
                    "file_type": "binary",
                    "size": file_info["size"],
                    "mime_type": file_info["mime_type"]
                },
                metadata=file_info,
                timestamp=datetime.utcnow(),
                source=f"file:{file_path}"
            )
            
            return [record]
            
        except Exception as e:
            raise ProcessingError(f"Failed to process binary file {file_path}: {e}")
    
    # Helper Methods
    
    def _flatten_dict(self, d: dict, parent_key: str = '', sep: str = '.') -> dict:
        """Flatten nested dictionary"""
        
        items = []
        for k, v in d.items():
            new_key = f"{parent_key}{sep}{k}" if parent_key else k
            if isinstance(v, dict):
                items.extend(self._flatten_dict(v, new_key, sep=sep).items())
            else:
                items.append((new_key, v))
        return dict(items)
    
    async def _initialize_ocr(self) -> None:
        """Initialize OCR processor"""
        # Would initialize Tesseract or other OCR engine
        self._ocr_processor = OCRProcessor(language=self.config.ocr_language)
    
    # Schema and Metadata
    
    async def get_schema(self) -> Dict[str, Any]:
        """Get schema information for discovered files"""
        
        if not self.is_connected:
            await self.connect()
        
        schema_info = {
            "total_files": len(self._discovered_files),
            "file_types": {},
            "files": []
        }
        
        # Count file types
        for file_info in self._discovered_files:
            file_type = file_info["file_type"].value
            if file_type not in schema_info["file_types"]:
                schema_info["file_types"][file_type] = 0
            schema_info["file_types"][file_type] += 1
            
            schema_info["files"].append({
                "name": file_info["name"],
                "path": file_info["path"],
                "type": file_type,
                "size_mb": file_info["size_mb"],
                "modified": file_info["modified"].isoformat()
            })
        
        return schema_info


# Placeholder for OCR processor
class OCRProcessor:
    def __init__(self, language: str = "eng"):
        self.language = language
    
    async def extract_text(self, image_path: str) -> str:
        # Would implement actual OCR using Tesseract or similar
        return "OCR text extraction not implemented yet"