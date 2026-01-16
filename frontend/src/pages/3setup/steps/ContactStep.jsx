import React from 'react';


// Contact Step Component.
const ContactStep = ({ contact, onUpdate }) => {
	return (
		<div>
			<h2 className="text-2xl font-bold text-gray-900 mb-6">Your Contact Information</h2>
			<p className="text-gray-600 mb-6">Add your contact details and professional links.</p>

			<div className="space-y-4">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
					<input
						type="email"
						value={contact.email}
						onChange={(e) => onUpdate('email', e.target.value)}
						className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
						placeholder="your.email@example.com"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
					<input
						type="tel"
						value={contact.phone}
						onChange={(e) => onUpdate('phone', e.target.value)}
						className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
						placeholder="(123) 456-7890"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">GitHub</label>
					<input
						type="url"
						value={contact.github}
						onChange={(e) => onUpdate('github', e.target.value)}
						className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
						placeholder="https://github.com/username"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
					<input
						type="url"
						value={contact.linkedin}
						onChange={(e) => onUpdate('linkedin', e.target.value)}
						className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
						placeholder="https://linkedin.com/in/username"
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Portfolio/Website</label>
					<input
						type="url"
						value={contact.portfolio}
						onChange={(e) => onUpdate('portfolio', e.target.value)}
						className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-pink focus:border-transparent"
						placeholder="https://yourwebsite.com"
					/>
				</div>
			</div>
		</div>
	)
}

export default ContactStep;