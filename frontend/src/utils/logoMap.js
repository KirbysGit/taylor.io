/**
 * Brand imagery and copy — single source of truth for logo URLs.
 *
 * Paths are absolute from the site root (files live in `frontend/public/`).
 *
 * @typedef {'navbar' | 'wordmark' | 'wordmarkPng' | 'icon' | 'iconPng' | 'favicon' | 'appleTouch' | 'og'} LogoKey
 */

/** @type {Readonly<Record<LogoKey, string>>} */
export const LOGO_MAP = {
	/** Primary app chrome (TopNav, etc.) — `public/lg_tr_logo.png` */
	navbar: '/lg_tr_logo.png',
	wordmark: '/brand/taylor-wordmark.svg',
	wordmarkPng: '/brand/taylor-wordmark.png',
	icon: '/brand/taylor-icon.svg',
	iconPng: '/brand/taylor-icon.png',
	favicon: '/favicon.ico',
	appleTouch: '/apple-touch-icon.png',
	og: '/brand/taylor-og.png',
}

/** Plain-text brand (alt text, footers, modals when not using an image). */
export const BRAND_NAME = 'taylor.io'

/** Browser tab / default document title (can diverge from wordmark if needed). */
export const SITE_TITLE = 'taylor.io'

/**
 * @param {LogoKey} key
 * @returns {string}
 */
export function resolveLogo(key) {
	const path = LOGO_MAP[key]
	if (path === undefined) {
		throw new Error(`logoMap: unknown key "${key}"`)
	}
	return path
}
