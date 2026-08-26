import Swal from 'sweetalert2'

export const showSuccessAlert = (title, text, html) => {
    return Swal.fire({
        title: title || 'Success!',
        text: text,
        html: html,
        icon: 'success',
        iconColor: '#0d9488',
        background: '#ffffff',
        color: '#0f172a',
        confirmButtonColor: '#0d9488',
        confirmButtonText: 'Great, got it!',
        customClass: {
            popup: 'rounded-2xl shadow-2xl border border-teal-100 p-6',
            title: 'text-xl font-bold text-slate-800',
            htmlContainer: 'text-slate-600 text-sm leading-relaxed',
            confirmButton: 'btn btn-primary px-6 py-2.5 rounded-xl font-medium shadow-md shadow-teal-500/20'
        }
    })
}

export const showErrorAlert = (title, text, html) => {
    return Swal.fire({
        title: title || 'Unavailable',
        text: text,
        html: html,
        icon: 'error',
        iconColor: '#ef4444',
        background: '#ffffff',
        color: '#0f172a',
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Close',
        customClass: {
            popup: 'rounded-2xl shadow-2xl border border-red-100 p-6',
            title: 'text-xl font-bold text-slate-800',
            htmlContainer: 'text-slate-600 text-sm leading-relaxed',
            confirmButton: 'btn btn-error px-6 py-2.5 rounded-xl font-medium'
        }
    })
}

export const showConfirmAlert = (title, text, confirmText = 'Yes, proceed', isDanger = false) => {
    return Swal.fire({
        title: title,
        text: text,
        icon: isDanger ? 'warning' : 'question',
        iconColor: isDanger ? '#ef4444' : '#0d9488',
        showCancelButton: true,
        confirmButtonColor: isDanger ? '#ef4444' : '#0d9488',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: confirmText,
        cancelButtonText: 'Cancel',
        background: '#ffffff',
        color: '#0f172a',
        reverseButtons: true,
        customClass: {
            popup: 'rounded-2xl shadow-2xl border border-slate-100 p-6',
            title: 'text-xl font-bold text-slate-800',
            htmlContainer: 'text-slate-600 text-sm',
            confirmButton: `btn ${isDanger ? 'btn-error' : 'btn-primary'} px-6 py-2.5 rounded-xl font-medium`,
            cancelButton: 'btn btn-ghost px-5 py-2.5 rounded-xl'
        }
    })
}

export default {
    showSuccessAlert,
    showErrorAlert,
    showConfirmAlert
}
