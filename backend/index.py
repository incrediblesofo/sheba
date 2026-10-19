"""Entrypoint for Vercel Serverless Functions."""
import os
from config.wsgi import application, app

__all__ = ["application", "app"]
