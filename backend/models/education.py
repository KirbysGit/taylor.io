# models / education.py

# imports.
from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, Boolean
from sqlalchemy.orm import relationship
from .base import Base


# education model.
class Education(Base):
    __tablename__ = "education"

    id = Column(Integer, primary_key=True, index=True)                      # id.
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)       # foreign key to user.
    school = Column(String(200), nullable=True)                             # school name.
    degree = Column(String(200), nullable=True)                            # degree type (e.g., "Bachelor of Science").
    field = Column(String(200), nullable=True)                             # field of study (e.g., "Computer Engineering").
    start_date = Column(DateTime, nullable=True)                            # start date.
    end_date = Column(DateTime, nullable=True)                              # end date (null if current).
    current = Column(Boolean, nullable=False, default=False)                # current status.
    gpa = Column(String(50), nullable=True)                                 # GPA (e.g., "3.78 / 4.0").
    honors_awards = Column(Text, nullable=True)                              # honors and awards (text field).
    clubs_extracurriculars = Column(Text, nullable=True)                     # clubs and extracurriculars (text field).
    location = Column(String(100), nullable=True)                            # location (e.g., "Orlando, FL").
    relevant_coursework = Column(Text, nullable=True)                         # relevant coursework (text field).

    # relationship back to user.
    user = relationship("User", back_populates="education")

