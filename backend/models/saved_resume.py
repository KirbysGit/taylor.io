# models / saved_resume.py

# Saved resume preview - user can save a snapshot of their resume for later.
# Limited per user (configurable via MAX_SAVED_RESUMES).

from datetime import datetime
from sqlalchemy import Column, Integer, String, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base


class SavedResume(Base):
    __tablename__ = "saved_resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)  # e.g. "Software Engineer Resume"
    resume_data = Column(JSON, nullable=False)      # full resume state (header, education, experience, etc.)
    template = Column(String(100), nullable=True)  # template used when saved
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="saved_resumes")
