# models / experience.py

# imports.
from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from .base import Base


# experience model.
class Experience(Base):
    __tablename__ = "experiences"

    id = Column(Integer, primary_key=True, index=True)                      # id.
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)       # foreign key to user.
    title = Column(String(200), nullable=False)                             # title.
    company = Column(String(200), nullable=True)                            # company.
    description = Column(Text, nullable=True)                               # description.
    start_date = Column(DateTime, nullable=True)                            # start date.
    end_date = Column(DateTime, nullable=True)                              # end date (null if current).
    location = Column(String(100), nullable=True)                           # location (e.g., Remote, On-site, Hybrid).
    role_type = Column(String(50), nullable=True)                           # role type (e.g., Full-time, Part-time, Contract).

    # relationship back to user.
    user = relationship("User", back_populates="experiences")

