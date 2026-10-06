"""
test_graph_builder.py
Comprehensive test suite for the Knowledge Graph and Reasoning Agent Layer.
Tests entity modeling, cross-day derived edges, explicit scoring formulas,
cold-start and edge-case handling, and end-to-end question execution with evidence verification.
"""

import pytest
try:
    from workouts.wearable.graph_builder import (
        FitbitKnowledgeGraph,
        compute_workout_performance_score,
        compute_recovery_score
    )
    from workouts.wearable.agent import FitbitAgent, DISCLAIMER
except ImportError:
    from graph_builder import (
        FitbitKnowledgeGraph,
        compute_workout_performance_score,
        compute_recovery_score
    )
    from agent import FitbitAgent, DISCLAIMER

# Deterministic fixture dataset ensuring consistent cross-day relationships across any test environment
SAMPLE_FIXTURE_DATA = {
    "data": {
        "exercise": {
            "dataPoints": [
                {
                    "exercise": {
                        "interval": {
                            "startTime": "2026-08-01T10:00:00Z",
                            "endTime": "2026-08-01T11:00:00Z"
                        },
                        "displayName": "Morning Run",
                        "exerciseType": "RUNNING",
                        "activeDuration": "3600s",
                        "metricsSummary": {
                            "caloriesKcal": 450,
                            "steps": 5200,
                            "distanceMillimeters": 5000000,
                            "averageHeartRateBeatsPerMinute": 135,
                            "activeZoneMinutes": 45
                        }
                    }
                },
                {
                    "exercise": {
                        "interval": {
                            "startTime": "2026-08-02T14:00:00Z",
                            "endTime": "2026-08-02T15:30:00Z"
                        },
                        "displayName": "Power Walk",
                        "exerciseType": "WALKING",
                        "activeDuration": "5400s",
                        "metricsSummary": {
                            "caloriesKcal": 550,
                            "steps": 7800,
                            "distanceMillimeters": 6200000,
                            "averageHeartRateBeatsPerMinute": 115,
                            "activeZoneMinutes": 55
                        }
                    }
                }
            ]
        },
        "sleep": {
            "dataPoints": [
                {
                    "sleep": {
                        "interval": {
                            "startTime": "2026-07-31T22:00:00Z",
                            "endTime": "2026-08-01T06:00:00Z"
                        },
                        "summary": {
                            "minutesAsleep": "450",
                            "minutesAwake": "30",
                            "stagesSummary": [
                                {"type": "LIGHT", "minutes": "240"},
                                {"type": "DEEP", "minutes": "110"},
                                {"type": "REM", "minutes": "100"}
                            ]
                        }
                    }
                },
                {
                    "sleep": {
                        "interval": {
                            "startTime": "2026-08-01T22:30:00Z",
                            "endTime": "2026-08-02T06:45:00Z"
                        },
                        "summary": {
                            "minutesAsleep": "480",
                            "minutesAwake": "15",
                            "stagesSummary": [
                                {"type": "LIGHT", "minutes": "250"},
                                {"type": "DEEP", "minutes": "120"},
                                {"type": "REM", "minutes": "110"}
                            ]
                        }
                    }
                }
            ]
        },
        "steps": {
            "dataPoints": [
                {
                    "dataSource": {"platform": "FITBIT"},
                    "steps": {
                        "interval": {
                            "civilStartTime": {"date": {"year": 2026, "month": 8, "day": 1}}
                        },
                        "count": "12500"
                    }
                },
                {
                    "dataSource": {"platform": "FITBIT"},
                    "steps": {
                        "interval": {
                            "civilStartTime": {"date": {"year": 2026, "month": 8, "day": 2}}
                        },
                        "count": "15450"
                    }
                }
            ]
        },
        "nutrition-log": {
            "dataPoints": [
                {
                    "nutritionLog": {
                        "interval": {
                            "civilStartTime": {"date": {"year": 2026, "month": 8, "day": 1}}
                        },
                        "foodDisplayName": "Oatmeal with Berries",
                        "mealType": "BREAKFAST",
                        "energy": {"kcal": 380},
                        "totalCarbohydrate": {"grams": 58},
                        "protein": {"grams": 14},
                        "totalFat": {"grams": 6}
                    }
                }
            ]
        }
    }
}


@pytest.fixture
def sample_graph():
    """Provides an initialized FitbitKnowledgeGraph using the fixture dataset."""
    return FitbitKnowledgeGraph(SAMPLE_FIXTURE_DATA)


@pytest.fixture
def sample_agent():
    """Provides an initialized FitbitAgent using the fixture dataset."""
    return FitbitAgent(SAMPLE_FIXTURE_DATA)


# -----------------------------------------------------------------------------
# Unit Tests: Scoring Formulas
# -----------------------------------------------------------------------------

def test_workout_performance_score_formula():
    """Verifies that the performance score formula is bounded between 0 and 100 and scales monotonically."""
    score_low = compute_workout_performance_score(calories=100, active_zone_mins=10, duration_mins=20)
    score_mid = compute_workout_performance_score(calories=400, active_zone_mins=40, duration_mins=60)
    score_high = compute_workout_performance_score(calories=800, active_zone_mins=90, duration_mins=120)

    assert 0 <= score_low <= 100
    assert 0 <= score_mid <= 100
    assert 0 <= score_high <= 100
    assert score_low < score_mid < score_high
    assert score_high == 100  # Capped at 100


def test_recovery_score_formula():
    """Verifies that the sleep recovery score formula scales appropriately with duration and restorative sleep."""
    score_poor = compute_recovery_score(hours_asleep=4.0, efficiency_pct=70.0, deep_rem_ratio=0.20)
    score_optimal = compute_recovery_score(hours_asleep=8.0, efficiency_pct=95.0, deep_rem_ratio=0.45)

    assert 0 <= score_poor < score_optimal <= 100
    assert score_optimal == 100


# -----------------------------------------------------------------------------
# Unit Tests: Knowledge Graph Construction & Cross-Day Derived Edges
# -----------------------------------------------------------------------------

def test_knowledge_graph_entities(sample_graph):
    """Verifies that Day, Sleep, Workout, Steps, and Meal entities are correctly instantiated in the graph."""
    stats = sample_graph.get_graph_stats()
    nodes_by_type = stats["nodes_by_type"]

    assert "Day" in nodes_by_type
    assert "Sleep" in nodes_by_type
    assert "Workout" in nodes_by_type
    assert "Steps" in nodes_by_type
    assert "Meal" in nodes_by_type

    assert "2026-08-01" in sample_graph.get_days()
    assert "2026-08-02" in sample_graph.get_days()


def test_cross_day_derived_edges(sample_graph):
    """Verifies that cross-day temporal and influence edges are computed between consecutive days."""
    cross_edges = sample_graph.get_cross_day_edges()
    assert len(cross_edges) > 0

    rel_types = [e["relationship"] for e in cross_edges]
    assert "SLEEP_IMPACT" in rel_types
    assert "INFLUENCED_WORKOUT" in rel_types

    # Test attributes on INFLUENCED_WORKOUT
    workout_edges = [e for e in cross_edges if e["relationship"] == "INFLUENCED_WORKOUT"]
    assert len(workout_edges) > 0
    first_edge_attrs = workout_edges[0]["attributes"]
    assert "prior_sleep_hours" in first_edge_attrs
    assert "workout_performance_score" in first_edge_attrs


# -----------------------------------------------------------------------------
# Unit Tests: Agent Tools & Cold-Start Edge Cases
# -----------------------------------------------------------------------------

def test_get_day_summary_success(sample_agent):
    """Verifies get_day_summary returns full structure for an existing day."""
    summary = sample_agent.get_day_summary("2026-08-02")
    assert summary["status"] == "success"
    assert summary["date"] == "2026-08-02"
    assert summary["total_steps"] == 15450
    assert summary["workout_count"] == 1
    assert len(summary["workouts"]) == 1
    assert summary["workouts"][0]["name"] == "Power Walk"


def test_get_day_summary_missing_date(sample_agent):
    """Verifies that missing dates return a structured 'no_data_for_date' response with suggestions."""
    summary = sample_agent.get_day_summary("2025-01-01")
    assert summary["status"] == "no_data_for_date"
    assert "available_dates" in summary
    assert "2026-08-02" in summary["available_dates"]


def test_baseline_average_and_cold_start():
    """Verifies baseline calculation detects cold-start when fewer than 3 days of data exist."""
    two_day_data = {
        "data": {
            "steps": {
                "dataPoints": [
                    {"dataSource": {"platform": "FITBIT"}, "steps": {"interval": {"civilStartTime": {"date": {"year": 2026, "month": 8, "day": 1}}}, "count": "10000"}},
                    {"dataSource": {"platform": "FITBIT"}, "steps": {"interval": {"civilStartTime": {"date": {"year": 2026, "month": 8, "day": 2}}}, "count": "12000"}}
                ]
            }
        }
    }
    short_agent = FitbitAgent(two_day_data)
    res = short_agent.get_baseline_average("total_steps")
    assert res["status"] == "success"
    assert res["sample_size"] == 2
    assert res["is_cold_start"] is True
    assert "cold_start_warning" in res
    assert res["baseline_mean"] == 11000.0


def test_compare_to_baseline(sample_agent):
    """Verifies comparison to baseline calculates differences and percentage changes cleanly."""
    comp = sample_agent.compare_to_baseline("2026-08-02", "total_steps")
    assert comp["status"] == "success"
    assert comp["metric"] == "total_steps"
    assert comp["day_value"] == 15450
    assert "difference" in comp
    assert "percentage_change" in comp
    assert "comparison_status" in comp


def test_find_correlated_days_structured(sample_agent):
    """Verifies structured condition querying correctly traces next-day outcomes."""
    corr = sample_agent.find_correlated_days(metric="sleep_hours", operator=">=", threshold=7.0)
    assert corr["status"] == "success"
    assert corr["metric"] == "sleep_hours"
    assert corr["operator"] == ">="
    assert corr["threshold"] == 7.0
    assert corr["matching_days_count"] > 0

    first_match = corr["matching_days"][0]
    assert "measured_value" in first_match
    assert first_match["measured_value"] >= 7.0
    # Next day outcome was captured
    assert "next_day_outcome" in first_match


def test_rank_best_recovery_days(sample_agent):
    """Verifies recovery ranking returns sorted days with recovery scores."""
    ranked = sample_agent.rank_best_recovery_days()
    assert len(ranked) > 0
    assert "recovery_score" in ranked[0]
    if len(ranked) > 1:
        assert ranked[0]["recovery_score"] >= ranked[1]["recovery_score"]


# -----------------------------------------------------------------------------
# End-to-End Tests: Question Pipeline & Non-Medical Framing Verification
# -----------------------------------------------------------------------------

def test_e2e_question_energy_analysis(sample_agent):
    """
    End-to-End Test 1:
    'Why was my energy low on 2026-08-02?'
    Verifies question processing, tool invocation, evidence trail, and disclaimer presence.
    """
    dynamic_date = sample_agent.kg.get_days()[-1]
    question = f"Why was my energy low on {dynamic_date}?"
    response = sample_agent.ask_question(question)

    assert response["question"] == question
    assert len(response["answer"]) > 50
    assert len(response["evidence"]) >= 2
    assert "model_used" in response

    # Check evidence trail contains actual tool outputs
    tools_called = [e["tool"] for e in response["evidence"]]
    assert "get_day_summary" in tools_called
    assert "compare_to_baseline" in tools_called

    # Verify framing disclaimer
    assert DISCLAIMER in response["answer"]


def test_e2e_question_workout_precursors(sample_agent):
    """
    End-to-End Test 2:
    'What consistently happens before my best workouts?'
    Verifies cross-day pattern traversal, correlation tool usage, and synthesized insights.
    """
    question = "What consistently happens before my best workouts?"
    response = sample_agent.ask_question(question)

    assert response["question"] == question
    assert len(response["answer"]) > 50
    assert len(response["evidence"]) >= 2

    # Check evidence trail
    tools_called = [e["tool"] for e in response["evidence"]]
    assert "find_correlated_days" in tools_called
    assert "rank_best_recovery_days" in tools_called

    # Verify framing disclaimer
    assert DISCLAIMER in response["answer"]


def test_real_dataset_integrity():
    """Verifies that the live fitbit_daily_data.json file (if present) loads cleanly without errors."""
    live_agent = FitbitAgent("fitbit_daily_data.json")
    stats = live_agent.kg.get_graph_stats()
    assert stats["total_nodes"] > 0
    assert stats["total_edges"] > 0
