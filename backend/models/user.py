# models / user.py

# imports.
from sqlalchemy import Column, Integer, String, JSON, DateTime
from sqlalchemy.orm import relationship
from .base import Base


# main user model.
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)                      # id.
    first_name = Column(String(100), nullable=False)                        # first name.
    last_name = Column(String(100), nullable=False)                         # last name.
    email = Column(String(255), unique=True, nullable=False, index=True)    # email.
    password_hash = Column(String(255), nullable=False)                     # password.

    # attached resume metadata (Info page: "Attached Resume" banner)
    attached_resume_filename = Column(String(255), nullable=True)
    attached_resume_uploaded_at = Column(DateTime, nullable=True)

    # one user has many experiences, projects, skills, education, and contact entries.
    summary = relationship("Summary", back_populates="user", uselist=False, cascade="all, delete-orphan")
    
    experiences = relationship("Experience", back_populates="user", cascade="all, delete-orphan")
    
    projects = relationship("Projects", back_populates="user", cascade="all, delete-orphan")
    
    skills = relationship("Skills", back_populates="user", cascade="all, delete-orphan")
    
    education = relationship("Education", back_populates="user", cascade="all, delete-orphan")
    
    contact = relationship("Contact", back_populates="user", uselist=False, cascade="all, delete-orphan")

    # optional per-user section header overrides, e.g., {"education": "Academics"}
    section_labels = Column(JSON, nullable=True)

    # saved resume previews (snapshots for later)
    saved_resumes = relationship("SavedResume", back_populates="user", cascade="all, delete-orphan")

