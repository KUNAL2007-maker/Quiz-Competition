#!/usr/bin/env python3
"""
Unit tests for Null Origin Python backend logic (backend/app.py).
"""

import unittest
from backend.app import (
    calculate_countdown,
    compute_leaderboard_rankings,
    evaluate_quiz_submission,
    validate_operator_profile,
)


class TestAegisPythonBackendLogic(unittest.TestCase):
    def test_countdown_null_or_invalid_stays_standby(self) -> None:
        res_none = calculate_countdown(None, now_ms=1700000000000)
        self.assertFalse(res_none["isValid"])
        self.assertFalse(res_none["isExpired"])
        self.assertEqual(res_none["totalMs"], 0)

        res_bad = calculate_countdown("invalid-date", now_ms=1700000000000)
        self.assertFalse(res_bad["isValid"])
        self.assertEqual(res_bad["totalMs"], 0)

    def test_countdown_calculates_exact_units(self) -> None:
        now = 1700000000000
        # 1 day (86400s) + 2h (7200s) + 3m (180s) + 45s = 93825s
        target = now + 93825 * 1000
        res = calculate_countdown(target, now_ms=now)
        self.assertTrue(res["isValid"])
        self.assertFalse(res["isExpired"])
        self.assertEqual(res["days"], 1)
        self.assertEqual(res["hours"], 2)
        self.assertEqual(res["minutes"], 3)
        self.assertEqual(res["seconds"], 45)

    def test_countdown_expiration(self) -> None:
        now = 1700000000000
        res = calculate_countdown(now - 1000, now_ms=now)
        self.assertTrue(res["isValid"])
        self.assertTrue(res["isExpired"])
        self.assertEqual(res["seconds"], 0)
        self.assertEqual(res["progressPercent"], 100)

    def test_validate_operator_profile(self) -> None:
        valid = validate_operator_profile(
            {
                "displayName": "Cipher Operator",
                "username": "cipher_01",
                "biography": "Forensics and reverse engineering.",
            }
        )
        self.assertTrue(valid["isValid"])
        self.assertEqual(valid["errors"], {})

        invalid = validate_operator_profile(
            {
                "displayName": "A",
                "username": "bad handle!",
                "biography": "x" * 300,
            }
        )
        self.assertFalse(invalid["isValid"])
        self.assertIn("displayName", invalid["errors"])
        self.assertIn("username", invalid["errors"])
        self.assertIn("biography", invalid["errors"])

    def test_evaluate_quiz_submission_empty_and_real(self) -> None:
        empty_eval = evaluate_quiz_submission([], {})
        self.assertEqual(empty_eval["totalQuestions"], 0)
        self.assertEqual(empty_eval["finalScore"], 0)

        questions = [
            {
                "id": "q1",
                "category": "Cryptography",
                "points": 150,
                "correctOptionId": "opt_b",
            },
            {
                "id": "q2",
                "category": "Forensics",
                "points": 100,
                "correctOptionId": "opt_a",
            },
        ]
        answers = {"q1": "opt_b", "q2": "opt_c"}
        review = {"q2": True}
        graded = evaluate_quiz_submission(questions, answers, review, time_taken_seconds=95)
        self.assertEqual(graded["totalQuestions"], 2)
        self.assertEqual(graded["answeredCount"], 2)
        self.assertEqual(graded["correctCount"], 1)
        self.assertEqual(graded["incorrectCount"], 1)
        self.assertEqual(graded["finalScore"], 150)
        self.assertEqual(graded["maxScore"], 250)
        self.assertEqual(graded["accuracyPercent"], 50)
        self.assertEqual(graded["markedForReviewCount"], 1)

    def test_compute_leaderboard_rankings(self) -> None:
        self.assertEqual(compute_leaderboard_rankings([]), [])
        raw = [
            {"participantId": "u1", "displayName": "Alpha", "score": 200, "accuracyPercent": 80, "completionTimeSeconds": 120},
            {"participantId": "u2", "displayName": "Bravo", "score": 350, "accuracyPercent": 95, "completionTimeSeconds": 140},
            {"participantId": "u3", "displayName": "Charlie", "score": 200, "accuracyPercent": 80, "completionTimeSeconds": 90},
        ]
        ranked = compute_leaderboard_rankings(raw)
        self.assertEqual([r["participantId"] for r in ranked], ["u2", "u3", "u1"])
        self.assertEqual([r["rank"] for r in ranked], [1, 2, 3])


if __name__ == "__main__":
    unittest.main()
