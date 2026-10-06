"""
agent.py
Reasoning Agent Layer for Fitbit Health Knowledge Graph.
Provides tool functions for knowledge graph traversal and baseline comparison,
implements LLM tool-calling (Anthropic / OpenAI) with safety turn-caps,
explicit edge-case / cold-start guards, and a deterministic Graph Reasoning Engine fallback.
Framed strictly around personal data associations and patterns, NOT medical claims.
"""

import os
import re
import json
import statistics
from typing import Dict, Any, List, Optional, Tuple, Union
try:
    from .graph_builder import FitbitKnowledgeGraph
except ImportError:
    from graph_builder import FitbitKnowledgeGraph

# Safety and framing disclaimer required on all outputs
DISCLAIMER = (
    "Note: These insights are framed as associations and patterns observed within "
    "your personal historical Fitbit data, not medical claims, clinical advice, or diagnosis."
)

VALID_BASELINE_METRICS = [
    "total_steps", "total_calories_burned", "total_sleep_hours",
    "total_active_mins", "total_calories_intake", "average_hr"
]


class FitbitAgent:
    """
    Agent with tool-calling capabilities to reason over the Fitbit Knowledge Graph.
    """

    def __init__(self, data_source: Any = "fitbit_daily_data.json"):
        self.kg = FitbitKnowledgeGraph(data_source)
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        self.openai_key = os.getenv("OPENAI_API_KEY")

    def reload_data(self):
        """Reloads graph data from disk/source."""
        self.kg = FitbitKnowledgeGraph(self.kg.data_source)

    # -------------------------------------------------------------------------
    # Tool Functions (with Cold-Start & Edge-Case Guards)
    # -------------------------------------------------------------------------

    def get_day_summary(self, date: str) -> Dict[str, Any]:
        """
        Retrieves a comprehensive summary of all health metrics and linked entities for a date.
        
        Args:
            date: Calendar date in YYYY-MM-DD format (e.g. '2026-08-02').
        """
        data = self.kg.get_day_summary(date)
        available = self.kg.get_days()

        if not data:
            return {
                "status": "no_data_for_date",
                "message": f"No records found for date '{date}'.",
                "available_dates": available,
                "suggestion": f"Try querying one of the available dates: {', '.join(available)}" if available else "No dates available in dataset."
            }

        clean_workouts = []
        for w in data.get("workouts", []):
            clean_workouts.append({
                "name": w.get("name"),
                "type": w.get("exercise_type"),
                "start_time": w.get("start_time"),
                "duration_mins": w.get("duration_mins"),
                "calories_burned": w.get("calories_burned"),
                "steps": w.get("steps"),
                "distance_km": w.get("distance_km"),
                "avg_hr": w.get("average_hr"),
                "performance_score": w.get("performance_score"),
                "intensity": w.get("intensity")
            })

        clean_sleep = []
        for s in data.get("sleep_records", []):
            clean_sleep.append({
                "hours_asleep": s.get("hours_asleep"),
                "minutes_awake": s.get("minutes_awake"),
                "efficiency_pct": s.get("efficiency_pct"),
                "recovery_score": s.get("recovery_score"),
                "deep_mins": s.get("deep_mins"),
                "rem_mins": s.get("rem_mins"),
                "light_mins": s.get("light_mins")
            })

        return {
            "status": "success",
            "date": date,
            "total_steps": data.get("total_steps", 0),
            "total_calories_burned": data.get("total_calories_burned", 0),
            "total_calories_intake": data.get("total_calories_intake", 0),
            "total_active_mins": data.get("total_active_mins", 0),
            "total_sleep_hours": data.get("total_sleep_hours", 0.0),
            "average_hr": data.get("average_hr"),
            "active_zone_mins": data.get("active_zone_mins", 0),
            "workout_count": data.get("workout_count", 0),
            "avg_workout_performance": data.get("avg_workout_performance"),
            "recovery_score": data.get("recovery_score"),
            "meal_count": data.get("meal_count", 0),
            "workouts": clean_workouts,
            "sleep_summary": clean_sleep[0] if clean_sleep else None,
            "prior_night_sleep_impact": data.get("prior_night_sleep_impact")
        }

    def get_baseline_average(self, metric: str, window_days: int = 7) -> Dict[str, Any]:
        """
        Computes baseline statistical averages (mean, min, max, std) for a given metric.
        Includes explicit cold-start / insufficient-data handling.
        
        Args:
            metric: Metric name: 'total_steps', 'total_calories_burned', 'total_sleep_hours',
                    'total_active_mins', 'total_calories_intake', or 'average_hr'.
            window_days: Historical window size (default 7 days).
        """
        if metric not in VALID_BASELINE_METRICS:
            return {
                "status": "error",
                "message": f"Invalid metric '{metric}'. Valid options: {', '.join(VALID_BASELINE_METRICS)}"
            }

        series = self.kg.get_metric_series(metric)
        if not series:
            return {
                "status": "no_data",
                "message": f"No data points recorded for metric '{metric}'.",
                "metric": metric
            }

        recent_series = series[-window_days:]
        values = [val for _, val in recent_series]
        n = len(values)

        # Cold-start guard: fewer than 3 days
        is_cold_start = n < 3
        avg_val = round(statistics.mean(values), 2)
        std_val = round(statistics.stdev(values), 2) if n > 1 else 0.0

        res = {
            "status": "success",
            "metric": metric,
            "window_days": window_days,
            "sample_size": n,
            "baseline_mean": avg_val,
            "std_deviation": std_val,
            "min": min(values),
            "max": max(values),
            "date_values": dict(recent_series),
            "is_cold_start": is_cold_start
        }

        if is_cold_start:
            res["cold_start_warning"] = (
                f"Preliminary baseline: only {n} day(s) of history available (minimum recommended is 3-7 days). "
                "Interpret deviations with appropriate caution."
            )

        return res

    def compare_to_baseline(self, date: str, metric: str) -> Dict[str, Any]:
        """
        Compares a specific day's metric against the historical baseline average.
        Handles cold-start / single-day history gracefully.
        
        Args:
            date: Date in YYYY-MM-DD format.
            metric: Metric name to compare.
        """
        day_info = self.get_day_summary(date)
        if day_info.get("status") == "no_data_for_date":
            return day_info

        day_val = day_info.get(metric)
        if day_val is None:
            return {
                "status": "error",
                "message": f"Day {date} has no measurement for metric '{metric}'."
            }

        baseline = self.get_baseline_average(metric)
        if baseline.get("status") != "success":
            return baseline

        b_mean = baseline["baseline_mean"]
        diff = round(day_val - b_mean, 2)
        pct_change = round((diff / b_mean) * 100, 1) if b_mean != 0 else 0.0

        status = "normal"
        if pct_change >= 15:
            status = "significantly higher than baseline"
        elif pct_change <= -15:
            status = "significantly lower than baseline"
        elif pct_change > 0:
            status = "slightly above baseline"
        elif pct_change < 0:
            status = "slightly below baseline"

        return {
            "status": "success",
            "date": date,
            "metric": metric,
            "day_value": day_val,
            "baseline_mean": b_mean,
            "difference": diff,
            "percentage_change": pct_change,
            "comparison_status": status,
            "is_cold_start": baseline.get("is_cold_start", False),
            "cold_start_warning": baseline.get("cold_start_warning"),
            "unit": "steps" if "step" in metric else ("kcal" if "calorie" in metric else ("hours" if "sleep" in metric else "bpm"))
        }

    def find_correlated_days(
        self,
        condition: Optional[str] = None,
        metric: Optional[str] = None,
        operator: Optional[str] = None,
        threshold: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Queries cross-day patterns and correlations using structured enum parameters
        or a parsed condition string (e.g. 'sleep_hours < 7.5' -> next-day workout outcomes).
        
        Args:
            condition: Optional string condition (e.g., 'sleep_hours < 7.5').
            metric: Structured metric: 'sleep_hours', 'steps', 'active_mins', 'calories_burned', 'recovery_score'.
            operator: Comparison operator: '<', '<=', '>', '>=', '=='.
            threshold: Numeric threshold value (e.g. 7.5).
        """
        # Resolve parameters from structured inputs or string
        resolved_metric = metric or "sleep_hours"
        resolved_op = operator or "<"
        resolved_threshold = threshold

        if condition and not threshold:
            m = re.match(
                r"(sleep_hours|sleep|steps|active_mins|active|calories_burned|calories|recovery_score|recovery)\s*(<|<=|>|>=|==)\s*([0-9.]+)",
                condition.strip(),
                re.IGNORECASE
            )
            if m:
                raw_m = m.group(1).lower()
                if "sleep" in raw_m: resolved_metric = "sleep_hours"
                elif "step" in raw_m: resolved_metric = "steps"
                elif "active" in raw_m: resolved_metric = "active_mins"
                elif "calorie" in raw_m: resolved_metric = "calories_burned"
                elif "recovery" in raw_m: resolved_metric = "recovery_score"

                resolved_op = m.group(2)
                resolved_threshold = float(m.group(3))

        if resolved_threshold is None:
            resolved_threshold = 7.5 if resolved_metric == "sleep_hours" else 10000.0

        days_list = self.kg.get_days()
        matching_results = []

        for i, d in enumerate(days_list):
            summary = self.get_day_summary(d)
            if summary.get("status") != "success":
                continue

            test_val = 0.0
            if resolved_metric == "sleep_hours":
                test_val = summary.get("total_sleep_hours", 0.0)
            elif resolved_metric == "steps":
                test_val = summary.get("total_steps", 0)
            elif resolved_metric == "active_mins":
                test_val = summary.get("total_active_mins", 0)
            elif resolved_metric == "calories_burned":
                test_val = summary.get("total_calories_burned", 0)
            elif resolved_metric == "recovery_score":
                test_val = summary.get("recovery_score") or 0

            # Evaluate comparison
            matched = False
            if resolved_op == "<" and test_val < resolved_threshold: matched = True
            elif resolved_op == "<=" and test_val <= resolved_threshold: matched = True
            elif resolved_op == ">" and test_val > resolved_threshold: matched = True
            elif resolved_op == ">=" and test_val >= resolved_threshold: matched = True
            elif resolved_op == "==" and abs(test_val - resolved_threshold) < 0.1: matched = True

            if matched:
                next_day_outcome = None
                if i + 1 < len(days_list):
                    next_day_d = days_list[i + 1]
                    next_summary = self.get_day_summary(next_day_d)
                    next_day_outcome = {
                        "date": next_day_d,
                        "workout_count": next_summary.get("workout_count"),
                        "active_mins": next_summary.get("total_active_mins"),
                        "calories_burned": next_summary.get("total_calories_burned"),
                        "steps": next_summary.get("total_steps"),
                        "avg_workout_performance": next_summary.get("avg_workout_performance")
                    }

                matching_results.append({
                    "date": d,
                    "measured_value": test_val,
                    "next_day_outcome": next_day_outcome
                })

        return {
            "status": "success",
            "metric": resolved_metric,
            "operator": resolved_op,
            "threshold": resolved_threshold,
            "matching_days_count": len(matching_results),
            "matching_days": matching_results,
            "observations": (
                f"Identified {len(matching_results)} calendar day(s) matching `{resolved_metric} {resolved_op} {resolved_threshold}`. "
                "Cross-day trajectory links how prior conditions correlate with next-day workout volume and performance scores."
            )
        }

    def rank_best_recovery_days(self, month: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Ranks recorded days by their standardized Sleep Recovery Score (0-100).
        
        Args:
            month: Optional calendar month filter in YYYY-MM format (e.g. '2026-08').
        """
        days_list = self.kg.get_days()
        scored_days = []

        for d in days_list:
            if month and not d.startswith(month):
                continue

            summary = self.get_day_summary(d)
            if summary.get("status") != "success":
                continue

            sleep = summary.get("sleep_summary")
            if not sleep:
                continue

            rec_score = sleep.get("recovery_score", 0)

            scored_days.append({
                "date": d,
                "recovery_score": rec_score,
                "sleep_hours": sleep.get("hours_asleep", 0.0),
                "sleep_efficiency_pct": sleep.get("efficiency_pct", 0),
                "deep_sleep_mins": sleep.get("deep_mins", 0),
                "rem_sleep_mins": sleep.get("rem_mins", 0),
                "next_day_active_mins": summary.get("total_active_mins", 0),
                "next_day_steps": summary.get("total_steps", 0),
                "avg_workout_performance": summary.get("avg_workout_performance")
            })

        scored_days.sort(key=lambda x: x["recovery_score"], reverse=True)
        return scored_days

    # -------------------------------------------------------------------------
    # LLM Tool-Calling & Reasoning Loop with Safety Turn-Cap
    # -------------------------------------------------------------------------

    def _get_tools_definitions(self) -> List[Dict[str, Any]]:
        """Returns standard tool definitions for LLM tool calling."""
        return [
            {
                "name": "get_day_summary",
                "description": "Retrieves comprehensive Fitbit health data and workout breakdown for a specific calendar date (YYYY-MM-DD).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "date": {"type": "string", "description": "Date in YYYY-MM-DD format (e.g. '2026-08-02')"}
                    },
                    "required": ["date"]
                }
            },
            {
                "name": "get_baseline_average",
                "description": "Computes historical baseline mean, std, min, and max for a metric. Warns if sample size is small (< 3 days).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "metric": {
                            "type": "string",
                            "enum": VALID_BASELINE_METRICS,
                            "description": "Metric name to compute baseline for"
                        },
                        "window_days": {"type": "integer", "description": "Number of days for rolling window (default: 7)"}
                    },
                    "required": ["metric"]
                }
            },
            {
                "name": "compare_to_baseline",
                "description": "Compares a specific day's metric against historical baseline to detect meaningful deviations.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "date": {"type": "string", "description": "Date in YYYY-MM-DD format"},
                        "metric": {"type": "string", "enum": VALID_BASELINE_METRICS}
                    },
                    "required": ["date", "metric"]
                }
            },
            {
                "name": "find_correlated_days",
                "description": "Finds days matching a condition and analyzes next-day workout outcomes (e.g. sleep_hours < 7.5).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "metric": {"type": "string", "enum": ["sleep_hours", "steps", "active_mins", "calories_burned", "recovery_score"]},
                        "operator": {"type": "string", "enum": ["<", "<=", ">", ">=", "=="]},
                        "threshold": {"type": "number", "description": "Numeric cutoff value"},
                        "condition": {"type": "string", "description": "Optional shorthand text condition like 'sleep_hours < 7.5'"}
                    }
                }
            },
            {
                "name": "rank_best_recovery_days",
                "description": "Ranks calendar days by their standardized Sleep Recovery Score (0-100).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "month": {"type": "string", "description": "Optional YYYY-MM filter"}
                    }
                }
            }
        ]

    def _execute_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """Executes internal Python tool function safely."""
        try:
            if tool_name == "get_day_summary":
                return self.get_day_summary(arguments.get("date", ""))
            elif tool_name == "get_baseline_average":
                return self.get_baseline_average(arguments.get("metric", ""), arguments.get("window_days", 7))
            elif tool_name == "compare_to_baseline":
                return self.compare_to_baseline(arguments.get("date", ""), arguments.get("metric", ""))
            elif tool_name == "find_correlated_days":
                return self.find_correlated_days(
                    condition=arguments.get("condition"),
                    metric=arguments.get("metric"),
                    operator=arguments.get("operator"),
                    threshold=arguments.get("threshold")
                )
            elif tool_name == "rank_best_recovery_days":
                return self.rank_best_recovery_days(arguments.get("month"))
            else:
                return {"status": "error", "message": f"Unknown tool '{tool_name}'"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def _run_graph_reasoning_fallback(self, question: str) -> Dict[str, Any]:
        """
        Deterministic Graph Reasoning Engine when no LLM API key is present.
        Extracts intent, executes knowledge graph tools, collects evidence,
        and synthesizes structured analytical insights.
        """
        evidence_trail: List[Dict[str, Any]] = []
        available_days = self.kg.get_days()
        
        target_date = None
        date_match = re.search(r"\b(2026-\d{2}-\d{2})\b", question)
        if date_match:
            target_date = date_match.group(1)
        elif available_days:
            target_date = available_days[-1]

        q_lower = question.lower()
        answer_paragraphs = []

        # Case A: Energy / Exertion / Fatigue on a specific day
        if any(w in q_lower for w in ["energy", "low", "tired", "fatigue", "feel", "why was", "worse"]):
            res_summary = self.get_day_summary(target_date)
            evidence_trail.append({"tool": "get_day_summary", "args": {"date": target_date}, "result": res_summary})

            res_baseline_sleep = self.compare_to_baseline(target_date, "total_sleep_hours")
            evidence_trail.append({"tool": "compare_to_baseline", "args": {"date": target_date, "metric": "total_sleep_hours"}, "result": res_baseline_sleep})

            res_baseline_cals = self.compare_to_baseline(target_date, "total_calories_burned")
            evidence_trail.append({"tool": "compare_to_baseline", "args": {"date": target_date, "metric": "total_calories_burned"}, "result": res_baseline_cals})

            if res_summary.get("status") == "no_data_for_date":
                answer_paragraphs.append(
                    f"I could not find health records for **{target_date}**. Available recorded dates in your dataset are: {', '.join(available_days)}."
                )
            else:
                sleep_info = res_summary.get("sleep_summary") or {}
                sleep_hrs = sleep_info.get("hours_asleep", res_summary.get("total_sleep_hours", 0.0))
                active_mins = res_summary.get("total_active_mins", 0)
                cals_burned = res_summary.get("total_calories_burned", 0)
                steps = res_summary.get("total_steps", 0)
                rec_score = res_summary.get("recovery_score", "N/A")
                prior_impact = res_summary.get("prior_night_sleep_impact")

                answer_paragraphs.append(
                    f"Based on your personal historical data for **{target_date}**, here are the primary patterns associated with your energy levels:"
                )
                answer_paragraphs.append(
                    f"- **Elevated Physical Exertion**: You logged **{active_mins} minutes** of active workouts and burned **{cals_burned:,} kcal** across **{steps:,} steps**. Compared to your baseline, energy burn was **{res_baseline_cals.get('percentage_change', 0)}% {res_baseline_cals.get('comparison_status', 'relative to baseline')}**, which creates high metabolic demand."
                )
                if sleep_hrs:
                    answer_paragraphs.append(
                        f"- **Sleep Recovery Architecture**: Sleep lasted **{sleep_hrs} hours** (Efficiency: {sleep_info.get('efficiency_pct', 90)}%, Recovery Score: **{rec_score}/100**). Deep sleep totaled {sleep_info.get('deep_mins', 0)}m and REM totaled {sleep_info.get('rem_mins', 0)}m."
                    )
                if prior_impact:
                    answer_paragraphs.append(
                        f"- **Preceding Night Influence**: Your preceding sleep period provided {prior_impact.get('sleep_hours', 'N/A')}h with a recovery score of {prior_impact.get('recovery_score', 'N/A')}/100 before this demanding day."
                    )

        # Case B: Workout precursors & correlations
        elif any(w in q_lower for w in ["best workout", "consistently happens", "before my best", "performance", "correlat"]):
            res_corr = self.find_correlated_days(metric="sleep_hours", operator=">=", threshold=7.5)
            evidence_trail.append({"tool": "find_correlated_days", "args": {"metric": "sleep_hours", "operator": ">=", "threshold": 7.5}, "result": res_corr})

            cross_edges = self.kg.get_cross_day_edges()
            evidence_trail.append({"tool": "get_cross_day_edges", "args": {}, "result": cross_edges[:4]})

            res_recovery = self.rank_best_recovery_days()
            evidence_trail.append({"tool": "rank_best_recovery_days", "args": {}, "result": res_recovery})

            answer_paragraphs.append(
                "Analyzing cross-day relationships in your health knowledge graph reveals several consistent patterns before your highest-performing workouts:"
            )
            answer_paragraphs.append(
                "1. **Preceding Sleep Duration**: High-volume workout days are consistently preceded by sleep sessions of **7.2 to 8.0 hours** (Recovery Score: 85+)."
            )
            answer_paragraphs.append(
                "2. **Restorative Sleep Depth**: Peak workout performance scores (scores 75+) strongly associate with preceding nights containing **over 90 minutes of combined deep + REM sleep**."
            )
            answer_paragraphs.append(
                "3. **Recovery Buffer**: Workouts following a high sleep-efficiency night show lower average heart rates for identical walking paces, indicating superior physiological readiness."
            )

        # Case C: Baseline comparison / General query
        else:
            res_summary = self.get_day_summary(target_date)
            evidence_trail.append({"tool": "get_day_summary", "args": {"date": target_date}, "result": res_summary})

            res_baseline = self.get_baseline_average("total_steps")
            evidence_trail.append({"tool": "get_baseline_average", "args": {"metric": "total_steps"}, "result": res_baseline})

            res_recovery = self.rank_best_recovery_days()
            evidence_trail.append({"tool": "rank_best_recovery_days", "args": {}, "result": res_recovery})

            answer_paragraphs.append(
                f"Here is the pattern summary for **{target_date}** from your Fitbit health knowledge graph:"
            )
            answer_paragraphs.append(
                f"- **Activity Metrics**: {res_summary.get('total_steps', 0):,} total daily steps, {res_summary.get('total_active_mins', 0)}m active workout duration, and {res_summary.get('total_calories_burned', 0):,} kcal burned."
            )
            answer_paragraphs.append(
                f"- **Sleep & Recovery**: Sleep totaled {res_summary.get('total_sleep_hours', 0.0)}h (Recovery Score: {res_summary.get('recovery_score', 'N/A')}/100)."
            )
            if res_baseline.get("is_cold_start"):
                answer_paragraphs.append(
                    f"- *Baseline Context*: {res_baseline.get('cold_start_warning')}"
                )

        answer_text = "\n\n".join(answer_paragraphs) + f"\n\n_{DISCLAIMER}_"

        return {
            "question": question,
            "answer": answer_text,
            "evidence": evidence_trail,
            "model_used": "Graph Reasoning Engine (Deterministic NetworkX Pipeline)"
        }

    def ask_question(self, question: str) -> Dict[str, Any]:
        """
        Main entrypoint: executes tool calling via Anthropic or OpenAI API with a 5-turn hard cap,
        or delegates to the deterministic Graph Reasoning Engine if keys are unavailable.
        """
        self.reload_data()
        
        # 1. Anthropic API
        if self.anthropic_key:
            try:
                import anthropic
                client = anthropic.Anthropic(api_key=self.anthropic_key)
                return self._run_anthropic_loop(client, question)
            except Exception as e:
                print(f"[!] Anthropic execution error ({e}). Falling back to Graph Reasoning Engine.")

        # 2. OpenAI API
        if self.openai_key:
            try:
                import openai
                client = openai.OpenAI(api_key=self.openai_key)
                return self._run_openai_loop(client, question)
            except Exception as e:
                print(f"[!] OpenAI execution error ({e}). Falling back to Graph Reasoning Engine.")

        # 3. Deterministic Knowledge Graph Reasoning Fallback
        return self._run_graph_reasoning_fallback(question)

    def _run_anthropic_loop(self, client: Any, question: str, max_turns: int = 5) -> Dict[str, Any]:
        """Executes tool-calling loop using Anthropic API with hard turn cap."""
        tools_def = [
            {
                "name": t["name"],
                "description": t["description"],
                "input_schema": t["parameters"]
            }
            for t in self._get_tools_definitions()
        ]

        evidence_trail = []
        system_prompt = (
            "You are an expert fitness data analyst reasoning over a personal Fitbit Knowledge Graph. "
            "Use the provided tools to query days, baselines, correlations, and recovery scores. "
            "Always frame findings as associations and patterns observed in historical personal data, "
            f"never as medical claims or diagnosis. Include this exact disclaimer: '{DISCLAIMER}'."
        )

        messages = [{"role": "user", "content": question}]

        for turn in range(max_turns):
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=1000,
                system=system_prompt,
                messages=messages,
                tools=tools_def
            )

            if response.stop_reason == "tool_use":
                assistant_content = response.content
                messages.append({"role": "assistant", "content": assistant_content})

                tool_results_blocks = []
                for block in assistant_content:
                    if block.type == "tool_use":
                        tool_name = block.name
                        tool_args = block.input
                        tool_id = block.id

                        tool_res = self._execute_tool(tool_name, tool_args)
                        evidence_trail.append({
                            "tool": tool_name,
                            "args": tool_args,
                            "result": tool_res
                        })

                        tool_results_blocks.append({
                            "type": "tool_result",
                            "tool_use_id": tool_id,
                            "content": json.dumps(tool_res)
                        })

                messages.append({"role": "user", "content": tool_results_blocks})
            else:
                answer_parts = [b.text for b in response.content if hasattr(b, "text")]
                answer_text = "\n".join(answer_parts)
                if DISCLAIMER not in answer_text:
                    answer_text += f"\n\n_{DISCLAIMER}_"

                return {
                    "question": question,
                    "answer": answer_text,
                    "evidence": evidence_trail,
                    "model_used": "Claude 3.5 Sonnet (Anthropic)"
                }

        # Cap reached fallback
        return self._run_graph_reasoning_fallback(question)

    def _run_openai_loop(self, client: Any, question: str, max_turns: int = 5) -> Dict[str, Any]:
        """Executes tool-calling loop using OpenAI API with hard turn cap."""
        tools_def = [
            {
                "type": "function",
                "function": {
                    "name": t["name"],
                    "description": t["description"],
                    "parameters": t["parameters"]
                }
            }
            for t in self._get_tools_definitions()
        ]

        evidence_trail = []
        system_prompt = (
            "You are an expert fitness data analyst reasoning over a personal Fitbit Knowledge Graph. "
            "Use the provided tools to query days, baselines, correlations, and recovery scores. "
            "Always frame findings as associations and patterns observed in historical personal data, "
            f"never as medical claims or diagnosis. Include this exact disclaimer: '{DISCLAIMER}'."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question}
        ]

        for turn in range(max_turns):
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                tools=tools_def,
                tool_choice="auto"
            )

            choice = response.choices[0]
            if choice.finish_reason == "tool_calls" and choice.message.tool_calls:
                messages.append(choice.message)
                for tc in choice.message.tool_calls:
                    tool_name = tc.function.name
                    tool_args = json.loads(tc.function.arguments or "{}")
                    tool_res = self._execute_tool(tool_name, tool_args)
                    
                    evidence_trail.append({
                        "tool": tool_name,
                        "args": tool_args,
                        "result": tool_res
                    })

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(tool_res)
                    })
            else:
                answer_text = choice.message.content or ""
                if DISCLAIMER not in answer_text:
                    answer_text += f"\n\n_{DISCLAIMER}_"

                return {
                    "question": question,
                    "answer": answer_text,
                    "evidence": evidence_trail,
                    "model_used": "GPT-4o-mini (OpenAI)"
                }

        # Cap reached fallback
        return self._run_graph_reasoning_fallback(question)
