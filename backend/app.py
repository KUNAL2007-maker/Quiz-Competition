#!/usr/bin/env python3
"""
Null Origin — Python Backend Logic & HTTP Engine
Provides pure, deterministic competition countdown math, quiz assessment evaluation,
operator callsign validation, leaderboard ranking computation, and an HTTP JSON API
server (port 5001) proxied by the Node/Vite gateway.
"""

from __future__ import annotations
import json
import math
import re
import sys
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import parse_qs, urlparse


# ============================================================================
# 1. PURE DOMAIN LOGIC FUNCTIONS
# ============================================================================

def parse_timestamp_ms(target_timestamp: Optional[Any]) -> Optional[int]:
    """Parse an ISO-8601 string or epoch milliseconds into integer milliseconds."""
    if target_timestamp is None or target_timestamp == "":
        return None
    if isinstance(target_timestamp, (int, float)):
        if math.isnan(target_timestamp) or math.isinf(target_timestamp):
            return None
        return int(target_timestamp)
    if isinstance(target_timestamp, str):
        raw = target_timestamp.strip()
        if not raw:
            return None
        if re.match(r"^-?\d+(\.\d+)?$", raw):
            return int(float(raw))
        try:
            iso_normalized = raw.replace("Z", "+00:00")
            dt = datetime.fromisoformat(iso_normalized)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return int(dt.timestamp() * 1000)
        except ValueError:
            return None
    return None


def calculate_countdown(
    target_timestamp: Optional[Any],
    now_ms: Optional[int] = None,
    reference_duration_ms: int = 3600 * 1000,
) -> Dict[str, Any]:
    """
    Pure drift-free countdown calculation from a target timestamp and current epoch ms.
    Never invents a timestamp when target_timestamp is missing or invalid.
    """
    if now_ms is None:
        now_ms = int(datetime.now(timezone.utc).timestamp() * 1000)

    parsed_target = parse_timestamp_ms(target_timestamp)
    if parsed_target is None:
        return {
            "totalMs": 0,
            "days": 0,
            "hours": 0,
            "minutes": 0,
            "seconds": 0,
            "isExpired": False,
            "isValid": False,
            "progressPercent": 0,
        }

    diff_ms = max(0, parsed_target - now_ms)
    is_expired = parsed_target <= now_ms

    total_seconds = math.ceil(diff_ms / 1000.0)
    days = total_seconds // 86400
    hours = (total_seconds % 86400) // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60

    safe_ref = reference_duration_ms if reference_duration_ms > 0 else 3600 * 1000
    elapsed_ratio = min(1.0, max(0.0, 1.0 - (diff_ms / float(safe_ref))))
    progress_percent = 100 if is_expired else int(round(elapsed_ratio * 100))

    return {
        "totalMs": int(diff_ms),
        "days": int(days),
        "hours": int(hours),
        "minutes": int(minutes),
        "seconds": int(seconds),
        "isExpired": bool(is_expired),
        "isValid": True,
        "progressPercent": int(progress_percent),
    }


def validate_operator_profile(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate operator profile fields (displayName, username/callsign, biography)
    against the strict schema boundaries.
    """
    display_name = str(payload.get("displayName", "") or "").strip()
    username = str(payload.get("username", "") or "").strip()
    biography = str(payload.get("biography", "") or "").strip()

    errors: Dict[str, str] = {}

    if len(display_name) > 0 and len(display_name) < 2:
        errors["displayName"] = "Display name must be at least 2 characters."
    elif len(display_name) > 48:
        errors["displayName"] = "Display name cannot exceed 48 characters."

    if len(username) > 0:
        if not re.match(r"^[a-zA-Z0-9_.-]{3,24}$", username):
            errors["username"] = (
                "Callsign handle must be 3–24 alphanumeric characters, underscores, dots, or hyphens."
            )

    if len(biography) > 280:
        errors["biography"] = "Operator biography cannot exceed 280 characters."

    return {
        "isValid": len(errors) == 0,
        "errors": errors,
        "sanitized": {
            "displayName": display_name[:48],
            "username": username[:24],
            "biography": biography[:280],
        },
    }


def evaluate_quiz_submission(
    questions: List[Dict[str, Any]],
    selected_answers: Dict[str, str],
    marked_for_review: Optional[Dict[str, bool]] = None,
    time_taken_seconds: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Pure quiz evaluation engine.
    Computes answered/unanswered counts, score, accuracy percentage, and topic breakdown
    when real questions with correctOptionId are provided. Never invents questions.
    """
    marked_for_review = marked_for_review or {}
    total_questions = len(questions)

    if total_questions == 0:
        return {
            "totalQuestions": 0,
            "answeredCount": 0,
            "unansweredCount": 0,
            "markedForReviewCount": 0,
            "correctCount": 0,
            "incorrectCount": 0,
            "finalScore": 0,
            "maxScore": 0,
            "accuracyPercent": 0,
            "timeTakenSeconds": time_taken_seconds,
            "topicBreakdown": [],
        }

    answered_count = 0
    review_count = 0
    correct_count = 0
    incorrect_count = 0
    final_score = 0
    max_score = 0

    topic_totals: Dict[str, List[int]] = {}  # topic -> [earned, possible]

    for q in questions:
        qid = str(q.get("id", ""))
        points = int(q.get("points", 100) or 100)
        category = str(q.get("category", "General Security") or "General Security")
        correct_opt = q.get("correctOptionId")

        max_score += points
        if category not in topic_totals:
            topic_totals[category] = [0, 0]
        topic_totals[category][1] += points

        if marked_for_review.get(qid):
            review_count += 1

        chosen = selected_answers.get(qid)
        if chosen is not None and str(chosen).strip() != "":
            answered_count += 1
            if correct_opt is not None:
                if str(chosen) == str(correct_opt):
                    correct_count += 1
                    final_score += points
                    topic_totals[category][0] += points
                else:
                    incorrect_count += 1

    unanswered_count = max(0, total_questions - answered_count)
    total_incorrect = incorrect_count + unanswered_count
    accuracy_percent = (
        int(round((correct_count / float(total_questions)) * 100))
        if total_questions > 0
        else 0
    )

    topic_breakdown = []
    for topic, (earned, possible) in topic_totals.items():
        pct = int(round((earned / float(possible)) * 100)) if possible > 0 else 0
        topic_breakdown.append({"topic": topic, "scorePercent": pct})

    return {
        "totalQuestions": total_questions,
        "answeredCount": answered_count,
        "unansweredCount": unanswered_count,
        "unwrittenCount": unanswered_count,
        "wrongAnswerCount": incorrect_count,
        "markedForReviewCount": review_count,
        "correctCount": correct_count,
        "incorrectCount": total_incorrect,
        "finalScore": final_score,
        "maxScore": max_score,
        "accuracyPercent": accuracy_percent,
        "timeTakenSeconds": time_taken_seconds,
        "topicBreakdown": topic_breakdown,
    }


def compute_leaderboard_rankings(entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Pure leaderboard ranking sorter.
    Sorts real participant entries by score DESC, then accuracyPercent DESC,
    then completionTimeSeconds ASC, and assigns 1-based rank numbers.
    Returns an empty list when no entries exist.
    """
    if not entries:
        return []

    def sort_key(item: Dict[str, Any]) -> Tuple[int, int, float, float]:
        score = int(item.get("score", 0) or 0)
        time_sec = item.get("completionTimeSeconds")
        safe_time = int(time_sec) if isinstance(time_sec, (int, float)) and time_sec >= 0 else 999999999
        created_val = item.get("createdAt")
        safe_created = float(created_val) if isinstance(created_val, (int, float)) else 9999999999.0
        accuracy = float(item.get("accuracyPercent", 0.0) or 0.0)
        return (-score, safe_time, safe_created, -accuracy)

    sorted_items = sorted(entries, key=sort_key)
    ranked: List[Dict[str, Any]] = []
    for idx, item in enumerate(sorted_items, start=1):
        copy_item = dict(item)
        copy_item["rank"] = idx
        ranked.append(copy_item)
    return ranked


# ============================================================================
# 2. HTTP JSON API SERVER (PORT 5001)
# ============================================================================

class AegisPythonAPIHandler(BaseHTTPRequestHandler):
    def _send_json(self, status_code: int, payload: Dict[str, Any]) -> None:
        raw = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        self.wfile.write(raw)

    def _read_json_body(self) -> Dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {}

    def do_OPTIONS(self) -> None:
        self._send_json(200, {"ok": True})

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/python/health":
            self._send_json(
                200,
                {
                    "status": "online",
                    "engine": "python3",
                    "version": sys.version.split()[0],
                },
            )
            return

        if parsed.path == "/api/python/countdown":
            qs = parse_qs(parsed.query)
            target = qs.get("targetTime", [None])[0]
            now_param = qs.get("nowMs", [None])[0]
            now_ms = int(now_param) if now_param and now_param.isdigit() else None
            result = calculate_countdown(target, now_ms=now_ms)
            self._send_json(200, result)
            return

        self._send_json(404, {"error": "Endpoint not found"})

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        body = self._read_json_body()

        if parsed.path == "/api/python/validate-profile":
            result = validate_operator_profile(body)
            self._send_json(200, result)
            return

        if parsed.path == "/api/python/evaluate-quiz":
            questions = body.get("questions", [])
            selected_answers = body.get("selectedAnswers", {})
            marked_for_review = body.get("markedForReview", {})
            time_taken = body.get("timeTakenSeconds")
            result = evaluate_quiz_submission(
                questions if isinstance(questions, list) else [],
                selected_answers if isinstance(selected_answers, dict) else {},
                marked_for_review if isinstance(marked_for_review, dict) else {},
                time_taken if isinstance(time_taken, int) else None,
            )
            self._send_json(200, result)
            return

        if parsed.path == "/api/python/rank-leaderboard":
            entries = body.get("entries", [])
            ranked = compute_leaderboard_rankings(entries if isinstance(entries, list) else [])
            self._send_json(200, {"entries": ranked})
            return

        self._send_json(404, {"error": "Endpoint not found"})

    def log_message(self, format: str, *args: Any) -> None:
        # Silence noisy per-request stdout logging
        return


def run_server(port: int = 5001) -> None:
    server = HTTPServer(("127.0.0.1", port), AegisPythonAPIHandler)
    print(f"[Null Origin Python Engine] Listening on http://127.0.0.1:{port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    port_arg = int(sys.argv[1]) if len(sys.argv) > 1 else 5001
    run_server(port_arg)
