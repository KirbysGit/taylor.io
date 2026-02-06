# routers/profile.py

# user profile routes (experiences, projects, skills).

# current:
# - get_my_profile                -      gets user's profile w/ all experiences, projects, and skills.
# - create_experience             -      creates a new experience for the current user.
# - create_project                -      creates a new project for the current user.
# - create_skill                  -      creates a new skill for the current user.
# - create_experiences_bulk       -      creates multiple experiences for the current user.
# - create_projects_bulk          -      creates multiple projects for the current user.
# - create_skills_bulk            -      creates multiple skills for the current user.

# imports.
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File

# local imports.
from database import get_db
from schemas import (
    ExperienceCreate, ExperienceResponse,
    ProjectCreate, ProjectResponse,
    SkillCreate, SkillResponse,
    EducationCreate, EducationResponse,
    UserProfileResponse, UserResponse,
    ParsedResumeResponse,
    ContactCreate, ContactResponse,
    SectionLabelsUpdate,
    SummaryCreate, SummaryResponse,
)
from resume_parser import parse_resume_file
from .auth import get_current_user_from_token
from models import User, Experience, Projects, Skills, Contact, Education, Summary

# create router.
router = APIRouter(prefix="/api/profile", tags=["profile"])

# ------------------- helper functions -------------------

# normalize skill name for case-insensitive matching
def normalize_skill_name(name: str) -> str:
    """Normalize skill name to lowercase for case-insensitive matching."""
    return name.strip().lower() if name else ""

# normalize category: empty string -> None, trim, limit to 50 chars
def normalize_category(category: Optional[str]) -> Optional[str]:
    """Normalize category: empty/None -> None, trim, max 50 chars."""
    if not category or not category.strip():
        return None
    normalized = category.strip()[:50]
    return normalized if normalized else None

# ------------------- routes -------------------

# get current user's full profile.
@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    # return the user's profile with all experiences, projects, skills, education, contact info, and summary.
    contact_response = None
    if current_user.contact:
        contact_response = ContactResponse.model_validate(current_user.contact)
    
    summary_response = None
    if current_user.summary:
        summary_response = SummaryResponse.model_validate(current_user.summary)
    
    return {
        "user": UserResponse.model_validate(current_user),
        "contact": contact_response,
        "education": [EducationResponse.model_validate(edu) for edu in current_user.education],
        "experiences": [ExperienceResponse.model_validate(exp) for exp in current_user.experiences],
        "projects": [ProjectResponse.model_validate(proj) for proj in current_user.projects],
        "skills": [SkillResponse.model_validate(skill) for skill in current_user.skills],
        "summary": summary_response,
    }


# update section header labels.
@router.post("/section-labels", response_model=UserResponse)
async def update_section_labels(
    payload: SectionLabelsUpdate,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    current_user.section_labels = payload.section_labels
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)


# create experience.
@router.post("/experiences", response_model=ExperienceResponse)
async def create_experience(
    experience_data: ExperienceCreate,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    # create a new experience for the current user.
    new_experience = Experience(
        user_id=current_user.id,
        title=experience_data.title,
        company=experience_data.company,
        description=experience_data.description,
        start_date=experience_data.start_date,
        end_date=experience_data.end_date,
        location=experience_data.location,
        skills=experience_data.skills,
    )
    
    # add, commit, and refresh db.
    db.add(new_experience)
    db.commit()
    db.refresh(new_experience)
    
    return ExperienceResponse.model_validate(new_experience)


# create project.
@router.post("/projects", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    # create a new project for the current user.
    new_project = Projects(
        user_id=current_user.id,
        title=project_data.title,
        description=project_data.description,
        tech_stack=project_data.tech_stack,
        url=project_data.url,
    )
    
    # add, commit, and refresh db.
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    
    return ProjectResponse.model_validate(new_project)


# create skill.
@router.post("/skills", response_model=SkillResponse)
async def create_skill(
    skill_data: SkillCreate,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    # normalize skill name and category
    normalized_name = normalize_skill_name(skill_data.name)
    normalized_category = normalize_category(skill_data.category)
    
    # check if skill already exists for this user (case-insensitive match by name only).
    existing_skill = db.query(Skills).filter(
        Skills.user_id == current_user.id,
        func.lower(Skills.name) == normalized_name
    ).first()
    
    # if skill already exists, update its category and return it.
    if existing_skill:
        existing_skill.category = normalized_category
        db.commit()
        db.refresh(existing_skill)
        return SkillResponse.model_validate(existing_skill)
    
    # create a new skill for the current user.
    new_skill = Skills(
        user_id=current_user.id,
        name=skill_data.name.strip(),  # store original case
        category=normalized_category,
    )
    
    # add, commit, and refresh db.
    db.add(new_skill)
    db.commit()
    db.refresh(new_skill)
    
    return SkillResponse.model_validate(new_skill)

# 
# create or update summary.
@router.post("/summary", response_model=SummaryResponse)
async def create_or_update_summary(
    summary_data: SummaryCreate,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    # check if summary already exists for this user (one-to-one relationship).
    existing_summary = db.query(Summary).filter(Summary.user_id == current_user.id).first()
    
    if existing_summary:
        # update existing summary.
        existing_summary.summary = summary_data.summary
        db.commit()
        db.refresh(existing_summary)
        return SummaryResponse.model_validate(existing_summary)
    else:
        # create new summary.
        new_summary = Summary(
            user_id=current_user.id,
            summary=summary_data.summary,
        )
        db.add(new_summary)
        db.commit()
        db.refresh(new_summary)
        return SummaryResponse.model_validate(new_summary)

# bulk create experiences.
@router.post("/experiences/bulk", response_model=List[ExperienceResponse])
async def create_experiences_bulk(
    experiences_data: List[ExperienceCreate],
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    # get all existing experiences for this user.
    existing_experiences = db.query(Experience).filter(
        Experience.user_id == current_user.id
    ).all()
    
    # normalize None values for matching (treat empty string as None).
    def normalize_for_match(value):
        return None if value is None or (isinstance(value, str) and value.strip() == '') else value
    
    # create a matching key function for experiences (title + company + start_date).
    def get_match_key(exp):
        return (
            exp.title.strip().lower() if exp.title else '',
            normalize_for_match(exp.company) or '',
            exp.start_date
        )
    
    # build a map of existing experiences by match key.
    existing_map = {}
    for exp in existing_experiences:
        key = get_match_key(exp)
        existing_map[key] = exp
    
    # process incoming experiences: update existing or create new.
    result_experiences = []
    matched_keys = set()
    
    for exp_data in experiences_data:
        # normalize incoming data for matching.
        incoming_key = (
            exp_data.title.strip().lower() if exp_data.title else '',
            normalize_for_match(exp_data.company) or '',
            exp_data.start_date
        )
        
        if incoming_key in existing_map:
            # update existing experience.
            existing_exp = existing_map[incoming_key]
            existing_exp.title = exp_data.title
            existing_exp.company = exp_data.company
            existing_exp.description = exp_data.description
            existing_exp.start_date = exp_data.start_date
            existing_exp.end_date = exp_data.end_date
            existing_exp.location = exp_data.location
            existing_exp.skills = exp_data.skills
            result_experiences.append(existing_exp)
            matched_keys.add(incoming_key)
        else:
            # create new experience.
            new_exp = Experience(
                user_id=current_user.id,
                title=exp_data.title,
                company=exp_data.company,
                description=exp_data.description,
                start_date=exp_data.start_date,
                end_date=exp_data.end_date,
                location=exp_data.location,
                skills=exp_data.skills,
            )
            db.add(new_exp)
            result_experiences.append(new_exp)
    
    # delete existing experiences that weren't matched.
    for key, exp in existing_map.items():
        if key not in matched_keys:
            db.delete(exp)
    
    # commit all changes.
    db.commit()
    for exp in result_experiences:
        db.refresh(exp)
    
    return [ExperienceResponse.model_validate(exp) for exp in result_experiences]


# bulk create projects.
@router.post("/projects/bulk", response_model=List[ProjectResponse])
async def create_projects_bulk(
    projects_data: List[ProjectCreate],
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    # get all existing projects for this user.
    existing_projects = db.query(Projects).filter(
        Projects.user_id == current_user.id
    ).all()
    
    # build a map of existing projects by title (case-insensitive).
    existing_map = {}
    for proj in existing_projects:
        key = proj.title.strip().lower() if proj.title else ''
        existing_map[key] = proj
    
    # process incoming projects: update existing or create new.
    result_projects = []
    matched_keys = set()
    
    for proj_data in projects_data:
        # normalize title for matching.
        incoming_key = proj_data.title.strip().lower() if proj_data.title else ''
        
        if incoming_key and incoming_key in existing_map:
            # update existing project.
            existing_proj = existing_map[incoming_key]
            existing_proj.title = proj_data.title
            existing_proj.description = proj_data.description
            existing_proj.tech_stack = proj_data.tech_stack
            existing_proj.url = proj_data.url
            result_projects.append(existing_proj)
            matched_keys.add(incoming_key)
        else:
            # create new project.
            new_proj = Projects(
                user_id=current_user.id,
                title=proj_data.title,
                description=proj_data.description,
                tech_stack=proj_data.tech_stack,
                url=proj_data.url,
            )
            db.add(new_proj)
            result_projects.append(new_proj)
    
    # delete existing projects that weren't matched.
    for key, proj in existing_map.items():
        if key not in matched_keys:
            db.delete(proj)
    
    # commit all changes.
    db.commit()
    for proj in result_projects:
        db.refresh(proj)
    
    return [ProjectResponse.model_validate(proj) for proj in result_projects]


# create or update contact info.
@router.post("/contact", response_model=ContactResponse)
async def create_or_update_contact(
    contact_data: ContactCreate,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    # check if contact already exists for this user
    existing_contact = db.query(Contact).filter(Contact.user_id == current_user.id).first()
    
    if existing_contact:
        # update existing contact
        if contact_data.email is not None:
            existing_contact.email = contact_data.email
        if contact_data.phone is not None:
            existing_contact.phone = contact_data.phone
        if contact_data.github is not None:
            existing_contact.github = contact_data.github
        if contact_data.linkedin is not None:
            existing_contact.linkedin = contact_data.linkedin
        if contact_data.portfolio is not None:
            existing_contact.portfolio = contact_data.portfolio
        if getattr(contact_data, "location", None) is not None:
            existing_contact.location = contact_data.location
        
        # add, commit, and refresh db.
        db.commit()
        db.refresh(existing_contact)
        return ContactResponse.model_validate(existing_contact)
    else:
        # create new contact
        new_contact = Contact(
            user_id=current_user.id,
            email=contact_data.email,
            phone=contact_data.phone,
            github=contact_data.github,
            linkedin=contact_data.linkedin,
            portfolio=contact_data.portfolio,
            location=getattr(contact_data, "location", None),
        )

        # add, commit, and refresh db.
        db.add(new_contact)
        db.commit()
        db.refresh(new_contact)
        return ContactResponse.model_validate(new_contact)


# create education.
@router.post("/education", response_model=EducationResponse)
async def create_education(
    education_data: EducationCreate,
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    # create a new education entry for the current user.
    new_education = Education(
        user_id=current_user.id,
        school=education_data.school,
        degree=education_data.degree,
        discipline=education_data.discipline,
        start_date=education_data.start_date,
        end_date=education_data.end_date,
        current=education_data.current,
        gpa=education_data.gpa,
        location=education_data.location,
        minor=education_data.minor,
        subsections=education_data.subsections,
    )
    
    # add, commit, and refresh db.
    db.add(new_education)
    db.commit()
    db.refresh(new_education)
    
    return EducationResponse.model_validate(new_education)


# bulk create education.
@router.post("/education/bulk", response_model=List[EducationResponse])
async def create_education_bulk(
    education_data: List[EducationCreate],
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    # delete all existing education entries for this user first (replace all pattern).
    db.query(Education).filter(Education.user_id == current_user.id).delete()
    
    # create multiple education entries for the current user.
    new_education_list = []
    for edu_data in education_data:
        new_edu = Education(
            user_id=current_user.id,
            school=edu_data.school,
            degree=edu_data.degree,
            discipline=edu_data.discipline,
            start_date=edu_data.start_date,
            end_date=edu_data.end_date,
            current=edu_data.current,
            gpa=edu_data.gpa,
            location=edu_data.location,
            minor=edu_data.minor,
            subsections=edu_data.subsections,
        )
        db.add(new_edu)
        new_education_list.append(new_edu)
    
    # add, commit, and refresh db.
    db.commit()
    for edu in new_education_list:
        db.refresh(edu)
    
    return [EducationResponse.model_validate(edu) for edu in new_education_list]


# bulk create skills.
@router.post("/skills/bulk", response_model=List[SkillResponse])
async def create_skills_bulk(
    skills_data: List[SkillCreate],
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    # get all existing skills for this user.
    existing_skills = db.query(Skills).filter(
        Skills.user_id == current_user.id
    ).all()
    
    # build a map of existing skills by normalized name (case-insensitive).
    existing_map = {}
    for skill in existing_skills:
        key = normalize_skill_name(skill.name)
        existing_map[key] = skill
    
    # process incoming skills: update existing or create new.
    result_skills = []
    matched_keys = set()
    
    for skill_data in skills_data:
        # normalize incoming skill name and category.
        normalized_name = normalize_skill_name(skill_data.name)
        normalized_category = normalize_category(skill_data.category)
        
        if normalized_name in existing_map:
            # update existing skill (update category, preserve original name case if needed).
            existing_skill = existing_map[normalized_name]
            existing_skill.category = normalized_category
            result_skills.append(existing_skill)
            matched_keys.add(normalized_name)
        else:
            # create new skill.
            new_skill = Skills(
                user_id=current_user.id,
                name=skill_data.name.strip(),  # store original case
                category=normalized_category,
            )
            db.add(new_skill)
            result_skills.append(new_skill)
    
    # delete existing skills that weren't matched (removed from frontend).
    for key, skill in existing_map.items():
        if key not in matched_keys:
            db.delete(skill)
    
    # commit all changes.
    db.commit()
    for skill in result_skills:
        db.refresh(skill)
    
    return [SkillResponse.model_validate(skill) for skill in result_skills]


# parse resume file.
@router.post("/parse-resume", response_model=ParsedResumeResponse)
async def parse_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    # parse a resume file (PDF or DOCX) and extract structured data.
    
    # validate file type (only PDF and DOCX are supported).
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided"
        )
    
    if not (file.filename.lower().endswith('.pdf') or file.filename.lower().endswith(('.docx', '.doc'))):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Only PDF and DOCX files are supported."
        )
    
    # validate file size (maximum size is 10MB).
    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size is 10MB."
        )
    
    try:
        # parse the resume file.
        parsed_data = parse_resume_file(file_bytes, file.filename)
        
        # helper function to parse date strings.
        def parse_date(date_str: str) -> datetime | None:
            if not date_str:
                return None
            try:
                return datetime.strptime(date_str, "%Y-%m")
            except (ValueError, TypeError):
                return None
        
        # save contact info to database if present.
        contact_info = parsed_data.get("contact_info", {})
        if contact_info and any(contact_info.values()):
            existing_contact = db.query(Contact).filter(Contact.user_id == current_user.id).first()

            if existing_contact:
                # update existing contact (only update fields that are not None).
                for field in ["email", "phone", "github", "linkedin", "portfolio", "location"]:
                    if contact_info.get(field):
                        setattr(existing_contact, field, contact_info[field])
            else:
                # create new contact.
                new_contact = Contact(
                    user_id=current_user.id,
                    email=contact_info.get("email"),
                    phone=contact_info.get("phone"),
                    github=contact_info.get("github"),
                    linkedin=contact_info.get("linkedin"),
                    portfolio=contact_info.get("portfolio"),
                    location=contact_info.get("location"),
                )
                db.add(new_contact)
        
        # save education to database if present.
        education_list = parsed_data.get("education", [])
        for edu_data in education_list:
            new_education = Education(
                user_id=current_user.id,
                school=edu_data.get("school"),
                degree=edu_data.get("degree"),
                discipline=edu_data.get("discipline"),
                start_date=parse_date(edu_data.get("startDate")),
                end_date=parse_date(edu_data.get("endDate")),
                current=edu_data.get("current", False),
                gpa=edu_data.get("gpa"),
                location=edu_data.get("location"),
                subsections=edu_data.get("subsections"),
            )
            db.add(new_education)
        
        # save summary to database if present.
        summary = parsed_data.get("summary", "")
        print(parsed_data)
        if summary:
            existing_summary = db.query(Summary).filter(Summary.user_id == current_user.id).first()
            if existing_summary:
                existing_summary.summary = summary
            else:
                new_summary = Summary(
                    user_id=current_user.id,
                    summary=summary,
                )
                db.add(new_summary)
        
        # commit all changes at once.
        db.commit()
        
        # convert parsed data to response format.
        return ParsedResumeResponse(
            experiences=parsed_data.get("experiences", []),
            education=parsed_data.get("education", []),
            skills=parsed_data.get("skills", []),
            projects=parsed_data.get("projects", []),
            contact_info=parsed_data.get("contact_info", {}),
            summary=parsed_data.get("summary", ""),
            warnings=parsed_data.get("warnings", [])
        )
    except ImportError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Required library not installed: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error parsing resume: {str(e)}"
        )

