# routers/__init__.py

# export routers.
from .auth import router as auth_router
from .users import router as users_router
from .profile import router as profile_router
from .resume_generator import router as generator_router
from .templates import router as templates_router

__all__ = ["auth_router", "users_router", "profile_router", "generator_router", "templates_router"]

