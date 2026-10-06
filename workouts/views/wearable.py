import os
import json
import logging
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from workouts.models import WearableSession
from workouts.wearable.graph_builder import FitbitKnowledgeGraph
from workouts.wearable.agent import FitbitAgent
from workouts.wearable.fetch_fitbit_data import (
    OAuthManager,
    GoogleHealthAPIClient,
    save_data,
    TOKENS_FILE,
    OUTPUT_FILE
)

logger = logging.getLogger(__name__)

# Global cached agent for default dataset
_default_agent = None


def get_wearable_agent(user=None):
    """
    Returns a FitbitAgent instance.
    If the authenticated user has a WearableSession with raw_data_json, loads their data.
    Otherwise falls back to the default fitbit_daily_data.json.
    """
    global _default_agent
    if user and user.is_authenticated:
        session = WearableSession.objects.filter(user=user).first()
        if session and session.raw_data_json:
            try:
                user_data = json.loads(session.raw_data_json)
                return FitbitAgent(data_source=user_data)
            except Exception as e:
                logger.warning(f"Error parsing user wearable JSON: {e}")

    if _default_agent is None:
        _default_agent = FitbitAgent(data_source=OUTPUT_FILE)
    return _default_agent


@require_http_methods(["GET"])
def wearable_status_api(request):
    """
    Returns OAuth connectivity, client ID, token availability, and dataset status.
    """
    try:
        oauth_mgr = OAuthManager()
        has_secret = bool(oauth_mgr.client_id)
        tokens = oauth_mgr.load_tokens()
        has_refresh_token = bool(tokens and "refresh_token" in tokens)
        has_data = os.path.exists(OUTPUT_FILE)

        # Check DB session if user is logged in
        if request.user.is_authenticated:
            sess = WearableSession.objects.filter(user=request.user).first()
            if sess and sess.raw_data_json:
                has_data = True
            if sess and sess.tokens_json:
                try:
                    user_toks = json.loads(sess.tokens_json)
                    if "refresh_token" in user_toks:
                        has_refresh_token = True
                except Exception:
                    pass

        return JsonResponse({
            "has_client_secret": has_secret,
            "has_refresh_token": has_refresh_token,
            "has_data": has_data,
            "client_id": oauth_mgr.client_id,
            "redirect_uri": oauth_mgr.redirect_uri
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status_code=500)


@require_http_methods(["GET"])
def wearable_auth_url_api(request):
    """
    Generates the OAuth 2.0 authorization URL for Google Health API.
    """
    try:
        redirect_uri = request.GET.get("redirect_uri")
        oauth_mgr = OAuthManager()
        url = oauth_mgr.get_authorization_url(redirect_uri=redirect_uri)
        return JsonResponse({
            "auth_url": url,
            "redirect_uri": redirect_uri or oauth_mgr.redirect_uri
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status_code=500)


@csrf_exempt
@require_http_methods(["POST"])
def wearable_exchange_code_api(request):
    """
    Exchanges an authorization code for access and refresh tokens.
    """
    try:
        body = json.loads(request.body.decode('utf-8')) if request.body else {}
        auth_code = body.get("code", "").strip()
        redirect_uri = body.get("redirect_uri")

        if not auth_code:
            return JsonResponse({"error": "Authorization code is required."}, status_code=400)

        oauth_mgr = OAuthManager()
        tokens = oauth_mgr.exchange_code_for_tokens(auth_code, redirect_uri=redirect_uri)

        # Persist to database if authenticated
        if request.user.is_authenticated:
            sess, _ = WearableSession.objects.get_or_create(user=request.user)
            sess.tokens_json = json.dumps(tokens)
            sess.save()

        return JsonResponse({
            "success": True,
            "message": "OAuth tokens saved and verified successfully!"
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status_code=500)


@require_http_methods(["GET"])
def wearable_tokens_status_api(request):
    """
    Returns masked token metadata for safety in UI display.
    """
    try:
        oauth_mgr = OAuthManager()
        tokens = oauth_mgr.load_tokens()

        if request.user.is_authenticated:
            sess = WearableSession.objects.filter(user=request.user).first()
            if sess and sess.tokens_json:
                try:
                    tokens = json.loads(sess.tokens_json)
                except Exception:
                    pass

        if tokens:
            return JsonResponse({
                "has_access_token": "access_token" in tokens,
                "has_refresh_token": "refresh_token" in tokens,
                "expires_in": tokens.get("expires_in"),
                "acquired_at": tokens.get("acquired_at"),
                "token_type": tokens.get("token_type")
            })
        return JsonResponse({"has_access_token": False, "has_refresh_token": False})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status_code=500)


@require_http_methods(["GET"])
def wearable_data_api(request):
    """
    Returns the latest synced wearable JSON data.
    """
    try:
        # Check database for authenticated user first
        if request.user.is_authenticated:
            sess = WearableSession.objects.filter(user=request.user).first()
            if sess and sess.raw_data_json:
                try:
                    data = json.loads(sess.raw_data_json)
                    return JsonResponse(data)
                except Exception:
                    pass

        # Fallback to local synced file
        if os.path.exists(OUTPUT_FILE):
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            return JsonResponse(data)

        return JsonResponse({"fetched_at": None, "data": None})
    except Exception as e:
        return JsonResponse({"error": f"Error reading wearable data: {e}"}, status_code=500)


@csrf_exempt
@require_http_methods(["POST"])
def wearable_fetch_data_api(request):
    """
    Triggers live synchronization with Google Health REST API v4.
    """
    try:
        oauth_mgr = OAuthManager()
        api_client = GoogleHealthAPIClient(oauth_mgr)
        data = api_client.fetch_exercise_data(interactive=False)
        save_data(data)

        # Update user session in database
        if request.user.is_authenticated:
            sess, _ = WearableSession.objects.get_or_create(user=request.user)
            sess.raw_data_json = json.dumps(data)

            # Pre-compute aggregates for instant Layer 5 context
            try:
                kg = FitbitKnowledgeGraph(data_source=data)
                days = kg.get_days()
                if days:
                    latest = kg.get_day_summary(days[-1])
                    if latest:
                        sess.total_steps = latest.get("total_steps", 0)
                        sess.total_calories_burned = latest.get("total_calories_burned", 0)
                        sess.total_active_mins = latest.get("total_active_mins", 0)
                        sess.total_sleep_hours = latest.get("total_sleep_hours", 0.0)
                        sess.recovery_score = latest.get("recovery_score", 0) or 0
                        sess.avg_workout_performance = latest.get("avg_workout_performance", 0) or 0
                        sess.average_hr = latest.get("average_hr")
            except Exception as e:
                logger.warning(f"Error pre-computing wearable session aggregates: {e}")

            sess.save()

        # Reload cached agent
        global _default_agent
        _default_agent = None

        return JsonResponse({"success": True, "data": data})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status_code=500)


@csrf_exempt
@require_http_methods(["POST"])
def wearable_ask_api(request):
    """
    Queries the Knowledge Graph Reasoning Agent.
    Executes multi-hop tool-calling or deterministic NetworkX graph reasoning,
    returning a synthesized answer with full evidence trail.
    """
    try:
        body = json.loads(request.body.decode('utf-8')) if request.body else {}
        question = body.get("question", "").strip()
        if not question:
            return JsonResponse({"error": "Question parameter is required."}, status_code=400)

        agent = get_wearable_agent(request.user)
        result = agent.ask_question(question)
        return JsonResponse(result)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status_code=500)


@require_http_methods(["GET"])
def wearable_graph_stats_api(request):
    """
    Returns NetworkX knowledge graph topology metrics, node distribution,
    and cross-day derived influence relationships.
    """
    try:
        agent = get_wearable_agent(request.user)
        stats = agent.kg.get_graph_stats()
        cross_day = agent.kg.get_cross_day_edges()
        return JsonResponse({
            "status": "success",
            "stats": stats,
            "cross_day_edges": cross_day
        })
    except Exception as e:
        return JsonResponse({"error": str(e)}, status_code=500)
