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
    """
    GET /api/analytics/
    Returns all data needed for the React Analytics page.
    """
    from workouts.models import WorkoutLog, SetLog
    from .shared import calculate_e1rm
    from django.utils import timezone
    from datetime import timedelta

    today = timezone.now().date()
    
    # Last 30 days of WorkoutLog for this user
    thirty_days_ago = today - timedelta(days=30)
    
    logs = WorkoutLog.objects.filter(
        user=request.user,
        date__gte=thirty_days_ago
    ).order_by('-date')

    # Today's logs with PR detection
    today_logs = WorkoutLog.objects.filter(
        user=request.user, 
        date=today
    ).order_by('created_at')

    # Build today's ledger with PR flags
    from .shared import get_current_pr_e1rm
    ledger = []
    for log in today_logs:
        sets = list(SetLog.objects.filter(workout_log=log))
        prev_pr = get_current_pr_e1rm(request.user, log.exercise_name)
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
            'sets': log.sets if hasattr(log, 'sets') else 
                    SetLog.objects.filter(workout_log=log).count(),
            'weight': log.weight,
            'reps': log.reps,
            'date': log.date.strftime('%d %b %Y'),
            'is_pr': is_pr,
        })

    # Volume by muscle group (last 30 days)
    from collections import defaultdict
    volume_by_muscle = defaultdict(float)
    for log in logs:
        if log.muscle_group and log.weight and log.reps:
            volume_by_muscle[log.muscle_group] += log.weight * log.reps

    # Streak calculation
    streak = 0
    check_date = today
    while True:
        if WorkoutLog.objects.filter(
            user=request.user, date=check_date
        ).exists():
            streak += 1
            check_date -= timedelta(days=1)
        else:
            break

    return JsonResponse({
        'today_ledger': ledger,
        'volume_by_muscle': dict(volume_by_muscle),
        'streak': streak,
        'total_sessions_30d': logs.values('date').distinct().count(),
    })


