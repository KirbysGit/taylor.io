import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithub, faLinkedin } from '@fortawesome/free-brands-svg-icons'
import {
	faAward,
	faCircleInfo,
	faEnvelope,
	faGlobe,
	faLocationDot,
	faPhone,
} from '@fortawesome/free-solid-svg-icons'
import ContactField from './contact/ContactField'
import TaglineMiniEditor from './TaglineMiniEditor'

const ContactInput = ({ contact, onUpdate }) => {
	return (
		<div className="space-y-6">
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<ContactField
					label="Email"
					icon={faEnvelope}
					type="email"
					value={contact.email}
					onChange={(v) => onUpdate('email', v)}
					placeholder="your.email@example.com"
					autoComplete="email"
				/>
				<ContactField
					label="Phone"
					icon={faPhone}
					type="tel"
					value={contact.phone}
					onChange={(v) => onUpdate('phone', v)}
					placeholder="(123) 456-7890"
					autoComplete="tel"
				/>
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<ContactField
					label="LinkedIn"
					icon={faLinkedin}
					type="url"
					value={contact.linkedin}
					onChange={(v) => onUpdate('linkedin', v)}
					placeholder="https://linkedin.com/in/username"
				/>
				<ContactField
					label="Location"
					icon={faLocationDot}
					value={contact.location}
					onChange={(v) => onUpdate('location', v)}
					placeholder="City, State"
				/>
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<ContactField
					label="GitHub"
					icon={faGithub}
					type="url"
					value={contact.github}
					onChange={(v) => onUpdate('github', v)}
					placeholder="https://github.com/username"
				/>
				<ContactField
					label="Portfolio / Website"
					icon={faGlobe}
					type="url"
					value={contact.portfolio}
					onChange={(v) => onUpdate('portfolio', v)}
					placeholder="https://yourwebsite.com"
				/>
			</div>

			<div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
				<div className="mb-4 flex gap-3 sm:mb-5">
					<span
						className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-pink/10 text-brand-pink"
						aria-hidden
					>
						<FontAwesomeIcon icon={faAward} className="size-4" />
					</span>
					<div className="min-w-0">
						<h3 className="text-sm font-bold text-slate-900">Professional Tagline</h3>
						<p className="mt-0.5 text-sm leading-relaxed text-slate-500">
							A short line that captures the kind of work you do.
						</p>
					</div>
				</div>

				<TaglineMiniEditor
					value={contact.tagline || ''}
					onChange={(v) => onUpdate('tagline', v)}
					placeholder="e.g. Software Engineer · Product · Design"
				/>

				<p className="mt-4 flex items-start gap-2 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
					<FontAwesomeIcon icon={faCircleInfo} className="mt-0.5 size-3.5 shrink-0 text-slate-400" aria-hidden />
					This line can be reused across tailored résumé versions.
				</p>
			</div>
		</div>
	)
}

export default ContactInput
