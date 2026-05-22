import React from 'react'
import SummaryInput from '@/components/inputs/SummaryInput'
import ProfileSectionCard from './ProfileSectionCard'

const SummarySection = ({ summary, onUpdate }) => {
	return (
		<ProfileSectionCard
			title="Professional Summary"
			description="A short, reusable overview Taylor can adapt for each résumé."
			hideEyebrow
		>
			<SummaryInput summary={summary} onUpdate={onUpdate} />
		</ProfileSectionCard>
	)
}

export default SummarySection
