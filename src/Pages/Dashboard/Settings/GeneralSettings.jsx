import React, { useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Calendar, CreditCard, ShieldAlert, Save } from 'lucide-react'

const GeneralSettings = () => {
    const [saved, setSaved] = useState(false)
    const [formData, setFormData] = useState({})

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <Link
                    to="/dashboard/settings"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 mb-2 transition-colors"
                >
                    <ArrowLeft size={14} /> Back to Settings
                </Link>
                <h1 className="text-2xl font-bold text-slate-900">General Settings</h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Configure your resort's core booking, payment, and cancellation rules.
                </p>
            </div>

            {saved && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold">
                    Settings saved successfully!
                </div>
            )}


        </div>
    )
}

export default GeneralSettings