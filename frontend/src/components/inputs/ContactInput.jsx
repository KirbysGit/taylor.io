import React from 'react'

// Contact Input Component - Just the form fields, no headers
const ContactInput = ({ contact, onUpdate }) => {
	return (
		<div className="space-y-4">
			<div>
				<label className="label">Email</label>
				<input
					type="email"
					value={contact.email || ''}
					onChange={(e) => onUpdate('email', e.target.value)}
					className="input"
					placeholder="your.email@example.com"
				/>
			</div>
			<div>
				<label className="label">Phone</label>
				<input
					type="tel"
					value={contact.phone || ''}
					onChange={(e) => onUpdate('phone', e.target.value)}
					className="input"
					placeholder="(123) 456-7890"
				/>
			</div>
			<div>
				<label className="label">GitHub</label>
				<input
					type="url"
					value={contact.github || ''}
					onChange={(e) => onUpdate('github', e.target.value)}
					className="input"
					placeholder="https://github.com/username"
				/>
			</div>
			<div>
				<label className="label">LinkedIn</label>
				<input
					type="url"
					value={contact.linkedin || ''}
					onChange={(e) => onUpdate('linkedin', e.target.value)}
					className="input"
					placeholder="https://linkedin.com/in/username"
				/>
			</div>
			<div>
				<label className="label">Portfolio/Website</label>
				<input
					type="url"
					value={contact.portfolio || ''}
					onChange={(e) => onUpdate('portfolio', e.target.value)}
					className="input"
					placeholder="https://yourwebsite.com"
				/>
			</div>
			<div>
				<label className="label">Location</label>
				<input
					type="text"
					value={contact.location || ''}
					onChange={(e) => onUpdate('location', e.target.value)}
					className="input"
					placeholder="City, State"
				/>
			</div>
		</div>
	)
}

export default ContactInput
