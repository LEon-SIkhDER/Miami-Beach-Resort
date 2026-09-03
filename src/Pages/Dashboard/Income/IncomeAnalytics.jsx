import React, { useState, useMemo } from 'react'
import { Link } from 'react-router'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
import { useQuery } from '@tanstack/react-query'
import {
    DollarSign,
    TrendingUp,
    Calendar,
    BedDouble,
    Search,
    Receipt,
    UserCheck,
    Eye,
    ArrowUpRight,
    Sparkles,
    BarChart3,
    Calendar as CalendarIcon,
    Filter,
    RotateCcw,
    Users,
    Briefcase,
    CreditCard
} from 'lucide-react'
import { formatDate } from '../../../utils/bookingUtils'

const IncomeAnalytics = () => {
    const axiosSecure = useAxiosSecure()
    const [search, setSearch] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("all")
    const [selectedRole, setSelectedRole] = useState("all")
    const [selectedWorker, setSelectedWorker] = useState("all")
    const [startDate, setStartDate] = useState(null)
    const [endDate, setEndDate] = useState(null)
    const [activePreset, setActivePreset] = useState("all")

    const formattedStart = startDate ? format(startDate, "yyyy-MM-dd") : ""
    const formattedEnd = endDate ? format(endDate, "yyyy-MM-dd") : ""

    const { data: incomeData = {}, isLoading: isIncomeLoading } = useQuery({
        queryKey: ["admin-income-breakdown", formattedStart, formattedEnd],
        queryFn: async () => {
            const params = new URLSearchParams()
            if (formattedStart) params.append("startDate", formattedStart)
            if (formattedEnd) params.append("endDate", formattedEnd)
            const queryStr = params.toString() ? `?${params.toString()}` : ""
            const res = await axiosSecure.get(`/admin/income-breakdown${queryStr}`)
            return res.data
        }
    })

    const { data: overview = {}, isLoading: isOverviewLoading } = useQuery({
        queryKey: ["admin-overview"],
        queryFn: async () => {
            const res = await axiosSecure.get("/admin/overview")
            return res.data
        }
    })

    // Fetch all users for worker / agent / b2b dropdown filters
    const { data: allUsers = [] } = useQuery({
        queryKey: ["all-users-for-sales-report"],
        queryFn: async () => {
            const res = await axiosSecure.get("/users")
            return res.data
        }
    })

    const handlePresetChange = (preset) => {
        setActivePreset(preset)
        const today = new Date()
        if (preset === "all") {
            setStartDate(null)
            setEndDate(null)
        } else if (preset === "today") {
            setStartDate(today)
            setEndDate(today)
        } else if (preset === "week") {
            setStartDate(startOfWeek(today, { weekStartsOn: 6 }))
            setEndDate(endOfWeek(today, { weekStartsOn: 6 }))
        } else if (preset === "month") {
            setStartDate(startOfMonth(today))
            setEndDate(endOfMonth(today))
        } else if (preset === "last30") {
            setStartDate(subDays(today, 30))
            setEndDate(today)
        }
    }

    const handleCustomDateChange = (type, date) => {
        setActivePreset("custom")
        if (type === "start") {
            setStartDate(date)
            if (endDate && date && date > endDate) {
                setEndDate(date)
            }
        } else {
            setEndDate(date)
        }
    }

    const isLoading = isIncomeLoading || isOverviewLoading
    const roomBreakdown = incomeData.roomBreakdown || []
    const isDateFiltered = !!startDate || !!endDate

    // Flatten all room-level booking items for the details table
    const allBookingItems = useMemo(() => {
        return roomBreakdown.flatMap(cat => 
            (cat.bookings || []).map(b => ({
                ...b,
                categoryName: cat.roomName
            }))
        )
    }, [roomBreakdown])

    // Helper to check worker / staff roles (excluding general guests 'user')
    const isWorkerRole = (role) => {
        if (!role) return false
        const r = String(role).trim().toLowerCase()
        return ["agent", "b2b", "manager", "admin", "authority"].includes(r)
    }

    // Helper to match a role against the active selectedRole filter
    const matchesRole = (itemRole, targetRole) => {
        if (!itemRole) return false
        const r = String(itemRole).trim().toLowerCase()
        if (targetRole === "all") return isWorkerRole(r)
        return r === targetRole.toLowerCase()
    }

    // Distinct worker accounts and references from data + users list matching selectedRole
    const workerOptions = useMemo(() => {
        const set = new Map()

        // 1. Add matching users from database (allUsers)
        allUsers.forEach(u => {
            if (matchesRole(u.role, selectedRole)) {
                const label = u.name || u.email
                if (label) {
                    set.set(label, { name: label, role: u.role })
                }
            }
        })

        // 2. Add matching bookedBy and references from booking items
        allBookingItems.forEach(item => {
            const bookedRole = item.bookedBy?.role || item.requestedByRole
            if (item.bookedBy?.name && matchesRole(bookedRole, selectedRole) && !set.has(item.bookedBy.name)) {
                set.set(item.bookedBy.name, { name: item.bookedBy.name, role: bookedRole || "worker" })
            }
            if (item.reference && matchesRole(item.requestedByRole || bookedRole, selectedRole) && !set.has(item.reference)) {
                set.set(item.reference, { name: item.reference, role: item.requestedByRole || bookedRole || "reference" })
            }
        })

        return Array.from(set.values()).sort((a, b) => a.name.localeCompare(b.name))
    }, [allUsers, allBookingItems, selectedRole])

    const filteredItems = useMemo(() => {
        return allBookingItems.filter(item => {
            // Category filter
            if (selectedCategory !== "all" && item.categoryName !== selectedCategory) {
                return false
            }

            // Role filter
            if (selectedRole !== "all") {
                const itemRole = (item.requestedByRole || item.bookedBy?.role || "").toLowerCase()
                if (itemRole !== selectedRole.toLowerCase()) {
                    return false
                }
            }

            // Worker / Reference filter
            if (selectedWorker !== "all") {
                const ref = (item.reference || "").toLowerCase()
                const bookedName = (item.bookedBy?.name || "").toLowerCase()
                const bookedEmail = (item.bookedBy?.email || "").toLowerCase()
                const target = selectedWorker.toLowerCase()

                if (ref !== target && bookedName !== target && bookedEmail !== target) {
                    return false
                }
            }

            // Search query
            if (search.trim()) {
                const s = search.toLowerCase()
                const match = (
                    item.guestName?.toLowerCase().includes(s) ||
                    item.guestPhone?.toLowerCase().includes(s) ||
                    item.bookingId?.toLowerCase().includes(s) ||
                    item.categoryName?.toLowerCase().includes(s) ||
                    item.transactionId?.toLowerCase().includes(s) ||
                    item.reference?.toLowerCase().includes(s) ||
                    item.paymentMethod?.toLowerCase().includes(s)
                )
                if (!match) return false
            }

            return true
        })
    }, [allBookingItems, selectedCategory, selectedRole, selectedWorker, search])

    const isAnyFilterActive = isDateFiltered || selectedRole !== "all" || selectedWorker !== "all" || selectedCategory !== "all" || !!search.trim()

    // Dynamic totals calculation across all active filters
    const totalFilteredSales = useMemo(() => {
        return filteredItems.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    }, [filteredItems])

    const totalFilteredNights = useMemo(() => {
        return filteredItems.reduce((sum, item) => sum + Number(item.nights || 0), 0)
    }, [filteredItems])

    const totalFilteredPaid = useMemo(() => {
        const seen = new Set()
        let sum = 0
        filteredItems.forEach(item => {
            const bId = String(item.bookingId || item._id)
            if (!seen.has(bId)) {
                seen.add(bId)
                sum += Number(item.paidAmount || 0)
            }
        })
        return sum
    }, [filteredItems])

    const totalFilteredDue = useMemo(() => {
        const seen = new Set()
        let sum = 0
        filteredItems.forEach(item => {
            const bId = String(item.bookingId || item._id)
            if (!seen.has(bId)) {
                seen.add(bId)
                sum += Number(item.dueAmount || 0)
            }
        })
        return sum
    }, [filteredItems])

    // Distinct bookings count matching active filters
    const filteredBookingsCount = useMemo(() => {
        const idSet = new Set(filteredItems.map(item => String(item.bookingId || item._id)))
        return idSet.size
    }, [filteredItems])

    // All available suite categories for the selector
    const allAvailableCategories = useMemo(() => {
        const set = new Set()
        roomBreakdown.forEach(cat => {
            if (cat.roomName) set.add(cat.roomName)
        })
        allBookingItems.forEach(item => {
            if (item.categoryName) set.add(item.categoryName)
        })
        return Array.from(set).sort()
    }, [roomBreakdown, allBookingItems])

    // Dynamic suite category performance derived from filteredItems
    const filteredRoomBreakdown = useMemo(() => {
        const catMap = new Map()
        filteredItems.forEach(item => {
            const catName = item.categoryName || "Uncategorized"
            if (!catMap.has(catName)) {
                catMap.set(catName, {
                    roomName: catName,
                    totalRevenue: 0,
                    bookingCount: 0,
                    totalNights: 0,
                    bookings: []
                })
            }
            const entry = catMap.get(catName)
            entry.totalRevenue += Number(item.amount || 0)
            entry.bookingCount += 1
            entry.totalNights += Number(item.nights || 0)
            entry.bookings.push(item)
        })
        return Array.from(catMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue)
    }, [filteredItems])

    return (
        <div className="space-y-6 sm:space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                            <DollarSign size={22} />
                        </span>
                        Sales Report & Revenue Analytics
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Comprehensive sales reporting, worker & agent performance tracking, room tariffs, and revenue breakdowns.
                    </p>
                </div>

                <div className="inline-flex items-center gap-1.5 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 shadow-xs">
                    <TrendingUp size={14} className="text-emerald-600" /> Live Sales Dashboard
                </div>
            </div>

            {/* Date Range & Worker Filter Controls Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                {/* Row 1: Date Filter & Presets */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Date Pickers */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                            <CalendarIcon size={16} className="text-teal-600" />
                            <span>Sales Date Range:</span>
                        </div>

                        {/* From Date */}
                        <div className="relative">
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">From Date</label>
                            <DatePicker
                                selected={startDate}
                                onChange={(date) => handleCustomDateChange("start", date)}
                                selectsStart
                                startDate={startDate}
                                endDate={endDate}
                                dateFormat="dd MMM yyyy"
                                placeholderText="Select From Date"
                                className="input input-sm input-bordered rounded-xl bg-slate-50 text-xs font-semibold text-slate-800 w-36 sm:w-40 cursor-pointer focus:bg-white"
                            />
                        </div>

                        {/* To Date */}
                        <div className="relative">
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">To Date</label>
                            <DatePicker
                                selected={endDate}
                                onChange={(date) => handleCustomDateChange("end", date)}
                                selectsEnd
                                startDate={startDate}
                                endDate={endDate}
                                minDate={startDate}
                                dateFormat="dd MMM yyyy"
                                placeholderText="Select To Date"
                                className="input input-sm input-bordered rounded-xl bg-slate-50 text-xs font-semibold text-slate-800 w-36 sm:w-40 cursor-pointer focus:bg-white"
                            />
                        </div>

                        {isAnyFilterActive && (
                            <button
                                type="button"
                                onClick={() => {
                                    handlePresetChange("all")
                                    setSelectedRole("all")
                                    setSelectedWorker("all")
                                    setSelectedCategory("all")
                                    setSearch("")
                                }}
                                className="btn btn-sm btn-ghost text-rose-600 hover:bg-rose-50 rounded-xl gap-1 mt-4 text-xs font-bold"
                                title="Reset all filters"
                            >
                                <RotateCcw size={13} /> Clear All Filters
                            </button>
                        )}
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-400 mr-1 hidden sm:inline">Presets:</span>
                        {[
                            { id: "all", label: "All Time" },
                            { id: "today", label: "Today" },
                            { id: "week", label: "This Week" },
                            { id: "month", label: "This Month" },
                            { id: "last30", label: "Last 30 Days" }
                        ].map((preset) => (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => handlePresetChange(preset.id)}
                                className={`btn btn-xs rounded-xl font-bold transition-all ${
                                    activePreset === preset.id
                                        ? "bg-teal-600 text-white shadow-xs border-teal-600"
                                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-transparent"
                                }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Row 2: Worker & Role Filter Selectors (Requirement 7) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                    {/* Role Filter */}
                    <div className="form-control">
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1">
                            <Briefcase size={12} className="text-teal-600" /> Filter by Worker Role
                        </label>
                        <select
                            value={selectedRole}
                            onChange={e => {
                                const newRole = e.target.value
                                setSelectedRole(newRole)
                                if (selectedWorker !== "all") {
                                    setSelectedWorker("all")
                                }
                            }}
                            className="select select-sm select-bordered rounded-xl bg-white text-xs font-semibold text-slate-800"
                        >
                            <option value="all">All Worker Roles</option>
                            <option value="agent">Agent (Marketing / Sales)</option>
                            <option value="b2b">B2B Partner</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    {/* Specific Worker / Agent / B2B Person Filter */}
                    <div className="form-control">
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1">
                            <UserCheck size={12} className="text-indigo-600" /> Filter by Specific Worker / Reference
                        </label>
                        <select
                            value={selectedWorker}
                            onChange={e => setSelectedWorker(e.target.value)}
                            className="select select-sm select-bordered rounded-xl bg-white text-xs font-semibold text-slate-800"
                        >
                            <option value="all">
                                {selectedRole === "all" ? "All Workers & References" : `All ${selectedRole === "b2b" ? "B2B Partners" : selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1) + "s"} & References`}
                            </option>
                            {workerOptions.map((w, idx) => (
                                <option key={idx} value={w.name}>
                                    {w.name} ({String(w.role || "").toUpperCase()})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Room Category Filter */}
                    <div className="form-control">
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1">
                            <BedDouble size={12} className="text-purple-600" /> Filter by Suite Category
                        </label>
                        <select
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                            className="select select-sm select-bordered rounded-xl bg-white text-xs font-semibold text-slate-800"
                        >
                            <option value="all">All Suite Types</option>
                            {allAvailableCategories.map((catName, i) => (
                                <option key={i} value={catName}>{catName}</option>
                            ))}
                        </select>
                    </div>

                    {/* Search Field */}
                    <div className="form-control">
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1">
                            <Search size={12} className="text-slate-500" /> Quick Search
                        </label>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search name, phone, ID, TrxID..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="input input-sm input-bordered pl-8 rounded-xl w-full bg-white text-xs"
                            />
                        </div>
                    </div>
                </div>

                {/* Active Filter Indicator Banner */}
                {isAnyFilterActive && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                        <span className="badge badge-sm bg-teal-50 text-teal-800 border-teal-200 font-bold">Active Filters</span>
                        {isDateFiltered && (
                            <span className="bg-slate-100 px-2 py-0.5 rounded-lg text-slate-700">
                                Date: <strong>{startDate ? formatDate(startDate) : "Beginning"}</strong> to <strong>{endDate ? formatDate(endDate) : "Latest"}</strong>
                            </span>
                        )}
                        {selectedRole !== "all" && (
                            <span className="bg-indigo-50 px-2 py-0.5 rounded-lg text-indigo-700 font-semibold">
                                Role: <strong>{selectedRole.toUpperCase()}</strong>
                            </span>
                        )}
                        {selectedWorker !== "all" && (
                            <span className="bg-purple-50 px-2 py-0.5 rounded-lg text-purple-700 font-semibold">
                                Worker: <strong>{selectedWorker}</strong>
                            </span>
                        )}
                        {selectedCategory !== "all" && (
                            <span className="bg-amber-50 px-2 py-0.5 rounded-lg text-amber-800 font-semibold">
                                Suite: <strong>{selectedCategory}</strong>
                            </span>
                        )}
                        {search.trim() && (
                            <span className="bg-teal-50 px-2 py-0.5 rounded-lg text-teal-800 font-semibold">
                                Search: <strong>"{search.trim()}"</strong>
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Income Highlights Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white shadow-md flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-bold tracking-wider text-indigo-200">
                            {isAnyFilterActive ? "Filtered Revenue" : "Total Revenue"}
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                            <DollarSign size={18} className="text-indigo-200" />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl sm:text-3xl font-extrabold tracking-tight">৳{Number(totalFilteredSales || 0).toLocaleString()}</p>
                        <p className="text-[11px] text-indigo-200 mt-0.5">
                            {isAnyFilterActive ? "Income matching active filters" : "All-time confirmed earnings"}
                        </p>
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-emerald-100 shadow-xs flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-bold tracking-wider text-emerald-700">
                            {isAnyFilterActive ? "Collected (Paid)" : "Monthly Revenue"}
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Calendar size={18} />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                            ৳{Number(isAnyFilterActive ? (totalFilteredPaid || 0) : (overview.monthlyRevenue || 0)).toLocaleString()}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            {isAnyFilterActive ? "Total payment collected in filter" : (overview.currentMonthName || "Current Month")}
                        </p>
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
                            {isAnyFilterActive ? "Filtered Bookings" : "Confirmed Bookings"}
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                            <Receipt size={18} />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                            {filteredBookingsCount}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            {isAnyFilterActive ? "Reservations in active filter" : "Active & Completed Stays"}
                        </p>
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
                            {isAnyFilterActive ? "Active Filtered Suites" : "Suite Categories"}
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                            <BedDouble size={18} />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                            {filteredRoomBreakdown.length}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            {isAnyFilterActive ? "Categories matching filter" : "Active Room Types with Sales"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Room Revenue Performance Grid */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 font-serif flex items-center gap-2">
                    <BarChart3 size={18} className="text-teal-600" /> Revenue by Room Suite {isAnyFilterActive ? "(Filtered)" : ""}
                </h3>

                {filteredRoomBreakdown.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
                        <BedDouble size={36} className="mx-auto mb-2 opacity-50 text-slate-300" />
                        <p className="font-semibold text-slate-600 text-sm">No room sales recorded matching your selected filters.</p>
                        <p className="text-xs text-slate-400 mt-1">Try selecting a different date range, worker, role, or clearing filters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredRoomBreakdown.map((cat, idx) => {
                            const share = totalFilteredSales > 0 ? Math.round((cat.totalRevenue / totalFilteredSales) * 100) : 0
                            return (
                                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-start justify-between gap-2">
                                            <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">{cat.roomName}</h4>
                                            <span className="badge badge-sm bg-teal-50 text-teal-800 border-teal-200 font-bold shrink-0">
                                                {share}% Share
                                            </span>
                                        </div>
                                        <p className="text-2xl font-extrabold text-teal-800 mt-2">
                                            ৳{Number(cat.totalRevenue || 0).toLocaleString()}
                                        </p>
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                                        <div className="flex justify-between">
                                            <span>Total Reservations:</span>
                                            <span className="font-semibold text-slate-800">{cat.bookingCount} Bookings</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Nights Sold:</span>
                                            <span className="font-semibold text-slate-800">{cat.totalNights} Nights</span>
                                        </div>
                                        {/* Progress bar */}
                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
                                            <div 
                                                className="bg-teal-600 h-full rounded-full transition-all" 
                                                style={{ width: `${Math.min(100, Math.max(5, share))}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Sales Report Transactions Table with Footer Totals (Requirement 7) */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 font-serif flex items-center gap-2">
                            <Receipt size={18} className="text-teal-600" /> Sales Transactions & Workflow Breakdown
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Showing {filteredItems.length} filtered transaction item(s) · Total Sells: <strong>৳{totalFilteredSales.toLocaleString()}</strong>
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="badge badge-sm bg-emerald-50 text-emerald-800 border-emerald-200 font-bold">
                            ৳{totalFilteredSales.toLocaleString()} Total Sales
                        </span>
                        <span className="badge badge-sm bg-slate-100 text-slate-700 font-semibold">
                            {filteredItems.length} Entries
                        </span>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-xs">
                    <table className="table table-zebra w-full whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                <th className="whitespace-nowrap min-w-[130px]">Booking ID</th>
                                <th className="whitespace-nowrap">Guest</th>
                                <th className="whitespace-nowrap">Suite Category</th>
                                <th className="whitespace-nowrap">Stay Dates</th>
                                <th className="whitespace-nowrap text-center">Nights</th>
                                <th className="whitespace-nowrap">Worker / Reference</th>
                                <th className="whitespace-nowrap">Payment & Trx</th>
                                <th className="whitespace-nowrap text-right">Sale Amount (৳)</th>
                                <th className="text-center whitespace-nowrap">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {isLoading ? (
                                [1, 2, 3, 4].map(n => (
                                    <tr key={n} className="animate-pulse">
                                        <td><div className="h-5 bg-slate-200 w-24"></div></td>
                                        <td><div className="h-4 bg-slate-200 w-28"></div></td>
                                        <td><div className="h-4 bg-slate-200 w-36"></div></td>
                                        <td><div className="h-4 bg-slate-200 w-32"></div></td>
                                        <td><div className="h-4 bg-slate-200 w-16"></div></td>
                                        <td><div className="h-4 bg-slate-200 w-24"></div></td>
                                        <td><div className="h-4 bg-slate-200 w-24"></div></td>
                                        <td><div className="h-4 bg-slate-200 w-20 ml-auto"></div></td>
                                        <td><div className="h-7 bg-slate-200 w-14 mx-auto"></div></td>
                                    </tr>
                                ))
                            ) : filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-12 text-slate-400">
                                        <Receipt size={36} className="mx-auto mb-2 opacity-50" />
                                        No sales records matching your selected filter criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item, idx) => (
                                    <tr key={`${item.bookingId}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="whitespace-nowrap">
                                            <Link
                                                to={`/dashboard/bookings/${item._id}`}
                                                className="font-mono text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200/60 inline-flex items-center gap-1"
                                            >
                                                {item.bookingId}
                                            </Link>
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <p className="font-bold text-slate-900">{item.guestName}</p>
                                            <p className="text-xs text-slate-500 font-medium">{item.guestPhone}</p>
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <p className="font-semibold text-slate-800 text-xs">{item.categoryName}</p>
                                            {item.extraService && (
                                                <span className="text-[10px] text-amber-800 font-semibold block">
                                                    + {item.extraService}
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-xs text-slate-700 whitespace-nowrap">
                                            {formatDate(item.checkIn)} → {formatDate(item.checkOut)}
                                        </td>
                                        <td className="text-xs text-slate-600 whitespace-nowrap font-semibold text-center">
                                            {item.nights}
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <div className="space-y-0.5">
                                                {item.reference ? (
                                                    <span className="inline-flex items-center gap-1 font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200">
                                                        <UserCheck size={11} className="text-teal-600" /> {item.reference}
                                                    </span>
                                                ) : item.bookedBy?.name ? (
                                                    <span className="inline-flex items-center gap-1 font-semibold text-slate-800 text-xs">
                                                        {item.bookedBy.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">Direct / Online</span>
                                                )}
                                                {item.requestedByRole && (
                                                    <span className="badge badge-xs bg-indigo-50 text-indigo-800 border-none font-bold block w-fit uppercase text-[9px]">
                                                        {item.requestedByRole}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="text-xs text-slate-600 whitespace-nowrap">
                                            <p className="font-semibold text-slate-800">
                                                {item.paymentMethod || "M-Banking / Cash"}
                                            </p>
                                            {item.transactionId && (
                                                <p className="font-mono text-[11px] text-slate-500">Trx: {item.transactionId}</p>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap text-right font-mono">
                                            <div className="font-extrabold text-teal-900 text-sm">
                                                ৳{Number(item.amount || 0).toLocaleString()}
                                            </div>
                                            {Number(item.dueAmount || 0) > 0 ? (
                                                <span className="inline-block text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.2 rounded border border-orange-200/70 mt-0.5 font-sans">
                                                    Due: ৳{Number(item.dueAmount).toLocaleString()}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-semibold text-emerald-600 block mt-0.5 font-sans">
                                                    Paid in Full
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-center whitespace-nowrap">
                                            <Link
                                                to={`/dashboard/bookings/${item._id}`}
                                                className="btn btn-xs btn-outline border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg gap-1 font-semibold"
                                            >
                                                <Eye size={12} /> View Details
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>

                        {/* Table Footer with Total Sells and Summary (Requirement 7) */}
                        {filteredItems.length > 0 && (
                            <tfoot className="bg-slate-100/90 border-t-2 border-slate-300 text-slate-900 font-bold text-xs">
                                <tr>
                                    <td colSpan={4} className="py-3 px-4 font-black uppercase tracking-wider text-slate-800">
                                        Total Sells Summary ({filteredItems.length} Transactions)
                                    </td>
                                    <td className="py-3 text-center font-mono font-bold text-slate-800">
                                        {totalFilteredNights} Nights
                                    </td>
                                    <td colSpan={2} className="py-3 px-2 text-right text-slate-600 font-semibold">
                                        Total Filtered Sells:
                                    </td>
                                    <td className="py-3 text-right font-mono font-black text-sm text-teal-950 whitespace-nowrap">
                                        <div>৳{totalFilteredSales.toLocaleString()}</div>
                                        {totalFilteredDue > 0 && (
                                            <div className="text-[10px] text-orange-600 font-bold font-sans mt-0.5">
                                                Total Due: ৳{totalFilteredDue.toLocaleString()}
                                            </div>
                                        )}
                                    </td>
                                    <td className="text-center py-3">
                                        <span className="badge badge-sm bg-teal-800 text-white font-bold border-none">
                                            Report Total
                                        </span>
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    )
}

export default IncomeAnalytics
