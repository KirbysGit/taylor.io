import React from 'react'
import ContactInput from '@/components/inputs/ContactInput'
import ProfileSectionCard from './ProfileSectionCard'

const ContactSection = ({ contact, onUpdate }) => {
	return (
		<ProfileSectionCard
			title="Contact Information"
			description="How employers can reach you and where they can learn more."
		>
			<ContactInput contact={contact} onUpdate={onUpdate} />
		</ProfileSectionCard>
	)
}

export default ContactSection
