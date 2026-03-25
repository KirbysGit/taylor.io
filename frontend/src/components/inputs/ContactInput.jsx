import React from 'react'
import TaglineMiniEditor from './TaglineMiniEditor'
import TaglinePreview from './TaglinePreview'

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

			<div className="animate-slide-tagline border-t border-gray-200 pt-5 mt-1">
				<label className="label">Professional Tagline</label>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-0 items-stretch">
					<TaglineMiniEditor
						className="min-w-0"
						value={contact.tagline || ''}
						onChange={(v) => onUpdate('tagline', v)}
						placeholder="Example: **Role** | _Skills * Stack_"
					/>
					<div className="flex flex-col gap-2 min-w-0 min-h-0">
						<div className="flex items-center min-h-[2.25rem] shrink-0">
							<span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Preview</span>
						</div>
						<TaglinePreview value={contact.tagline} className="flex-1" />
					</div>
				</div>
			</div>
		</div>
	)
}

export default ContactInput
