/**
 * Dynamically updates the browser top bar and mobile status bar color.
 * Supports Android Chrome, mobile Safari, and iOS PWA standalone display modes.
 *
 * @param {string} color - Hex color code (e.g. '#ffffff', '#031d17', '#04261f')
 * @param {'default' | 'black' | 'black-translucent'} [barStyle] - Optional iOS status bar style
 */
export const setStatusBarThemeColor = (color, barStyle) => {
    if (typeof document === 'undefined') return

    // 1. Standard HTML5 theme-color (Android Chrome, iOS 15+ Safari)
    let metaTheme = document.querySelector('meta[name="theme-color"]')
    if (!metaTheme) {
        metaTheme = document.createElement('meta')
        metaTheme.name = 'theme-color'
        document.head.appendChild(metaTheme)
    }
    if (metaTheme.getAttribute('content') !== color) {
        metaTheme.setAttribute('content', color)
    }

    // 2. Apple Mobile Web App status bar style (iOS standalone PWA)
    let metaApple = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    if (metaApple) {
        const targetStyle = barStyle || (color.toLowerCase() === '#ffffff' ? 'default' : 'black-translucent')
        if (metaApple.getAttribute('content') !== targetStyle) {
            metaApple.setAttribute('content', targetStyle)
        }
    }
}
