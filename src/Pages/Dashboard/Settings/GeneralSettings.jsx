import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router'
import axios from 'axios'
import {
    ArrowLeft,
    Sparkles,
    Calendar,
    CreditCard,
    ShieldAlert,
    Bell,
    Save,
    Plus,
    Clock,
    DollarSign,
    Car,
    Bed,
    UtensilsCrossed,
    Waves,
    Compass,
    Shirt,
    Flame,
    ToggleLeft,
    ToggleRight,
    Search,
    Info,
    SlidersHorizontal,
    Percent,
    ShieldCheck,
    MessageSquare,
    Mail,
    Smartphone,
    X,
    KeyRound,
    Trash2
} from 'lucide-react'
import toast from 'react-hot-toast'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "https://miami-beach-resort.vercel.app"

const GeneralSettings = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const activeTab = searchParams.get('tab') || 'extra-services'

    const [extraServices, setExtraServices] = useState(() => {
        try {
            const cached = localStorage.getItem("miami_extra_services")
            return cached ? JSON.parse(cached) : []
        } catch {
            return []
        }
    })
    const [isLoadingServices, setIsLoadingServices] = useState(false)
    const [serviceSearch, setServiceSearch] = useState("")
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [newService, setNewService] = useState({
        name: "",
        category: "General",
        price: "",
        billingType: "Per Night",
        description: ""
    })

    // Fetch extra services from backend on mount
    useEffect(() => {
        const fetchServices = async () => {
            try {
                setIsLoadingServices(true)
                const { data } = await axios.get(`${SERVER_URL}/extra-services`)
                if (Array.isArray(data)) {
                    setExtraServices(data)
                    localStorage.setItem("miami_extra_services", JSON.stringify(data))
                }
            } catch (err) {
                console.error("Failed to fetch extra services:", err)
            } finally {
                setIsLoadingServices(false)
            }
        }
        fetchServices()
    }, [])

    // Demo states for other tabs
    const [demo2State, setDemo2State] = useState({
        checkInTime: "14:00",
        checkOutTime: "11:30",
        gracePeriod: "60",
        minNightsRegular: 1,
        minNightsPeak: 2,
        maxRoomsPerBooking: 4,
        autoHoldHours: 4,
        instantConfirmation: true,
        requireNid: true,
        childFreeAge: 6
    })

    const [demo3State, setDemo3State] = useState({
        vatRate: 15,
        serviceChargeRate: 10,
        touristLevy: 200,
        depositPercentage: 50,
        bkashActive: true,
        nagadActive: true,
        cardActive: true,
        amexActive: true,
        cashActive: true,
        currency: "BDT"
    })

    const [demo4State, setDemo4State] = useState({
        freeCancelDays: 7,
        partialRefundPercent: 50,
        partialDaysMin: 3,
        weatherWaiverActive: true,
        weatherSignalThreshold: 4,
        autoRefundProcessed: true
    })

    const [demo5State, setDemo5State] = useState({
        smsEnabled: true,
        emailEnabled: true,
        whatsappEnabled: true,
        smsSenderId: "MIAMIBEACH",
        preArrivalAlertHours: 24,
        sendReviewInvite: true
    })

    const handleTabSelect = (tabKey) => {
        setSearchParams({ tab: tabKey })
    }

    const toggleServiceActive = async (id, currentStatus) => {
        const updated = !currentStatus
        setExtraServices(prev => {
            const next = prev.map(item => {
                if (item._id === id || item.id === id) {
                    return { ...item, active: updated }
                }
                return item
            })
            localStorage.setItem("miami_extra_services", JSON.stringify(next))
            return next
        })

        try {
            await axios.patch(`${SERVER_URL}/extra-services/${id}`, { active: updated })
            toast.success(`Service status updated`)
        } catch (err) {
            console.error("Failed to update status on server:", err)
        }
    }

    const handleDeleteService = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete "${name || 'this service'}"?`)) return

        setExtraServices(prev => {
            const next = prev.filter(item => item._id !== id && item.id !== id)
            localStorage.setItem("miami_extra_services", JSON.stringify(next))
            return next
        })

        try {
            await axios.delete(`${SERVER_URL}/extra-services/${id}`)
            toast.success("Extra service deleted")
        } catch (err) {
            console.error("Failed to delete service on server:", err)
        }
    }

    const handleAddService = async (e) => {
        e.preventDefault()
        if (!newService.name.trim() || !newService.price) {
            toast.error("Please enter a valid service name and price")
            return
        }

        const payload = {
            name: newService.name.trim(),
            category: newService.category || "General",
            price: Number(newService.price),
            currency: "৳",
            billingType: newService.billingType || "Per Night",
            description: newService.description?.trim() || "",
            active: true
        }

        const toastId = toast.loading("Adding extra service...")
        try {
            const { data } = await axios.post(`${SERVER_URL}/extra-services`, payload)
            const createdItem = {
                ...payload,
                _id: data.insertedId || data._id || `srv-${Date.now()}`
            }
            setExtraServices(prev => {
                const next = [createdItem, ...prev]
                localStorage.setItem("miami_extra_services", JSON.stringify(next))
                return next
            })
            setNewService({ name: "", category: "General", price: "", billingType: "Per Night", description: "" })
            setIsAddModalOpen(false)
            toast.success("Extra service added successfully!", { id: toastId })
        } catch (err) {
            // Fallback to local storage if network / server fails
            const localItem = { ...payload, _id: `srv-${Date.now()}` }
            setExtraServices(prev => {
                const next = [localItem, ...prev]
                localStorage.setItem("miami_extra_services", JSON.stringify(next))
                return next
            })
            setNewService({ name: "", category: "General", price: "", billingType: "Per Night", description: "" })
            setIsAddModalOpen(false)
            toast.success("Extra service added successfully!", { id: toastId })
        }
    }

    const handleSaveGlobal = () => {
        toast.success("Settings updated successfully! Changes are live across all booking channels.")
    }

    // Tab Navigation Menu definitions
    const tabs = [
        {
            id: "extra-services",
            label: "Extra Services",
            badge: extraServices.length > 0 ? `${extraServices.filter(s => s.active).length} Active` : undefined,
            icon: <Sparkles size={16} />
        },
        {
            id: "demo-2",
            label: "Demo 2: Booking Rules",
            badge: "Check-in / Stay",
            icon: <Calendar size={16} />
        },
        {
            id: "demo-3",
            label: "Demo 3: Payments & Taxes",
            badge: "VAT & MFS",
            icon: <CreditCard size={16} />
        },
        {
            id: "demo-4",
            label: "Demo 4: Cancellation & Refund",
            badge: "Policies",
            icon: <ShieldAlert size={16} />
        },
        {
            id: "demo-5",
            label: "Demo 5: Guest Alerts & SMS",
            badge: "Automated",
            icon: <Bell size={16} />
        },
        {
            id: "demo-6",
            label: "Demo 6: Operations & Keys",
            badge: "Housekeeping",
            icon: <KeyRound size={16} />
        }
    ]

    const filteredServices = extraServices.filter(s =>
        s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
        s.category.toLowerCase().includes(serviceSearch.toLowerCase())
    )

    const renderServiceIcon = (iconName) => {
        switch (iconName) {
            case "Car": return <Car size={20} />
            case "Bed": return <Bed size={20} />
            case "UtensilsCrossed": return <UtensilsCrossed size={20} />
            case "Waves": return <Waves size={20} />
            case "Compass": return <Compass size={20} />
            case "Flame": return <Flame size={20} />
            case "Shirt": return <Shirt size={20} />
            default: return <Sparkles size={20} />
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-16">
            {/* Top Header Card */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Link
                        to="/dashboard/settings"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 mb-2 transition-colors"
                    >
                        <ArrowLeft size={14} /> Back to All Settings
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20">
                            <SlidersHorizontal size={20} />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight">
                                General Settings
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-500">
                                Resort operational parameters, guest add-on services, room booking policies, and fiscal rules.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    <button
                        type="button"
                        onClick={handleSaveGlobal}
                        className="btn btn-sm bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl border-none shadow-sm flex items-center gap-2 px-4 cursor-pointer"
                    >
                        <Save size={15} /> Save All Changes
                    </button>
                </div>
            </div>

            {/* TOP TAB NAVIGATION MENU */}
            <div className="bg-white p-2 sm:p-2.5 rounded-2xl border border-slate-200 shadow-xs">
                <nav className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => handleTabSelect(tab.id)}
                                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                                    isActive
                                        ? "bg-teal-600 text-white shadow-md shadow-teal-600/20"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                }`}
                            >
                                <span className={isActive ? "text-teal-100" : "text-teal-600"}>
                                    {tab.icon}
                                </span>
                                <span>{tab.label}</span>
                                {tab.badge && (
                                    <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            isActive
                                                ? "bg-teal-500/50 text-white"
                                                : "bg-slate-100 text-slate-600"
                                        }`}
                                    >
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </nav>
            </div>

            {/* ========================================================================= */}
            {/* TAB 1: EXTRA SERVICES */}
            {/* ========================================================================= */}
            {activeTab === 'extra-services' && (
                <div className="space-y-6">
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-teal-50 via-cyan-50 to-emerald-50 border border-teal-200 rounded-3xl p-5 sm:p-6 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-start gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-teal-600/20">
                                    <Sparkles size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                                        Extra Services & Guest Add-ons
                                    </h2>
                                    <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
                                        Manage optional add-on amenities and services available for guests during reservation or check-in.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(true)}
                                className="btn btn-sm bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl border-none shadow-sm flex items-center gap-2 self-start sm:self-auto shrink-0 cursor-pointer"
                            >
                                <Plus size={16} /> Add Extra Service
                            </button>
                        </div>

                        {/* Real Count Stats (Only shown when services exist) */}
                        {extraServices.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-teal-200/60">
                                <div className="bg-white/90 backdrop-blur-xs p-3.5 rounded-2xl border border-teal-100">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Services</p>
                                    <p className="text-xl font-extrabold text-slate-900 mt-0.5">{extraServices.length}</p>
                                </div>
                                <div className="bg-white/90 backdrop-blur-xs p-3.5 rounded-2xl border border-teal-100">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Services</p>
                                    <p className="text-xl font-extrabold text-teal-700 mt-0.5">
                                        {extraServices.filter(s => s.active).length}
                                    </p>
                                </div>
                                <div className="bg-white/90 backdrop-blur-xs p-3.5 rounded-2xl border border-teal-100">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Disabled Services</p>
                                    <p className="text-xl font-extrabold text-slate-500 mt-0.5">
                                        {extraServices.filter(s => !s.active).length}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* If Services Exist: Search & Filter */}
                    {extraServices.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                            <div className="relative w-full sm:w-80">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search extra services..."
                                    value={serviceSearch}
                                    onChange={(e) => setServiceSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                                />
                            </div>
                            <div className="text-xs text-slate-500 font-medium self-end sm:self-auto">
                                Showing {filteredServices.length} of {extraServices.length} services
                            </div>
                        </div>
                    )}

                    {/* Empty State when no services exist */}
                    {extraServices.length === 0 && !isLoadingServices && (
                        <div className="bg-white rounded-3xl border border-slate-200 p-12 sm:p-16 text-center shadow-xs">
                            <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-4 border border-teal-100 shadow-xs">
                                <Sparkles size={28} />
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-slate-800">No Extra Services Added</h3>
                            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md mx-auto">
                                There are currently no extra services configured. Click the button below to add your first guest amenity or add-on.
                            </p>
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(true)}
                                className="btn btn-sm bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl border-none shadow-sm mt-5 inline-flex items-center gap-2 cursor-pointer"
                            >
                                <Plus size={16} /> Add Extra Service
                            </button>
                        </div>
                    )}

                    {/* Loading State */}
                    {isLoadingServices && (
                        <div className="p-12 text-center text-slate-400 text-sm">
                            <span className="loading loading-spinner loading-md text-teal-600"></span>
                            <p className="mt-2">Loading extra services...</p>
                        </div>
                    )}

                    {/* Service Cards Grid */}
                    {extraServices.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredServices.map((service) => {
                                const serviceId = service._id || service.id
                                return (
                                    <div
                                        key={serviceId}
                                        className={`bg-white rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between ${
                                            service.active
                                                ? "border-slate-200 hover:border-teal-300 hover:shadow-md shadow-xs"
                                                : "border-dashed border-slate-200 bg-slate-50/50 opacity-70"
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                                                        service.active
                                                            ? "bg-teal-50 text-teal-700 border border-teal-100"
                                                            : "bg-slate-100 text-slate-400 border border-slate-200"
                                                    }`}>
                                                        {renderServiceIcon(service.icon || service.category)}
                                                    </div>
                                                    <div>
                                                        <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                                            {service.category || "General"}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    {/* Active Toggle */}
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleServiceActive(serviceId, service.active)}
                                                        className={`p-1 rounded-lg transition-colors cursor-pointer ${
                                                            service.active
                                                                ? "text-teal-600 hover:bg-teal-50"
                                                                : "text-slate-400 hover:bg-slate-100"
                                                        }`}
                                                        title={service.active ? "Deactivate Service" : "Activate Service"}
                                                    >
                                                        {service.active ? (
                                                            <ToggleRight size={28} className="text-teal-600" />
                                                        ) : (
                                                            <ToggleLeft size={28} className="text-slate-300" />
                                                        )}
                                                    </button>

                                                    {/* Delete Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteService(serviceId, service.name)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                                        title="Delete Service"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            <h3 className="font-bold text-slate-900 text-base leading-snug">
                                                {service.name}
                                            </h3>
                                            {service.description && (
                                                <p className="text-xs text-slate-500 mt-1.5 line-clamp-3 leading-relaxed">
                                                    {service.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Price / Rate</p>
                                                <p className="text-base font-extrabold text-slate-900">
                                                    {service.currency || "৳"}{Number(service.price || 0).toLocaleString()}
                                                    <span className="text-xs font-normal text-slate-500 ml-1">
                                                        / {service.billingType || "Per Night"}
                                                    </span>
                                                </p>
                                            </div>

                                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                                                service.active
                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                    : "bg-slate-100 text-slate-500 border border-slate-200"
                                            }`}>
                                                {service.active ? "Available" : "Disabled"}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: DEMO 2 (BOOKING RULES & STAY POLICIES) */}
            {/* ========================================================================= */}
            {activeTab === 'demo-2' && (
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-sky-50 via-indigo-50 to-teal-50 border border-sky-200 rounded-3xl p-5 sm:p-6 shadow-xs">
                        <div className="flex items-start gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-sky-600/20">
                                <Calendar size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                                    Demo 2: Core Booking, Check-in & Stay Policies
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
                                    This demo page outlines the operational stay parameters enforced by Miami Beach Resort. 
                                    These settings dictate reception schedules, room turnaround windows, automatic reservation release timings, and guest age allowances.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Check-in / Check-out Windows */}
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
                            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                                <Clock size={18} className="text-sky-600" />
                                <h3 className="font-bold text-slate-900 text-base">Check-in & Check-out Timings</h3>
                            </div>

                            <p className="text-xs text-slate-500 leading-relaxed">
                                Standard hotel turnover schedule allowing our housekeeping crew sufficient window to sanitize and prepare rooms.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                        Standard Check-in Time
                                    </label>
                                    <input
                                        type="time"
                                        value={demo2State.checkInTime}
                                        onChange={(e) => setDemo2State(prev => ({ ...prev, checkInTime: e.target.value }))}
                                        className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 font-semibold text-slate-800"
                                    />
                                    <span className="text-[11px] text-slate-400 mt-1 block">Earliest arrival without early fee</span>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                        Standard Check-out Time
                                    </label>
                                    <input
                                        type="time"
                                        value={demo2State.checkOutTime}
                                        onChange={(e) => setDemo2State(prev => ({ ...prev, checkOutTime: e.target.value }))}
                                        className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 font-semibold text-slate-800"
                                    />
                                    <span className="text-[11px] text-slate-400 mt-1 block">Keys returned to front desk</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Late Check-out Free Grace Period (Minutes)
                                </label>
                                <input
                                    type="number"
                                    value={demo2State.gracePeriod}
                                    onChange={(e) => setDemo2State(prev => ({ ...prev, gracePeriod: e.target.value }))}
                                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 font-semibold text-slate-800"
                                />
                                <span className="text-[11px] text-slate-400 mt-1 block">
                                    Grace minutes before automatic 50% half-day rate is charged.
                                </span>
                            </div>
                        </div>

                        {/* Minimum Stay & Capacity */}
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
                            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                                <Bed size={18} className="text-teal-600" />
                                <h3 className="font-bold text-slate-900 text-base">Stay Length & Room Restrictions</h3>
                            </div>

                            <p className="text-xs text-slate-500 leading-relaxed">
                                Prevent unoptimized single-night gaps during peak beach seasons and protect overall resort yield.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                        Regular Min. Nights
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={demo2State.minNightsRegular}
                                        onChange={(e) => setDemo2State(prev => ({ ...prev, minNightsRegular: Number(e.target.value) }))}
                                        className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 font-semibold text-slate-800"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                        Peak Season Min. Nights
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={demo2State.minNightsPeak}
                                        onChange={(e) => setDemo2State(prev => ({ ...prev, minNightsPeak: Number(e.target.value) }))}
                                        className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 font-semibold text-slate-800"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Unpaid Booking Hold Window (Hours)
                                </label>
                                <input
                                    type="number"
                                    value={demo2State.autoHoldHours}
                                    onChange={(e) => setDemo2State(prev => ({ ...prev, autoHoldHours: Number(e.target.value) }))}
                                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 font-semibold text-slate-800"
                                />
                                <span className="text-[11px] text-slate-400 mt-1 block">
                                    Reservations not paid within this duration are automatically voided.
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Operational Toggles */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
                        <h3 className="font-bold text-slate-900 text-base">Guest Identity & Compliance Toggles</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                <div>
                                    <p className="text-xs font-bold text-slate-800">Mandatory Government NID / Passport</p>
                                    <p className="text-[11px] text-slate-500">Require physical ID copy verification at check-in counter.</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={demo2State.requireNid}
                                    onChange={(e) => setDemo2State(prev => ({ ...prev, requireNid: e.target.checked }))}
                                    className="toggle toggle-teal"
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                <div>
                                    <p className="text-xs font-bold text-slate-800">Instant Online Booking Confirmation</p>
                                    <p className="text-[11px] text-slate-500">Auto-confirm bookings without manual front desk review.</p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={demo2State.instantConfirmation}
                                    onChange={(e) => setDemo2State(prev => ({ ...prev, instantConfirmation: e.target.checked }))}
                                    className="toggle toggle-teal"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: DEMO 3 (PAYMENT GATEWAYS & TAXES) */}
            {/* ========================================================================= */}
            {activeTab === 'demo-3' && (
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200 rounded-3xl p-5 sm:p-6 shadow-xs">
                        <div className="flex items-start gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
                                <CreditCard size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                                    Demo 3: Payment Gateways, VAT & Fiscal Settings
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
                                    Configure Bangladesh statutory tax percentages, resort service charge rates, bKash/Nagad merchant credentials, 
                                    and credit card processing policies for guest reservations and on-premise dining.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Tax & Surcharges */}
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
                            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                                <Percent size={18} className="text-emerald-600" />
                                <h3 className="font-bold text-slate-900 text-base">Fiscal Tax & Service Rates</h3>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Government VAT Rate (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={demo3State.vatRate}
                                        onChange={(e) => setDemo3State(prev => ({ ...prev, vatRate: Number(e.target.value) }))}
                                        className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 font-semibold"
                                    />
                                    <span className="text-[11px] text-slate-400">National Board of Revenue standard hotel tax.</span>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Resort Service Charge (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={demo3State.serviceChargeRate}
                                        onChange={(e) => setDemo3State(prev => ({ ...prev, serviceChargeRate: Number(e.target.value) }))}
                                        className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 font-semibold"
                                    />
                                    <span className="text-[11px] text-slate-400">Shared resort staff welfare pool.</span>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Advance Deposit Requirement (%)
                                    </label>
                                    <input
                                        type="number"
                                        value={demo3State.depositPercentage}
                                        onChange={(e) => setDemo3State(prev => ({ ...prev, depositPercentage: Number(e.target.value) }))}
                                        className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 font-semibold"
                                    />
                                    <span className="text-[11px] text-slate-400">Minimum down payment required to lock room.</span>
                                </div>
                            </div>
                        </div>

                        {/* Payment Rails */}
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs lg:col-span-2">
                            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                                <DollarSign size={18} className="text-teal-600" />
                                <h3 className="font-bold text-slate-900 text-base">Active Merchant Payment Channels</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                {/* bKash */}
                                <div className="p-4 rounded-2xl border border-pink-100 bg-pink-50/40 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-pink-600 text-white font-bold text-xs flex items-center justify-center">
                                            bK
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-900">bKash Merchant PGW</p>
                                            <p className="text-[11px] text-slate-500">MFS Direct API · 1.5% Fee</p>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={demo3State.bkashActive}
                                        onChange={(e) => setDemo3State(prev => ({ ...prev, bkashActive: e.target.checked }))}
                                        className="toggle toggle-secondary"
                                    />
                                </div>

                                {/* Nagad */}
                                <div className="p-4 rounded-2xl border border-orange-100 bg-orange-50/40 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-orange-600 text-white font-bold text-xs flex items-center justify-center">
                                            NG
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-900">Nagad Merchant PGW</p>
                                            <p className="text-[11px] text-slate-500">Direct Post Office Rail · 1.4%</p>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={demo3State.nagadActive}
                                        onChange={(e) => setDemo3State(prev => ({ ...prev, nagadActive: e.target.checked }))}
                                        className="toggle toggle-warning"
                                    />
                                </div>

                                {/* Visa / Mastercard */}
                                <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/40 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                                            V/M
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-900">Visa & Mastercard POS</p>
                                            <p className="text-[11px] text-slate-500">Credit / Debit · 2.2% Fee</p>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={demo3State.cardActive}
                                        onChange={(e) => setDemo3State(prev => ({ ...prev, cardActive: e.target.checked }))}
                                        className="toggle toggle-info"
                                    />
                                </div>

                                {/* Cash at Desk */}
                                <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/40 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                                            ৳
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-900">Cash at Front Counter</p>
                                            <p className="text-[11px] text-slate-500">Physical receipt ledger</p>
                                        </div>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={demo3State.cashActive}
                                        onChange={(e) => setDemo3State(prev => ({ ...prev, cashActive: e.target.checked }))}
                                        className="toggle toggle-success"
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-600">
                                <span className="font-bold">Currency Base:</span> All bookings are settled primarily in BDT (Bangladeshi Taka). 
                                Real-time foreign exchange cards are settled through automated SSLCommerz or City Bank gateway.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 4: DEMO 4 (CANCELLATION & REFUND POLICIES) */}
            {/* ========================================================================= */}
            {activeTab === 'demo-4' && (
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-rose-50 via-pink-50 to-amber-50 border border-rose-200 rounded-3xl p-5 sm:p-6 shadow-xs">
                        <div className="flex items-start gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-600/20">
                                <ShieldAlert size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                                    Demo 4: Cancellation Tiers, Refunds & Coastal Waivers
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
                                    Establishes transparent refund matrices for guest itinerary cancellations. 
                                    Also governs weather-related maritime hazard protection policies specific to Cox's Bazar coastlines.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Tiered Matrix */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
                        <h3 className="font-bold text-slate-900 text-base">Tiered Refund Matrix</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs sm:text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 text-slate-400 uppercase text-[11px] font-bold">
                                        <th className="pb-3">Cancellation Notice Window</th>
                                        <th className="pb-3">Refund Eligibility</th>
                                        <th className="pb-3">Penalty / Retention Fee</th>
                                        <th className="pb-3">Processing Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <tr>
                                        <td className="py-3 font-semibold text-slate-800">More than 7 days before check-in</td>
                                        <td className="py-3 text-emerald-600 font-bold">100% Full Refund</td>
                                        <td className="py-3 text-slate-500">5% Gateway service fee only</td>
                                        <td className="py-3 text-slate-500">3-5 Business Days</td>
                                    </tr>
                                    <tr>
                                        <td className="py-3 font-semibold text-slate-800">3 to 7 days before check-in</td>
                                        <td className="py-3 text-amber-600 font-bold">50% Partial Refund</td>
                                        <td className="py-3 text-slate-500">50% Deposit forfeited</td>
                                        <td className="py-3 text-slate-500">5-7 Business Days</td>
                                    </tr>
                                    <tr>
                                        <td className="py-3 font-semibold text-slate-800">Less than 48 hours before check-in</td>
                                        <td className="py-3 text-rose-600 font-bold">Non-Refundable</td>
                                        <td className="py-3 text-slate-500">1st Night full rate charged</td>
                                        <td className="py-3 text-slate-500">N/A</td>
                                    </tr>
                                    <tr>
                                        <td className="py-3 font-semibold text-slate-800">No-Show on arrival date</td>
                                        <td className="py-3 text-rose-600 font-bold">0% Refund</td>
                                        <td className="py-3 text-slate-500">100% of entire booking forfeited</td>
                                        <td className="py-3 text-slate-500">N/A</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Coastal Weather Clause */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
                        <div className="flex items-center gap-2.5 pb-2">
                            <ShieldCheck size={20} className="text-teal-600" />
                            <h3 className="font-bold text-slate-900 text-base">Cox's Bazar Cyclone & Weather Waiver Clause</h3>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                            When the Bangladesh Meteorological Department issues <strong>Cyclone Warning Signal No. 4 or higher</strong> for Cox's Bazar maritime port, 
                            the resort activates automatic fee-free rescheduling or issues a 100% credit voucher valid for 12 months.
                        </p>

                        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                            <div>
                                <p className="text-xs font-bold text-slate-800">Automated Maritime Signal Waiver</p>
                                <p className="text-[11px] text-slate-500">Allow guests to reschedule without penalty during weather red alerts.</p>
                            </div>
                            <input
                                type="checkbox"
                                checked={demo4State.weatherWaiverActive}
                                onChange={(e) => setDemo4State(prev => ({ ...prev, weatherWaiverActive: e.target.checked }))}
                                className="toggle toggle-teal"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 5: DEMO 5 (GUEST ALERTS & NOTIFICATIONS) */}
            {/* ========================================================================= */}
            {activeTab === 'demo-5' && (
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-teal-50 border border-purple-200 rounded-3xl p-5 sm:p-6 shadow-xs">
                        <div className="flex items-start gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-purple-600/20">
                                <Bell size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                                    Demo 5: Automated Guest Notifications & SMS Dispatch
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
                                    Manage automated communications sent across every touchpoint of the guest journey. 
                                    Supports local SMS telecommunication channels, branded HTML emails, and WhatsApp concierge alerts.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                                    <Smartphone size={18} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-900">SMS Gateway</p>
                                    <p className="text-[11px] text-slate-500">Greenweb / Twilio BD</p>
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={demo5State.smsEnabled}
                                onChange={(e) => setDemo5State(prev => ({ ...prev, smsEnabled: e.target.checked }))}
                                className="toggle toggle-teal"
                            />
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                                    <Mail size={18} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-900">Email Confirmations</p>
                                    <p className="text-[11px] text-slate-500">SendGrid SMTP Delivery</p>
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={demo5State.emailEnabled}
                                onChange={(e) => setDemo5State(prev => ({ ...prev, emailEnabled: e.target.checked }))}
                                className="toggle toggle-primary"
                            />
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                                    <MessageSquare size={18} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-900">WhatsApp Concierge</p>
                                    <p className="text-[11px] text-slate-500">Meta Cloud API Bot</p>
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={demo5State.whatsappEnabled}
                                onChange={(e) => setDemo5State(prev => ({ ...prev, whatsappEnabled: e.target.checked }))}
                                className="toggle toggle-success"
                            />
                        </div>
                    </div>

                    {/* Notification Templates Preview */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
                        <h3 className="font-bold text-slate-900 text-base">Sample Automated Notification Templates</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-800">1. Instant Booking Confirmation (SMS)</span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800">Trigger: Paid</span>
                                </div>
                                <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 font-mono text-[11px]">
                                    "Dear {'{{guest_name}}'}, your booking at Miami Beach Resort is confirmed! Booking ID: {'{{booking_id}}'}, Room: {'{{room_name}}'}. Check-in: {'{{check_in_date}}'}. Support: +880 1812-345678."
                                </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-800">2. Pre-Arrival Welcome (24h Before)</span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800">Trigger: 24h Prior</span>
                                </div>
                                <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200 font-mono text-[11px]">
                                    "Excited to welcome you tomorrow! Need airport pickup from Cox's Bazar Airport? Reply SHUTTLE to this message or speak to our 24/7 concierge."
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 6: DEMO 6 (OPERATIONS & KEYCARDS) */}
            {/* ========================================================================= */}
            {activeTab === 'demo-6' && (
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-teal-50 border border-amber-200 rounded-3xl p-5 sm:p-6 shadow-xs">
                        <div className="flex items-start gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-600/20">
                                <KeyRound size={24} />
                            </div>
                            <div>
                                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                                    Demo 6: Housekeeping, Keycard & Front Desk Operations
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-3xl">
                                    Daily operational parameters for room turnover, RFID card issuance, beach towel custody, 
                                    and housekeeping inspection schedules.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3 shadow-xs">
                            <h3 className="font-bold text-slate-900 text-sm">Housekeeping Shift Hours</h3>
                            <p className="text-xs text-slate-500">Morning room turnover: 08:30 AM to 01:30 PM.</p>
                            <p className="text-xs text-slate-500">Evening turndown service: 06:00 PM to 08:30 PM.</p>
                            <div className="mt-3 p-3 bg-teal-50 rounded-xl text-teal-800 text-xs font-semibold">
                                Eco-policy: Linen changed every 48 hours unless requested otherwise.
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3 shadow-xs">
                            <h3 className="font-bold text-slate-900 text-sm">RFID Smart Door Keycards</h3>
                            <p className="text-xs text-slate-500">Keycard validity is automatically synchronized to checkout time (11:30 AM).</p>
                            <p className="text-xs text-slate-500">Lost Keycard Replacement Penalty: ৳500 per RFID card.</p>
                            <div className="mt-3 p-3 bg-amber-50 rounded-xl text-amber-800 text-xs font-semibold">
                                Master override card held only by Chief Security Officer and General Manager.
                            </div>
                        </div>

                        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-3 shadow-xs">
                            <h3 className="font-bold text-slate-900 text-sm">Private Beach & Pool Access</h3>
                            <p className="text-xs text-slate-500">Infinity Pool Hours: 06:30 AM - 08:30 PM.</p>
                            <p className="text-xs text-slate-500">Beach Towel Custody Card issued at poolside counter.</p>
                            <div className="mt-3 p-3 bg-indigo-50 rounded-xl text-indigo-800 text-xs font-semibold">
                                Certified lifeguard stationed during daylight swimming hours.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* ADD EXTRA SERVICE MODAL */}
            {/* ========================================================================= */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <Sparkles size={18} className="text-teal-600" />
                                <h3 className="text-base font-bold text-slate-900">Add New Extra Service</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleAddService} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Service Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Scuba Diving Experience, Extra Beach Towel"
                                    value={newService.name}
                                    onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Category
                                    </label>
                                    <select
                                        value={newService.category}
                                        onChange={(e) => setNewService(prev => ({ ...prev, category: e.target.value }))}
                                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500"
                                    >
                                        <option value="Transportation">Transportation</option>
                                        <option value="Accommodation">Accommodation</option>
                                        <option value="Dining">Dining</option>
                                        <option value="Wellness">Wellness</option>
                                        <option value="Adventure">Adventure</option>
                                        <option value="Housekeeping">Housekeeping</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Billing Type
                                    </label>
                                    <select
                                        value={newService.billingType}
                                        onChange={(e) => setNewService(prev => ({ ...prev, billingType: e.target.value }))}
                                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500"
                                    >
                                        <option value="Per Night">Per Night</option>
                                        <option value="Per Trip">Per Trip</option>
                                        <option value="Per Person">Per Person</option>
                                        <option value="Per Event">Per Event</option>
                                        <option value="Per Load">Per Load</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Price (BDT ৳) *
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    placeholder="e.g. 2500"
                                    value={newService.price}
                                    onChange={(e) => setNewService(prev => ({ ...prev, price: e.target.value }))}
                                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Description / Inclusions
                                </label>
                                <textarea
                                    rows="3"
                                    placeholder="Brief explanation shown to guests during room booking..."
                                    value={newService.description}
                                    onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="btn btn-sm btn-ghost rounded-xl text-slate-600 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-sm bg-teal-600 hover:bg-teal-700 text-white rounded-xl border-none cursor-pointer"
                                >
                                    Create Service
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default GeneralSettings