// Renders each page of a PDF blob URL to a canvas stack (real margins / breaks = export fidelity).

import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

/** US Letter width in PDF points (matches Playwright Letter output). */
const LETTER_W_PT = 612

export default function ExactPdfPages({ pdfUrl, zoomPercent = 100 }) {
	const hostRef = useRef(null)
	const [error, setError] = useState(null)
	const [busy, setBusy] = useState(false)

	useEffect(() => {
		const host = hostRef.current
		if (!host || !pdfUrl) {
			if (host) host.innerHTML = ''
			setError(null)
			setBusy(false)
			return
		}

		let cancelled = false
		setError(null)
		setBusy(true)
		host.innerHTML = ''

		const scaleBase = (850 / LETTER_W_PT) * (zoomPercent / 100)

		;(async () => {
			try {
				const loadingTask = pdfjsLib.getDocument({
					url: pdfUrl,
					withCredentials: false,
				})
				const pdf = await loadingTask.promise
				if (cancelled) return

				const n = pdf.numPages
				for (let i = 1; i <= n; i++) {
					if (cancelled) return
					const page = await pdf.getPage(i)
					const viewport = page.getViewport({ scale: scaleBase })
					const canvas = document.createElement('canvas')
					const ctx = canvas.getContext('2d')
					const dpr = Math.min(window.devicePixelRatio || 1, 2)
					const w = Math.floor(viewport.width)
					const h = Math.floor(viewport.height)
					canvas.width = Math.floor(w * dpr)
					canvas.height = Math.floor(h * dpr)
					canvas.style.width = `${w}px`
					canvas.style.height = `${h}px`
					canvas.style.display = 'block'
					ctx.scale(dpr, dpr)

					await page.render({
						canvasContext: ctx,
						viewport,
						canvas,
					}).promise
					if (cancelled) return

					const wrap = document.createElement('div')
					wrap.style.marginBottom = i < n ? '28px' : '8px'
					wrap.style.boxShadow =
						'0 0 0 1px rgba(15, 23, 42, 0.06), 0 4px 14px rgba(15, 23, 42, 0.11), 0 18px 40px rgba(15, 23, 42, 0.16)'
					wrap.style.background = '#fff'
					wrap.style.borderRadius = '2px'
					wrap.appendChild(canvas)
					host.appendChild(wrap)
					if (i === 1 && !cancelled) setBusy(false)
				}
			} catch (e) {
				if (!cancelled) {
					console.error('Exact PDF render failed', e)
					setError('Could not render PDF preview.')
				}
			} finally {
				if (!cancelled) setBusy(false)
			}
		})()

		return () => {
			cancelled = true
		}
	}, [pdfUrl, zoomPercent])

	if (!pdfUrl) return null

	return (
		<div className="flex flex-col items-center py-1 w-full">
			{error && (
				<p className="text-sm text-amber-800 mb-2 px-2 text-center">{error}</p>
			)}
			{busy && !error && (
				<p className="text-sm text-gray-500 py-4 shrink-0">Loading PDF…</p>
			)}
			<div ref={hostRef} className="w-full flex flex-col items-center" />
		</div>
	)
}
