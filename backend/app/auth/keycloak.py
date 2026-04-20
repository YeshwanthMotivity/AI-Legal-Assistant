import httpx
from app.config import settings
from typing import Optional

async def get_admin_token() -> str:
    """Get an admin access token for Keycloak REST API."""
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{settings.keycloak_url}/realms/master/protocol/openid-connect/token",
            data={
                "client_id": "admin-cli",
                "username": settings.keycloak_admin_user,
                "password": settings.keycloak_admin_password,
                "grant_type": "password",
            }
        )
        r.raise_for_status()
        return r.json()["access_token"]

async def create_keycloak_user(email: str, username: str, password: str, role: str, first_name: str = "", last_name: str = "", full_name: str = "") -> str:
    """Create a user in Keycloak and assign a realm role."""
    if full_name and not first_name:
        parts = full_name.split(" ", 1)
        first_name = parts[0]
        if len(parts) > 1:
            last_name = parts[1]
            
    token = await get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    base_url = f"{settings.keycloak_url}/admin/realms/{settings.keycloak_realm}"
    
    # 1. Create user
    user_payload = {
        "username": username,
        "email": email,
        "enabled": True,
        "firstName": first_name,
        "lastName": last_name,
        "credentials": [{"type": "password", "value": password, "temporary": False}]
    }
    
    async with httpx.AsyncClient() as client:
        r = await client.post(f"{base_url}/users", json=user_payload, headers=headers)
        
        keycloak_id = None
        if r.status_code == 409:
            # User already exists, fetch their ID
            r = await client.get(f"{base_url}/users", params={"username": username}, headers=headers)
            users_list = r.json()
            if users_list:
                keycloak_id = users_list[0]["id"]
            else:
                # Fallback: if username lookup fails, try email
                r = await client.get(f"{base_url}/users", params={"email": email}, headers=headers)
                users_list = r.json()
                if users_list:
                    keycloak_id = users_list[0]["id"]
        
        if not keycloak_id:
            r.raise_for_status()
            # Get Keycloak ID from Location header or search
            location = r.headers.get("Location")
            if location:
                keycloak_id = location.split("/")[-1]
            else:
                r = await client.get(f"{base_url}/users", params={"username": username}, headers=headers)
                keycloak_id = r.json()[0]["id"]

        # 2. Get the role definition
        # Keycloak roles are usually lowercase in configuration but we use uppercase internally
        role_name = role.lower()
        r = await client.get(f"{base_url}/roles/{role_name}", headers=headers)
        if r.status_code != 200:
            # If specific role doesn't exist, skip or handle error
            return keycloak_id
            
        role_data = r.json()
        
        # 3. Assign role to user
        await client.post(
            f"{base_url}/users/{keycloak_id}/role-mappings/realm",
            json=[{"id": role_data["id"], "name": role_data["name"]}],
            headers=headers
        )
        
        return keycloak_id

async def update_keycloak_user_status(keycloak_id: str, enabled: bool):
    """Enable or disable a user in Keycloak."""
    token = await get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    base_url = f"{settings.keycloak_url}/admin/realms/{settings.keycloak_realm}"
    
    async with httpx.AsyncClient() as client:
        r = await client.put(
            f"{base_url}/users/{keycloak_id}",
            json={"enabled": enabled},
            headers=headers
        )
        r.raise_for_status()

async def delete_keycloak_user(keycloak_id: str):
    """Delete a user from Keycloak."""
    token = await get_admin_token()
    headers = {"Authorization": f"Bearer {token}"}
    base_url = f"{settings.keycloak_url}/admin/realms/{settings.keycloak_realm}"
    
    async with httpx.AsyncClient() as client:
        r = await client.delete(f"{base_url}/users/{keycloak_id}", headers=headers)
        r.raise_for_status()
