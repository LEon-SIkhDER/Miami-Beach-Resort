import React, { useState } from 'react'
import { Link } from 'react-router'
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
    BarChart3
} from 'lucide-react'

const IncomeAnalytics = () => {
    const axiosSecure = useAxiosSecure()
    const [search, setSearch] = useState("")
    const [selectedCategory, setSelectedCategory] = useState("all")

    const { data: incomeData = {}, isLoading: isIncomeLoading } = useQuery({
        queryKey: ["admin-income-breakdown"],
        queryFn: async () => {
            const res = await axiosSecure.get("/admin/income-breakdown")
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

    const isLoading = isIncomeLoading || isOverviewLoading
    const roomBreakdown = incomeData.roomBreakdown || []
    const totalRevenue = incomeData.totalRevenue || overview.totalRevenue || 0
    const monthlyRevenue = overview.monthlyRevenue || 0

    // Flatten all room-level booking items for the details table
    const allBookingItems = roomBreakdown.flatMap(cat => 
        (cat.bookings || []).map(b => ({
            ...b,
            categoryName: cat.roomName
        }))
    )

    const filteredItems = allBookingItems.filter(item => {
        const matchesCategory = selectedCategory === "all" || item.categoryName === selectedCategory
        if (!matchesCategory) return false
        if (!search) return true
        const s = search.toLowerCase()
        return (
            item.guestName?.toLowerCase().includes(s) ||
            item.guestPhone?.toLowerCase().includes(s) ||
            item.bookingId?.toLowerCase().includes(s) ||
            item.categoryName?.toLowerCase().includes(s) ||
            item.transactionId?.toLowerCase().includes(s) ||
            item.reference?.toLowerCase().includes(s)
        )
    })

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                            <DollarSign size={22} />
                        </span>
                        Room Income & Revenue Analytics
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Comprehensive earnings breakdown across all suites, physical rooms, and guest reservations.
                    </p>
                </div>

                <div className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 shadow-xs">
                    <TrendingUp size={14} className="text-emerald-600" /> Live Financial Report
                </div>
            </div>

            {/* Income Highlights Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white shadow-md flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-bold tracking-wider text-indigo-200">Total Revenue</span>
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                            <DollarSign size={18} className="text-indigo-200" />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl sm:text-3xl font-extrabold tracking-tight">৳{Number(totalRevenue || 0).toLocaleString()}</p>
                        <p className="text-[11px] text-indigo-200 mt-0.5">All-time confirmed earnings</p>
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-emerald-100 shadow-xs flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-bold tracking-wider text-emerald-700">Monthly Revenue</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <Calendar size={18} />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">৳{Number(monthlyRevenue || 0).toLocaleString()}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">{overview.currentMonthName || "Current Month"}</p>
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-bold tracking-wider text-slate-500">Confirmed Bookings</span>
                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                            <Receipt size={18} />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{overview.confirmedCount || 0}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Active & Completed Stays</p>
                    </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-bold tracking-wider text-slate-500">Suite Categories</span>
                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                            <BedDouble size={18} />
                        </div>
                    </div>
                    <div>
                        <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{roomBreakdown.length}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Active Room Types</p>
                    </div>
                </div>
            </div>

            {/* Room Revenue Performance Grid */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 font-serif flex items-center gap-2">
                    <BarChart3 size={18} className="text-teal-600" /> Revenue by Room Suite
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {roomBreakdown.map((cat, idx) => {
                        const share = totalRevenue > 0 ? Math.round((cat.totalRevenue / totalRevenue) * 100) : 0
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
            </div>

            {/* Income Transactions Table */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-slate-900 font-serif flex items-center gap-2">
                        <Receipt size={18} className="text-teal-600" /> Confirmed Booking Transactions
                    </h3>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className="relative">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name, ID, TrxID..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="input input-sm input-bordered pl-9 rounded-xl w-48 sm:w-60 bg-white"
                            />
                        </div>

                        <select
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                            className="select select-sm select-bordered rounded-xl bg-white text-xs font-semibold"
                        >
                            <option value="all">All Suite Types</option>
                            {roomBreakdown.map((cat, i) => (
                                <option key={i} value={cat.roomName}>{cat.roomName}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra w-full whitespace-nowrap">
                            <thead>
                                <tr className="bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                    <th className="whitespace-nowrap min-w-[130px]">Booking ID</th>
                                    <th className="whitespace-nowrap">Guest</th>
                                    <th className="whitespace-nowrap">Suite / Assigned Room</th>
                                    <th className="whitespace-nowrap">Stay Dates</th>
                                    <th className="whitespace-nowrap">Duration</th>
                                    <th className="whitespace-nowrap">Bill Amount</th>
                                    <th className="whitespace-nowrap">Trx ID / Ref</th>
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
                                            <td><div className="h-4 bg-slate-200 w-20"></div></td>
                                            <td><div className="h-4 bg-slate-200 w-24"></div></td>
                                            <td><div className="h-7 bg-slate-200 w-14 mx-auto"></div></td>
                                        </tr>
                                    ))
                                ) : filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-12 text-slate-400">
                                            <Receipt size={36} className="mx-auto mb-2 opacity-50" />
                                            No income records matching your search.
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
                                                {item.roomNo && (
                                                    <span className="badge badge-xs bg-teal-100 text-teal-900 border-none font-mono font-bold mt-0.5">
                                                        Room {item.roomNo}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="text-xs text-slate-700 whitespace-nowrap">
                                                {item.checkIn} → {item.checkOut}
                                            </td>
                                            <td className="text-xs text-slate-600 whitespace-nowrap font-medium">
                                                {item.nights} night(s)
                                            </td>
                                            <td className="font-bold text-teal-900 whitespace-nowrap">
                                                ৳{Number(item.amount || 0).toLocaleString()}
                                            </td>
                                            <td className="text-xs text-slate-600 whitespace-nowrap">
                                                {item.transactionId ? (
                                                    <p className="font-mono font-bold text-slate-800">{item.transactionId}</p>
                                                ) : <span className="text-slate-400">—</span>}
                                                {item.reference && <p className="text-[11px] text-teal-700">Ref: {item.reference}</p>}
                                            </td>
                                            <td className="text-center whitespace-nowrap">
                                                <Link
                                                    to={`/dashboard/bookings/${item._id}`}
                                                    className="btn btn-xs btn-outline border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg gap-1"
                                                >
                                                    <Eye size={12} /> Details
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default IncomeAnalytics
