import React, { useContext, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router'
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
    User,
    Menu,
    X,
    Sparkles,
    PhoneCall
} from 'lucide-react'
import { showConfirmAlert } from '../utils/customSwal'
import Logo from './Logo'

const Header = () => {
    const { user, logOut } = useContext(AuthContext)
    const { role } = useRole()
    const navigate = useNavigate()
    const location = useLocation()
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [mobileNavOpen, setMobileNavOpen] = useState(false)
    const [imgError, setImgError] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const dropdownRef = useRef(null)

    const isStaffRole = ["admin", "manager", "agent", "b2b"].includes(role)

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 20) {
                setScrolled(true)
            } else {
                setScrolled(false)
            }
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

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

    const handleAnchorClick = (e, targetId) => {
        e.preventDefault()
        setMobileNavOpen(false)
        if (location.pathname === '/') {
            const el = document.getElementById(targetId)
            if (el) {
                el.scrollIntoView({ behavior: 'smooth' })
            }
        } else {
            navigate(`/#${targetId}`)
        }
    }

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
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#c5a880] text-[#04261f] shadow-xs"><ShieldCheck size={11} /> Royal Admin</span>
            case "manager":
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-700 text-white shadow-xs"><ShieldCheck size={11} /> Manager</span>
            case "agent":
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-700 text-white shadow-xs"><ShieldCheck size={11} /> Concierge Agent</span>
            case "b2b":
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-700 text-white shadow-xs"><ShieldCheck size={11} /> Corporate Partner</span>
            default:
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#04261f] text-[#dfc89e] border border-[#c5a880]/30"><User size={11} /> Valued Guest</span>
        }
    }

    return (
        <header 
            className={`sticky top-0 z-50 transition-all duration-300 ${
                scrolled 
                    ? "bg-[#04261f]/95 backdrop-blur-md shadow-2xl border-b border-[#c5a880]/20 py-2.5" 
                    : "bg-[#031d17]/90 backdrop-blur-md border-b border-[#c5a880]/15 py-3.5"
            }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                
                {/* Brand Logo & Crest */}
                <Logo />

                {/* Desktop Center Navigation */}
                <nav className="hidden lg:flex items-center gap-8 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                    <a 
                        href="#rooms" 
                        onClick={(e) => handleAnchorClick(e, 'rooms')}
                        className="hover:text-[#dfc89e] transition-colors cursor-pointer py-1 relative group"
                    >
                         Rooms
                        <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-[#c5a880] transition-all duration-300 group-hover:w-full"></span>
                    </a>
                    <a 
                        href="#services" 
                        onClick={(e) => handleAnchorClick(e, 'services')}
                        className="hover:text-[#dfc89e] transition-colors cursor-pointer py-1 relative group"
                    >
                        Services 
                        <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-[#c5a880] transition-all duration-300 group-hover:w-full"></span>
                    </a>
                    <a 
                        href="#contact" 
                        onClick={(e) => handleAnchorClick(e, 'contact')}
                        className="hover:text-[#dfc89e] transition-colors cursor-pointer py-1 relative group"
                    >
                        Contact  
                        <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-[#c5a880] transition-all duration-300 group-hover:w-full"></span>
                    </a>
                    
                    {!isStaffRole && (
                        <Link 
                            to="/my-bookings" 
                            className="hover:text-[#dfc89e] text-[#dfc89e] transition-colors font-bold"
                        >
                            My Bookings
                        </Link>
                    )}
                    {user && isStaffRole && (
                        <Link 
                            to="/dashboard" 
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#c5a880]/20 hover:bg-[#c5a880]/30 text-[#f5ebd7] font-bold border border-[#c5a880]/40 transition-all text-[11px]"
                        >
                            <LayoutDashboard size={13} className="text-[#dfc89e]" />
                            <span>Dashboard</span>
                        </Link>
                    )}
                </nav>

                {/* Right Actions */}
                <div className="flex items-center gap-3">
                    
                    {/* Direct Concierge Call button */}
                    <a 
                        href="tel:+8801616472282" 
                        className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#dfc89e] hover:text-white bg-white/5 hover:bg-white/10 border border-[#c5a880]/30 transition-all"
                    >
                        <PhoneCall size={13} className="text-[#c5a880]" />
                        <span className="tracking-wider font-mono text-[11px]">+8801616472282</span>
                    </a>

                    {/* Logged in User Avatar & Dropdown */}
                    {user ? (
                        <div className="relative" ref={dropdownRef}>
                            
                            {/* Avatar Trigger Pill */}
                            <button
                                type="button"
                                onClick={() => setDropdownOpen(prev => !prev)}
                                className={`flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full border transition-all duration-200 select-none bg-[#03221b] ${
                                    dropdownOpen 
                                        ? "border-[#c5a880] ring-2 ring-[#c5a880]/30 shadow-lg" 
                                        : "border-[#c5a880]/30 hover:border-[#c5a880] shadow-xs"
                                }`}
                                aria-label="User Profile Menu"
                            >
                                {user.photoURL && !imgError ? (
                                    <img 
                                        src={user.photoURL} 
                                        alt={user.displayName || "User Avatar"} 
                                        onError={() => setImgError(true)}
                                        className="h-8 w-8 rounded-full object-cover border border-[#c5a880] ring-1 ring-[#c5a880]/40"
                                    />
                                ) : (
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#c5a880] to-[#9a7b52] text-[#04261f] font-black text-xs flex items-center justify-center shadow-xs">
                                        {getInitial()}
                                    </div>
                                )}

                                <span className="text-xs font-semibold text-[#f5ebd7] max-w-[100px] truncate hidden md:inline-block">
                                    {user.displayName ? user.displayName.split(' ')[0] : "VIP Guest"}
                                </span>

                                <ChevronDown 
                                    size={13} 
                                    className={`text-[#dfc89e] transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`} 
                                />
                            </button>

                            {/* Dropdown Menu Container */}
                            <div 
                                className={`absolute right-0 mt-2 w-72 sm:w-80 bg-[#04261f] border border-[#c5a880]/30 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200 origin-top-right z-50 ${
                                    dropdownOpen 
                                        ? "opacity-100 scale-100 pointer-events-auto" 
                                        : "opacity-0 scale-95 pointer-events-none"
                                }`}
                            >
                                {/* Dropdown Header Card */}
                                <div className="bg-gradient-to-br from-[#021a15] via-[#04261f] to-[#0b3b30] p-4 sm:p-5 text-white flex items-center gap-3.5 border-b border-[#c5a880]/20">
                                    {user.photoURL && !imgError ? (
                                        <img 
                                            src={user.photoURL} 
                                            alt={user.displayName || "User"} 
                                            onError={() => setImgError(true)}
                                            className="h-12 w-12 rounded-full object-cover border-2 border-[#dfc89e] ring-2 ring-[#c5a880]/30 shrink-0"
                                        />
                                    ) : (
                                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#dfc89e] to-[#9a7b52] text-[#04261f] font-black text-lg flex items-center justify-center border-2 border-[#dfc89e] shadow-md shrink-0">
                                            {getInitial()}
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-serif font-bold text-sm sm:text-base text-[#f5ebd7] truncate">
                                            {user.displayName || "Distinguished Guest"}
                                        </h3>
                                        <p className="text-xs text-slate-300 truncate font-mono mt-0.5">
                                            {user.email}
                                        </p>
                                        <div className="mt-2">
                                            {renderRoleBadge(role)}
                                        </div>
                                    </div>
                                </div>

                                {/* Menu Items */}
                                <div className="p-3 space-y-1 text-xs">
                                    {isStaffRole ? (
                                        <>
                                            <Link 
                                                to="/dashboard" 
                                                onClick={() => setDropdownOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-200 hover:bg-white/10 hover:text-[#dfc89e] font-semibold transition-colors"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-[#c5a880]/20 text-[#dfc89e] flex items-center justify-center shrink-0 border border-[#c5a880]/30">
                                                    <LayoutDashboard size={15} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-xs">Dashboard Overview</p>
                                                    <p className="text-[10px] text-slate-400">Analytics & resort management</p>
                                                </div>
                                            </Link>

                                            <Link 
                                                to="/dashboard/calender" 
                                                onClick={() => setDropdownOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-200 hover:bg-white/10 hover:text-[#dfc89e] font-semibold transition-colors"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-[#c5a880]/20 text-[#dfc89e] flex items-center justify-center shrink-0 border border-[#c5a880]/30">
                                                    <CalendarDays size={15} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-xs">Booking Calendar</p>
                                                    <p className="text-[10px] text-slate-400">Live room occupancy & schedules</p>
                                                </div>
                                            </Link>

                                            <Link 
                                                to="/dashboard/bookings" 
                                                onClick={() => setDropdownOpen(false)}
                                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-200 hover:bg-white/10 hover:text-[#dfc89e] font-semibold transition-colors"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-[#c5a880]/20 text-[#dfc89e] flex items-center justify-center shrink-0 border border-[#c5a880]/30">
                                                    <CalendarCheck size={15} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-xs">All Reservations</p>
                                                    <p className="text-[10px] text-slate-400">Review & confirm guest orders</p>
                                                </div>
                                            </Link>
                                        </>
                                    ) : (
                                        <Link 
                                            to="/my-bookings" 
                                            onClick={() => setDropdownOpen(false)}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-200 hover:bg-white/10 hover:text-[#dfc89e] font-semibold transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-[#c5a880]/20 text-[#dfc89e] flex items-center justify-center shrink-0 border border-[#c5a880]/30">
                                                <CalendarCheck size={15} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-white text-xs">My Bookings</p>
                                                <p className="text-[10px] text-slate-400">View reservations & voucher PDF</p>
                                            </div>
                                        </Link>
                                    )}

                                    <a 
                                        href="#rooms" 
                                        onClick={(e) => { setDropdownOpen(false); handleAnchorClick(e, 'rooms') }}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-200 hover:bg-white/10 hover:text-[#dfc89e] font-semibold transition-colors cursor-pointer"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-white/5 text-slate-300 flex items-center justify-center shrink-0">
                                            <BedDouble size={15} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-xs">Explore Royal Suites</p>
                                            <p className="text-[10px] text-slate-400">Choose luxury chambers</p>
                                        </div>
                                    </a>

                                    <div className="my-1.5 border-t border-[#c5a880]/20"></div>

                                    <button 
                                        type="button"
                                        onClick={handleLogOut}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 font-bold transition-colors text-left cursor-pointer"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-rose-950/60 text-rose-400 flex items-center justify-center shrink-0 border border-rose-800/40">
                                            <LogOut size={15} />
                                        </div>
                                        <span>Sign Out</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link 
                                to="/login" 
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-[#f5ebd7] bg-[#c5a880]/20 hover:bg-[#c5a880]/30 border border-[#c5a880]/40 transition-all shadow-xs"
                            >
                                <LogIn size={13} className="text-[#dfc89e]" />
                                <span>Sign In</span>
                            </Link>
                            {/* <Link 
                                to="/register" 
                                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                            >
                                <UserPlus size={13} />
                                <span>Join VIP</span>
                            </Link> */}
                        </div>
                    )}

                    {/* Mobile Menu Button */}
                    <button
                        type="button"
                        onClick={() => setMobileNavOpen(prev => !prev)}
                        className="lg:hidden p-2 rounded-xl text-[#dfc89e] hover:bg-white/10 transition-colors cursor-pointer"
                        aria-label="Toggle Mobile Navigation"
                    >
                        {mobileNavOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation Drawer */}
            {mobileNavOpen && (
                <div className="lg:hidden bg-[#031d17] border-b border-[#c5a880]/30 px-6 py-5 space-y-4 animate-in slide-in-from-top-4 duration-200">
                    <nav className="flex flex-col space-y-3 text-sm font-semibold uppercase tracking-widest text-slate-200">
                        <a 
                            href="#rooms" 
                            onClick={(e) => handleAnchorClick(e, 'rooms')}
                            className="py-2 border-b border-white/5 hover:text-[#dfc89e]"
                        >
                            Suites & Rooms
                        </a>
                        <a 
                            href="#services" 
                            onClick={(e) => handleAnchorClick(e, 'services')}
                            className="py-2 border-b border-white/5 hover:text-[#dfc89e]"
                        >
                            Services & Amenities
                        </a>
                        <a 
                            href="#contact" 
                            onClick={(e) => handleAnchorClick(e, 'contact')}
                            className="py-2 border-b border-white/5 hover:text-[#dfc89e]"
                        >
                            Contact & Concierge
                        </a>

                        {!isStaffRole && (
                            <Link 
                                to="/my-bookings" 
                                onClick={() => setMobileNavOpen(false)}
                                className="py-2 text-[#dfc89e] font-bold"
                            >
                                My Bookings
                            </Link>
                        )}
                        {user && isStaffRole && (
                            <Link 
                                to="/dashboard" 
                                onClick={() => setMobileNavOpen(false)}
                                className="py-2 text-[#dfc89e] font-bold flex items-center gap-2"
                            >
                                <LayoutDashboard size={16} />
                                <span>Go to Dashboard</span>
                            </Link>
                        )}
                    </nav>

                    <div className="pt-2 border-t border-[#c5a880]/20 flex items-center justify-between text-xs text-slate-300">
                        <span className="flex items-center gap-1.5">
                            <Sparkles size={14} className="text-[#dfc89e]" />
                            5-Star Luxury Resort
                        </span>
                        <a href="tel:+8801616472282" className="text-[#dfc89e] font-mono font-bold">
                            +8801616472282
                        </a>
                    </div>
                </div>
            )}
        </header>
    )
}

export default Header
