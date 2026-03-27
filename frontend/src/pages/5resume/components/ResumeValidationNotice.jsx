import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faClipboardList } from '@fortawesome/free-solid-svg-icons'

const FIELD_LABELS = {
	header: {
		name: 'your name',
	},
	education: {
		school: 'university name',
		degree: 'degree type',
		discipline: 'discipline',
	},
	experience: {
		title: 'job title',
		company: 'company name',
		description: 'role description',
	},
	projects: {
		title: 'project title',
		description: 'project description',
	},
}

const SECTION_LABEL = {
	header: 'Header',
	education: 'Education',
	experience: 'Experience',
	projects: 'Projects',
}

function leadPhrase(section, indexInSection) {
	if (section === 'header') return null
	if (section === 'education') {
		return indexInSection === 0 ? 'This education entry needs' : 'Another education entry needs'
	}
	if (section === 'experience') {
		return indexInSection === 0 ? 'This role needs' : 'Another role needs'
	}
	if (section === 'projects') {
		return indexInSection === 0 ? 'This project needs' : 'Another project needs'
	}
	return null
}

function EmphasisList({ parts }) {
	if (parts.length === 0) return null
	return parts.map((text, i) => (
		<span key={text}>
			{i > 0 && (i === parts.length - 1 ? ' and ' : ', ')}
			<strong className="font-semibold text-gray-900">{text}</strong>
		</span>
	))
}

export default function ResumeValidationNotice({ issues }) {
	if (!issues?.length) return null

	const counts = issues.reduce((acc, issue) => {
		acc[issue.section] = (acc[issue.section] || 0) + 1
		return acc
	}, {})

	const indexInSection = {}

	return (
		<div className="text-left">
			<div className="flex items-start gap-3 mb-5">
				<div
					className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-pink/10 text-brand-pink"
					aria-hidden="true"
				>
					<FontAwesomeIcon icon={faClipboardList} className="h-4 w-4" />
				</div>
				<div>
					<h2
						id="resume-validation-title"
						className="text-lg font-semibold tracking-tight text-gray-900"
					>
						Quick check before we preview
					</h2>
					<p className="mt-1 text-sm leading-relaxed text-gray-600">
						We only need a few required fields filled in—once you add them, your preview will load right away.
					</p>
				</div>
			</div>

			<ul className="space-y-3 max-h-64 overflow-y-auto pr-1">
				{issues.map((issue) => {
					const labels = issue.missing.map((key) => FIELD_LABELS[issue.section][key])
					const sectionIdx = indexInSection[issue.section] ?? 0
					indexInSection[issue.section] = sectionIdx + 1

					const lead = leadPhrase(issue.section, sectionIdx)
					const badge = SECTION_LABEL[issue.section]
					const showBadge =
						issue.section !== 'header' && counts[issue.section] > 1

					return (
						<li
							key={issue.id}
							className="rounded-xl border border-gray-200/90 bg-gradient-to-b from-white to-gray-50/80 px-4 py-3 shadow-sm"
						>
							{showBadge && (
								<p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-pink">
									{badge}
								</p>
							)}
							<p className="text-sm leading-relaxed text-gray-700">
								{issue.section === 'header' && (
									<>
										Add <EmphasisList parts={labels} /> in the header so your resume preview can render.
									</>
								)}
								{issue.section !== 'header' && (
									<>
										{lead}{' '}
										<EmphasisList parts={labels} />.
									</>
								)}
							</p>
						</li>
					)
				})}
			</ul>
		</div>
	)
}
