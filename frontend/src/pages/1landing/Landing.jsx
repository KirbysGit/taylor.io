// landing/Landing.jsx — marketing landing (cream + brand-pink, Inter)

import LandingCta from './components/LandingCta'
import LandingFooter from './components/LandingFooter'
import LandingHeader from './components/LandingHeader'
import LandingHero from './components/LandingHero'
import LandingGrowWithYou from './components/LandingGrowWithYou'
import LandingHowItHelps from './components/LandingHowItHelps'
import LandingHowItWorks from './components/LandingHowItWorks'
import LandingOneProfileManyResumes from './components/LandingOneProfileManyResumes'

export default function Landing() {
	return (
		<div
			id="landing-scroll-root"
			className="landing-scrollbar min-h-screen overflow-y-auto"
			style={{ height: '100vh', overflowY: 'auto' }}
		>
			{/* Fixed card nav overlays content; hero runs edge-to-edge under it. */}
			<LandingHeader />
			<div className="flex min-h-[100dvh] flex-col">
				<LandingHero />
			</div>

			<main className="bg-cream">
				<LandingHowItHelps />
				<LandingHowItWorks />
				<LandingOneProfileManyResumes />
				<LandingGrowWithYou />
				<LandingCta />
			</main>

			<LandingFooter />
		</div>
	)
}
