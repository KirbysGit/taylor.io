# models / skills.py

# imports.
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base


# skills model.
class Skills(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)                      # id.
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)       # foreign key to user.
    name = Column(String(100), nullable=False)                              # skill name.

    # relationship back to user.
    user = relationship("User", back_populates="skills")

