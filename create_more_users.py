import json
import urllib.request
import urllib.error

# Configuration
ADMIN_USER = "admin"
ADMIN_PASS = "admin"
KEYCLOAK_URL = "http://localhost:8080"
REALM_NAME = "judicial"

def request(url, data=None, headers=None, method="GET"):
    if headers is None:
        headers = {}
    if data is not None and not isinstance(data, (str, bytes)):
        data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            if response.status in [201, 204]:
                return {"status": response.status, "headers": dict(response.info())}
            content = response.read().decode("utf-8")
            return json.loads(content) if content else None
    except urllib.error.HTTPError as e:
        if e.code == 409: return "ALREADY_EXISTS"
        raise e

def create_user(username, email, role, password="password123"):
    print(f"--- Creating user '{username}' ---")
    auth_data = f"client_id=admin-cli&username={ADMIN_USER}&password={ADMIN_PASS}&grant_type=password".encode("utf-8")
    token_resp = request(f"{KEYCLOAK_URL}/realms/master/protocol/openid-connect/token", data=auth_data, headers={"Content-Type": "application/x-www-form-urlencoded"}, method="POST")
    token = token_resp["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    user_payload = {
        "username": username,
        "email": email,
        "enabled": True,
        "credentials": [{"type": "password", "value": password, "temporary": False}]
    }
    res = request(f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/users", user_payload, headers, "POST")
    
    if res == "ALREADY_EXISTS":
        print("   User already exists.")
    else:
        print("   User created successfully.")

    # Get user internal ID
    users = request(f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/users?username={username}", None, headers)
    user_id = users[0]["id"]
    
    # Get role internal ID
    roles = request(f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/roles/{role}", None, headers)
    role_id = roles["id"]
    
    # Assign
    request(f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/users/{user_id}/role-mappings/realm", [{"id": role_id, "name": role}], headers, "POST")
    print(f"✅ User '{username}' created and assigned role '{role}'")

if __name__ == "__main__":
    create_user("judge_test", "judge@example.com", "judge")
    create_user("clerk_test", "clerk@example.com", "clerk")
