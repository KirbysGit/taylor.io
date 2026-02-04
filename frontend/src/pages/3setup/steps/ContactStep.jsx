import React from 'react';

// maybe location for another field.
// maybe personal blog or medium for another field.

// Contact Step Component.
const ContactStep = ({ contact, onUpdate }) => {
	return (
		<div>
			<h2 className="text-2xl font-bold text-gray-900 mb-2">Your Contact Information</h2>
			<p className="text-gray-600 mb-3">Let's add your contact information so employers can reach you.</p>
			<div className="smallDivider mb-3"></div>

			<div className="space-y-4">
				<div>
					<label className="label">Email</label>
					<input
						type="email"
						value={contact.email}
						onChange={(e) => onUpdate('email', e.target.value)}
						className="input"
						placeholder="your.email@example.com"
					/>
				</div>
				<div>
					<label className="label">Phone</label>
					<input
						type="tel"
						value={contact.phone}
						onChange={(e) => onUpdate('phone', e.target.value)}
						className="input"
						placeholder="(123) 456-7890"
					/>
				</div>
				<div>
					<label className="label">GitHub</label>
					<input
						type="url"
						value={contact.github}
						onChange={(e) => onUpdate('github', e.target.value)}
						className="input"
						placeholder="https://github.com/username"
					/>
				</div>
				<div>
					<label className="label">LinkedIn</label>
					<input
						type="url"
						value={contact.linkedin}
						onChange={(e) => onUpdate('linkedin', e.target.value)}
						className="input"
						placeholder="https://linkedin.com/in/username"
					/>
				</div>
				<div>
					<label className="label">Portfolio/Website</label>
					<input
						type="url"
						value={contact.portfolio}
						onChange={(e) => onUpdate('portfolio', e.target.value)}
						className="input"
						placeholder="https://yourwebsite.com"
					/>
				</div>
			</div>
		</div>
	)
}

export default ContactStep;