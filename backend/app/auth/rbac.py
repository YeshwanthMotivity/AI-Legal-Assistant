from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.auth.jwt import verify_token


security = HTTPBearer(auto_error=False)


# Role definitions
class UserRole:
    ADMIN = "admin"
    JUDGE = "judge"
    CLERK = "clerk"


# Role hierarchy - higher roles include permissions of lower roles
ROLE_HIERARCHY = {
    UserRole.ADMIN: [UserRole.ADMIN, UserRole.JUDGE, UserRole.CLERK],
    UserRole.JUDGE: [UserRole.JUDGE, UserRole.CLERK],
    UserRole.CLERK: [UserRole.CLERK],
}


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
    payload = verify_token(token)

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

    # Ensure user has a role
    if "role" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing role",
        )

    return payload


def require_role(*allowed_roles: str):
    """Dependency factory for role-based access control.

    Respects ROLE_HIERARCHY: ADMIN inherits JUDGE and CLERK permissions,
    JUDGE inherits CLERK permissions. An admin can access any judge or
    clerk route without being explicitly listed.
    """
    async def role_checker(
        user: dict = Depends(get_current_user)
    ) -> dict:
        user_role = user.get("role")
        # Expand the user's role to all roles they are permitted to act under
        effective_roles = ROLE_HIERARCHY.get(user_role, [user_role])

        if not any(r in allowed_roles for r in effective_roles):
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
        user_permissions = user.get("permissions", [])

        # Check if user has any of the required permissions
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
