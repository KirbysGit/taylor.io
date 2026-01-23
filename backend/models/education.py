# models / education.py

# imports.
from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, Boolean, JSON
from sqlalchemy.orm import relationship
from .base import Base


# education model.
class Education(Base):
    __tablename__ = "education"

    id = Column(Integer, primary_key=True, index=True)                          # id.
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)       # foreign key to user.
    school = Column(String(200), nullable=True)                                 # school name.
    degree = Column(String(200), nullable=True)                                 # degree type.
    discipline = Column(String(200), nullable=True)                             # field of study.
    start_date = Column(DateTime, nullable=True)                                # start date.
    end_date = Column(DateTime, nullable=True)                                  # end date (null if current).
    current = Column(Boolean, nullable=False, default=False)                    # current status.
    gpa = Column(String(50), nullable=True)                                     # gpa.
    location = Column(String(100), nullable=True)                               # location.
    minor = Column(String(200), nullable=True)                                  # minor field of study.
    subsections = Column(JSON, nullable=True)                                   # user sections (ex. honors, clubs)
    

    # relationship back to user.
    user = relationship("User", back_populates="education")

