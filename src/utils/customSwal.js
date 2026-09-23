import React from 'react'
import { createRoot } from 'react-dom/client'
import Swal from 'sweetalert2'
import {
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Trash2,
    LogOut,
    Info,
    HelpCircle,
    ShieldAlert
} from 'lucide-react'

/**
 * Returns preset styling and icon component for preset icon strings.
 */
const getPresetConfig = (preset, isDanger) => {
    switch (preset) {
        case 'delete':
        case 'trash':
        case 'remove':
        case 'error':
            return {
                color: '#e11d48',
                bg: 'rgba(225, 29, 72, 0.1)',
                border: 'rgba(225, 29, 72, 0.28)',
                glow: 'rgba(225, 29, 72, 0.35)',
                icon: Trash2
            }
        case 'warning':
        case 'suspend':
            return {
                color: '#d97706',
                bg: 'rgba(245, 158, 11, 0.1)',
                border: 'rgba(245, 158, 11, 0.28)',
                glow: 'rgba(245, 158, 11, 0.35)',
                icon: AlertTriangle
            }
        case 'success':
        case 'check':
        case 'confirmed':
            return {
                color: '#059669',
                bg: 'rgba(16, 185, 129, 0.1)',
                border: 'rgba(16, 185, 129, 0.28)',
                glow: 'rgba(16, 185, 129, 0.35)',
                icon: CheckCircle2
            }
        case 'info':
            return {
                color: '#0284c7',
                bg: 'rgba(2, 132, 199, 0.1)',
                border: 'rgba(2, 132, 199, 0.28)',
                glow: 'rgba(2, 132, 199, 0.35)',
                icon: Info
            }
        case 'logout':
        case 'signout':
            return {
                color: '#0d9488',
                bg: 'rgba(13, 148, 136, 0.1)',
                border: 'rgba(13, 148, 136, 0.28)',
                glow: 'rgba(13, 148, 136, 0.35)',
                icon: LogOut
            }
        case 'question':
        default:
            return {
                color: isDanger ? '#e11d48' : '#0d9488',
                bg: isDanger ? 'rgba(225, 29, 72, 0.1)' : 'rgba(13, 148, 136, 0.1)',
                border: isDanger ? 'rgba(225, 29, 72, 0.28)' : 'rgba(13, 148, 136, 0.28)',
                glow: isDanger ? 'rgba(225, 29, 72, 0.35)' : 'rgba(13, 148, 136, 0.35)',
                icon: isDanger ? AlertTriangle : HelpCircle
            }
    }
}

/**
 * Dynamically mounts custom Lucide icon badge inside the SweetAlert modal.
 */
const renderModalIcon = (modal, icon, isDanger) => {
    const existingIcon = modal.querySelector('.miami-swal-icon-wrapper')
    if (existingIcon) return

    const iconContainer = document.createElement('div')
    iconContainer.className = 'miami-swal-icon-wrapper'
    const iconInner = document.createElement('div')
    iconInner.className = 'miami-swal-icon-inner'
    iconContainer.appendChild(iconInner)
    modal.insertBefore(iconContainer, modal.firstChild)

    // 1. If React element is passed (<Trash2 />)
    if (React.isValidElement(icon)) {
        createRoot(iconInner).render(icon)
        return
    }

    // 2. If Lucide icon component is passed (e.g. icon={Trash2} or icon={AlertTriangle})
    if (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && '$$typeof' in icon)) {
        const IconComponent = icon
        const colorClass = isDanger ? 'text-rose-600' : 'text-teal-600'
        createRoot(iconInner).render(
            React.createElement(IconComponent, {
                size: 24,
                className: `w-6 h-6 ${colorClass}`
            })
        )
        if (isDanger) {
            iconInner.style.background = 'rgba(225, 29, 72, 0.1)'
            iconInner.style.borderColor = 'rgba(225, 29, 72, 0.28)'
            iconInner.style.boxShadow = '0 0 20px -3px rgba(225, 29, 72, 0.35)'
        }
        return
    }

    // 3. String preset or default fallback
    const preset = getPresetConfig(typeof icon === 'string' ? icon : undefined, isDanger)
    iconInner.style.background = preset.bg
    iconInner.style.borderColor = preset.border
    iconInner.style.boxShadow = `0 0 20px -3px ${preset.glow}`

    const PresetIcon = preset.icon
    createRoot(iconInner).render(
        React.createElement(PresetIcon, {
            size: 24,
            style: { color: preset.color },
            className: 'w-6 h-6'
        })
    )
}

/**
 * Dynamic SweetAlert modal customized for Miami Beach Resort UI design system.
 * Returns Promise<boolean> (true if confirmed, false if cancelled/dismissed).
 *
 * @example
 * const confirmed = await showCustomSwal({
 *   title: "Delete Category?",
 *   des: "This action will permanently delete this category.",
 *   icon: Trash2,
 *   isDanger: true,
 *   confirmButtonText: "Yes, Delete"
 * });
 */
export const showCustomSwal = async (options = {}) => {
    const {
        title = "Are you sure?",
        des,
        description = des,
        icon,
        confirmButtonText = "Confirm",
        cancelButtonText = "Cancel",
        showCancelButton = true,
        showConfirmButton = true,
        reverseButtons = true,
        isDanger = false,
        html,
        onConfirm,
        onCancel
    } = options

    const result = await Swal.fire({
        title,
        html: html || (description ? `<div class="swal-custom-body"><p class="swal-custom-desc">${description}</p></div>` : undefined),
        showCancelButton,
        showConfirmButton,
        confirmButtonText,
        cancelButtonText,
        reverseButtons,
        buttonsStyling: false,
        customClass: {
            popup: `miami-swal-popup ${isDanger ? 'is-danger' : ''}`,
            container: 'miami-swal-container',
            title: 'miami-swal-title',
            htmlContainer: 'miami-swal-html',
            actions: 'miami-swal-actions',
            confirmButton: isDanger ? 'miami-swal-btn-confirm !bg-rose-600 hover:!bg-rose-700 !border-rose-500/50 shadow-rose-600/30' : 'miami-swal-btn-confirm',
            cancelButton: 'miami-swal-btn-cancel'
        },
        didOpen: (modal) => {
            renderModalIcon(modal, icon || (isDanger ? 'warning' : 'question'), isDanger)
        }
    })

    if (result.isConfirmed) {
        if (onConfirm) await onConfirm()
        return true
    } else {
        if (onCancel) await onCancel()
        return false
    }
}

/**
 * Custom styled Sign Out confirmation modal matching Miami Beach Resort design language.
 */
export const confirmSignOut = async (onConfirm) => {
    return showCustomSwal({
        title: "Sign Out Confirmation",
        des: "Are you sure you want to end your current session and sign out of Miami Beach Resort?",
        icon: LogOut,
        confirmButtonText: "Yes, Sign Out",
        cancelButtonText: "Cancel",
        isDanger: true,
        onConfirm
    })
}

/**
 * Backward-compatible helper for existing codebases.
 * Returns a SweetAlertResult object where `result.isConfirmed` is true/false.
 */
export const showConfirmAlert = async (title, text, confirmText = 'Yes, proceed', isDanger = false, options = {}) => {
    const result = await Swal.fire({
        title: title || 'Are you sure?',
        html: text ? `<div class="swal-custom-body"><p class="swal-custom-desc">${text}</p></div>` : (options.html || undefined),
        showCancelButton: true,
        showConfirmButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: options.cancelButtonText || 'Cancel',
        reverseButtons: true,
        buttonsStyling: false,
        customClass: {
            popup: `miami-swal-popup ${isDanger ? 'is-danger' : ''}`,
            container: 'miami-swal-container',
            title: 'miami-swal-title',
            htmlContainer: 'miami-swal-html',
            actions: 'miami-swal-actions',
            confirmButton: isDanger ? 'miami-swal-btn-confirm !bg-rose-600 hover:!bg-rose-700 !border-rose-500/50 shadow-rose-600/30' : 'miami-swal-btn-confirm',
            cancelButton: 'miami-swal-btn-cancel'
        },
        didOpen: (modal) => {
            renderModalIcon(modal, options.icon || (isDanger ? 'warning' : 'question'), isDanger)
        }
    })

    if (result.isConfirmed && options.onConfirm) {
        await options.onConfirm()
    } else if (!result.isConfirmed && options.onCancel) {
        await options.onCancel()
    }

    return result
}

/**
 * Success modal styled with Miami Beach Resort luxury theme.
 */
export const showSuccessAlert = (title, text, html, options = {}) => {
    return Swal.fire({
        title: title || 'Success!',
        html: html || (text ? `<div class="swal-custom-body"><p class="swal-custom-desc">${text}</p></div>` : undefined),
        showCancelButton: false,
        showConfirmButton: true,
        confirmButtonText: options.confirmButtonText || 'Great, got it!',
        buttonsStyling: false,
        customClass: {
            popup: 'miami-swal-popup',
            container: 'miami-swal-container',
            title: 'miami-swal-title',
            htmlContainer: 'miami-swal-html',
            actions: 'miami-swal-actions',
            confirmButton: 'miami-swal-btn-confirm'
        },
        didOpen: (modal) => {
            renderModalIcon(modal, options.icon || 'success', false)
        }
    })
}

/**
 * Error / Unavailable modal styled with Miami Beach Resort theme.
 */
export const showErrorAlert = (title, text, html, options = {}) => {
    return Swal.fire({
        title: title || 'Action Unavailable',
        html: html || (text ? `<div class="swal-custom-body"><p class="swal-custom-desc">${text}</p></div>` : undefined),
        showCancelButton: false,
        showConfirmButton: true,
        confirmButtonText: options.confirmButtonText || 'Close',
        buttonsStyling: false,
        customClass: {
            popup: 'miami-swal-popup is-danger',
            container: 'miami-swal-container',
            title: 'miami-swal-title',
            htmlContainer: 'miami-swal-html',
            actions: 'miami-swal-actions',
            confirmButton: 'miami-swal-btn-confirm !bg-rose-600 hover:!bg-rose-700 !border-rose-500/50 shadow-rose-600/30'
        },
        didOpen: (modal) => {
            renderModalIcon(modal, options.icon || 'error', true)
        }
    })
}

Swal.showCustomSwal = showCustomSwal
Swal.confirmSignOut = confirmSignOut
Swal.showConfirmAlert = showConfirmAlert
Swal.showSuccessAlert = showSuccessAlert
Swal.showErrorAlert = showErrorAlert

export default Swal
