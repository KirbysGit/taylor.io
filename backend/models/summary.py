# models / summary.py

# imports.
from sqlalchemy import Column, Integer, ForeignKey, Text
from sqlalchemy.orm import relationship
from .base import Base

# summary model.
class Summary(Base):
    __tablename__ = "professional_summary"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    summary = Column(Text, nullable=False)

    # relationship back to user.
    user = relationship("User", back_populates="summary")