import React, { useContext } from 'react'
import { Link, useNavigate } from 'react-router'
import { AuthContext } from '../Context/AuthContext'
import useRole from '../hooks/useRole'
import { LayoutDashboard, LogIn, LogOut, UserPlus } from 'lucide-react'
import { showConfirmAlert } from '../utils/customSwal'
import logo from '../assets/logo.png'

const Header = () => {
    const { user, logOut } = useContext(AuthContext)
    const { role } = useRole()
    const navigate = useNavigate()

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

    return (
        <header className="glass-header sticky top-0 z-50 border-b border-slate-200/80 shadow-xs">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
                <Link to="/" className="flex items-center gap-3 group">
                    <img 
                        src={logo} 
                        alt="Miami Beach Resort Logo" 
                        className="h-11 w-auto object-contain group-hover:scale-105 transition-transform duration-200" 
                    />
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-extrabold tracking-tight text-slate-900 font-serif">Miami Beach Resort</span>
                            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200/60">Cox's Bazar</span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">📍 Dolphin Mor, Kolatoli Beach</p>
                    </div>
                </Link>

                <div className="flex items-center gap-2.5">
                    <Link 
                        to="/dashboard" 
                        className="btn btn-sm btn-primary gap-1.5 shadow-sm shadow-teal-500/20 hover:shadow-md transition-all rounded-xl text-white"
                    >
                        <LayoutDashboard size={15} />
                        <span>Dashboard</span>
                        {role === "admin" && (
                            <span className="badge badge-xs bg-amber-400 text-slate-900 border-none font-bold ml-1">Admin</span>
                        )}
                    </Link>

                    {user ? (
                        <button 
                            onClick={handleLogOut} 
                            className="btn btn-sm btn-outline border-slate-300 text-slate-700 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 gap-1.5 rounded-xl transition-colors"
                        >
                            <LogOut size={15} />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <Link 
                                to="/login" 
                                className="btn btn-sm btn-outline border-slate-300 text-slate-700 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 gap-1.5 rounded-xl"
                            >
                                <LogIn size={15} />
                                <span>Login</span>
                            </Link>
                            <Link 
                                to="/register" 
                                className="btn btn-sm btn-ghost text-slate-600 hover:text-teal-700 hidden md:inline-flex rounded-xl"
                            >
                                <UserPlus size={15} />
                                <span>Register</span>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}

export default Header
