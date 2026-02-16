// components / left / WelcomeMessage.jsx

// Welcome message shown on first visit to the resume builder.

import { XIcon } from '@/components/icons'

function WelcomeMessage({ user, onDismiss }) {
	return (
		<div className="flex flex-col gap-0.5 p-3 border-[2px] rounded-md border-brand-pink-light mb-6 relative">
			<h2 className="text-[1.25rem] font-semibold text-gray-900 mb-1">
				{user?.first_name ? `Hey, ${user.first_name}! 👋` : 'Hey there! 👋'}
			</h2>
			<span className="text-[0.875rem] text-gray-500">Welcome to the <b>Builder</b>! This is where you will customize your resume.</span>
			<span className="text-[0.875rem] text-gray-500">We've filled in what we know. Feel free to tweak or add anything. 😄</span>
			<button
				type="button"
				onClick={onDismiss}
				className="absolute top-2 right-2 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
			>
				<XIcon />
			</button>
		</div>
	)
}

export default WelcomeMessage
