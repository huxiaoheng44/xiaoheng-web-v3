"""ASGI entrypoint. API implementation lives under app/api; no frontend code."""
from .app.api.routes import app, create_app

__all__ = ['app', 'create_app']
