import React, { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import {
    Building2,
    BedDouble,
    Utensils,
    Users,
    Settings as SettingsIcon,
    Database,
    FileText,
    Image,
    Phone,
    PlusCircle,
    Layers,
    Coins,
    Star,
    Video,
    LayoutGrid,
    UtensilsCrossed,
    CircleDollarSign,
    ToggleLeft,
    UserPlus,
    Shield,
    Lock,
    Calendar,
    CreditCard,
    XCircle,
    CloudUpload,
    RotateCcw,
    ChevronRight,
    Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'

// --- Custom Header SVG Illustrations (Matching Visual Style) ---

const HotelIllustration = () => (
    <svg className="w-20 h-16 sm:w-24 sm:h-20" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Palm Trees */}
        <path d="M12 68C13 52 18 42 22 36" stroke="#059669" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M22 36C18 32 10 32 8 36" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
        <path d="M22 36C20 30 16 26 12 28" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
        <path d="M22 36C26 30 30 32 32 36" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
        <path d="M88 68C87 52 82 42 78 36" stroke="#059669" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M78 36C82 32 90 32 92 36" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
        <path d="M78 36C80 30 84 26 88 28" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>
        <path d="M78 36C74 30 70 32 68 36" stroke="#10b981" strokeWidth="2" strokeLinecap="round"/>

        {/* Building Base */}
        <rect x="25" y="20" width="50" height="50" rx="3" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="2"/>
        <rect x="23" y="16" width="54" height="6" rx="2" fill="#0284c7"/>
        <text x="50" y="21" fill="#ffffff" fontSize="4.5" fontWeight="bold" textAnchor="middle" letterSpacing="0.5">HOTEL</text>

        {/* Windows */}
        <rect x="30" y="26" width="8" height="8" rx="1.5" fill="#38bdf8"/>
        <rect x="46" y="26" width="8" height="8" rx="1.5" fill="#38bdf8"/>
        <rect x="62" y="26" width="8" height="8" rx="1.5" fill="#38bdf8"/>
        <rect x="30" y="38" width="8" height="8" rx="1.5" fill="#38bdf8"/>
        <rect x="46" y="38" width="8" height="8" rx="1.5" fill="#38bdf8"/>
        <rect x="62" y="38" width="8" height="8" rx="1.5" fill="#38bdf8"/>
        <rect x="30" y="50" width="8" height="8" rx="1.5" fill="#38bdf8"/>
        <rect x="62" y="50" width="8" height="8" rx="1.5" fill="#38bdf8"/>

        {/* Door */}
        <rect x="45" y="52" width="10" height="18" rx="1" fill="#0284c7"/>
        <line x1="20" y1="70" x2="80" y2="70" stroke="#bae6fd" strokeWidth="2"/>
    </svg>
)

const BedIllustration = () => (
    <svg className="w-20 h-16 sm:w-24 sm:h-20" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Headboard */}
        <rect x="20" y="28" width="60" height="34" rx="4" fill="#10b981" stroke="#059669" strokeWidth="2"/>
        {/* Mattress / Bedding */}
        <rect x="24" y="44" width="52" height="18" rx="3" fill="#ecfdf5" stroke="#34d399" strokeWidth="2"/>
        {/* Pillows */}
        <rect x="28" y="34" width="18" height="10" rx="3" fill="#ffffff" stroke="#a7f3d0" strokeWidth="1.5"/>
        <rect x="54" y="34" width="18" height="10" rx="3" fill="#ffffff" stroke="#a7f3d0" strokeWidth="1.5"/>
        {/* Duvet Fold */}
        <path d="M24 50H76V62H24V50Z" fill="#34d399" opacity="0.6"/>
        {/* Legs */}
        <rect x="22" y="62" width="4" height="8" rx="1" fill="#047857"/>
        <rect x="74" y="62" width="4" height="8" rx="1" fill="#047857"/>
    </svg>
)

const RestaurantIllustration = () => (
    <svg className="w-20 h-16 sm:w-24 sm:h-20" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Base Platter */}
        <ellipse cx="50" cy="58" rx="34" ry="7" fill="#fed7aa" stroke="#f97316" strokeWidth="2"/>
        <ellipse cx="50" cy="56" rx="30" ry="5" fill="#ffedd5"/>
        {/* Cloche Dome */}
        <path d="M22 54C22 36 34 26 50 26C66 26 78 36 78 54H22Z" fill="#fb923c" stroke="#ea580c" strokeWidth="2"/>
        {/* Knob */}
        <circle cx="50" cy="23" r="4.5" fill="#f97316" stroke="#ea580c" strokeWidth="1.5"/>
        {/* Steam line accents */}
        <path d="M42 16C43 13 41 11 43 8" stroke="#fdba74" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M50 14C51 11 49 9 51 6" stroke="#fdba74" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M58 16C59 13 57 11 59 8" stroke="#fdba74" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
)

const StaffIllustration = () => (
    <svg className="w-20 h-16 sm:w-24 sm:h-20" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Left User */}
        <circle cx="34" cy="38" r="9" fill="#c7d2fe" opacity="0.85"/>
        <path d="M20 62C20 52 26 48 34 48C42 48 48 52 48 62" fill="#c7d2fe" opacity="0.85"/>
        {/* Right User */}
        <circle cx="66" cy="38" r="9" fill="#c7d2fe" opacity="0.85"/>
        <path d="M52 62C52 52 58 48 66 48C74 48 80 52 80 62" fill="#c7d2fe" opacity="0.85"/>
        {/* Center Main User */}
        <circle cx="50" cy="32" r="11" fill="#6366f1"/>
        <path d="M33 62C33 50 40 45 50 45C60 45 67 50 67 62" fill="#6366f1"/>
    </svg>
)

const GeneralIllustration = () => (
    <svg className="w-20 h-16 sm:w-24 sm:h-20" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Big Gear */}
        <g transform="translate(42, 42)">
            <circle cx="0" cy="0" r="14" fill="#2dd4bf" stroke="#0d9488" strokeWidth="2.5"/>
            <circle cx="0" cy="0" r="5" fill="#f0fdfa"/>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
                <rect
                    key={i}
                    x="-3"
                    y="-19"
                    width="6"
                    height="6"
                    rx="1.5"
                    fill="#0d9488"
                    transform={`rotate(${deg})`}
                />
            ))}
        </g>
        {/* Small Gear */}
        <g transform="translate(68, 28)">
            <circle cx="0" cy="0" r="9" fill="#99f6e4" stroke="#0d9488" strokeWidth="2"/>
            <circle cx="0" cy="0" r="3.5" fill="#f0fdfa"/>
            {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                <rect
                    key={i}
                    x="-2"
                    y="-13"
                    width="4"
                    height="5"
                    rx="1"
                    fill="#0d9488"
                    transform={`rotate(${deg})`}
                />
            ))}
        </g>
    </svg>
)

const BackupIllustration = () => (
    <svg className="w-20 h-16 sm:w-24 sm:h-20" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Soft Background Cloud */}
        <path
            d="M32 58H68C76 58 82 52 82 44C82 37 77 31 70 30C69 22 62 16 53 16C46 16 39 20 37 26C35 25 33 25 31 25C22 25 15 32 15 41C15 50 22 58 32 58Z"
            fill="#c084fc"
            opacity="0.35"
        />
        {/* Main Solid Cloud */}
        <path
            d="M35 54H68C74.6 54 80 48.6 80 42C80 35.8 75.3 30.7 69.2 30.1C68.1 22.8 61.8 17.5 54 17.5C47.8 17.5 42.4 20.8 39.8 25.8C38.3 25.3 36.7 25 35 25C27.3 25 21 31.3 21 39C21 47.3 27.3 54 35 54Z"
            fill="#8b5cf6"
        />
        {/* Arrow Upload */}
        <path d="M50 46V31M50 31L43 38M50 31L57 38" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
)

// --- Settings Page Component ---

const Settings = () => {
    const location = useLocation()

    useEffect(() => {
        const params = new URLSearchParams(location.search)
        const section = params.get('section')
        if (section) {
            const el = document.getElementById(section)
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                el.classList.add('ring-4', 'ring-teal-500/50')
                const timer = setTimeout(() => {
                    el.classList.remove('ring-4', 'ring-teal-500/50')
                }, 2500)
                return () => clearTimeout(timer)
            }
        }
    }, [location.search])

    const settingsCards = [
        // 1. Hotel Setup
        {
            id: "hotel-setup",
            title: "Hotel Setup",
            subtitle: "Manage hotel basic information, logo and contact details.",
            headerIcon: <Building2 size={24} />,
            headerBg: "bg-[#0284c7]",
            headerGradient: "from-sky-50 via-blue-50/70 to-white",
            headerBorder: "border-sky-100",
            illustration: <HotelIllustration />,
            items: [
                {
                    title: "Hotel Information",
                    subtitle: "Hotel name, address, description, etc.",
                    icon: <FileText size={18} />,
                    iconBg: "bg-sky-100/90 text-sky-600"
                },
                {
                    title: "Hotel Logo",
                    subtitle: "Upload or change hotel logo.",
                    icon: <Image size={18} />,
                    iconBg: "bg-sky-100/90 text-sky-600"
                },
                {
                    title: "Contact Information",
                    subtitle: "Phone, email, website, social media.",
                    icon: <Phone size={18} />,
                    iconBg: "bg-sky-100/90 text-sky-600"
                }
            ]
        },

        // 2. Room Setup
        {
            id: "room-setup",
            title: "Room Setup",
            subtitle: "Manage room types, room numbers, facilities and pricing.",
            headerIcon: <BedDouble size={24} />,
            headerBg: "bg-[#059669]",
            headerGradient: "from-emerald-50 via-teal-50/70 to-white",
            headerBorder: "border-emerald-100",
            illustration: <BedIllustration />,
            items: [
                {
                    title: "Add Room Number",
                    subtitle: "Create room numbers and details.",
                    icon: <PlusCircle size={18} />,
                    iconBg: "bg-emerald-100/90 text-emerald-600"
                },
                {
                    title: "Add Room Type",
                    subtitle: "Standard, Deluxe, Family, etc.",
                    icon: <Layers size={18} />,
                    iconBg: "bg-purple-100/90 text-purple-600"
                },
                {
                    title: "Add Room Price / Rent",
                    subtitle: "Set price for each room type.",
                    icon: <Coins size={18} />,
                    iconBg: "bg-amber-100/90 text-amber-600"
                },
                {
                    title: "Add Room Features",
                    subtitle: "AC, WiFi, Balcony, etc.",
                    icon: <Star size={18} />,
                    iconBg: "bg-teal-100/90 text-teal-600"
                },
                {
                    title: "Add Room Photos",
                    subtitle: "Upload room images.",
                    icon: <Image size={18} />,
                    iconBg: "bg-rose-100/90 text-rose-600"
                },
                {
                    title: "Add Room Videos",
                    subtitle: "Upload room videos.",
                    icon: <Video size={18} />,
                    iconBg: "bg-violet-100/90 text-violet-600"
                }
            ]
        },

        // 3. Restaurant Setup
        {
            id: "restaurant-setup",
            title: "Restaurant Setup",
            subtitle: "Manage food menu, categories and pricing.",
            headerIcon: <Utensils size={24} />,
            headerBg: "bg-[#f97316]",
            headerGradient: "from-amber-50 via-orange-50/70 to-white",
            headerBorder: "border-amber-100",
            illustration: <RestaurantIllustration />,
            items: [
                {
                    title: "Add Food Category",
                    subtitle: "Create food categories (Breakfast, Lunch, etc.).",
                    icon: <LayoutGrid size={18} />,
                    iconBg: "bg-emerald-100/90 text-emerald-600"
                },
                {
                    title: "Add Food Menu / Item",
                    subtitle: "Add food items with details.",
                    icon: <UtensilsCrossed size={18} />,
                    iconBg: "bg-orange-100/90 text-orange-600"
                },
                {
                    title: "Add Food Price",
                    subtitle: "Set price for each menu item.",
                    icon: <CircleDollarSign size={18} />,
                    iconBg: "bg-sky-100/90 text-sky-600"
                },
                {
                    title: "Add Food Photo",
                    subtitle: "Upload food images.",
                    icon: <Image size={18} />,
                    iconBg: "bg-rose-100/90 text-rose-600"
                },
                {
                    title: "Available / Unavailable",
                    subtitle: "Manage item availability.",
                    icon: <ToggleLeft size={18} />,
                    iconBg: "bg-purple-100/90 text-purple-600"
                }
            ]
        },

        // 4. Staff & Permission
        {
            id: "staff-permission",
            title: "Staff & Permission",
            subtitle: "Manage staff, roles and access permission.",
            headerIcon: <Users size={24} />,
            headerBg: "bg-[#6366f1]",
            headerGradient: "from-indigo-50 via-purple-50/70 to-white",
            headerBorder: "border-indigo-100",
            illustration: <StaffIllustration />,
            items: [
                {
                    title: "Add Staff",
                    subtitle: "Add new staff member.",
                    icon: <UserPlus size={18} />,
                    iconBg: "bg-emerald-100/90 text-emerald-600"
                },
                {
                    title: "Staff Role",
                    subtitle: "Assign roles (Manager, Reception, etc.).",
                    icon: <Shield size={18} />,
                    iconBg: "bg-purple-100/90 text-purple-600"
                },
                {
                    title: "Permission",
                    subtitle: "Control access to different modules.",
                    icon: <Lock size={18} />,
                    iconBg: "bg-amber-100/90 text-amber-600"
                }
            ]
        },

        // 5. General Settings
        {
            id: "general-settings",
            title: "General Settings",
            subtitle: "Configure booking, payment and cancellation settings.",
            headerIcon: <SettingsIcon size={24} />,
            headerBg: "bg-[#0d9488]",
            headerGradient: "from-teal-50 via-cyan-50/70 to-white",
            headerBorder: "border-teal-100",
            illustration: <GeneralIllustration />,
            items: [
                {
                    title: "Booking Settings",
                    subtitle: "Check-in/out time, room hold, etc.",
                    icon: <Calendar size={18} />,
                    iconBg: "bg-sky-100/90 text-sky-600"
                },
                {
                    title: "Payment Settings",
                    subtitle: "Payment methods, currency, tax, etc.",
                    icon: <CreditCard size={18} />,
                    iconBg: "bg-emerald-100/90 text-emerald-600"
                },
                {
                    title: "Cancellation Settings",
                    subtitle: "Cancellation policy and refund rules.",
                    icon: <XCircle size={18} />,
                    iconBg: "bg-rose-100/90 text-rose-600"
                }
            ]
        },

        // 6. Backup
        {
            id: "backup-logs",
            title: "Backup",
            subtitle: "Keep your data safe and secure.",
            headerIcon: <Database size={24} />,
            headerBg: "bg-[#4f46e5]",
            headerGradient: "from-violet-50 via-indigo-50/70 to-white",
            headerBorder: "border-violet-100",
            illustration: <BackupIllustration />,
            items: [
                {
                    title: "Create Backup",
                    subtitle: "Take a full system backup.",
                    icon: <CloudUpload size={18} />,
                    iconBg: "bg-indigo-100/90 text-indigo-600"
                },
                {
                    title: "Restore Backup",
                    subtitle: "Restore from previous backup.",
                    icon: <RotateCcw size={18} />,
                    iconBg: "bg-emerald-100/90 text-emerald-600"
                }
            ]
        }
    ]

    return (
        <div className="space-y-6 pb-12">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs">
                <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold mb-2">
                        <Sparkles size={13} className="text-amber-500" /> Admin & Manager Portal
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight">
                        Settings & System Controls
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
                        Comprehensive control panel for hotel profile, accommodation management, dining, staff permissions, and data integrity.
                    </p>
                </div>
            </div>

            {/* 6 Settings Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
                {settingsCards.map((card, idx) => (
                    <div
                        key={idx}
                        id={card.id}
                        className="bg-white rounded-3xl border h-full border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col scroll-mt-24"
                    >
                        {/* Card Header */}
                        <Link
                            to={`/dashboard/settings/${card.id}`}
                            className={`bg-gradient-to-r ${card.headerGradient} border-b ${card.headerBorder} p-5 sm:p-6 flex items-start justify-between gap-3 relative overflow-hidden group hover:opacity-95 transition-opacity`}
                        >
                            <div className="flex items-start gap-3.5 relative z-10 min-w-0">
                                <div className={`w-12 h-12 rounded-2xl ${card.headerBg} text-white flex items-center justify-center shadow-md shadow-slate-900/10 shrink-0`}>
                                    {card.headerIcon}
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight group-hover:text-teal-900 transition-colors">
                                        {card.title}
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-1 leading-snug">
                                        {card.subtitle}
                                    </p>
                                </div>
                            </div>
                            <div className="shrink-0 relative z-10 opacity-95">
                                {card.illustration}
                            </div>
                        </Link>

                        {/* List of Settings Options */}
                        <div className="divide-y divide-slate-100 flex-1">
                            {card.items.map((item, itemIdx) => (
                                <Link
                                    key={itemIdx}
                                    to={`/dashboard/settings/${card.id}`}
                                    className="group flex items-center justify-between p-4 sm:px-5 hover:bg-slate-50/80 transition-all duration-150 cursor-pointer"
                                >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className={`w-9 h-9 rounded-xl ${item.iconBg} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs`}>
                                            {item.icon}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-teal-700 transition-colors">
                                                {item.title}
                                            </h3>
                                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                                {item.subtitle}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="shrink-0 ml-3 text-slate-300 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all">
                                        <ChevronRight size={18} />
                                    </div>
                                </Link>
                            ))}
                        </div>
                        <div className='flex-1'></div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default Settings
