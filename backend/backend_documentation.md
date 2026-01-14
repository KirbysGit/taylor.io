# Backend Documentation

My directory :

```
/backend
	/models			-	stores all of the model's for our db.
		__init__.py
		base.py		- 	creates our base class.
		contact.py	-	creates our contacts model (user's contact info)
		education.py	- 	creates our education model (user's education)
		projects.py	-	creates our projects model (user's projects)
		skills.py	- 	creates our skills model (user's skills)
		user.py		- 	creates our user model (user's name & all of above)

	/resume_generator
		/builder		-	responsible for building the resume by section.
			__init__.py	- 	holds build_docx func that combines this data.
			common.py	-	general purpose handler (ex. margins, alignment, filling in placeholders)
			education.py	-	handles filling in education based on edu placeholders
			experience.py	- 	wip...
			header.py	-	handles filling in header values with spacing.
			projects.py	-	wip...
			skills.py	-	wip...

		/formatter
			__init__.py
			formatters.py	- 	assist in formatting in data in docx resumes.

		/templates
			template resume files.

		__init__.py
		context.py		-	general setup for the context to pass into the builder.
		generator.py		-	builds resume.
		pdf_generator.py	-	takes docx resume to pdf.

	/resume_parser
		/Aextractor
			__init__.py
			docx_extractor.py	-	parses data from docx files. (super easy)
			pdf_extractor.py	-	parses data from pdf files. (very messy)
		/Bcleaner
			__init__.py
			clean_text_regex.py	-	specific regex issues i've dealt with so far and clean up.
			openai_cleaner.py	-	openai api cleaner vals.
		/Csegmenter
			__init__.py
			section_finder.py	-	sorts section and generates position per section to reference.
		/Dnlp
			__init__.py
			nlp_utils.py		-	extract specific features (title, date)
			normalizer.py		- 	fix spacing for messy pdf data.
			skill_matcher.py	-	get relevant skills.
			spacy_loader.py		-	loads spacy model?
		/Eparsers
			__init__.py
			contact_parser.py	-	parses contact info.
			education_parser.py	-	parses education info.
			experience_parser.py	-	parses experience info.
			projects_parser.py	- 	parses projects.
			skills_parser.py	-	parses skills.

		pipeline.py		-	combines all stages into one pipeline.

	/routers
		__init__.py
		auth.py			-	handles set up of user (register, login)
		profile.py		-	handles user profile routes
		resume_parser.py	-	handles resume parsing endpoints
		resume.py		-	handles resume generation endpoints)
		security.py		-	handles security (passwords, tokens)
		users.py		-	handles user-related routes?

database.py		-	general database set up.
main.py			-	sets up routers.
schemas.py		-	general schema for endpoint data transfer.
tailor.db 		-	holds sqlite db.
.env			-	holds .env info.
requirements.txt	-	dependency array.
documentation.md <- you are here!
```

above is how i've organized the directory thus far. really just want to take a look at it coming back, it still feels like too much, i want to clean it up a bit but im going to work through the frontend too and decide on how to proceed.

need to go through and do api documentation too for the sake of cleanliness as well as a breakdown of the flow of information with the resume extraction to how its stored in the db to how its being returned through resume previews right now.
