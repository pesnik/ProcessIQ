"""
ProcessIQ Security API
REST endpoints for user management, permissions, audit trails, and security
"""

from fastapi import APIRouter, HTTPException, Depends, Header, Request
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from datetime import datetime

from ..core.engine import ProcessIQEngine
from ..core.security_features import Permission, AuditAction

router = APIRouter()

# Pydantic models for API requests/responses
class CreateRoleRequest(BaseModel):
    name: str
    description: str
    permissions: List[str]

class CreateUserRequest(BaseModel):
    username: str
    email: str
    full_name: str
    role_ids: List[str]

class UserResponse(BaseModel):
    user_id: str
    username: str
    email: str
    full_name: str
    roles: List[str]
    is_active: bool
    created_at: str
    last_login: Optional[str]

class RoleResponse(BaseModel):
    role_id: str
    name: str
    description: str
    permissions: List[str]
    created_at: str
    updated_at: str
    is_system_role: bool

class AuditSearchRequest(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    user_id: Optional[str] = None
    action: Optional[str] = None
    resource_type: Optional[str] = None
    success: Optional[bool] = None
    limit: int = 100

class AuditEntryResponse(BaseModel):
    audit_id: str
    timestamp: str
    user_id: Optional[str]
    username: Optional[str]
    action: str
    resource_type: str
    resource_id: Optional[str]
    details: Dict[str, Any]
    ip_address: Optional[str]
    user_agent: Optional[str]
    success: bool
    error_message: Optional[str]

# Dependency to get ProcessIQ engine
async def get_engine() -> ProcessIQEngine:
    """Get ProcessIQ engine instance"""
    from ..api.workflows import get_engine as get_workflow_engine
    return await get_workflow_engine()

# Security dependency
async def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    """Extract user ID from authorization header"""
    # In a real implementation, this would validate JWT token
    # For now, we'll use a simple approach
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    
    # Simple token format: "Bearer user_id"
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid authorization scheme")
        return token  # In real implementation, decode JWT to get user_id
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authorization header format")

async def require_permission(
    permission: Permission,
    user_id: str = Depends(get_current_user_id),
    engine: ProcessIQEngine = Depends(get_engine)
):
    """Dependency to check user permissions"""
    security_features = getattr(engine, 'security_features', None)
    if not security_features:
        raise HTTPException(status_code=500, detail="Security features not enabled")
    
    has_permission = await security_features.rbac_system.check_permission(user_id, permission)
    if not has_permission:
        raise HTTPException(status_code=403, detail=f"Missing required permission: {permission.value}")
    
    return user_id

# RBAC Endpoints

@router.post("/rbac/roles", response_model=str)
async def create_role(
    request: CreateRoleRequest,
    user_id: str = Depends(lambda: require_permission(Permission.ADMIN_ROLES)),
    engine: ProcessIQEngine = Depends(get_engine)
):
    """Create a new role"""
    try:
        role_id = await engine.security_features.rbac_system.create_role(
            name=request.name,
            description=request.description,
            permissions=request.permissions
        )
        
        # Log audit event
        await engine.security_features.audit_system.log_audit_event(
            action=AuditAction.ROLE_CREATED,
            resource_type="role",
            user_id=user_id,
            resource_id=role_id,
            details={"name": request.name, "permissions": request.permissions}
        )
        
        return role_id
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/rbac/roles", response_model=List[RoleResponse])
async def list_roles(
    user_id: str = Depends(lambda: require_permission(Permission.ADMIN_ROLES)),
    engine: ProcessIQEngine = Depends(get_engine)
):
    """List all roles"""
    try:
        roles = await engine.security_features.rbac_system.list_roles()
        
        return [
            RoleResponse(
                role_id=role.role_id,
                name=role.name,
                description=role.description,
                permissions=[p.value for p in role.permissions],
                created_at=role.created_at.isoformat(),
                updated_at=role.updated_at.isoformat(),
                is_system_role=role.is_system_role
            )
            for role in roles
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rbac/roles/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: str,
    user_id: str = Depends(lambda: require_permission(Permission.ADMIN_ROLES)),
    engine: ProcessIQEngine = Depends(get_engine)
):
    """Get role by ID"""
    try:
        role = await engine.security_features.rbac_system.get_role(role_id)
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        
        return RoleResponse(
            role_id=role.role_id,
            name=role.name,
            description=role.description,
            permissions=[p.value for p in role.permissions],
            created_at=role.created_at.isoformat(),
            updated_at=role.updated_at.isoformat(),
            is_system_role=role.is_system_role
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rbac/users", response_model=str)
async def create_user(
    request: CreateUserRequest,
    user_id: str = Depends(lambda: require_permission(Permission.ADMIN_USERS)),
    engine: ProcessIQEngine = Depends(get_engine)
):
    """Create a new user"""
    try:
        new_user_id = await engine.security_features.rbac_system.create_user(
            username=request.username,
            email=request.email,
            full_name=request.full_name,
            role_ids=request.role_ids
        )
        
        # Log audit event
        await engine.security_features.audit_system.log_audit_event(
            action=AuditAction.USER_CREATED,
            resource_type="user",
            user_id=user_id,
            resource_id=new_user_id,
            details={
                "username": request.username,
                "email": request.email,
                "roles": request.role_ids
            }
        )
        
        return new_user_id
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/rbac/users", response_model=List[UserResponse])
async def list_users(
    user_id: str = Depends(lambda: require_permission(Permission.ADMIN_USERS)),
    engine: ProcessIQEngine = Depends(get_engine)
):
    """List all users"""
    try:
        users = await engine.security_features.rbac_system.list_users()
        
        return [
            UserResponse(
                user_id=user.user_id,
                username=user.username,
                email=user.email,
                full_name=user.full_name,
                roles=list(user.roles),
                is_active=user.is_active,
                created_at=user.created_at.isoformat(),
                last_login=user.last_login.isoformat() if user.last_login else None
            )
            for user in users
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rbac/users/{target_user_id}", response_model=UserResponse)
async def get_user(
    target_user_id: str,
    user_id: str = Depends(lambda: require_permission(Permission.ADMIN_USERS)),
    engine: ProcessIQEngine = Depends(get_engine)
):
    """Get user by ID"""
    try:
        user = await engine.security_features.rbac_system.get_user(target_user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return UserResponse(
            user_id=user.user_id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            roles=list(user.roles),
            is_active=user.is_active,
            created_at=user.created_at.isoformat(),
            last_login=user.last_login.isoformat() if user.last_login else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rbac/users/{target_user_id}/permissions")
async def get_user_permissions(
    target_user_id: str,
    user_id: str = Depends(lambda: require_permission(Permission.ADMIN_USERS)),
    engine: ProcessIQEngine = Depends(get_engine)
):
    """Get all permissions for a user"""
    try:
        permissions = await engine.security_features.rbac_system.get_user_permissions(target_user_id)
        
        return {
            "user_id": target_user_id,
            "permissions": [p.value for p in permissions]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Audit Endpoints

@router.post("/audit/search", response_model=List[AuditEntryResponse])
async def search_audit_entries(
    request: AuditSearchRequest,
    user_id: str = Depends(lambda: require_permission(Permission.AUDIT_VIEW)),
    engine: ProcessIQEngine = Depends(get_engine)
):
    """Search audit entries"""
    try:
        # Convert string dates to datetime objects
        start_date = datetime.fromisoformat(request.start_date) if request.start_date else None
        end_date = datetime.fromisoformat(request.end_date) if request.end_date else None
        
        # Convert action string to enum
        action = None
        if request.action:
            try:
                action = AuditAction(request.action)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid action: {request.action}")
        
        entries = await engine.security_features.audit_system.search_audit_entries(
            start_date=start_date,
            end_date=end_date,
            user_id=request.user_id,
            action=action,
            resource_type=request.resource_type,
            success=request.success,
            limit=request.limit
        )
        
        return [
            AuditEntryResponse(
                audit_id=entry.audit_id,
                timestamp=entry.timestamp.isoformat(),
                user_id=entry.user_id,
                username=entry.username,
                action=entry.action.value,
                resource_type=entry.resource_type,
                resource_id=entry.resource_id,
                details=entry.details,
                ip_address=entry.ip_address,
                user_agent=entry.user_agent,
                success=entry.success,
                error_message=entry.error_message
            )
            for entry in entries
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/audit/recent", response_model=List[AuditEntryResponse])
async def get_recent_audit_entries(
    limit: int = 100,
    user_id: str = Depends(lambda: require_permission(Permission.AUDIT_VIEW)),
    engine: ProcessIQEngine = Depends(get_engine)
):
    """Get recent audit entries"""
    try:
        entries = await engine.security_features.audit_system.get_recent_audit_entries(limit)
        
        return [
            AuditEntryResponse(
                audit_id=entry.audit_id,
                timestamp=entry.timestamp.isoformat(),
                user_id=entry.user_id,
                username=entry.username,
                action=entry.action.value,
                resource_type=entry.resource_type,
                resource_id=entry.resource_id,
                details=entry.details,
                ip_address=entry.ip_address,
                user_agent=entry.user_agent,
                success=entry.success,
                error_message=entry.error_message
            )
            for entry in entries
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/audit/export")
async def export_audit_log(
    start_date: str,
    end_date: str,
    output_format: str = "json",
    user_id: str = Depends(lambda: require_permission(Permission.AUDIT_EXPORT)),
    engine: ProcessIQEngine = Depends(get_engine)
):
    """Export audit log for date range"""
    try:
        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)
        
        export_path = await engine.security_features.audit_system.export_audit_log(
            start_date=start_dt,
            end_date=end_dt,
            output_format=output_format
        )
        
        # Log audit event
        await engine.security_features.audit_system.log_audit_event(
            action=AuditAction.SYSTEM_CONFIG_CHANGED,
            resource_type="audit",
            user_id=user_id,
            details={
                "action": "audit_log_exported",
                "start_date": start_date,
                "end_date": end_date,
                "export_path": export_path
            }
        )
        
        return {
            "export_path": export_path,
            "format": output_format,
            "message": "Audit log exported successfully"
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# System Information

@router.get("/system/permissions")
async def list_available_permissions(
    user_id: str = Depends(lambda: require_permission(Permission.ADMIN_SYSTEM)),
    engine: ProcessIQEngine = Depends(get_engine)
):
    """List all available system permissions"""
    return {
        "permissions": [
            {
                "value": permission.value,
                "name": permission.name,
                "description": f"Permission to {permission.value}"
            }
            for permission in Permission
        ]
    }

@router.get("/system/audit_actions")
async def list_audit_actions(
    user_id: str = Depends(lambda: require_permission(Permission.AUDIT_VIEW)),
    engine: ProcessIQEngine = Depends(get_engine)
):
    """List all audit action types"""
    return {
        "actions": [
            {
                "value": action.value,
                "name": action.name,
                "description": f"Audit action: {action.value}"
            }
            for action in AuditAction
        ]
    }

@router.post("/system/demo-users")
async def create_demo_users(
    user_id: str = Depends(lambda: require_permission(Permission.ADMIN_SYSTEM)),
    engine: ProcessIQEngine = Depends(get_engine)
):
    """Create demo users for testing"""
    try:
        await engine.security_features.create_demo_users()
        
        return {
            "message": "Demo users created successfully",
            "users": [
                {"username": "developer", "role": "developer"},
                {"username": "operator", "role": "operator"},
                {"username": "viewer", "role": "viewer"}
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))