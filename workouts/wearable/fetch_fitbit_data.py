import os
import json
import time
import urllib.parse
from datetime import datetime, timezone
import requests

# Default File Paths
TOKENS_FILE = os.path.join(os.path.dirname(__file__), "tokens.json")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "fitbit_daily_data.json")

# OAuth & API Configs
DEFAULT_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
DEFAULT_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
DEFAULT_REDIRECT_URI = os.getenv("FITBIT_REDIRECT_URI", "https://www.google.com")

SCOPES = [
    "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
    "https://www.googleapis.com/auth/googlehealth.sleep.readonly",
    "https://www.googleapis.com/auth/googlehealth.nutrition.readonly"
]
SCOPE = " ".join(SCOPES)

AUTH_URI = "https://accounts.google.com/o/oauth2/auth"
TOKEN_URI = "https://oauth2.googleapis.com/token"
BASE_API_URI = "https://health.googleapis.com/v4/users/me/dataTypes"


class OAuthManager:
    """Manages OAuth 2.0 flow, token storage, and automatic access token refresh."""

    def __init__(self, client_secret_path=None, tokens_filepath=TOKENS_FILE, redirect_uri=DEFAULT_REDIRECT_URI):
        self.client_secret_path = client_secret_path
        self.tokens_filepath = tokens_filepath
        self.redirect_uri = redirect_uri
        self.client_id, self.client_secret = self._load_client_secret()

    def _load_client_secret(self):
        """Loads client ID and client secret dynamically from environment or JSON file."""
        cid = os.getenv("GOOGLE_CLIENT_ID", "")
        csec = os.getenv("GOOGLE_CLIENT_SECRET", "")
        if cid and csec:
            return cid, csec

        # Search for any client_secret*.json file in project root
        current_dir = os.path.dirname(__file__)
        candidates = [f for f in os.listdir(current_dir) if f.startswith("client_secret") and f.endswith(".json")]
        if candidates:
            target_path = os.path.join(current_dir, candidates[0])
            try:
                with open(target_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    installed = data.get("installed") or data.get("web") or {}
                    
                    redirect_uris = installed.get("redirect_uris", [])
                    if redirect_uris and isinstance(redirect_uris, list):
                        self.redirect_uri = redirect_uris[0]
                    cid = installed.get("client_id", "")
                    csec = installed.get("client_secret", "")
                    if cid and csec:
                        return cid, csec
            except Exception as e:
                print(f"[!] Warning: Failed to parse secret file ({e}). Using default credentials.")
        return DEFAULT_CLIENT_ID, DEFAULT_CLIENT_SECRET

    def get_authorization_url(self, redirect_uri=None):
        """Generates the OAuth 2.0 authorization URL for user consent."""
        r_uri = redirect_uri or self.redirect_uri
        params = {
            "client_id": self.client_id,
            "redirect_uri": r_uri,
            "response_type": "code",
            "scope": SCOPE,
            "access_type": "offline",
            "prompt": "consent"
        }
        return f"{AUTH_URI}?{urllib.parse.urlencode(params)}"

    def exchange_code_for_tokens(self, auth_code, redirect_uri=None):
        """Exchanges an authorization code for access and refresh tokens."""
        r_uri = redirect_uri or self.redirect_uri
        # Sanitize auth code if full URL was pasted
        if "code=" in auth_code:
            parsed = urllib.parse.urlparse(auth_code)
            query_params = urllib.parse.parse_qs(parsed.query)
            auth_code = query_params.get("code", [auth_code])[0]

        auth_code = auth_code.strip()

        payload = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": auth_code,
            "grant_type": "authorization_code",
            "redirect_uri": r_uri
        }

        print("[*] Requesting tokens from Google OAuth server...")
        response = requests.post(TOKEN_URI, data=payload)
        
        if response.status_code != 200:
            raise Exception(f"Token exchange failed ({response.status_code}): {response.text}")
        
        tokens = response.json()
        tokens["acquired_at"] = time.time()
        self.save_tokens(tokens)
        print("[+] Tokens successfully obtained and saved.")
        return tokens

    def refresh_access_token(self, refresh_token):
        """Requests a new access token using an existing refresh token."""
        payload = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token"
        }

        print("[*] Automatically refreshing access token...")
        response = requests.post(TOKEN_URI, data=payload)

        if response.status_code != 200:
            raise Exception(f"Token refresh failed ({response.status_code}): {response.text}")

        new_token_data = response.json()
        
        # Load existing tokens to keep refresh_token if new response doesn't include a new one
        existing_tokens = self.load_tokens() or {}
        existing_tokens["access_token"] = new_token_data["access_token"]
        existing_tokens["expires_in"] = new_token_data.get("expires_in", 3600)
        if "refresh_token" in new_token_data:
            existing_tokens["refresh_token"] = new_token_data["refresh_token"]
        existing_tokens["acquired_at"] = time.time()

        self.save_tokens(existing_tokens)
        print("[+] Access token successfully refreshed.")
        return existing_tokens["access_token"]

    def load_tokens(self):
        """Loads saved tokens from local file if available."""
        if os.path.exists(self.tokens_filepath):
            try:
                with open(self.tokens_filepath, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"[!] Warning: Error loading tokens file: {e}")
        return None

    def save_tokens(self, tokens):
        """Saves token dictionary to local JSON file."""
        with open(self.tokens_filepath, "w", encoding="utf-8") as f:
            json.dump(tokens, f, indent=2)

    def get_valid_access_token(self, interactive=True):
        """
        Retrieves a valid access token.
        If tokens don't exist, triggers the initial interactive authorization flow (if interactive=True)
        or raises an exception (if interactive=False).
        If access token is near expiration or expired, uses refresh token to get a new one.
        """
        tokens = self.load_tokens()

        if not tokens or "refresh_token" not in tokens:
            if not interactive:
                raise Exception("OAuth authorization required. Please complete initial setup by submitting your authorization code in the UI or CLI.")
                
            print("\n=======================================================")
            print(" INITIAL OAUTH AUTHORIZATION REQUIRED")
            print("=======================================================")
            auth_url = self.get_authorization_url()
            print("\n1. Open the following URL in your web browser:\n")
            print(f"   {auth_url}\n")
            print("2. Log in and grant permissions.")
            print(f"3. You will be redirected to: {self.redirect_uri}?code=...")
            print("4. Copy the full redirected URL or the 'code' parameter value.")
            print("=======================================================\n")
            
            auth_code = input("Enter the Authorization Code or full redirect URL: ")
            tokens = self.exchange_code_for_tokens(auth_code)
            return tokens["access_token"]

        # Check token freshness (buffer of 60 seconds)
        acquired_at = tokens.get("acquired_at", 0)
        expires_in = tokens.get("expires_in", 3600)
        buffer_seconds = 60

        if time.time() >= (acquired_at + expires_in - buffer_seconds):
            print("[!] Access token is expired or near expiration. Initiating refresh...")
            return self.refresh_access_token(tokens["refresh_token"])

        print("[+] Active access token retrieved from local storage.")
        return tokens["access_token"]


class GoogleHealthAPIClient:
    """Handles requests to the Google Health REST API v4 across multiple categories."""

    def __init__(self, oauth_manager):
        self.oauth_manager = oauth_manager

    def fetch_data_type(self, data_type, interactive=True):
        """Fetches all data points for a category across all pages (e.g. all daily steps, distance, food)."""
        access_token = self.oauth_manager.get_valid_access_token(interactive=interactive)
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json"
        }
        base_url = f"{BASE_API_URI}/{data_type}/dataPoints"
        
        all_data_points = []
        page_token = None
        page_count = 0

        while True:
            url = f"{base_url}?pageToken={page_token}" if page_token else base_url
            response = requests.get(url, headers=headers)

            # Handle token expiration (401 Unauthorized) by attempting one refresh retry
            if response.status_code == 401:
                tokens = self.oauth_manager.load_tokens()
                if tokens and "refresh_token" in tokens:
                    fresh_token = self.oauth_manager.refresh_access_token(tokens["refresh_token"])
                    headers["Authorization"] = f"Bearer {fresh_token}"
                    response = requests.get(url, headers=headers)

            if response.status_code != 200:
                print(f"[!] Warning fetching category '{data_type}' ({response.status_code}): {response.text[:200]}")
                if not all_data_points:
                    return {"error": response.text, "status_code": response.status_code}
                break

            data = response.json()
            pts = data.get("dataPoints", [])
            all_data_points.extend(pts)
            page_token = data.get("nextPageToken")
            page_count += 1

            if not page_token or page_count > 50:
                break

        print(f"[+] Category '{data_type}': {len(all_data_points)} points fetched across {page_count} pages.")
        return {"dataPoints": all_data_points}

    def fetch_all_data(self, interactive=True):
        """Fetches exercise, sleep, food/nutrition, steps, and distance data points."""
        categories = ["exercise", "sleep", "food", "nutrition-log", "steps", "distance"]
        results = {}
        for cat in categories:
            print(f"[*] Fetching Google Health data category: {cat}...")
            results[cat] = self.fetch_data_type(cat, interactive=interactive)
        
        # Legacy backward-compatibility structure
        results["dataPoints"] = (results.get("exercise") or {}).get("dataPoints", [])
        return results

    def fetch_exercise_data(self, interactive=True):
        """Fetches exercise data points (backward compatibility)."""
        return self.fetch_all_data(interactive=interactive)


def save_data(data, filepath=OUTPUT_FILE):
    """Saves fetched JSON data to a local file with ISO timestamp."""
    # Prevent double-nesting if already wrapped in metadata
    actual_data = data
    while isinstance(actual_data, dict) and "data" in actual_data and isinstance(actual_data["data"], dict) and any(k in actual_data["data"] for k in ["exercise", "sleep", "steps", "dataPoints", "data"]):
        actual_data = actual_data["data"]

    payload = {
        "fetched_at": datetime.now(timezone.utc).isoformat(),
        "data": actual_data
    }
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    print(f"[+] Fitbit daily data successfully saved to: {filepath}")


def main():
    print("=======================================================")
    print("      FITBIT GOOGLE HEALTH API V4 DATA FETCHER         ")
    print("=======================================================\n")
    try:
        oauth_manager = OAuthManager()
        api_client = GoogleHealthAPIClient(oauth_manager)
        
        # Fetch all data categories
        data = api_client.fetch_all_data()
        
        # Save output
        save_data(data)
        print("\n[+] Task completed successfully.")

    except Exception as e:
        print(f"\n[!] Error during execution: {e}")


if __name__ == "__main__":
    main()
