import React, { useContext, useState } from 'react'
import { Link } from 'react-router'
import { AuthContext } from '../../../Context/AuthContext'
import useRole from '../../../hooks/useRole'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import {
    CalendarCheck,
    CheckCircle2,
    Clock,
    XCircle,
    DollarSign,
    TrendingUp,
    TrendingDown,
    Minus,
    BedDouble,
    ArrowUpRight,
    Calendar,
    Users,
    ExternalLink,
    LogIn,
    LogOut,
    CalendarClock
} from 'lucide-react'
import { formatDate } from '../../../utils/bookingUtils'
import { format } from 'date-fns'

const formatChartDate = (dateStr) => {
    if (!dateStr) return { day: '', date: '', label: '' }
    try {
        const d = typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
            ? new Date(`${dateStr}T00:00:00`)
            : new Date(dateStr)
        if (isNaN(d.getTime())) return { day: dateStr, date: '', label: dateStr }
        return {
            day: format(d, 'EEE'), // 'Sat', 'Sun', 'Mon'
            date: format(d, 'MMM d'), // 'Oct 22'
            label: format(d, 'EEE, MMM d'),
            full: format(d, 'EEEE, MMM d, yyyy')
        }
    } catch {
        return { day: dateStr, date: '', label: dateStr }
    }
}

const renderDayTick = ({ x, y, payload }) => {
    const parsed = formatChartDate(payload?.value)
    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={10} textAnchor="middle" fill="#0f172a" fontSize={11} fontWeight={600}>
                {parsed.day}
            </text>
            {parsed.date && (
                <text x={0} y={0} dy={23} textAnchor="middle" fill="#64748b" fontSize={10}>
                    {parsed.date}
                </text>
            )}
        </g>
    )
}
const DashboardHome = () => {
    const { user } = useContext(AuthContext)
    const { role } = useRole()
    const axiosSecure = useAxiosSecure()
    const isAdminOrManager = role === "admin" || role === "manager"

    // user bookings summary for regular guests
    const { data: userBookings = [] } = useQuery({
        queryKey: ["user-bookings-summary", user?.email],
        enabled: !!user?.email && !isAdminOrManager && role === "user",
        queryFn: async () => {
            const res = await axiosSecure.get(`/bookings?email=${user.email}`)
            return res.data
        }
    })

    // admin / manager overview (lightweight aggregate metrics & partner summary)
    const { data: overview = {}, isLoading: overviewLoading } = useQuery({
        queryKey: ["admin-overview"],
        enabled: isAdminOrManager,
        queryFn: async () => {
            const res = await axiosSecure.get("/admin/overview")
            return res.data
        }
    })

    if (isAdminOrManager) {
        if (overviewLoading) {
            return (
                <div className="space-y-8 animate-pulse">
                    <div className="space-y-2">
                        <div className="h-7 bg-slate-200 rounded-lg w-48"></div>
                        <div className="h-4 bg-slate-200 rounded w-72"></div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(n => (
                            <div key={n} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-200"></div>
                                <div className="h-4 bg-slate-200 rounded w-20"></div>
                                <div className="h-6 bg-slate-200 rounded w-16"></div>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(n => (
                            <div key={n} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
                                <div className="w-7 h-7 rounded-lg bg-slate-200"></div>
                                <div className="h-6 bg-slate-200 rounded w-12"></div>
                                <div className="h-3 bg-slate-200 rounded w-24"></div>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 h-80"></div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 h-80"></div>
                    </div>
                </div>
            )
        }

        const opStats = overview.operationalStats || {}
        const operationalCards = [
            {
                title: "Check-in Today",
                value: opStats.checkInToday?.value ?? 0,
                unit: "Rooms",
                icon: <LogIn size={15} className="text-teal-600" />,
                bg: "bg-teal-50",
                border: "border-teal-100",
                trend: opStats.checkInToday?.trend || "neutral",
                trendText: opStats.checkInToday?.text || "0% from yesterday",
                link: "/dashboard/bookings?status=checked_id",
                subtext: "Rooms checked in today"
            },
            {
                title: "Check-out Today",
                value: opStats.checkOutToday?.value ?? 0,
                unit: "Rooms",
                icon: <LogOut size={15} className="text-blue-600" />,
                bg: "bg-blue-50",
                border: "border-blue-100",
                trend: opStats.checkOutToday?.trend || "neutral",
                trendText: opStats.checkOutToday?.text || "0% from yesterday",
                link: "/dashboard/bookings?status=checked_out",
                subtext: "Rooms checked out today"
            },
            {
                title: "In-House Guests",
                value: opStats.inHouseGuests?.value ?? 0,
                unit: "Guests",
                icon: <Users size={15} className="text-purple-600" />,
                bg: "bg-purple-50",
                border: "border-purple-100",
                trend: opStats.inHouseGuests?.trend || "neutral",
                trendText: opStats.inHouseGuests?.text || "0% from yesterday",
                link: "/dashboard/bookings?status=checked_id",
                subtext: `Across ${opStats.inHouseGuests?.roomsCount || 0} occupied rooms`
            },
            {
                title: "Expected Arrival",
                value: opStats.expectedArrivals?.value ?? 0,
                unit: "Bookings",
                icon: <CalendarCheck size={15} className="text-emerald-600" />,
                bg: "bg-emerald-50",
                border: "border-emerald-100",
                trend: opStats.expectedArrivals?.trend || "neutral",
                trendText: opStats.expectedArrivals?.text || "0% from yesterday",
                link: "/dashboard/bookings?status=booking_confirmed",
                subtext: "Reservations scheduled today"
            },
            {
                title: "Expected Departure",
                value: opStats.expectedDepartures?.value ?? 0,
                unit: "Bookings",
                icon: <CalendarClock size={15} className="text-amber-600" />,
                bg: "bg-amber-50",
                border: "border-amber-100",
                trend: opStats.expectedDepartures?.trend || "neutral",
                trendText: opStats.expectedDepartures?.text || "0% from yesterday",
                link: "/dashboard/bookings?status=checked_id",
                subtext: "In-house reservations departing"
            },
            {
                title: "Occupancy Rate",
                value: `${opStats.occupancyRate?.value ?? 0}%`,
                unit: "",
                icon: <BedDouble size={15} className="text-indigo-600" />,
                bg: "bg-indigo-50",
                border: "border-indigo-100",
                trend: opStats.occupancyRate?.trend || "neutral",
                trendText: opStats.occupancyRate?.text || "0% from yesterday",
                link: "/dashboard/calender",
                subtext: `${opStats.occupancyRate?.roomsOccupied || 0} / ${opStats.occupancyRate?.totalRooms || 38} Rooms occupied`
            }
        ]

        const stats = [
            {
                title: "Total Bookings",
                value: overview.totalBookings || 0,
                icon: <CalendarCheck size={15} className="text-teal-600" />,
                bg: "bg-teal-50",
                border: "border-teal-100",
                badge: "All Time",
                link: "/dashboard/bookings"
            },
            {
                title: "Confirmed",
                value: overview.confirmedCount || 0,
                icon: <CheckCircle2 size={15} className="text-emerald-600" />,
                bg: "bg-emerald-50",
                border: "border-emerald-100",
                badge: "Active",
                link: "/dashboard/bookings?status=booking_confirmed"
            },
            {
                title: "Pending Action",
                value: overview.pendingCount || 0,
                icon: <Clock size={15} className="text-amber-600" />,
                bg: "bg-amber-50",
                border: "border-amber-100",
                badge: "Review",
                link: "/dashboard/bookings?status=request_booking"
            },
            {
                title: "Cancelled",
                value: overview.cancelledCount || 0,
                icon: <XCircle size={15} className="text-rose-600" />,
                bg: "bg-rose-50",
                border: "border-rose-100",
                badge: "Void",
                link: "/dashboard/cancellations"
            },
            {
                title: "Monthly Income",
                value: `৳${(overview.monthlyRevenue || 0).toLocaleString()}`,
                icon: <Calendar size={15} className="text-emerald-600" />,
                bg: "bg-emerald-50",
                border: "border-emerald-200/70",
                badge: overview.currentMonthName || "This Month",
                link: "/dashboard/income",
                highlight: true
            },
            {
                title: "Total Income",
                value: `৳${(overview.totalRevenue || 0).toLocaleString()}`,
                icon: <DollarSign size={15} className="text-indigo-600" />,
                bg: "bg-indigo-50",
                border: "border-indigo-200/70",
                badge: "All Rooms",
                link: "/dashboard/income",
                highlight: true
            }
        ]

        const dayChartData = overview.bookingsPerDay?.length ? overview.bookingsPerDay : [
            { _id: 'Day 1', count: 0 },
            { _id: 'Day 2', count: 0 },
            { _id: 'Day 3', count: 0 },
            { _id: 'Day 4', count: 0 },
            { _id: 'Day 5', count: 0 },
            { _id: 'Day 6', count: 0 },
            { _id: 'Today', count: 0 }
        ]

        const roomChartData = overview.bookingsPerRoom?.length ? overview.bookingsPerRoom : [
            { _id: 'Couple Sea View', count: 0 },
            { _id: 'Family Suite', count: 0 },
            { _id: 'Balcony Room', count: 0 }
        ]

        // Agent & B2B partner performance metrics from overview API
        const partnerSummary = overview.partnerSummary || {
            partnerCount: 0,
            agentCount: 0,
            b2bCount: 0,
            totalBookings: 0,
            totalSales: 0,
            totalPaid: 0,
            totalDue: 0
        }

        return (
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight">
                                {role === "admin" ? "Resort Admin Overview" : "Management Dashboard"}
                            </h1>
                            <span className={`badge badge-sm font-bold uppercase text-[10px] border-none ${role === "admin" ? "bg-amber-400 text-slate-900" : "bg-purple-600 text-white"
                                }`}>
                                {role}
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Live operational performance, room revenues, and Agent & B2B partner workflows.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Link to="/dashboard/users" className="btn btn-sm btn-outline border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-bold">
                            <Users size={14} /> Users & Roles
                        </Link>
                        <Link to="/dashboard/calender" className="btn btn-sm bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-xs border-none">
                            <CalendarCheck size={14} /> Booking Calendar
                        </Link>
                    </div>
                </div>

                {/* 6 Key Stats Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {stats.map((s, idx) => (
                        <Link
                            key={idx}
                            to={s.link}
                            className={`group relative p-3 sm:p-4 rounded-2xl bg-white border ${s.border} shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-slate-500">{s.title}</p>
                                <div className={`w-7 h-7 rounded-lg ${s.bg} flex items-center justify-center`}>
                                    {s.icon}
                                </div>
                            </div>
                            <div>
                                <h3 className={`text-lg sm:text-xl font-black mt-0.5 tracking-tight ${s.highlight ? 'text-teal-900' : 'text-slate-900'
                                    }`}>
                                    {s.value}
                                </h3>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Today's Front Desk Operations */}
                <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg sm:text-xl font-bold text-slate-900 font-serif">
                                    Today's Front Desk Operations
                                </h2>
                                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/80">
                                    {opStats.date ? formatDate(opStats.date) : "Today"}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Live room turnovers, in-house guests, and expected daily check-in/out movement compared to yesterday.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                        {operationalCards.map((card, idx) => (
                            <Link
                                key={idx}
                                to={card.link}
                                className={`group p-3 sm:p-4 rounded-2xl bg-white border ${card.border} shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between`}
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-semibold text-slate-600 line-clamp-1">{card.title}</p>
                                        <div className={`w-7 h-7 rounded-lg ${card.bg} flex items-center justify-center shrink-0`}>
                                            {card.icon}
                                        </div>
                                    </div>
                                    <div className="flex items-baseline gap-1.5">
                                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                            {card.value}
                                        </h3>
                                        {card.unit && (
                                            <span className="text-xs font-bold text-slate-400">
                                                {card.unit}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                                        {card.subtext}
                                    </p>
                                </div>

                                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                                    {card.trend === 'up' && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded-full">
                                            <TrendingUp size={11} className="text-emerald-600" />
                                            <span>{card.trendText}</span>
                                        </span>
                                    )}
                                    {card.trend === 'down' && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200/60 px-1.5 py-0.5 rounded-full">
                                            <TrendingDown size={11} className="text-rose-600" />
                                            <span>{card.trendText}</span>
                                        </span>
                                    )}
                                    {card.trend === 'neutral' && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 rounded-full">
                                            <Minus size={11} className="text-slate-400" />
                                            <span>{card.trendText}</span>
                                        </span>
                                    )}
                                    <ArrowUpRight size={13} className="text-slate-300 group-hover:text-teal-600 transition-colors" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Analytics Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Daily bookings bar chart */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-slate-900 text-base font-serif">Recent Booking Trend</h3>
                                <p className="text-xs text-slate-500">Reservations created over the last 7 days</p>
                            </div>
                        </div>
                        <div className="w-full h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={dayChartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="_id" 
                                        tick={renderDayTick} 
                                        height={42} 
                                        axisLine={false} 
                                        tickLine={false} 
                                    />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                                        labelFormatter={(val) => {
                                            const parsed = formatChartDate(val)
                                            return parsed.full || val
                                        }}
                                    />
                                    <Bar dataKey="count" fill="#0d9488" radius={[6, 6, 0, 0]} name="Reservations" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Bookings by room type */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="font-bold text-slate-900 text-base font-serif">Bookings by Room Suite</h3>
                                <p className="text-xs text-slate-500">Distribution across room categories</p>
                            </div>
                            <Link to="/dashboard/income" className="text-xs font-semibold text-teal-700 hover:underline">
                                Revenue View →
                            </Link>
                        </div>
                        <div className="w-full h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={roomChartData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="_id" tick={{ fontSize: 11, fill: '#64748b' }} width={120} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                                    />
                                    <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]} name="Bookings" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Agent & B2B Partner Workflow Section */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif">
                                    Agent & B2B Partner Workflow
                                </h2>
                                <span className="badge badge-sm bg-teal-100 text-teal-900 font-bold">
                                    {partnerSummary.partnerCount} Partners
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Live sales performance, booking counts, and operational metrics of verified Agents and B2B Corporate Partners.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Link to="/dashboard/income" className="btn btn-xs bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl gap-1 shadow-2xs border-none">
                                View Sales Report <ArrowUpRight size={13} />
                            </Link>
                            <Link to="/dashboard/users" className="text-xs font-bold text-teal-700 hover:underline flex items-center gap-1">
                                Manage Roles <ExternalLink size={12} />
                            </Link>
                        </div>
                    </div>

                    {/* Partner Performance Summary Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">Active Partners</span>
                                <Users size={16} className="text-teal-600" />
                            </div>
                            <p className="text-xl font-black text-slate-900">
                                {partnerSummary.partnerCount} <span className="text-xs font-semibold text-slate-400">({partnerSummary.agentCount} Agents · {partnerSummary.b2bCount} B2B)</span>
                            </p>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">Partner Bookings</span>
                                <CalendarCheck size={16} className="text-blue-600" />
                            </div>
                            <p className="text-xl font-black text-slate-900">
                                {partnerSummary.totalBookings} <span className="text-xs font-semibold text-slate-400">Bookings</span>
                            </p>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">Total Sales Volume</span>
                                <TrendingUp size={16} className="text-emerald-600" />
                            </div>
                            <p className="text-xl font-black text-emerald-800">
                                ৳{partnerSummary.totalSales.toLocaleString()}
                            </p>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">Collected / Due</span>
                                <DollarSign size={16} className="text-indigo-600" />
                            </div>
                            <p className="text-sm font-bold text-slate-900">
                                <span className="text-emerald-700">৳{partnerSummary.totalPaid.toLocaleString()}</span>
                                {partnerSummary.totalDue > 0 && (
                                    <span className="text-orange-600 ml-1 font-semibold text-xs">/ Due ৳{partnerSummary.totalDue.toLocaleString()}</span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Personal Sales overview for Agent / B2B Staff Roles
    const isPartnerStaff = role === "agent" || role === "b2b" || role === "front_desk"
    const { data: salesOverview = {}, isLoading: salesLoading } = useQuery({
        queryKey: ["my-sales-overview", user?.email, user?.displayName],
        enabled: isPartnerStaff && !!user?.email,
        queryFn: async () => {
            const res = await axiosSecure.get(`/sales/my-overview?email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.displayName || '')}`)
            return res.data
        }
    })

    // Guest User Dashboard (regular users)
    const confirmed = userBookings.filter(b => b.status === "booking_confirmed" || b.status === "confirmed").length
    const pending = userBookings.filter(b => b.status === "request_booking" || b.status === "pending").length
    const cancelled = userBookings.filter(b => b.status === "cancel" || b.status === "cancelled").length

    if (isPartnerStaff) {
        const {
            monthlySales = 0,
            totalSales = 0,
            monthlyBookingsCount = 0,
            totalBookingsCount = 0,
            totalPaid = 0,
            totalDue = 0,
            categoryBreakdown = [],
            detailedSells = []
        } = salesOverview

        return (
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight">
                                Sales Overview · {user?.displayName || "Partner"}
                            </h1>
                            <span className="badge badge-md bg-teal-600 text-white font-bold uppercase text-[10px]">
                                {role}
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Track your monthly & total sales performance, room category distribution, and booking details.
                        </p>
                    </div>

                    <Link to="/dashboard/calender" className="btn btn-sm bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-xs border-none self-start">
                        <CalendarCheck size={15} />
                        <span>Open Reservation Calendar</span>
                    </Link>
                </div>

                {/* Sells Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                    {/* Monthly Sells */}
                    <div className="bg-white p-5 rounded-2xl border border-teal-200/80 bg-linear-to-br from-teal-50/50 to-white shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-teal-700">This Month</span>
                            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                                <DollarSign size={16} />
                            </div>
                        </div>
                        <p className="text-xl sm:text-2xl font-black text-teal-900">৳{monthlySales.toLocaleString()}</p>
                        <p className="text-[11px] text-slate-500 font-medium">Monthly Sells</p>
                    </div>

                    {/* Total Sells */}
                    <div className="bg-white p-5 rounded-2xl border border-indigo-200/80 bg-linear-to-br from-indigo-50/50 to-white shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-indigo-700">All Time</span>
                            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                                <TrendingUp size={16} />
                            </div>
                        </div>
                        <p className="text-xl sm:text-2xl font-black text-indigo-900">৳{totalSales.toLocaleString()}</p>
                        <p className="text-[11px] text-slate-500 font-medium">Total Sells</p>
                    </div>

                    {/* Monthly Bookings */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Monthly</span>
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <Calendar size={16} />
                            </div>
                        </div>
                        <p className="text-xl sm:text-2xl font-black text-slate-900">{monthlyBookingsCount}</p>
                        <p className="text-[11px] text-slate-500 font-medium">Monthly Bookings</p>
                    </div>

                    {/* Total Bookings */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Lifetime</span>
                            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <CalendarCheck size={16} />
                            </div>
                        </div>
                        <p className="text-xl sm:text-2xl font-black text-slate-900">{totalBookingsCount}</p>
                        <p className="text-[11px] text-slate-500 font-medium">Total Bookings</p>
                    </div>

                    {/* Total Paid Received */}
                    <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-emerald-600">Collected</span>
                            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                <CheckCircle2 size={16} />
                            </div>
                        </div>
                        <p className="text-xl sm:text-2xl font-black text-emerald-700">৳{totalPaid.toLocaleString()}</p>
                        <p className="text-[11px] text-slate-500 font-medium">Total Paid</p>
                    </div>

                    {/* Total Due Balance */}
                    <div className="bg-white p-5 rounded-2xl border border-orange-200 shadow-xs space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-orange-600">Pending</span>
                            <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
                                <Clock size={16} />
                            </div>
                        </div>
                        <p className="text-xl sm:text-2xl font-black text-orange-600">৳{totalDue.toLocaleString()}</p>
                        <p className="text-[11px] text-slate-500 font-medium">Total Due</p>
                    </div>
                </div>

                {/* Sells by Room Category Breakdown Chart / Table */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-slate-900 text-base font-serif">Sells by Room Category</h3>
                                <p className="text-xs text-slate-500">Revenue and count distribution across room types</p>
                            </div>
                        </div>

                        {categoryBreakdown.length > 0 ? (
                            <div className="w-full h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={categoryBreakdown}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            formatter={(value, name) => [name === "revenue" ? `৳${Number(value).toLocaleString()}` : value, name === "revenue" ? "Revenue" : "Bookings"]}
                                            contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                                        />
                                        <Bar dataKey="revenue" fill="#0d9488" radius={[6, 6, 0, 0]} name="revenue" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="py-16 text-center text-slate-400">
                                <BedDouble size={36} className="mx-auto mb-2 opacity-50" />
                                <p className="text-xs">No sells data recorded yet.</p>
                            </div>
                        )}
                    </div>

                    {/* Category List */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                        <h3 className="font-bold text-slate-900 text-base font-serif">Category Performance</h3>
                        <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                            {categoryBreakdown.map((cat, idx) => (
                                <div key={idx} className="py-3 flex items-center justify-between text-xs">
                                    <div>
                                        <strong className="text-slate-900 block font-semibold">{cat.category}</strong>
                                        <span className="text-slate-400">{cat.count} booking{cat.count > 1 ? 's' : ''}</span>
                                    </div>
                                    <div className="text-right">
                                        <strong className="text-teal-700 font-bold block">৳{Number(cat.revenue || 0).toLocaleString()}</strong>
                                        <span className="text-[10px] text-slate-400">Revenue</span>
                                    </div>
                                </div>
                            ))}
                            {categoryBreakdown.length === 0 && (
                                <p className="py-8 text-center text-xs text-slate-400">No category sells yet.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Detailed Sells History Table */}
                <div className="bg-white border border-slate-200 shadow-xs space-y-3 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-slate-900 text-base font-serif">Detailed Sells History</h3>
                            <p className="text-xs text-slate-500">All bookings credited to your reference / account with room, category, and stay time.</p>
                        </div>
                        <span className="badge badge-sm bg-slate-100 text-slate-700 font-bold">
                            {detailedSells.length} Sells Records
                        </span>
                    </div>

                    <table className="table table-sm w-full text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                            <tr>
                                <th>Booking ID</th>
                                <th>Guest</th>
                                <th>Category & Room</th>
                                <th>Stay Dates & Nights</th>
                                <th>Total Sells</th>
                                <th>Paid / Method</th>
                                <th>Due</th>
                                <th>Status</th>
                                <th>Booking Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {detailedSells.map((sell, idx) => (
                                <tr key={sell.bookingId || idx} className="hover:bg-slate-50/80 transition">
                                    <td className="font-mono font-bold text-teal-800">
                                        #{String(sell.bookingId).slice(-6)}
                                    </td>
                                    <td>
                                        <div className="font-bold text-slate-900">{sell.guestName}</div>
                                        <div className="text-[10px] text-slate-400">{sell.mobile}</div>
                                    </td>
                                    <td>
                                        <div className="font-semibold text-slate-800">{sell.category}</div>
                                        <div className="text-[10px] text-teal-700 font-bold">Room {sell.roomNo}</div>
                                    </td>
                                    <td>
                                        <div className="text-slate-700 font-medium">
                                            {formatDate(sell.checkIn)} → {formatDate(sell.checkOut)}
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-semibold">{sell.nights} night{sell.nights > 1 ? 's' : ''}</span>
                                    </td>
                                    <td className="font-bold text-slate-900">
                                        ৳{Number(sell.totalAmount || 0).toLocaleString()}
                                    </td>
                                    <td>
                                        <span className="font-bold text-emerald-700">৳{Number(sell.paidAmount || 0).toLocaleString()}</span>
                                        <span className="block text-[10px] text-slate-400 font-semibold">{sell.paymentMethod || "Direct"}</span>
                                    </td>
                                    <td>
                                        {Number(sell.dueAmount || 0) > 0 ? (
                                            <span className="badge badge-xs bg-orange-100 text-orange-800 font-bold border-none">
                                                Due ৳{Number(sell.dueAmount).toLocaleString()}
                                            </span>
                                        ) : (
                                            <span className="text-emerald-600 font-semibold text-[11px]">Paid ✅</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`badge badge-xs font-bold border-none ${sell.status === "booking_confirmed" || sell.status === "confirmed" ? "bg-[#5261d6] text-white" :
                                                sell.status === "checked_id" || sell.status === "checked_in" ? "bg-[#01966e] text-white" :
                                                    sell.status === "request_booking" ? "bg-[#f59e0b] text-white" :
                                                        "bg-slate-200 text-slate-700"
                                            }`}>
                                            {sell.status}
                                        </span>
                                    </td>
                                    <td className="text-slate-400 text-[11px] whitespace-nowrap">
                                        {sell.bookingDate ? formatDate(sell.bookingDate) : "N/A"}
                                    </td>
                                </tr>
                            ))}
                            {detailedSells.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="text-center py-12 text-slate-400">
                                        No sales records credited to your account or reference yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight">
                    Welcome back, {user?.displayName || "Guest"}! 👋
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Manage your reservations and stay information at Miami Beach Resort.
                </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3">
                        <CalendarCheck size={22} />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Total Bookings</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{userBookings.length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                        <CheckCircle2 size={22} />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Confirmed</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">{confirmed}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                        <Clock size={22} />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Pending Review</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">{pending}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                        <XCircle size={22} />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Cancelled</p>
                    <p className="text-2xl font-bold text-rose-600 mt-1">{cancelled}</p>
                </div>
            </div>
        </div>
    )
}

export default DashboardHome
