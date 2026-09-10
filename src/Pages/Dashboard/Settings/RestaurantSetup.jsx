import React from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Utensils } from 'lucide-react'

const RestaurantSetup = () => {
    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
                <div>
                    <Link
                        to="/dashboard/settings"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 mb-2 transition-colors"
                    >
                        <ArrowLeft size={14} /> Back to All Settings
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight">
                        Restaurant Setup
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        This is Restaurant Setup page.
                    </p>
                </div>
            </div>

            {/* Placeholder Content */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
                    <Utensils size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Restaurant Setup</h2>
                <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                    This is Restaurant Setup page.
                </p>
            </div>
        </div>
    )
}

export default RestaurantSetup
