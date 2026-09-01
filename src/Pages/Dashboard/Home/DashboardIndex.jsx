import React from 'react'
import { Navigate } from 'react-router'
import useRole from '../../../hooks/useRole'

const DashboardIndex = () => {
    const { role, roleLoading } = useRole()

    if (roleLoading || role === undefined) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
                <span className="loading loading-spinner loading-lg text-teal-600"></span>
                <p className="text-sm font-medium text-slate-400">Loading...</p>
            </div>
        )
    }

    // All non-user roles (admin, manager, agent, b2b) land on the calendar page first
    if (role !== "user") {
        return <Navigate to="/dashboard/calender" replace />
    }

    // Regular guest users are redirected to My Bookings
    return <Navigate to="/my-bookings" replace />
}

export default DashboardIndex
