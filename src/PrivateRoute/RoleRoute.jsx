import React, { useContext } from 'react'
import { AuthContext } from '../Context/AuthContext'
import { Navigate } from 'react-router'
import useRole from '../hooks/useRole'

const RoleRoute = ({ children, allowedRoles = ["admin"] }) => {
    const { user, loading } = useContext(AuthContext)
    const { role, roleLoading } = useRole()

    if (loading || roleLoading || role === undefined) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-base-200">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="text-sm font-medium text-base-content/60">Verifying access permissions...</p>
            </div>
        )
    }

    if (!user) return <Navigate to="/login" replace />
    
    if (!allowedRoles.includes(role)) {
        return <Navigate to="/forbidden" replace />
    }

    return children
}

export default RoleRoute
