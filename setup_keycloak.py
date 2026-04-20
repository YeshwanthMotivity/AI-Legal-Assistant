import json
import urllib.request
import urllib.error

# Base configuration
ADMIN_USER = "admin"
ADMIN_PASS = "admin"
KEYCLOAK_URL = "http://localhost:8080"
REALM_NAME = "judicial"
FRONTEND_CLIENT_ID = "judicial-frontend"
BACKEND_CLIENT_ID = "judicial-backend"

def request(url, data=None, headers=None, method="GET"):
    # print(f"DEBUG: {method} {url}")
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
        if e.code == 409: # Already exists
            return "ALREADY_EXISTS"
        body = e.read().decode("utf-8")
        # print(f"DEBUG: Request failed: {e.code} - {body}")
        raise e

def setup():
    print("1. Authenticating as admin...")
    try:
        auth_data = f"client_id=admin-cli&username={ADMIN_USER}&password={ADMIN_PASS}&grant_type=password".encode("utf-8")
        token_resp = request(
            f"{KEYCLOAK_URL}/realms/master/protocol/openid-connect/token",
            data=auth_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST"
        )
        token = token_resp["access_token"]
    except Exception as e:
        print(f"ERROR: Failed to connect to Keycloak. Is it running at {KEYCLOAK_URL}?")
        return

    headers = {"Authorization": f"Bearer {token}"}

    print(f"2. Creating realm '{REALM_NAME}'...")
    res = request(f"{KEYCLOAK_URL}/admin/realms", {"realm": REALM_NAME, "enabled": True}, headers, "POST")
    if res == "ALREADY_EXISTS":
        print("   Realm already exists.")
    else:
        print("   Realm created.")

    print("3. Creating roles...")
    for role in ["admin", "judge", "clerk"]:
        res = request(f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/roles", {"name": role}, headers, "POST")
        if res == "ALREADY_EXISTS":
            print(f"   Role '{role}' already exists.")
        else:
            print(f"   Role '{role}' created.")

    print(f"4. Creating frontend client '{FRONTEND_CLIENT_ID}'...")
    res = request(f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/clients", {
        "clientId": FRONTEND_CLIENT_ID,
        "enabled": True,
        "publicClient": True,
        "protocol": "openid-connect",
        "webOrigins": ["*"],
        "redirectUris": ["*"],
        "attributes": {"pkce.code.challenge.method": "S256"}
    }, headers, "POST")
    if res == "ALREADY_EXISTS":
        print("   Frontend client already exists.")
    else:
        print("   Frontend client created.")

    print(f"5. Creating backend client '{BACKEND_CLIENT_ID}'...")
    res = request(f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/clients", {
        "clientId": BACKEND_CLIENT_ID,
        "enabled": True,
        "publicClient": False,
        "serviceAccountsEnabled": True,
        "protocol": "openid-connect"
    }, headers, "POST")
    if res == "ALREADY_EXISTS":
        print("   Backend client already exists.")
    else:
        print("   Backend client created.")

    print("6. Fetching client secret...")
    clients_list = request(f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/clients", headers=headers)
    target_client = next((c for c in clients_list if c["clientId"] == BACKEND_CLIENT_ID), None)
    
    if not target_client:
        print("ERROR: Failed to find the created backend client.")
        return

    client_id_internal = target_client["id"]
    # Updated endpoint for Keycloak 24
    secret_resp = request(f"{KEYCLOAK_URL}/admin/realms/{REALM_NAME}/clients/{client_id_internal}/client-secret", headers=headers)
    secret = secret_resp["value"]

    print(f"\n🎉 SUCCESS! Keycloak is configured.")
    print(f"--------------------------------------------------")
    print(f"PASTE THIS SECRET INTO YOUR .env FILE:")
    print(f"KEYCLOAK_CLIENT_SECRET={secret}")
    print(f"--------------------------------------------------")

if __name__ == "__main__":
    setup()
