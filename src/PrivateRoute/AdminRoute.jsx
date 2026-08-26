import { useContext } from 'react'
import { AuthContext } from '../Context/AuthContext'
import { Navigate } from 'react-router'
import useRole from '../hooks/useRole'

const AdminRoute = ({ children }) => {
    const { user, loading } = useContext(AuthContext)
    const { role, roleLoading } = useRole()

    if (loading || roleLoading) return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-base-200">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="text-sm font-medium text-base-content/60">Verifying admin access...</p>
        </div>
    )

    if (!user) return <Navigate to="/login" replace />
    if (role !== "admin") return <Navigate to="/forbidden" replace />
    return children
}

export default AdminRoute
