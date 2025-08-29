"""
ProcessIQ Security & Access Control
User management, permissions, audit trails, and security features
"""

import json
import time
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Set
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path

from .events import EventBus
from .exceptions import ProcessIQError


# Role-Based Access Control (RBAC)

class Permission(Enum):
    """System permissions"""
    WORKFLOW_CREATE = "workflow.create"
    WORKFLOW_READ = "workflow.read"
    WORKFLOW_UPDATE = "workflow.update"
    WORKFLOW_DELETE = "workflow.delete"
    WORKFLOW_EXECUTE = "workflow.execute"
    WORKFLOW_DEBUG = "workflow.debug"
    ADMIN_USERS = "admin.users"
    ADMIN_ROLES = "admin.roles"
    ADMIN_SYSTEM = "admin.system"
    AUDIT_VIEW = "audit.view"
    AUDIT_EXPORT = "audit.export"


@dataclass
class Role:
    """User role definition"""
    role_id: str
    name: str
    description: str
    permissions: Set[Permission]
    created_at: datetime
    updated_at: datetime
    is_system_role: bool = False
    
    def dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "role_id": self.role_id,
            "name": self.name,
            "description": self.description,
            "permissions": [p.value for p in self.permissions],
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "is_system_role": self.is_system_role
        }


@dataclass
class User:
    """User definition"""
    user_id: str
    username: str
    email: str
    full_name: str
    roles: Set[str]  # role_ids
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    
    def dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "user_id": self.user_id,
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "roles": list(self.roles),
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat(),
            "last_login": self.last_login.isoformat() if self.last_login else None
        }


class RBACSystem:
    """Role-Based Access Control System"""
    
    def __init__(self, data_dir: str = "data/rbac"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        self.roles: Dict[str, Role] = {}
        self.users: Dict[str, User] = {}
        
        self._initialize_system_roles()
    
    def _initialize_system_roles(self):
        """Initialize default system roles"""
        
        # Super Admin role
        admin_role = Role(
            role_id="admin",
            name="Administrator",
            description="Full system access",
            permissions=set(Permission),  # All permissions
            created_at=datetime.now(),
            updated_at=datetime.now(),
            is_system_role=True
        )
        self.roles[admin_role.role_id] = admin_role
        
        # Workflow Developer role
        developer_role = Role(
            role_id="developer",
            name="Workflow Developer",
            description="Can create, edit and execute workflows",
            permissions={
                Permission.WORKFLOW_CREATE,
                Permission.WORKFLOW_READ,
                Permission.WORKFLOW_UPDATE,
                Permission.WORKFLOW_EXECUTE,
                Permission.WORKFLOW_DEBUG
            },
            created_at=datetime.now(),
            updated_at=datetime.now(),
            is_system_role=True
        )
        self.roles[developer_role.role_id] = developer_role
        
        # Workflow Operator role
        operator_role = Role(
            role_id="operator",
            name="Workflow Operator",
            description="Can view and execute workflows",
            permissions={
                Permission.WORKFLOW_READ,
                Permission.WORKFLOW_EXECUTE
            },
            created_at=datetime.now(),
            updated_at=datetime.now(),
            is_system_role=True
        )
        self.roles[operator_role.role_id] = operator_role
        
        # Viewer role
        viewer_role = Role(
            role_id="viewer",
            name="Viewer",
            description="Read-only access",
            permissions={
                Permission.WORKFLOW_READ,
                Permission.AUDIT_VIEW
            },
            created_at=datetime.now(),
            updated_at=datetime.now(),
            is_system_role=True
        )
        self.roles[viewer_role.role_id] = viewer_role
    
    async def create_role(self, name: str, description: str, permissions: List[str]) -> str:
        """Create a new role"""
        role_id = str(uuid.uuid4())
        
        # Convert permission strings to Permission enum
        role_permissions = set()
        for perm_str in permissions:
            try:
                role_permissions.add(Permission(perm_str))
            except ValueError:
                raise ProcessIQError(f"Invalid permission: {perm_str}")
        
        role = Role(
            role_id=role_id,
            name=name,
            description=description,
            permissions=role_permissions,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            is_system_role=False
        )
        
        self.roles[role_id] = role
        return role_id
    
    async def create_user(self, username: str, email: str, full_name: str, role_ids: List[str]) -> str:
        """Create a new user"""
        user_id = str(uuid.uuid4())
        
        # Validate roles exist
        for role_id in role_ids:
            if role_id not in self.roles:
                raise ProcessIQError(f"Role {role_id} not found")
        
        user = User(
            user_id=user_id,
            username=username,
            email=email,
            full_name=full_name,
            roles=set(role_ids),
            is_active=True,
            created_at=datetime.now()
        )
        
        self.users[user_id] = user
        return user_id
    
    async def check_permission(self, user_id: str, permission: Permission) -> bool:
        """Check if user has specific permission"""
        user = self.users.get(user_id)
        if not user or not user.is_active:
            return False
        
        # Check all user roles for the permission
        for role_id in user.roles:
            role = self.roles.get(role_id)
            if role and permission in role.permissions:
                return True
        
        return False
    
    async def get_user_permissions(self, user_id: str) -> Set[Permission]:
        """Get all permissions for a user"""
        user = self.users.get(user_id)
        if not user or not user.is_active:
            return set()
        
        permissions = set()
        for role_id in user.roles:
            role = self.roles.get(role_id)
            if role:
                permissions.update(role.permissions)
        
        return permissions
    
    async def get_user(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        return self.users.get(user_id)
    
    async def get_role(self, role_id: str) -> Optional[Role]:
        """Get role by ID"""
        return self.roles.get(role_id)
    
    async def list_users(self) -> List[User]:
        """List all users"""
        return list(self.users.values())
    
    async def list_roles(self) -> List[Role]:
        """List all roles"""
        return list(self.roles.values())


# Audit System

class AuditAction(Enum):
    """Audit action types"""
    WORKFLOW_CREATED = "workflow.created"
    WORKFLOW_UPDATED = "workflow.updated"
    WORKFLOW_DELETED = "workflow.deleted"
    WORKFLOW_EXECUTED = "workflow.executed"
    USER_LOGIN = "user.login"
    USER_LOGOUT = "user.logout"
    USER_CREATED = "user.created"
    USER_UPDATED = "user.updated"
    ROLE_CREATED = "role.created"
    ROLE_UPDATED = "role.updated"
    SYSTEM_CONFIG_CHANGED = "system.config_changed"
    DEBUG_SESSION_STARTED = "debug.session_started"
    DEBUG_SESSION_STOPPED = "debug.session_stopped"


@dataclass
class AuditEntry:
    """Audit log entry"""
    audit_id: str
    timestamp: datetime
    user_id: Optional[str]
    username: Optional[str]
    action: AuditAction
    resource_type: str
    resource_id: Optional[str]
    details: Dict[str, Any]
    ip_address: Optional[str]
    user_agent: Optional[str]
    success: bool
    error_message: Optional[str] = None
    
    def dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "audit_id": self.audit_id,
            "timestamp": self.timestamp.isoformat(),
            "user_id": self.user_id,
            "username": self.username,
            "action": self.action.value,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "details": self.details,
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "success": self.success,
            "error_message": self.error_message
        }


class AuditSystem:
    """Audit logging system"""
    
    def __init__(self, event_bus: EventBus, data_dir: str = "data/audit"):
        self.event_bus = event_bus
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # In-memory audit log (for recent entries)
        self.recent_entries: List[AuditEntry] = []
        self.max_recent_entries = 1000
    
    async def log_audit_event(
        self,
        action: AuditAction,
        resource_type: str,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        resource_id: Optional[str] = None,
        details: Dict[str, Any] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        success: bool = True,
        error_message: Optional[str] = None
    ):
        """Log an audit event"""
        
        audit_entry = AuditEntry(
            audit_id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            user_id=user_id,
            username=username,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            error_message=error_message
        )
        
        # Add to recent entries
        self.recent_entries.append(audit_entry)
        if len(self.recent_entries) > self.max_recent_entries:
            self.recent_entries.pop(0)
        
        # Write to daily log file
        await self._write_to_log_file(audit_entry)
        
        # Emit event for real-time monitoring
        await self.event_bus.emit("audit.event_logged", {
            "audit_entry": audit_entry.dict()
        })
    
    async def _write_to_log_file(self, audit_entry: AuditEntry):
        """Write audit entry to daily log file"""
        
        # Create daily log file
        log_date = audit_entry.timestamp.strftime("%Y-%m-%d")
        log_file = self.data_dir / f"audit_{log_date}.jsonl"
        
        # Append to log file
        with open(log_file, 'a') as f:
            f.write(json.dumps(audit_entry.dict(), default=str) + '\n')
    
    async def get_recent_audit_entries(self, limit: int = 100) -> List[AuditEntry]:
        """Get recent audit entries"""
        return self.recent_entries[-limit:]
    
    async def search_audit_entries(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        user_id: Optional[str] = None,
        action: Optional[AuditAction] = None,
        resource_type: Optional[str] = None,
        success: Optional[bool] = None,
        limit: int = 1000
    ) -> List[AuditEntry]:
        """Search audit entries with filters"""
        
        results = []
        
        # Search in recent entries first
        for entry in self.recent_entries:
            if self._matches_filters(entry, start_date, end_date, user_id, action, resource_type, success):
                results.append(entry)
                if len(results) >= limit:
                    break
        
        return results
    
    def _matches_filters(
        self,
        entry: AuditEntry,
        start_date: Optional[datetime],
        end_date: Optional[datetime],
        user_id: Optional[str],
        action: Optional[AuditAction],
        resource_type: Optional[str],
        success: Optional[bool]
    ) -> bool:
        """Check if audit entry matches search filters"""
        
        if start_date and entry.timestamp < start_date:
            return False
        
        if end_date and entry.timestamp > end_date:
            return False
        
        if user_id and entry.user_id != user_id:
            return False
        
        if action and entry.action != action:
            return False
        
        if resource_type and entry.resource_type != resource_type:
            return False
        
        if success is not None and entry.success != success:
            return False
        
        return True
    
    async def export_audit_log(
        self,
        start_date: datetime,
        end_date: datetime,
        output_format: str = "json"
    ) -> str:
        """Export audit log for a date range"""
        
        entries = await self.search_audit_entries(
            start_date=start_date,
            end_date=end_date,
            limit=10000  # Large limit for export
        )
        
        timestamp = int(time.time())
        export_file = self.data_dir / f"audit_export_{timestamp}.{output_format}"
        
        if output_format == "json":
            export_data = {
                "export_info": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "exported_at": datetime.now().isoformat(),
                    "total_entries": len(entries)
                },
                "entries": [entry.dict() for entry in entries]
            }
            
            with open(export_file, 'w') as f:
                json.dump(export_data, f, indent=2, default=str)
        
        return str(export_file)


class SecurityMiddleware:
    """Security middleware for request processing"""
    
    def __init__(self, rbac_system: RBACSystem, audit_system: AuditSystem):
        self.rbac_system = rbac_system
        self.audit_system = audit_system
    
    async def authenticate_request(self, user_id: str, required_permission: Permission) -> bool:
        """Authenticate and authorize request"""
        
        # Check if user has required permission
        has_permission = await self.rbac_system.check_permission(user_id, required_permission)
        
        if not has_permission:
            # Log unauthorized access attempt
            await self.audit_system.log_audit_event(
                action=AuditAction.USER_LOGIN,  # Could be more specific
                resource_type="api",
                user_id=user_id,
                success=False,
                error_message=f"Access denied: missing permission {required_permission.value}"
            )
            
            return False
        
        return True
    
    async def log_api_access(
        self,
        user_id: str,
        username: str,
        action: AuditAction,
        resource_type: str,
        resource_id: Optional[str] = None,
        success: bool = True,
        details: Dict[str, Any] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """Log API access for audit trail"""
        
        await self.audit_system.log_audit_event(
            action=action,
            resource_type=resource_type,
            user_id=user_id,
            username=username,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success
        )


class SecurityFeatures:
    """Security and access control features"""
    
    def __init__(self, event_bus: EventBus):
        self.event_bus = event_bus
        self.rbac_system = RBACSystem()
        self.audit_system = AuditSystem(event_bus)
        self.security_middleware = SecurityMiddleware(self.rbac_system, self.audit_system)
    
    async def initialize(self):
        """Initialize security features"""
        
        # Create default admin user
        admin_user_id = await self.rbac_system.create_user(
            username="admin",
            email="admin@processiq.local",
            full_name="System Administrator",
            role_ids=["admin"]
        )
        
        # Log system initialization
        await self.audit_system.log_audit_event(
            action=AuditAction.SYSTEM_CONFIG_CHANGED,
            resource_type="system",
            details={
                "action": "security_features_initialized",
                "admin_user_created": admin_user_id
            }
        )
    
    async def create_demo_users(self):
        """Create demo users for testing"""
        
        # Developer user
        dev_user_id = await self.rbac_system.create_user(
            username="developer",
            email="dev@processiq.local",
            full_name="John Developer",
            role_ids=["developer"]
        )
        
        # Operator user
        op_user_id = await self.rbac_system.create_user(
            username="operator",
            email="operator@processiq.local",
            full_name="Jane Operator",
            role_ids=["operator"]
        )
        
        # Viewer user
        viewer_user_id = await self.rbac_system.create_user(
            username="viewer",
            email="viewer@processiq.local",
            full_name="Bob Viewer",
            role_ids=["viewer"]
        )
        
        await self.audit_system.log_audit_event(
            action=AuditAction.USER_CREATED,
            resource_type="user",
            details={
                "demo_users_created": [dev_user_id, op_user_id, viewer_user_id]
            }
        )


def create_security_features(event_bus: EventBus) -> SecurityFeatures:
    """Factory function to create security features"""
    return SecurityFeatures(event_bus)