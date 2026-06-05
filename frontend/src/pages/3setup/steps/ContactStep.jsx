import React from 'react';
import ContactInput from '@/components/inputs/ContactInput';

// Contact Step Component - Uses ContactInput with setup flow header
const ContactStep = ({ contact, onUpdate }) => {
	return (
		<div>
			<h2 className="mb-2 font-serif text-3xl font-bold tracking-tight text-gray-950">Your Contact Information</h2>
			<p className="text-gray-600 mb-3">Let's add your contact information so employers can reach you.</p>
			<div className="smallDivider mb-3"></div>
			<ContactInput contact={contact} onUpdate={onUpdate} />
		</div>
	)
}

export default ContactStep;