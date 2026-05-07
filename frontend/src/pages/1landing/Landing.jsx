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
			className="landing-scrollbar min-h-screen overflow-y-auto bg-cream"
			style={{ height: '100vh', overflowY: 'auto' }}
		>
			{/*
				Nav must sit outside the hero-only flex wrapper:
				sticky is clipped by its parent bottom — if that parent ends at the hero,
				the bar disappears when scrolling into cream sections below.
				Height calc keeps hero + pink bar ~= one viewport (toolbar ~3.5rem / md ~4rem).
			*/}
			<LandingHeader />
			<div className="flex min-h-[calc(100dvh-3.5rem)] flex-col md:min-h-[calc(100dvh-4rem)]">
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
