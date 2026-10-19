"""Root WSGI entrypoint for Vercel and serverless deployments."""
import os
from config.wsgi import application, app

__all__ = ["application", "app"]
