# models / contact.py

# imports.
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from .base import Base


# contact model.
class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)                      # id.
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)       # foreign key to user (one-to-one).
    email = Column(String(255), nullable=True)                               # email.
    phone = Column(String(50), nullable=True)                                # phone number.
    github = Column(String(500), nullable=True)                              # GitHub URL.
    linkedin = Column(String(500), nullable=True)                             # LinkedIn URL.
    portfolio = Column(String(500), nullable=True)                            # Portfolio/website URL.

    # relationship back to user.
    user = relationship("User", back_populates="contact")

