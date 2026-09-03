import React, { useContext, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router'

import { AuthContext } from '../../Context/AuthContext'
import useRole from '../../hooks/useRole'
import {
    LayoutDashboard,
    BedDouble,
    CalendarCheck,
    Users,
    LogOut,
    Menu,
    X,
    Shield,
    CalendarDays,
    XCircle,
    DollarSign,
    Briefcase
} from 'lucide-react'
import { showConfirmAlert } from '../../utils/customSwal'
import logo from '../../assets/logo.png'

const Dashboard = () => {
    const { user, logOut } = useContext(AuthContext)
    const { role } = useRole()
    const { pathname } = useLocation()
    const isCalendarRoute = pathname === "/dashboard/calender"

    const [sidebarOpen, setSidebarOpen] = useState(false)
    const navigate = useNavigate()

    if (role === "user") {
        return <Navigate to="/my-bookings" replace />
    }

    const handleLogOut = () => {
        showConfirmAlert(
            "Log Out Confirmation",
            "Are you sure you want to sign out of your account?",
            "Yes, Sign Out",
            true
        ).then((result) => {
            if (result.isConfirmed) {
                logOut().then(() => navigate("/"))
            }
        })
    }

    const userLinks = [
        { to: "/dashboard", label: "Overview", icon: <LayoutDashboard size={18} /> },
        { to: "/dashboard/bookings", label: "My Bookings", icon: <CalendarCheck size={18} /> },
    ]
    const b2bLinks = [
        { to: "/dashboard/overview", label: "Sales Overview", icon: <LayoutDashboard size={18} /> },
        // { to: "/dashboard/bookings", label: "My Bookings", icon: <CalendarCheck size={18} /> },
        { to: "/dashboard/calender", label: "Booking Calendar", icon: <CalendarDays size={18} /> },
    ]
    const agentLinks = [
        { to: "/dashboard/overview", label: "Sales Overview", icon: <LayoutDashboard size={18} /> },
        { to: "/dashboard/bookings", label: "All Bookings", icon: <CalendarCheck size={18} /> },
        { to: "/dashboard/cancellations", label: "Cancellations", icon: <XCircle size={18} /> },
        { to: "/dashboard/calender", label: "Booking Calendar", icon: <CalendarDays size={18} /> },
    ]
    const managerLinks = [
        { to: "/dashboard/overview", label: "Overview", icon: <LayoutDashboard size={18} /> }, 
        { to: "/dashboard/category&room", label: "Category & Room", icon: <BedDouble size={18} /> },
        { to: "/dashboard/bookings", label: "All Bookings", icon: <CalendarCheck size={18} /> },
        { to: "/dashboard/income", label: "Room Income", icon: <DollarSign size={18} /> },
        { to: "/dashboard/cancellations", label: "Cancellations", icon: <XCircle size={18} /> },
        { to: "/dashboard/users", label: "Users & Roles", icon: <Users size={18} /> },
        { to: "/dashboard/workflow", label: "Worker Workflow", icon: <Briefcase size={18} /> },
        { to: "/dashboard/calender", label: "Booking Calendar", icon: <CalendarDays size={18} /> },
    ]
    const adminLinks = [
        { to: "/dashboard/overview", label: "Admin Overview", icon: <LayoutDashboard size={18} /> },
        { to: "/dashboard/category&room", label: "Category & Room", icon: <BedDouble size={18} /> },
        { to: "/dashboard/bookings", label: "All Bookings", icon: <CalendarCheck size={18} /> },
        { to: "/dashboard/income", label: "Room Income", icon: <DollarSign size={18} /> },
        { to: "/dashboard/cancellations", label: "Cancellations", icon: <XCircle size={18} /> },
        { to: "/dashboard/users", label: "Users & Roles", icon: <Users size={18} /> },
        { to: "/dashboard/workflow", label: "Worker Workflow", icon: <Briefcase size={18} /> },
        { to: "/dashboard/calender", label: "Booking Calendar", icon: <CalendarDays size={18} /> },
    ]

    const getLinksForRole = () => {
        switch (role) {
            case "admin": return adminLinks
            case "manager": return managerLinks
            case "agent": return agentLinks
            case "b2b": return b2bLinks
            default: return userLinks
        }
    }

    const links = getLinksForRole()

    const renderRoleBadge = (currentRole, isHeader = false) => {
        const sizeClass = isHeader ? "badge-sm" : "badge-xs"
        switch (currentRole) {
            case "admin":
                return <span className={`badge ${sizeClass} font-bold bg-amber-400 text-slate-900 border-none`}>Admin</span>
            case "manager":
                return <span className={`badge ${sizeClass} font-bold bg-purple-600 text-white border-none`}>Manager</span>
            case "agent":
                return <span className={`badge ${sizeClass} font-bold bg-teal-600 text-white border-none`}>Agent</span>
            case "b2b":
                return <span className={`badge ${sizeClass} font-bold bg-blue-600 text-white border-none`}>B2B Partner</span>
            default:
                return <span className={`badge ${sizeClass} font-bold bg-slate-200 text-slate-700 border-none`}>User</span>
        }
    }

    const SidebarContent = () => (
        <div className="flex flex-col h-full p-5 bg-white border-r border-slate-200">
            {/* Resort Branding with Logo Image */}
            <div className="mb-6 pb-5 border-b border-slate-100">
                <Link to="/" className="flex items-center gap-2.5">
                    <img
                        src={logo}
                        alt="Miami Beach Resort Logo"
                        className="h-10 w-auto object-contain"
                    />
                    <div>
                        <span className="font-extrabold text-slate-900 font-serif text-base leading-tight block">Miami Beach Resort</span>
                        <span className="text-[11px] text-teal-700 font-semibold tracking-wide uppercase">Cox's Bazar</span>
                    </div>
                </Link>

                {/* User Card */}
                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
                        {user?.displayName ? user.displayName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">{user?.displayName || "Guest User"}</p>
                        <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                    </div>
                    {renderRoleBadge(role)}
                </div>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 space-y-1.5 overflow-y-auto">
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase px-3 mb-2">Main Menu</p>
                {links.map(link => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        end={link.to === "/dashboard" || link.to === "/dashboard/overview"}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 ${isActive
                                ? "bg-teal-600 text-white shadow-md shadow-teal-600/20"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            }`
                        }
                    >
                        {link.icon}
                        <span>{link.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Bottom Actions: Log out with confirmation */}
            <div className="pt-4 border-t border-slate-100">
                <button
                    onClick={handleLogOut}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                    <LogOut size={16} />
                    <span>Log Out</span>
                </button>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Desktop Sidebar */}
            <aside className={`${isCalendarRoute ? "hidden" : "hidden lg:flex"} flex-col w-64 fixed top-0 left-0 bottom-0 z-30`}>
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar */}
            {sidebarOpen && (
                <div className={`${isCalendarRoute ? "flex" : "lg:hidden flex"} fixed inset-0 z-50`}>
                    <div className="w-72 max-w-[80vw] h-full shadow-2xl">
                        <SidebarContent />
                    </div>
                    <div className="flex-1 bg-slate-900/40 backdrop-blur-xs" onClick={() => setSidebarOpen(false)} />
                </div>
            )}

            {/* Main Content */}
            <div className={`flex-1 min-w-0 flex flex-col min-h-screen ${isCalendarRoute ? "" : "lg:pl-64"}`}>
                <header className={`${isCalendarRoute ? "flex" : "lg:hidden flex"} glass-header border-b border-slate-200 px-4 py-3 items-center justify-between sticky top-0 z-20`}>
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="btn btn-ghost btn-sm btn-square text-slate-700"
                    >
                        <Menu size={20} />
                    </button>
                    <div className="flex items-center gap-2">
                        <img src={logo} alt="Logo" className="h-7 w-auto object-contain" />
                        <span className="font-serif font-bold text-slate-900 text-sm">Miami Beach Resort</span>
                    </div>
                    {renderRoleBadge(role, true)}
                </header>

                <main className={`flex-1 min-w-0 ${isCalendarRoute ? "w-full p-0 overflow-hidden" : "max-w-[1750px] p-4 sm:p-6 lg:p-8"} w-full mx-auto min-h-dvh`}>
                    <Outlet />
                </main>
            </div>
        </div>
    )
}

export default Dashboard
