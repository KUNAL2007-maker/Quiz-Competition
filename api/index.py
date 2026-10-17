#!/usr/bin/env python3
"""
Vercel Python Serverless Function Entrypoint
Routes /api/python/* requests directly to the Aegis Python Backend Engine (backend/app.py).
"""

import os
import sys

# Ensure project root is in sys.path so `backend.app` imports cleanly on Vercel
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.app import AegisPythonAPIHandler  # noqa: E402


class handler(AegisPythonAPIHandler):
    """Vercel Python Runtime compatible BaseHTTPRequestHandler."""
    pass
