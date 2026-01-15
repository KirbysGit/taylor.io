# frontend directory documentation

below is the directory tree of the current frontend (last updated 1 / 13 / 2026 )

```
frontend /
	src /
		api /
			services /
				auth.js		-	handles auth like register & login.
				experience.js	-	handles user's experience.
				profile.js	-	handles user profile updates.
				resume.js	-	handles resume generator calls.
				user.js		-	handles user api calls.
			api.js			-	api header requests.
		components /
			modals /
			ProtectedRoute.jsx	-	checks auth on load.
			TopNav.jsx		-	gen navbar.
		pages /
			1landing /
				Landing.jsx 	- 	landing page upon redirect to domain.
			2auth /
				components /
					LoginModal.jsx		- 	how users login.
					SignUpModal.jsx 	-	how users sign up.
				Auth.jsx	-	page for either signup or login.
			3setup /
				AccountSetup.jsx	-	account set up pipeline.
			4home /
				Home.jsx		-	home page for users.
			5resume /
				components /
					EducationTab.jsx	- 	where users input education.
					HeaderFieldsPanel.jsx	-	where users design their header.
					HeaderTab.jsx		-	parent of HeaderFieldsPanel
					ResumeDataPanel.jsx	-	unused
					ResumeStylingPanel.jsx	-	where users can style their resume.
				ResumePreview.jsx	-	where users design and build their resume.
			info /
				Info.jsx	- 	where users can see all of their info.

		styles /
			index.css		- 	really only used for tailwind.css
		App.jsx				- 	main router.
		main.jsx			- 	whatever main.jsx does.

	frontend_documentation.md	<-	you are here!
	index.html			-	main doc entry point.
	tailwind.configs.js		-	gen config for tailwind styling.
	vite.config.js			-	gen config for vite set up.
```

really want to go back through and clean up as much as i can because i just feel like i let ai do a bit too much in my first walk through.

over next week or so, putting a priority on refamiliarization and honing what is needed for my current purpose.
