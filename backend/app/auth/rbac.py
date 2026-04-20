from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.auth.jwt import verify_token


security = HTTPBearer(auto_error=False)


# Role definitions
class UserRole:
    ADMIN = "ADMIN"
    JUDGE = "JUDGE"
    CLERK = "CLERK"


# Role hierarchy - higher roles include permissions of lower roles
ROLE_HIERARCHY = {
    UserRole.ADMIN: [UserRole.ADMIN, UserRole.JUDGE, UserRole.CLERK],
    UserRole.JUDGE: [UserRole.JUDGE, UserRole.CLERK],
    UserRole.CLERK: [UserRole.CLERK],
}


def extract_role(payload: dict) -> str:
    """Extract the primary role from Keycloak's realm_access."""
    roles = payload.get("realm_access", {}).get("roles", [])
    # Order of precedence for multi-role users
    for r in ["admin", "judge", "clerk"]:
        if r in roles:
            return r.upper()
    return "CLERK"


async def get_current_user_payload(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Get current user payload from JWT token."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    # verify_token is now async because it may fetch JWKS
    payload = await verify_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Get current user with role validation."""
    payload = await get_current_user_payload(credentials)

    # Keycloak roles are in realm_access.roles
    payload["role"] = extract_role(payload)

    return payload


def require_role(*allowed_roles: str):
    """Dependency factory for role-based access control."""
    normalized_allowed = {r.upper() for r in allowed_roles}

    async def role_checker(
        user: dict = Depends(get_current_user)
    ) -> dict:
        user_role = user.get("role", "")
        # Expansion based on hierarchy
        effective_roles = ROLE_HIERARCHY.get(user_role, [user_role])

        if not any(r.upper() in normalized_allowed for r in effective_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {', '.join(allowed_roles)}"
            )

        return user

    return role_checker


def require_permission(*required_permissions: str):
    """Dependency factory for permission-based access control."""
    async def permission_checker(
        user: dict = Depends(get_current_user)
    ) -> dict:
        # Keycloak might have permissions in claims, but for now we stick to roles
        # If specific permissions are needed, they can be added to the token or mapped from roles
        user_role = user.get("role", "")
        
        # Simple mapping: ADMIN has all permissions
        if user_role == UserRole.ADMIN:
            return user
            
        user_permissions = user.get("permissions", [])
        has_permission = any(perm in user_permissions for perm in required_permissions)

        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required permissions: {', '.join(required_permissions)}"
            )

        return user

    return permission_checker


def check_role_permission(user_role: str, required_role: str) -> bool:
    """Check if user role has permission for required role."""
    allowed_roles = ROLE_HIERARCHY.get(user_role, [])
    return required_role in allowed_roles
