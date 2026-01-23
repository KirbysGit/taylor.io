# schemas.py

# pydantic schemas for request/response validation.
# basically define shape and rules for data coming in and going out of our api.

# imports.
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Union, Dict
from datetime import datetime


# --------- user schemas ---------

class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    section_labels: Optional[Dict[str, str]] = None

    model_config = {"from_attributes": True}


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


# --------- education schemas ---------

class EducationCreate(BaseModel):
    school: Optional[str] = None
    degree: Optional[str] = None
    discipline: Optional[str] = None
    minor: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    current: bool = False
    gpa: Optional[str] = None
    location: Optional[str] = None
    subsections: Optional[Dict[str, str]] = None


class EducationResponse(BaseModel):
    id: int
    user_id: int
    school: Optional[str] = None
    degree: Optional[str] = None
    discipline: Optional[str] = None
    minor: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    current: bool = False
    gpa: Optional[str] = None
    location: Optional[str] = None
    subsections: Optional[Dict[str, str]] = None

    model_config = {"from_attributes": True}


# --------- experience schemas ---------

class ExperienceCreate(BaseModel):
    title: str
    company: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    location: Optional[str] = None
    role_type: Optional[str] = None


class ExperienceResponse(BaseModel):
    id: int
    user_id: int
    title: str
    company: Optional[str]
    description: Optional[str]
    start_date: Optional[datetime]
    end_date: Optional[datetime]
    location: Optional[str] = None
    role_type: Optional[str] = None

    model_config = {"from_attributes": True}


# --------- project schemas ---------

class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None
    tech_stack: Optional[List[str]] = None
    url: Optional[str] = None


class ProjectResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: Optional[str]
    tech_stack: Optional[List[str]]
    url: Optional[str] = None

    model_config = {"from_attributes": True}


# --------- skill schemas ---------

class SkillCreate(BaseModel):
    name: str


class SkillResponse(BaseModel):
    id: int
    user_id: int
    name: str

    model_config = {"from_attributes": True}


# --------- contact schemas ---------

class ContactCreate(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    github: Optional[str] = None
    linkedin: Optional[str] = None
    portfolio: Optional[str] = None
    location: Optional[str] = None


class ContactResponse(BaseModel):
    id: int
    user_id: int
    email: Optional[str] = None
    phone: Optional[str] = None
    github: Optional[str] = None
    linkedin: Optional[str] = None
    portfolio: Optional[str] = None
    location: Optional[str] = None

    model_config = {"from_attributes": True}


# --------- user profile schema ---------

class UserProfileResponse(BaseModel):
    user: UserResponse
    experiences: List[ExperienceResponse]
    projects: List[ProjectResponse]
    skills: List[SkillResponse]
    education: List[EducationResponse] = []
    contact: Optional[ContactResponse] = None


# --------- section labels ---------
class SectionLabelsUpdate(BaseModel):
    section_labels: Dict[str, str]


# --------- parsed resume schemas ---------

class ParsedContactInfo(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    github: Optional[str] = None
    linkedin: Optional[str] = None
    portfolio: Optional[str] = None
    location: Optional[str] = None


class ParsedEducation(BaseModel):
    school: Optional[str] = None
    degree: Optional[str] = None
    discipline: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    current: bool = False
    gpa: Optional[str] = None
    location: Optional[str] = None
    subsections: Optional[Dict[str, str]] = None


class ParsedExperience(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    description: Optional[Union[str, List[str]]] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    current: bool = False
    location: Optional[str] = None
    roleType: Optional[str] = None


class ParsedProject(BaseModel):
    title: Optional[str] = None
    description: Optional[Union[str, List[str]]] = None
    techStack: Optional[List[str]] = None
    url: Optional[str] = None


class ParsedSkill(BaseModel):
    name: str
    category: Optional[str] = None  # e.g., "Languages", "Frameworks", "Data Tools"


class ParsedResumeResponse(BaseModel):
    experiences: List[ParsedExperience] = []
    education: List[ParsedEducation] = []
    skills: List[ParsedSkill] = []
    projects: List[ParsedProject] = []
    contact_info: ParsedContactInfo = ParsedContactInfo()
    warnings: List[str] = []

