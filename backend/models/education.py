# models / education.py

# imports.
from sqlalchemy import Column, Integer, String, ForeignKey, Text, DateTime, Boolean
from sqlalchemy.orm import relationship
from .base import Base


# education model.
class Education(Base):
    __tablename__ = "education"

    id = Column(Integer, primary_key=True, index=True)                          # id.
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)       # foreign key to user.
    school = Column(String(200), nullable=True)                                 # school name.
    degree = Column(String(200), nullable=True)                                 # degree type.
    field = Column(String(200), nullable=True)                                  # field of study.
    start_date = Column(DateTime, nullable=True)                                # start date.
    end_date = Column(DateTime, nullable=True)                                  # end date (null if current).
    current = Column(Boolean, nullable=False, default=False)                    # current status.
    gpa = Column(String(50), nullable=True)                                     # gpa.
    honors_awards = Column(Text, nullable=True)                                 # honors and awards.
    clubs_extracurriculars = Column(Text, nullable=True)                        # clubs and extracurriculars.
    location = Column(String(100), nullable=True)                               # location.
    relevant_coursework = Column(Text, nullable=True)                           # relevant coursework.

    # relationship back to user.
    user = relationship("User", back_populates="education")

