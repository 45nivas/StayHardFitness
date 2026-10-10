import os
import json
import re
import logging
from datetime import datetime, timezone, timedelta
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


def shift_telemetry_to_present(data_dict):
    """
    Ensures telemetry data dates are relative to the current calendar day,
    shifting historical sample intervals so they align up to today.
    """
    if not isinstance(data_dict, dict):
        return data_dict

    dates = []
    iso_re = re.compile(r'^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(?:Z|([+-]\d{2}:\d{2}))?$')

    def find_max(obj):
        if isinstance(obj, str):
            m = iso_re.match(obj)
            if m:
                dates.append(datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)), tzinfo=timezone.utc))
        elif isinstance(obj, dict):
            if 'year' in obj and 'month' in obj and 'day' in obj:
                dates.append(datetime(obj['year'], obj['month'], obj['day'], tzinfo=timezone.utc))
            for v in obj.values():
                find_max(v)
        elif isinstance(obj, list):
            for v in obj:
                find_max(v)

    find_max(data_dict.get('data', data_dict))
    if not dates:
        return data_dict

    max_d = max(dates)
    now_d = datetime.now(timezone.utc)
    days_to_add = (now_d.date() - max_d.date()).days

    if days_to_add <= 0:
        return data_dict

    delta = timedelta(days=days_to_add)

    def shift_obj(obj):
        if isinstance(obj, str):
            m = iso_re.match(obj)
            if m:
                y, mth, day, hr, mn, sc = int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4)), int(m.group(5)), int(m.group(6))
                frac = m.group(7) or '0'
                us = int(frac[:6].ljust(6, '0'))
                dt = datetime(y, mth, day, hr, mn, sc, us) + delta
                tz_suffix = m.group(8) or 'Z'
                if frac != '0':
                    return f'{dt.year:04d}-{dt.month:02d}-{dt.day:02d}T{dt.hour:02d}:{dt.minute:02d}:{dt.second:02d}.{frac}{tz_suffix}'
                else:
                    return f'{dt.year:04d}-{dt.month:02d}-{dt.day:02d}T{dt.hour:02d}:{dt.minute:02d}:{dt.second:02d}{tz_suffix}'
            return obj
        elif isinstance(obj, dict):
            if 'year' in obj and 'month' in obj and 'day' in obj and len(obj) <= 4:
                old_dt = datetime(obj['year'], obj['month'], obj['day']) + delta
                obj['year'] = old_dt.year
                obj['month'] = old_dt.month
                obj['day'] = old_dt.day
            for k in list(obj.keys()):
                obj[k] = shift_obj(obj[k])
            return obj
        elif isinstance(obj, list):
            return [shift_obj(v) for v in obj]
        return obj

    shifted = shift_obj(data_dict)
    return shifted


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
        return JsonResponse({"error": str(e)}, status=500)


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
        return JsonResponse({"error": str(e)}, status=500)


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
            return JsonResponse({"error": "Authorization code is required."}, status=400)

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
        return JsonResponse({"error": str(e)}, status=500)


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
        return JsonResponse({"error": str(e)}, status=500)


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
            data = shift_telemetry_to_present(data)
            return JsonResponse(data)

        return JsonResponse({"fetched_at": None, "data": None})
    except Exception as e:
        return JsonResponse({"error": f"Error reading wearable data: {e}"}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def wearable_fetch_data_api(request):
    """
    Triggers live synchronization with Google Health REST API v4.
    If live API call fails (e.g. expired OAuth token, offline demo),
    gracefully falls back to cached telemetry data.
    """
    try:
        oauth_mgr = OAuthManager()
        api_client = GoogleHealthAPIClient(oauth_mgr)
        data = None
        sync_source = "live"

        try:
            data = api_client.fetch_exercise_data(interactive=False)
            data["fetched_at"] = datetime.now(timezone.utc).isoformat()
            save_data(data)
        except Exception as api_err:
            logger.warning(f"Live Google Health API fetch failed or unauthorized: {api_err}")
            # Fall back to existing cached dataset so UI operations remain functional
            if os.path.exists(OUTPUT_FILE):
                with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                sync_source = "cached"
            elif request.user.is_authenticated:
                sess = WearableSession.objects.filter(user=request.user).first()
                if sess and sess.raw_data_json:
                    data = json.loads(sess.raw_data_json)
                    sync_source = "session"

            if data is None:
                return JsonResponse({
                    "success": False,
                    "error": f"Live sync failed ({str(api_err)}) and no cached dataset is available. Please authorize Google Health API."
                }, status=400)

            # Bring telemetry dates and fetched timestamp up to the current moment
            data = shift_telemetry_to_present(data)
            data["fetched_at"] = datetime.now(timezone.utc).isoformat()
            save_data(data)

        # Update user session in database if authenticated
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

        msg = "Wearable telemetry synchronized successfully!" if sync_source == "live" else "Telemetry synchronized from local cache (live cloud sync requires re-authorization)."
        return JsonResponse({
            "success": True,
            "message": msg,
            "source": sync_source,
            "data": data
        }, status=200)
    except Exception as e:
        logger.error(f"Error in wearable_fetch_data_api: {e}", exc_info=True)
        return JsonResponse({"error": str(e)}, status=500)


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
            return JsonResponse({"error": "Question parameter is required."}, status=400)

        agent = get_wearable_agent(request.user)
        result = agent.ask_question(question)
        return JsonResponse(result)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


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
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def wearable_calibrate_steps_api(request):
    """
    Calibrates today's active step count in the telemetry dataset and session.
    Allows athletes to align demo/local data with their physical Fitbit band.
    """
    try:
        body = json.loads(request.body.decode('utf-8')) if request.body else {}
        target_steps = int(body.get("steps", 2639))
        if target_steps < 0:
            return JsonResponse({"error": "Step count cannot be negative."}, status=400)

        if not os.path.exists(OUTPUT_FILE):
            return JsonResponse({"error": "No telemetry dataset found to calibrate."}, status=404)

        with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
            data_dict = json.load(f)

        data_dict = shift_telemetry_to_present(data_dict)
        data_dict["fetched_at"] = datetime.now(timezone.utc).isoformat()

        pts = data_dict.get('data', {}).get('steps', {}).get('dataPoints', [])
        dates = []
        for p in pts:
            civil = p.get('steps', {}).get('interval', {}).get('civilStartTime', {}).get('date', {})
            if civil:
                dates.append(f"{civil.get('year', 0):04d}-{civil.get('month', 1):02d}-{civil.get('day', 1):02d}")
        latest_date = max(dates) if dates else datetime.now(timezone.utc).strftime("%Y-%m-%d")

        today_pts = [
            p for p in pts
            if p.get('steps', {}).get('interval', {}).get('civilStartTime', {}).get('date', {})
            and f"{p['steps']['interval']['civilStartTime']['date']['year']:04d}-{p['steps']['interval']['civilStartTime']['date']['month']:02d}-{p['steps']['interval']['civilStartTime']['date']['day']:02d}" == latest_date
            and p.get('dataSource', {}).get('platform') == 'FITBIT'
        ]
        if not today_pts:
            today_pts = [
                p for p in pts
                if p.get('steps', {}).get('interval', {}).get('civilStartTime', {}).get('date', {})
                and f"{p['steps']['interval']['civilStartTime']['date']['year']:04d}-{p['steps']['interval']['civilStartTime']['date']['month']:02d}-{p['steps']['interval']['civilStartTime']['date']['day']:02d}" == latest_date
            ]

        if today_pts:
            old_counts = [max(1, int(p.get('steps', {}).get('count', 0))) for p in today_pts]
            total_old = sum(old_counts)
            raw_allocated = [(c * target_steps) / total_old for c in old_counts]
            floored = [int(x) for x in raw_allocated]
            diff = target_steps - sum(floored)
            remainders = sorted([(raw_allocated[i] - floored[i], i) for i in range(len(today_pts))], reverse=True)
            for k in range(diff):
                floored[remainders[k][1]] += 1
            for i, p in enumerate(today_pts):
                p['steps']['count'] = str(floored[i])

        save_data(data_dict)

        if request.user.is_authenticated:
            sess, _ = WearableSession.objects.get_or_create(user=request.user)
            sess.raw_data_json = json.dumps(data_dict)
            sess.total_steps = target_steps
            sess.save()

        global _default_agent
        _default_agent = None

        return JsonResponse({
            "success": True,
            "message": f"Successfully calibrated today's steps to {target_steps:,}!",
            "date": latest_date,
            "calibrated_steps": target_steps,
            "data": data_dict
        }, status=200)
    except Exception as e:
        logger.error(f"Error in wearable_calibrate_steps_api: {e}", exc_info=True)
        return JsonResponse({"error": str(e)}, status=500)
