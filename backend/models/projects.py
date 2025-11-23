# models / projects.py

# imports.
from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, JSON
from sqlalchemy.orm import relationship
from .base import Base

# projects model.
class Projects(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)                      # id.
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)       # foreign key to user.
    title = Column(String(200), nullable=False)                             # title.
    description = Column(String(500), nullable=True)                        # description.
    tech_stack = Column(JSON, nullable=True)                                # tech stack as list of strings.
    url = Column(String(500), nullable=True)                                # project URL/link.

    # relationship back to user.
    user = relationship("User", back_populates="projects")