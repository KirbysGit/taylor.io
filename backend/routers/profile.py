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
from typing import List
from datetime import datetime
from sqlalchemy.orm import Session
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
)
from resume_parser import parse_resume_file
from .auth import get_current_user_from_token
from models import User, Experience, Projects, Skills, Contact, Education

# create router.
router = APIRouter(prefix="/api/profile", tags=["profile"])

# ------------------- routes -------------------

# get current user's full profile.
@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    # return the user's profile with all experiences, projects, skills, education, and contact info.
    contact_response = None
    if current_user.contact:
        contact_response = ContactResponse.model_validate(current_user.contact)
    
    return {
        "user": UserResponse.model_validate(current_user),
        "contact": contact_response,
        "education": [EducationResponse.model_validate(edu) for edu in current_user.education],
        "experiences": [ExperienceResponse.model_validate(exp) for exp in current_user.experiences],
        "projects": [ProjectResponse.model_validate(proj) for proj in current_user.projects],
        "skills": [SkillResponse.model_validate(skill) for skill in current_user.skills],
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
        role_type=experience_data.role_type,
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

    # check if skill already exists for this user.
    existing_skill = db.query(Skills).filter(
        Skills.user_id == current_user.id,
        Skills.name == skill_data.name
    ).first()
    
    # if skill already exists, return it.
    if existing_skill:
        return SkillResponse.model_validate(existing_skill)
    
    # create a new skill for the current user.
    new_skill = Skills(
        user_id=current_user.id,
        name=skill_data.name,
    )
    
    # add, commit, and refresh db.
    db.add(new_skill)
    db.commit()
    db.refresh(new_skill)
    
    return SkillResponse.model_validate(new_skill)


# bulk create experiences.
@router.post("/experiences/bulk", response_model=List[ExperienceResponse])
async def create_experiences_bulk(
    experiences_data: List[ExperienceCreate],
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    # create multiple experiences for the current user.
    new_experiences = []
    for exp_data in experiences_data:
        new_exp = Experience(
            user_id=current_user.id,
            title=exp_data.title,
            company=exp_data.company,
            description=exp_data.description,
            start_date=exp_data.start_date,
            end_date=exp_data.end_date,
            location=exp_data.location,
            role_type=exp_data.role_type,
        )
        db.add(new_exp)
        new_experiences.append(new_exp)
    
    # add, commit, and refresh db.
    db.commit()
    for exp in new_experiences:
        db.refresh(exp)
    
    return [ExperienceResponse.model_validate(exp) for exp in new_experiences]


# bulk create projects.
@router.post("/projects/bulk", response_model=List[ProjectResponse])
async def create_projects_bulk(
    projects_data: List[ProjectCreate],
    current_user: User = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    # create multiple projects for the current user.
    new_projects = []
    for proj_data in projects_data:
        new_proj = Projects(
            user_id=current_user.id,
            title=proj_data.title,
            description=proj_data.description,
            tech_stack=proj_data.tech_stack,
            url=proj_data.url,
        )
        db.add(new_proj)
        new_projects.append(new_proj)
    
    # add, commit, and refresh db.
    db.commit()
    for proj in new_projects:
        db.refresh(proj)
    
    return [ProjectResponse.model_validate(proj) for proj in new_projects]


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
        honors_awards=education_data.honors_awards,
        clubs_extracurriculars=education_data.clubs_extracurriculars,
        location=education_data.location,
        relevant_coursework=education_data.relevant_coursework,
        minor=education_data.minor,
        label_overrides=education_data.label_overrides,
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
            honors_awards=edu_data.honors_awards,
            clubs_extracurriculars=edu_data.clubs_extracurriculars,
            location=edu_data.location,
            relevant_coursework=edu_data.relevant_coursework,
            minor=edu_data.minor,
            label_overrides=edu_data.label_overrides,
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
    # create multiple skills for the current user.
    new_skills = []
    for skill_data in skills_data:
        # check if skill already exists.
        existing_skill = db.query(Skills).filter(
            Skills.user_id == current_user.id,
            Skills.name == skill_data.name
        ).first()
        
        # if skill already exists, append it to the list.
        if existing_skill:
            new_skills.append(existing_skill)
        else:
            # create a new skill for the current user.
            new_skill = Skills(
                user_id=current_user.id,
                name=skill_data.name,
            )

            # add, commit, and refresh db.
            db.add(new_skill)
            new_skills.append(new_skill)
    
    # add, commit, and refresh db.
    db.commit()
    for skill in new_skills:
        db.refresh(skill)
    
    return [SkillResponse.model_validate(skill) for skill in new_skills]


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
                honors_awards=edu_data.get("honorsAwards"),
                clubs_extracurriculars=edu_data.get("clubsExtracurriculars"),
                location=edu_data.get("location"),
                relevant_coursework=edu_data.get("relevantCoursework"),
            )
            db.add(new_education)
        
        # commit all changes at once.
        db.commit()
        
        # convert parsed data to response format.
        return ParsedResumeResponse(
            experiences=parsed_data.get("experiences", []),
            education=parsed_data.get("education", []),
            skills=parsed_data.get("skills", []),
            projects=parsed_data.get("projects", []),
            contact_info=parsed_data.get("contact_info", {}),
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

