import os
import json
import uuid
import time
import cv2
import numpy as np
import requests
import datetime
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import StreamingHttpResponse, HttpResponse, JsonResponse
from django.contrib.auth import authenticate, login
from django.contrib.auth.forms import UserCreationForm
from django.contrib import messages
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from dotenv import load_dotenv
from django.db.models import Avg, Sum

# Models
from workouts.models import UserProfile, ChatSession, ChatMessage, MealLog, FoodItem, DailySummary, PostureAnalysis, WorkoutLog, FoodPreference
# Forms
from workouts.forms import UserProfileForm, ChatMessageForm
# Services/Chatbots
from workouts.fitness_chatbot import FitnessChatbot

# Shared global states
from .shared import MEDIAPIPE_AVAILABLE, RepCounter, REP_COUNTER_AVAILABLE, WORKOUT_STATS, WORKOUT_STATS_LOCK, GEMINI_API_KEY, GEMINI_URL, NUTRITION_DATABASE

def home(request):
    if request.user.is_authenticated:
        return redirect('workout_selection')
    return redirect('login')


@login_required
def analytics_api(request):
    from workouts.models import WorkoutLog, SetLog
    from workouts.shared import calculate_e1rm, get_current_pr_e1rm
    from django.utils import timezone
    from datetime import timedelta
    from collections import defaultdict
    from concurrent.futures import ThreadPoolExecutor, as_completed

    today = timezone.now().date()
    thirty_days_ago = today - timedelta(days=30)
    user = request.user

    # --- Define independent tasks ---

    def fetch_recent_logs():
        return list(WorkoutLog.objects.filter(
            user=user,
            date__gte=thirty_days_ago
        ).order_by('-date'))

    def fetch_today_logs():
        return list(WorkoutLog.objects.filter(
            user=user,
            date=today
        ).order_by('created_at'))

    def calculate_streak():
        streak = 0
        check_date = today
        while True:
            if WorkoutLog.objects.filter(
                user=user, date=check_date
            ).exists():
                streak += 1
                check_date -= timedelta(days=1)
            else:
                break
        return streak

    # --- Run all three in parallel ---
    results = {}
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(fetch_recent_logs): 'recent_logs',
            executor.submit(fetch_today_logs):  'today_logs',
            executor.submit(calculate_streak):  'streak',
        }
        for future in as_completed(futures):
            key = futures[future]
            try:
                results[key] = future.result()
            except Exception as e:
                results[key] = [] if key != 'streak' else 0

    recent_logs = results['recent_logs']
    today_logs  = results['today_logs']
    streak      = results['streak']

    # --- PR detection on today's logs (sequential, depends on today_logs) ---
    from workouts.shared import get_current_pr_e1rm
    ledger = []
    for log in today_logs:
        sets = list(SetLog.objects.filter(workout_log=log))
        prev_pr = get_current_pr_e1rm(user, log.exercise_name)
        is_pr = False
        if sets:
            for s in sets:
                if s.weight and s.reps:
                    if calculate_e1rm(s.weight, s.reps) > prev_pr:
                        is_pr = True
                        break
        else:
            if calculate_e1rm(log.weight or 0, log.reps or 0) > prev_pr:
                is_pr = True

        ledger.append({
            'id': log.id,
            'exercise_name': log.exercise_name,
            'muscle_group': log.muscle_group,
            'sets': SetLog.objects.filter(workout_log=log).count(),
            'weight': log.weight,
            'reps': log.reps,
            'date': log.date.strftime('%d %b %Y'),
            'is_pr': is_pr,
        })

    # --- Volume by muscle group (depends on recent_logs) ---
    volume_by_muscle = defaultdict(float)
    for log in recent_logs:
        if log.muscle_group and log.weight and log.reps:
            volume_by_muscle[log.muscle_group] += log.weight * log.reps

    return JsonResponse({
        'today_ledger': ledger,
        'volume_by_muscle': dict(volume_by_muscle),
        'streak': streak,
        'total_sessions_30d': len(set(
            log.date for log in recent_logs
        )),
    })


