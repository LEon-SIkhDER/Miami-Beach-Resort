import React, { useContext, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { AuthContext } from '../Context/AuthContext'
import useRole from '../hooks/useRole'
import { 
    LayoutDashboard, 
    LogIn, 
    LogOut, 
    UserPlus, 
    ChevronDown, 
    CalendarCheck, 
    CalendarDays, 
    BedDouble, 
    ShieldCheck, 
    User
} from 'lucide-react'
import { showConfirmAlert } from '../utils/customSwal'
import logo from '../assets/logo.png'

const Header = () => {
    const { user, logOut } = useContext(AuthContext)
    const { role } = useRole()
    const navigate = useNavigate()
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [imgError, setImgError] = useState(false)
    const dropdownRef = useRef(null)

    const isStaffRole = ["admin", "manager", "agent", "b2b"].includes(role)

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    const handleLogOut = () => {
        setDropdownOpen(false)
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

    const getInitial = () => {
        if (user?.displayName && user.displayName.trim().length > 0) {
            return user.displayName.trim().charAt(0).toUpperCase()
        }
        if (user?.email && user.email.trim().length > 0) {
            return user.email.trim().charAt(0).toUpperCase()
        }
        return "U"
    }

    const renderRoleBadge = (currentRole) => {
        switch (currentRole) {
            case "admin":
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-900 shadow-xs"><ShieldCheck size={11} /> Admin</span>
            case "manager":
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white shadow-xs"><ShieldCheck size={11} /> Manager</span>
            case "agent":
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-600 text-white shadow-xs"><ShieldCheck size={11} /> Agent</span>
            case "b2b":
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white shadow-xs"><ShieldCheck size={11} /> B2B Partner</span>
            default:
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700"><User size={11} /> Guest User</span>
        }
    }

    return (
        <header className="glass-header sticky top-0 z-50 border-b border-slate-200/80 shadow-xs bg-white/90 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
                
                {/* Brand Logo */}
                <Link to="/" className="flex items-center gap-3 group select-none">
                    <img 
                        src={logo} 
                        alt="Miami Beach Resort Logo" 
                        className="h-11 w-auto object-contain group-hover:scale-105 transition-transform duration-200" 
                    />
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 font-serif">Miami Beach Resort</span>
                            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200/60">Cox's Bazar</span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium hidden xs:block">📍 Dolphin Mor, Kolatoli Beach</p>
                    </div>
                </Link>

                {/* Desktop Center Navigation */}
                <nav className="hidden lg:flex items-center gap-7 text-xs sm:text-sm font-bold text-slate-700">
                    <Link to="/" className="hover:text-teal-700 transition-colors">Home</Link>
                    <Link to="/services" className="hover:text-teal-700 transition-colors">Services & Amenities</Link>
                    <Link to="/about" className="hover:text-teal-700 transition-colors">About Us</Link>
                    {user && !isStaffRole && (
                        <Link to="/my-bookings" className="hover:text-teal-700 transition-colors">My Bookings</Link>
                    )}
                </nav>

                {/* Right Actions */}
                <div className="flex items-center gap-2.5">
                    


                    {/* Logged in User Avatar & Dropdown */}
                    {user ? (
                        <div className="relative" ref={dropdownRef}>
                            
                            {/* Avatar Trigger Pill */}
                            <button
                                type="button"
                                onClick={() => setDropdownOpen(prev => !prev)}
                                className={`flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full border transition-all duration-200 select-none bg-white hover:bg-slate-50 ${
                                    dropdownOpen 
                                        ? "border-teal-500 ring-2 ring-teal-500/20 shadow-md" 
                                        : "border-slate-200 hover:border-teal-300 shadow-xs"
                                }`}
                                aria-label="User Profile Menu"
                            >
                                {/* Avatar Image or First Letter */}
                                {user.photoURL && !imgError ? (
                                    <img 
                                        src={user.photoURL} 
                                        alt={user.displayName || "User Avatar"} 
                                        onError={() => setImgError(true)}
                                        className="h-8 w-8 rounded-full object-cover border border-teal-200 ring-1 ring-teal-500/30"
                                    />
                                ) : (
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                                        {getInitial()}
                                    </div>
                                )}

                                {/* User First Name (Optional on larger screens) */}
                                <span className="text-xs font-bold text-slate-800 max-w-[100px] truncate hidden md:inline-block">
                                    {user.displayName ? user.displayName.split(' ')[0] : "Guest"}
                                </span>

                                <ChevronDown 
                                    size={14} 
                                    className={`text-slate-500 transition-transform duration-200 ${dropdownOpen ? "rotate-180 text-teal-600" : ""}`} 
                                />
                            </button>

                            {/* Dropdown Menu Container */}
                            <div 
                                className={`absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl  overflow-hidden transition-all duration-200 origin-top-right z-50 ${
                                    dropdownOpen 
                                        ? "opacity-100 scale-100 pointer-events-auto" 
                                        : "opacity-0 scale-95 pointer-events-none"
                                }`}
                            >
                                {/* Dropdown Header Card */}
                                <div className="bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 p-4 sm:p-5 text-white flex items-center gap-3.5">
                                    {user.photoURL && !imgError ? (
                                        <img 
                                            src={user.photoURL} 
                                            alt={user.displayName || "User"} 
                                            onError={() => setImgError(true)}
                                            className="h-12 w-12 rounded-full object-cover border-2 border-white/80 ring-2 ring-teal-400 shrink-0"
                                        />
                                    ) : (
                                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-white font-black text-lg flex items-center justify-center border-2 border-white/80 shadow-md shrink-0">
                                            {getInitial()}
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-bold text-sm sm:text-base text-white truncate">
                                            {user.displayName || "Valued Guest"}
                                        </h3>
                                        <p className="text-xs text-teal-200/90 truncate font-mono mt-0.5">
                                            {user.email}
                                        </p>
                                        <div className="mt-2">
                                            {renderRoleBadge(role)}
                                        </div>
                                    </div>
                                </div>

                                {/* Menu Items */}
                                <div className="p-3 space-y-1 text-xs sm:text-sm">
                                    
                                    {/* Staff / Admin Dashboard Links */}
                                    {isStaffRole ? (
                                        <>
                                            <Link 
                                                to="/dashboard" 
                                                onClick={() => setDropdownOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-teal-50 hover:text-teal-900 font-semibold transition-colors"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                                                    <LayoutDashboard size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-xs sm:text-sm">Dashboard Overview</p>
                                                    <p className="text-[11px] text-slate-400 font-normal">Analytics & resort control</p>
                                                </div>
                                            </Link>

                                            <Link 
                                                to="/dashboard/calender" 
                                                onClick={() => setDropdownOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-teal-50 hover:text-teal-900 font-semibold transition-colors"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                                                    <CalendarDays size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-xs sm:text-sm">Booking Calendar</p>
                                                    <p className="text-[11px] text-slate-400 font-normal">Live room status & reservations</p>
                                                </div>
                                            </Link>

                                            <Link 
                                                to="/dashboard/bookings" 
                                                onClick={() => setDropdownOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-teal-50 hover:text-teal-900 font-semibold transition-colors"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                                    <CalendarCheck size={16} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 text-xs sm:text-sm">All Bookings</p>
                                                    <p className="text-[11px] text-slate-400 font-normal">Manage all guest bookings</p>
                                                </div>
                                            </Link>
                                        </>
                                    ) : (
                                        /* Regular Guest User Links */
                                        <Link 
                                            to="/my-bookings" 
                                            onClick={() => setDropdownOpen(false)}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-teal-50 hover:text-teal-900 font-semibold transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                                                <CalendarCheck size={16} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 text-xs sm:text-sm">My Bookings</p>
                                                <p className="text-[11px] text-slate-400 font-normal">View reservations & voucher PDF</p>
                                            </div>
                                        </Link>
                                    )}

                                    {/* Browse Rooms Link */}
                                    <Link 
                                        to="/" 
                                        onClick={() => setDropdownOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                            <BedDouble size={16} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 text-xs sm:text-sm">Browse Suites & Rooms</p>
                                            <p className="text-[11px] text-slate-400 font-normal">Explore Miami Beach Resort</p>
                                        </div>
                                    </Link>

                                    {/* Divider */}
                                    <div className="my-1.5 border-t border-slate-100"></div>

                                    {/* Sign Out Button */}
                                    <button 
                                        type="button"
                                        onClick={handleLogOut}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 font-bold transition-colors text-left"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                                            <LogOut size={16} />
                                        </div>
                                        <span>Sign Out</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Logged Out Buttons */
                        <div className="flex items-center gap-1.5">
                            <Link 
                                to="/login" 
                                className="btn btn-sm btn-outline border-slate-300 text-slate-700 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 gap-1.5 rounded-xl font-bold"
                            >
                                <LogIn size={15} />
                                <span>Login</span>
                            </Link>
                            <Link 
                                to="/register" 
                                className="btn btn-sm btn-ghost text-slate-600 hover:text-teal-700 hidden sm:inline-flex rounded-xl font-semibold"
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
