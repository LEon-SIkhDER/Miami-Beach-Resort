import React, { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import { ReactLenis, useLenis } from 'lenis/react'
import 'lenis/dist/lenis.css'

const ScrollToTop = () => {
    const { pathname } = useLocation()
    const lenis = useLenis()

    useEffect(() => {
        if (lenis) {
            lenis.scrollTo(0, { immediate: true })
        } else {
            window.scrollTo(0, 0)
        }
    }, [pathname, lenis])

    return null
}

const SmoothScroll = ({ children }) => {
    const lenisRef = useRef(null)

    const lenisOptions = {
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        smoothTouch: false, // Keep native touch scrolling on smartphones and tablets
        wheelMultiplier: 1,
        touchMultiplier: 1.5,
        prevent: (node) => {
            if (!node) return false
            return (
                node.classList?.contains('modal-box') ||
                node.closest?.('.modal-box') ||
                node.closest?.('[data-lenis-prevent]') ||
                node.closest?.('.modal') ||
                node.closest?.('.booking-calendar') ||
                node.closest?.('.react-datepicker')
            )
        }
    }

    return (
        <ReactLenis root ref={lenisRef} options={lenisOptions}>
            <ScrollToTop />
            {children}
        </ReactLenis>
    )
}

export default SmoothScroll
