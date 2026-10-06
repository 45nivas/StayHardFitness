"""
graph_builder.py
Lightweight Knowledge Graph builder using NetworkX for personal Fitbit health data.
Models Days, Sleep, Workouts, Heart Rate, Steps, and Meals, as well as derived
cross-day relationships (e.g., previous night's sleep influencing next day's workout).

Explicit Scoring Formats:
1. Workout Performance Score (0-100):
   - Calorie Burn Intensity (40 pts): min(40, (calories_burned / 600) * 40)
   - Active Zone Exertion (30 pts): min(30, (active_zone_mins / 60) * 30)
   - Duration / Volume (30 pts): min(30, (duration_mins / 90) * 30)
2. Recovery Score (0-100):
   - Sleep Duration (40 pts): min(40, (sleep_hours / 8.0) * 40)
   - Sleep Efficiency (30 pts): min(30, (efficiency_pct / 95.0) * 30)
   - Restorative Ratio (30 pts): min(30, (deep_rem_ratio / 0.45) * 30)
"""

import os
import json
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
import networkx as nx


def compute_workout_performance_score(calories: int, active_zone_mins: int, duration_mins: int) -> int:
    """
    Computes a standardized Workout Performance Score (0-100).
    - Calories (40 max): 600 kcal benchmark
    - AZM (30 max): 60 mins benchmark
    - Duration (30 max): 90 mins benchmark
    """
    cal_score = min(40.0, (max(0, calories) / 600.0) * 40.0)
    azm_score = min(30.0, (max(0, active_zone_mins) / 60.0) * 30.0)
    dur_score = min(30.0, (max(0, duration_mins) / 90.0) * 30.0)
    return round(cal_score + azm_score + dur_score)


def compute_recovery_score(hours_asleep: float, efficiency_pct: float, deep_rem_ratio: float) -> int:
    """
    Computes a standardized Sleep Recovery Score (0-100).
    - Sleep Duration (40 max): 8.0 hrs benchmark
    - Sleep Efficiency (30 max): 95% benchmark
    - Restorative Ratio Deep+REM (30 max): 45% benchmark
    """
    dur_score = min(40.0, (max(0.0, hours_asleep) / 8.0) * 40.0)
    eff_score = min(30.0, (max(0.0, efficiency_pct) / 95.0) * 30.0)
    rest_score = min(30.0, (max(0.0, deep_rem_ratio) / 0.45) * 30.0)
    return round(dur_score + eff_score + rest_score)


class FitbitKnowledgeGraph:
    """
    Constructs and queries a NetworkX-based knowledge graph from Fitbit daily data.
    """

    def __init__(self, data_source: Any = "fitbit_daily_data.json"):
        self.data_source = data_source
        self.raw_data: Dict[str, Any] = {}
        self.graph = nx.DiGraph()
        self.days: Dict[str, Dict[str, Any]] = {}
        self._load_and_build()

    def _load_data(self) -> Dict[str, Any]:
        """Loads JSON data from file or dict."""
        if isinstance(self.data_source, dict):
            return self.data_source.get("data", self.data_source)
        
        filepath = self.data_source
        if not os.path.isabs(filepath):
            filepath = os.path.join(os.path.dirname(__file__), filepath)
            
        if os.path.exists(filepath):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = json.load(f)
                    return content.get("data", content)
            except Exception as e:
                print(f"[!] Error loading {filepath}: {e}")
                return {}
        return {}

    def _load_and_build(self):
        """Loads data and builds the graph."""
        self.raw_data = self._load_data()
        self.build_graph()

    def build_graph(self) -> nx.DiGraph:
        """
        Builds the knowledge graph nodes and edges.
        """
        self.graph.clear()
        self.days.clear()

        exercise_pts = self.raw_data.get("exercise", {}).get("dataPoints", [])
        sleep_pts = self.raw_data.get("sleep", {}).get("dataPoints", [])
        nutrition_pts = (
            self.raw_data.get("nutrition-log", {}).get("dataPoints", []) or
            self.raw_data.get("food", {}).get("dataPoints", [])
        )
        step_pts = self.raw_data.get("steps", {}).get("dataPoints", [])

        # 1. Discover all active dates
        all_dates = set()

        def extract_date(item: Dict[str, Any], date_field_paths: List[str]) -> Optional[str]:
            for path in date_field_paths:
                parts = path.split(".")
                curr = item
                for p in parts:
                    if isinstance(curr, dict):
                        curr = curr.get(p)
                    else:
                        curr = None
                        break
                if curr:
                    if isinstance(curr, dict) and "year" in curr:
                        return f"{curr['year']:04d}-{curr.get('month', 1):02d}-{curr.get('day', 1):02d}"
                    if isinstance(curr, str) and len(curr) >= 10:
                        return curr[:10]
            return None

        # Pre-scan dates from workouts
        for p in exercise_pts:
            d = extract_date(p, ["exercise.interval.startTime", "createTime"])
            if d:
                all_dates.add(d)

        # Pre-scan dates from sleep
        for p in sleep_pts:
            d_end = extract_date(p, ["sleep.interval.endTime"])
            d_start = extract_date(p, ["sleep.interval.startTime"])
            if d_end:
                all_dates.add(d_end)
            if d_start:
                all_dates.add(d_start)

        # Pre-scan dates from meals
        for p in nutrition_pts:
            d = extract_date(p, [
                "nutritionLog.interval.civilStartTime.date",
                "nutritionLog.interval.startTime",
                "createTime"
            ])
            if d:
                all_dates.add(d)

        # Pre-scan dates from steps
        for p in step_pts:
            d = extract_date(p, [
                "steps.interval.civilStartTime.date",
                "steps.interval.startTime"
            ])
            if d:
                all_dates.add(d)

        sorted_dates = sorted(list(all_dates))

        # 2. Add Day nodes
        for date_str in sorted_dates:
            day_node_id = f"day:{date_str}"
            day_attrs = {
                "id": day_node_id,
                "type": "Day",
                "date": date_str,
                "total_steps": 0,
                "total_calories_burned": 0,
                "total_calories_intake": 0,
                "total_active_mins": 0,
                "total_sleep_hours": 0.0,
                "workout_count": 0,
                "meal_count": 0,
                "average_hr": None,
                "active_zone_mins": 0,
                "recovery_score": None,
                "avg_workout_performance": None
            }
            self.days[date_str] = day_attrs
            self.graph.add_node(day_node_id, **day_attrs)

        # 3. Add Steps nodes & populate Day steps
        has_fitbit = any(p.get("dataSource", {}).get("platform") == "FITBIT" for p in step_pts)
        daily_steps_counter: Dict[str, int] = {}
        for p in step_pts:
            ds = p.get("dataSource", {})
            if has_fitbit and ds.get("platform") != "FITBIT":
                continue
            st = p.get("steps", {})
            cnt = int(st.get("count", 0))
            d = extract_date(p, ["steps.interval.civilStartTime.date", "steps.interval.startTime"])
            if d and d in self.days:
                daily_steps_counter[d] = daily_steps_counter.get(d, 0) + cnt

        for date_str, step_cnt in daily_steps_counter.items():
            steps_node_id = f"steps:{date_str}"
            steps_attrs = {
                "id": steps_node_id,
                "type": "Steps",
                "date": date_str,
                "count": step_cnt,
                "source": "FITBIT" if has_fitbit else "AGGREGATED"
            }
            self.graph.add_node(steps_node_id, **steps_attrs)
            self.graph.add_edge(f"day:{date_str}", steps_node_id, relationship="RECORDED_STEPS")
            self.days[date_str]["total_steps"] = step_cnt
            self.graph.nodes[f"day:{date_str}"]["total_steps"] = step_cnt

        # 4. Add Workout nodes
        daily_hr_values: Dict[str, List[int]] = {}
        daily_workout_scores: Dict[str, List[int]] = {}

        for idx, p in enumerate(exercise_pts):
            ex = p.get("exercise", {})
            metrics = ex.get("metricsSummary", {})
            interval = ex.get("interval", {})
            start_time = interval.get("startTime", "")
            d = extract_date(p, ["exercise.interval.startTime", "createTime"]) or (start_time[:10] if start_time else "")
            
            if not d:
                continue

            workout_id = f"workout:{idx + 1}_{d}"
            ex_type = ex.get("exerciseType", "WORKOUT")
            name = ex.get("displayName") or ex_type
            
            dur_mins = 0
            if ex.get("activeDuration") and isinstance(ex["activeDuration"], str) and ex["activeDuration"].endswith("s"):
                dur_mins = round(float(ex["activeDuration"][:-1]) / 60)
            elif interval.get("startTime") and interval.get("endTime"):
                try:
                    t1 = datetime.fromisoformat(interval["startTime"].replace("Z", "+00:00"))
                    t2 = datetime.fromisoformat(interval["endTime"].replace("Z", "+00:00"))
                    dur_mins = round((t2 - t1).total_seconds() / 60)
                except Exception:
                    dur_mins = 0

            cals = int(metrics.get("caloriesKcal", 0))
            steps = int(metrics.get("steps", 0))
            dist_mm = int(metrics.get("distanceMillimeters", 0))
            dist_km = round(dist_mm / 1_000_000, 2)
            avg_hr = metrics.get("averageHeartRateBeatsPerMinute")
            azm = int(metrics.get("activeZoneMinutes", 0))
            hr_zones = metrics.get("heartRateZoneDurations", {})

            # Compute definitive Workout Performance Score
            perf_score = compute_workout_performance_score(cals, azm, dur_mins)
            daily_workout_scores.setdefault(d, []).append(perf_score)

            # Intensity determination
            intensity = "MODERATE"
            if (avg_hr and int(avg_hr) >= 110) or azm >= 45 or perf_score >= 70:
                intensity = "VIGOROUS"
            elif (avg_hr and int(avg_hr) < 90) and perf_score < 40:
                intensity = "LIGHT"

            workout_attrs = {
                "id": workout_id,
                "type": "Workout",
                "name": name,
                "exercise_type": ex_type,
                "date": d,
                "start_time": start_time,
                "duration_mins": dur_mins,
                "calories_burned": cals,
                "steps": steps,
                "distance_km": dist_km,
                "average_hr": int(avg_hr) if avg_hr else None,
                "active_zone_mins": azm,
                "intensity": intensity,
                "performance_score": perf_score,
                "hr_zones": hr_zones
            }
            self.graph.add_node(workout_id, **workout_attrs)
            self.graph.add_edge(f"day:{d}", workout_id, relationship="DID_WORKOUT")
            self.graph.add_edge(workout_id, f"day:{d}", relationship="PERFORMED_ON")

            # Update day aggregates
            if d in self.days:
                self.days[d]["total_calories_burned"] += cals
                self.days[d]["total_active_mins"] += dur_mins
                self.days[d]["workout_count"] += 1
                self.days[d]["active_zone_mins"] += azm
                self.graph.nodes[f"day:{d}"]["total_calories_burned"] = self.days[d]["total_calories_burned"]
                self.graph.nodes[f"day:{d}"]["total_active_mins"] = self.days[d]["total_active_mins"]
                self.graph.nodes[f"day:{d}"]["workout_count"] = self.days[d]["workout_count"]
                self.graph.nodes[f"day:{d}"]["active_zone_mins"] = self.days[d]["active_zone_mins"]

                if avg_hr:
                    daily_hr_values.setdefault(d, []).append(int(avg_hr))

        # Set average workout performance per day
        for d, scores in daily_workout_scores.items():
            if d in self.days and scores:
                avg_p = round(sum(scores) / len(scores))
                self.days[d]["avg_workout_performance"] = avg_p
                self.graph.nodes[f"day:{d}"]["avg_workout_performance"] = avg_p

        # 5. Add HeartRate nodes
        for date_str, hr_list in daily_hr_values.items():
            if hr_list:
                avg_val = round(sum(hr_list) / len(hr_list))
                max_val = max(hr_list)
                hr_node_id = f"hr:{date_str}"
                hr_attrs = {
                    "id": hr_node_id,
                    "type": "HeartRate",
                    "date": date_str,
                    "average_bpm": avg_val,
                    "max_bpm": max_val,
                    "measurements_count": len(hr_list)
                }
                self.graph.add_node(hr_node_id, **hr_attrs)
                self.graph.add_edge(f"day:{date_str}", hr_node_id, relationship="HAD_HEART_RATE")
                self.days[date_str]["average_hr"] = avg_val
                self.graph.nodes[f"day:{date_str}"]["average_hr"] = avg_val

        # 6. Add Sleep nodes & link to the awakening Day
        for idx, p in enumerate(sleep_pts):
            sl = p.get("sleep", {})
            interval = sl.get("interval", {})
            summary = sl.get("summary", {})
            
            start_time = interval.get("startTime", "")
            end_time = interval.get("endTime", "")
            
            wake_date = end_time[:10] if end_time else (start_time[:10] if start_time else "")
            sleep_id = f"sleep:{idx + 1}_{wake_date}"

            mins_asleep = int(summary.get("minutesAsleep", 0))
            mins_awake = int(summary.get("minutesAwake", 0))
            hours_asleep = round(mins_asleep / 60, 2)
            
            light_mins = 0
            deep_mins = 0
            rem_mins = 0
            stages_summary = summary.get("stagesSummary", [])
            for st in stages_summary:
                st_type = (st.get("type") or "").upper()
                st_mins = int(st.get("minutes", 0))
                if st_type == "LIGHT":
                    light_mins += st_mins
                elif st_type == "DEEP":
                    deep_mins += st_mins
                elif st_type == "REM":
                    rem_mins += st_mins

            total_restful = deep_mins + rem_mins
            deep_rem_ratio = round(total_restful / max(mins_asleep, 1), 2)
            efficiency_pct = round((mins_asleep / max(mins_asleep + mins_awake, 1)) * 100)

            # Compute definitive Sleep Recovery Score
            rec_score = compute_recovery_score(hours_asleep, efficiency_pct, deep_rem_ratio)

            sleep_attrs = {
                "id": sleep_id,
                "type": "Sleep",
                "wake_date": wake_date,
                "start_time": start_time,
                "end_time": end_time,
                "minutes_asleep": mins_asleep,
                "minutes_awake": mins_awake,
                "hours_asleep": hours_asleep,
                "light_mins": light_mins,
                "deep_mins": deep_mins,
                "rem_mins": rem_mins,
                "deep_rem_ratio": deep_rem_ratio,
                "efficiency_pct": efficiency_pct,
                "recovery_score": rec_score,
                "stages": stages_summary
            }
            self.graph.add_node(sleep_id, **sleep_attrs)
            
            if wake_date and wake_date in self.days:
                self.graph.add_edge(f"day:{wake_date}", sleep_id, relationship="HAD_SLEEP")
                self.days[wake_date]["total_sleep_hours"] = hours_asleep
                self.days[wake_date]["recovery_score"] = rec_score
                self.graph.nodes[f"day:{wake_date}"]["total_sleep_hours"] = hours_asleep
                self.graph.nodes[f"day:{wake_date}"]["recovery_score"] = rec_score

        # 7. Add Meal nodes
        for idx, p in enumerate(nutrition_pts):
            nl = p.get("nutritionLog") or p.get("food") or {}
            name = nl.get("foodDisplayName") or nl.get("displayName") or f"Meal #{idx + 1}"
            meal_type = (nl.get("mealType") or "MEAL").upper()
            
            cals = 0
            if nl.get("energy") and "kcal" in nl["energy"]:
                cals = int(nl["energy"]["kcal"])
            elif nl.get("calories"):
                cals = int(nl["calories"])

            carbs = int(nl.get("totalCarbohydrate", {}).get("grams", 0))
            fat = int(nl.get("totalFat", {}).get("grams", 0))
            protein = int(nl.get("protein", {}).get("grams", 0))
            
            d = extract_date(p, [
                "nutritionLog.interval.civilStartTime.date",
                "nutritionLog.interval.startTime",
                "createTime"
            ])
            
            if not d or d not in self.days:
                continue

            meal_id = f"meal:{idx + 1}_{d}"
            meal_attrs = {
                "id": meal_id,
                "type": "Meal",
                "food_name": name,
                "meal_type": meal_type,
                "date": d,
                "calories": cals,
                "carbs_g": carbs,
                "fat_g": fat,
                "protein_g": protein
            }
            self.graph.add_node(meal_id, **meal_attrs)
            self.graph.add_edge(f"day:{d}", meal_id, relationship="CONSUMED_MEAL")

            self.days[d]["total_calories_intake"] += cals
            self.days[d]["meal_count"] += 1
            self.graph.nodes[f"day:{d}"]["total_calories_intake"] = self.days[d]["total_calories_intake"]
            self.graph.nodes[f"day:{d}"]["meal_count"] = self.days[d]["meal_count"]

        # 8. Compute and store derived cross-day relationships
        for i in range(len(sorted_dates) - 1):
            d_prev = sorted_dates[i]
            d_curr = sorted_dates[i + 1]
            
            self.graph.add_edge(
                f"day:{d_prev}",
                f"day:{d_curr}",
                relationship="PRECEDED",
                delta_days=1
            )

            sleep_nodes = [
                n for n, attr in self.graph.nodes(data=True)
                if attr.get("type") == "Sleep" and attr.get("wake_date") == d_curr
            ]
            
            curr_workouts = [
                n for n, attr in self.graph.nodes(data=True)
                if attr.get("type") == "Workout" and attr.get("date") == d_curr
            ]

            if sleep_nodes:
                sleep_attr = self.graph.nodes[sleep_nodes[0]]
                sleep_hrs = sleep_attr.get("hours_asleep", 0.0)
                efficiency = sleep_attr.get("efficiency_pct", 0)
                deep_rem = sleep_attr.get("deep_rem_ratio", 0.0)
                rec_score = sleep_attr.get("recovery_score", 0)

                self.graph.add_edge(
                    f"day:{d_prev}",
                    f"day:{d_curr}",
                    relationship="SLEEP_IMPACT",
                    sleep_hours=sleep_hrs,
                    sleep_efficiency=efficiency,
                    recovery_score=rec_score,
                    next_day_active_mins=self.days[d_curr]["total_active_mins"],
                    next_day_steps=self.days[d_curr]["total_steps"],
                    next_day_performance=self.days[d_curr].get("avg_workout_performance")
                )

                for w_id in curr_workouts:
                    w_attr = self.graph.nodes[w_id]
                    self.graph.add_edge(
                        sleep_nodes[0],
                        w_id,
                        relationship="INFLUENCED_WORKOUT",
                        prior_sleep_hours=sleep_hrs,
                        prior_sleep_efficiency=efficiency,
                        deep_rem_ratio=deep_rem,
                        prior_recovery_score=rec_score,
                        workout_performance_score=w_attr.get("performance_score", 0),
                        workout_calories=w_attr.get("calories_burned", 0),
                        workout_duration=w_attr.get("duration_mins", 0),
                        workout_avg_hr=w_attr.get("average_hr")
                    )

        return self.graph

    # Query Helper Methods
    def get_days(self) -> List[str]:
        """Returns sorted list of available calendar dates."""
        return sorted(list(self.days.keys()))

    def get_day_summary(self, date_str: str) -> Optional[Dict[str, Any]]:
        """Returns aggregated data and linked entities for a specific date."""
        day_id = f"day:{date_str}"
        if not self.graph.has_node(day_id):
            return None

        day_data = dict(self.graph.nodes[day_id])
        
        workouts = []
        sleeps = []
        meals = []
        heart_rates = []

        for _, neighbor, edge_data in self.graph.out_edges(day_id, data=True):
            rel = edge_data.get("relationship")
            n_data = dict(self.graph.nodes[neighbor])
            if rel == "DID_WORKOUT":
                workouts.append(n_data)
            elif rel == "HAD_SLEEP":
                sleeps.append(n_data)
            elif rel == "CONSUMED_MEAL":
                meals.append(n_data)
            elif rel == "HAD_HEART_RATE":
                heart_rates.append(n_data)

        day_data["workouts"] = workouts
        day_data["sleep_records"] = sleeps
        day_data["meals"] = meals
        day_data["heart_rate"] = heart_rates[0] if heart_rates else None

        prior_impact = None
        for u, _, edge_data in self.graph.in_edges(day_id, data=True):
            if edge_data.get("relationship") == "SLEEP_IMPACT":
                prior_impact = edge_data
                break
        day_data["prior_night_sleep_impact"] = prior_impact

        return day_data

    def get_cross_day_edges(self) -> List[Dict[str, Any]]:
        """Returns all derived cross-day relationships in the graph."""
        edges = []
        for u, v, data in self.graph.edges(data=True):
            if data.get("relationship") in ["INFLUENCED_WORKOUT", "SLEEP_IMPACT"]:
                edges.append({
                    "from": u,
                    "to": v,
                    "relationship": data.get("relationship"),
                    "attributes": {k: v for k, v in data.items() if k != "relationship"}
                })
        return edges

    def get_metric_series(self, metric_name: str) -> List[Tuple[str, float]]:
        """Extracts a time-series list of (date, value) for any day metric."""
        series = []
        for d in self.get_days():
            val = self.days[d].get(metric_name)
            if val is not None:
                series.append((d, float(val)))
        return series

    def get_graph_stats(self) -> Dict[str, Any]:
        """Returns topology statistics of the knowledge graph."""
        node_counts_by_type: Dict[str, int] = {}
        for _, attr in self.graph.nodes(data=True):
            t = attr.get("type", "Unknown")
            node_counts_by_type[t] = node_counts_by_type.get(t, 0) + 1

        edge_counts_by_rel: Dict[str, int] = {}
        for _, _, attr in self.graph.edges(data=True):
            r = attr.get("relationship", "Unknown")
            edge_counts_by_rel[r] = edge_counts_by_rel.get(r, 0) + 1

        return {
            "total_nodes": self.graph.number_of_nodes(),
            "total_edges": self.graph.number_of_edges(),
            "nodes_by_type": node_counts_by_type,
            "edges_by_relationship": edge_counts_by_rel,
            "available_dates": self.get_days()
        }
