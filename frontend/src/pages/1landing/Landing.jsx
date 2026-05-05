// landing/Landing.jsx — marketing landing (cream + brand-pink, Inter)

import LandingCta from './components/LandingCta'
import LandingFooter from './components/LandingFooter'
import LandingHeader from './components/LandingHeader'
import LandingHero from './components/LandingHero'
import LandingHowItHelps from './components/LandingHowItHelps'
import LandingHowItWorks from './components/LandingHowItWorks'

export default function Landing() {
	return (
		<div
			className="landing-scrollbar min-h-screen overflow-y-auto bg-cream"
			style={{ height: '100vh', overflowY: 'auto' }}
		>
			{/* One full viewport of brand + hero before cream sections — avoids a stripe of bg-cream on first paint */}
			<div className="flex min-h-[100dvh] flex-col">
				<LandingHeader />
				<LandingHero />
			</div>

			<main className="bg-cream">
				<LandingHowItWorks />
				<LandingHowItHelps />
				<LandingCta />
			</main>

			<LandingFooter />
		</div>
	)
}
