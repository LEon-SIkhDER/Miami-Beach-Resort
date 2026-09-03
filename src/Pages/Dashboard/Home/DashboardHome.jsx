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
    BedDouble,
    ArrowUpRight,
    Calendar,
    UserCheck,
    Building2,
    Users,
    Search,
    Activity,
    ExternalLink
} from 'lucide-react'
import { formatDate } from '../../../utils/bookingUtils'
import UserWorkflowModal from '../Users/UserWorkflowModal'

const DashboardHome = () => {
    const { user } = useContext(AuthContext)
    const { role } = useRole()
    const axiosSecure = useAxiosSecure()
    const isAdminOrManager = role === "admin" || role === "manager"

    // Partner search & filter tab on admin/manager dashboard
    const [partnerTab, setPartnerTab] = useState("all") // "all" | "agent" | "b2b"
    const [partnerSearch, setPartnerSearch] = useState("")
    const [selectedWorkflowUser, setSelectedWorkflowUser] = useState(null)

    // user bookings summary for regular guests
    const { data: userBookings = [] } = useQuery({
        queryKey: ["user-bookings-summary", user?.email],
        enabled: !!user?.email && !isAdminOrManager && role === "user",
        queryFn: async () => {
            const res = await axiosSecure.get(`/bookings?email=${user.email}`)
            return res.data
        }
    })

    // admin / manager overview
    const { data: overview = {}, isLoading: overviewLoading } = useQuery({
        queryKey: ["admin-overview"],
        enabled: isAdminOrManager,
        queryFn: async () => {
            const res = await axiosSecure.get("/admin/overview")
            return res.data
        }
    })

    // all users for agent & b2b partner workflow
    const { data: allUsers = [], isLoading: usersLoading } = useQuery({
        queryKey: ["admin-manager-partner-users"],
        enabled: isAdminOrManager,
        queryFn: async () => {
            const res = await axiosSecure.get("/users")
            return Array.isArray(res.data) ? res.data : []
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 h-80"></div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 h-80"></div>
                    </div>
                </div>
            )
        }

        const stats = [
            {
                title: "Total Bookings",
                value: overview.totalBookings || 0,
                icon: <CalendarCheck size={22} className="text-teal-600" />,
                bg: "bg-teal-50",
                border: "border-teal-100",
                badge: "All Time",
                link: "/dashboard/bookings"
            },
            {
                title: "Confirmed",
                value: overview.confirmedCount || 0,
                icon: <CheckCircle2 size={22} className="text-emerald-600" />,
                bg: "bg-emerald-50",
                border: "border-emerald-100",
                badge: "Active",
                link: "/dashboard/bookings?status=booking_confirmed"
            },
            {
                title: "Pending Action",
                value: overview.pendingCount || 0,
                icon: <Clock size={22} className="text-amber-600" />,
                bg: "bg-amber-50",
                border: "border-amber-100",
                badge: "Review",
                link: "/dashboard/bookings?status=request_booking"
            },
            {
                title: "Cancelled",
                value: overview.cancelledCount || 0,
                icon: <XCircle size={22} className="text-rose-600" />,
                bg: "bg-rose-50",
                border: "border-rose-100",
                badge: "Void",
                link: "/dashboard/cancellations"
            },
            {
                title: "Monthly Income",
                value: `৳${(overview.monthlyRevenue || 0).toLocaleString()}`,
                icon: <Calendar size={22} className="text-emerald-600" />,
                bg: "bg-emerald-50",
                border: "border-emerald-200/70",
                badge: overview.currentMonthName || "This Month",
                link: "/dashboard/income",
                highlight: true
            },
            {
                title: "Total Income",
                value: `৳${(overview.totalRevenue || 0).toLocaleString()}`,
                icon: <DollarSign size={22} className="text-indigo-600" />,
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

        // Agent & B2B partners workflow data
        const partnerUsers = allUsers.filter(u => u.role === "agent" || u.role === "b2b")
        const agentCount = partnerUsers.filter(u => u.role === "agent").length
        const b2bCount = partnerUsers.filter(u => u.role === "b2b").length
        const totalPartnerBookings = partnerUsers.reduce((sum, p) => sum + (p.stats?.totalBookings || 0), 0)
        const totalPartnerSales = partnerUsers.reduce((sum, p) => sum + (p.stats?.totalSales || 0), 0)
        const totalPartnerPaid = partnerUsers.reduce((sum, p) => sum + (p.stats?.totalPaid || 0), 0)
        const totalPartnerDue = partnerUsers.reduce((sum, p) => sum + (p.stats?.totalDue || 0), 0)

        const filteredPartners = partnerUsers.filter(p => {
            if (partnerTab === "agent" && p.role !== "agent") return false
            if (partnerTab === "b2b" && p.role !== "b2b") return false
            if (partnerSearch) {
                const s = partnerSearch.toLowerCase()
                const nameMatch = (p.name || "").toLowerCase().includes(s)
                const emailMatch = (p.email || "").toLowerCase().includes(s)
                const phoneMatch = (p.phone || "").toLowerCase().includes(s)
                return nameMatch || emailMatch || phoneMatch
            }
            return true
        })

        return (
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight">
                                {role === "admin" ? "Resort Admin Overview" : "Management Dashboard"}
                            </h1>
                            <span className={`badge badge-sm font-bold uppercase text-[10px] border-none ${
                                role === "admin" ? "bg-amber-400 text-slate-900" : "bg-purple-600 text-white"
                            }`}>
                                {role}
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Live operational performance, room revenues, and Agent & B2B partner workflows.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
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
                            className={`group relative p-4 sm:p-5 rounded-2xl bg-white border ${s.border} shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                                    {s.icon}
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    s.highlight ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                }`}>
                                    {s.badge}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500">{s.title}</p>
                                <h3 className={`text-xl sm:text-2xl font-black mt-0.5 tracking-tight ${
                                    s.highlight ? 'text-teal-900' : 'text-slate-900'
                                }`}>
                                    {s.value}
                                </h3>
                            </div>
                            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-teal-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span>Details</span>
                                <ArrowUpRight size={13} />
                            </div>
                        </Link>
                    ))}
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
                                    <XAxis dataKey="_id" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
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
                                    {partnerUsers.length} Partners
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Live sales performance, booking counts, and detailed audit activities of all verified Agents and B2B Corporate Partners.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Link to="/dashboard/workflow" className="btn btn-xs bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl gap-1 shadow-2xs border-none">
                                Open Dedicated Workflow Page <ArrowUpRight size={13} />
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
                                {partnerUsers.length} <span className="text-xs font-semibold text-slate-400">({agentCount} Agents · {b2bCount} B2B)</span>
                            </p>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">Partner Bookings</span>
                                <CalendarCheck size={16} className="text-blue-600" />
                            </div>
                            <p className="text-xl font-black text-slate-900">
                                {totalPartnerBookings} <span className="text-xs font-semibold text-slate-400">Bookings</span>
                            </p>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">Total Sales Volume</span>
                                <TrendingUp size={16} className="text-emerald-600" />
                            </div>
                            <p className="text-xl font-black text-emerald-800">
                                ৳{totalPartnerSales.toLocaleString()}
                            </p>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500">Collected / Due</span>
                                <DollarSign size={16} className="text-indigo-600" />
                            </div>
                            <p className="text-sm font-bold text-slate-900">
                                <span className="text-emerald-700">৳{totalPartnerPaid.toLocaleString()}</span>
                                {totalPartnerDue > 0 && (
                                    <span className="text-orange-600 ml-1 font-semibold text-xs">/ Due ৳{totalPartnerDue.toLocaleString()}</span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Partner Workflow Table Container */}
                    <div className="bg-white border border-slate-200 shadow-xs space-y-3 p-4 sm:p-6">
                        {/* Filter Tabs & Search */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            {/* Role Filter Tabs */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                                <button
                                    type="button"
                                    onClick={() => setPartnerTab("all")}
                                    className={`btn btn-xs rounded-xl font-bold gap-1.5 ${
                                        partnerTab === "all"
                                            ? "bg-teal-600 text-white shadow-xs border-teal-600"
                                            : "btn-ghost bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60"
                                    }`}
                                >
                                    <Users size={12} />
                                    <span>All Partners</span>
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/60 text-slate-700 font-mono">
                                        {partnerUsers.length}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPartnerTab("agent")}
                                    className={`btn btn-xs rounded-xl font-bold gap-1.5 ${
                                        partnerTab === "agent"
                                            ? "bg-teal-700 text-white shadow-xs border-teal-700"
                                            : "btn-ghost bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60"
                                    }`}
                                >
                                    <UserCheck size={12} />
                                    <span>Agents</span>
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/60 text-slate-700 font-mono">
                                        {agentCount}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPartnerTab("b2b")}
                                    className={`btn btn-xs rounded-xl font-bold gap-1.5 ${
                                        partnerTab === "b2b"
                                            ? "bg-blue-600 text-white shadow-xs border-blue-600"
                                            : "btn-ghost bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60"
                                    }`}
                                >
                                    <Building2 size={12} />
                                    <span>B2B Partners</span>
                                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200/60 text-slate-700 font-mono">
                                        {b2bCount}
                                    </span>
                                </button>
                            </div>

                            {/* Search Box */}
                            <div className="relative shrink-0 sm:w-64">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search partner name, email..."
                                    className="input input-sm input-bordered pl-8.5 pr-7 rounded-xl w-full bg-slate-50 focus:bg-white text-xs"
                                    value={partnerSearch}
                                    onChange={e => setPartnerSearch(e.target.value)}
                                />
                                {partnerSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setPartnerSearch("")}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Partner Table View */}
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="table table-zebra w-full whitespace-nowrap text-xs">
                            <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                                <tr>
                                    <th>#</th>
                                    <th>Partner Name & Contact</th>
                                    <th>Role</th>
                                    <th>Total Bookings</th>
                                    <th>Sales Volume</th>
                                    <th>Paid / Due</th>
                                    <th>Joined Date</th>
                                    <th className="text-center">Workflow & Activity</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {usersLoading ? (
                                    [1, 2, 3].map(n => (
                                        <tr key={n} className="animate-pulse">
                                            <td><div className="h-4 bg-slate-200 rounded w-4"></div></td>
                                            <td><div className="h-4 bg-slate-200 rounded w-36"></div></td>
                                            <td><div className="h-5 bg-slate-200 rounded-full w-16"></div></td>
                                            <td><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                                            <td><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                                            <td><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                                            <td><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                                            <td className="text-center"><div className="h-6 bg-slate-200 rounded w-24 mx-auto"></div></td>
                                        </tr>
                                    ))
                                ) : filteredPartners.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="text-center py-10 text-slate-400">
                                            <Users size={32} className="mx-auto mb-2 opacity-50" />
                                            {partnerUsers.length === 0
                                                ? "No Agents or B2B Partners registered yet. Change user roles in the Users & Roles tab."
                                                : "No partners found matching your search filter."}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPartners.map((p, idx) => {
                                        const bookingsCount = p.stats?.totalBookings || 0
                                        const salesAmount = p.stats?.totalSales || 0
                                        const paidAmount = p.stats?.totalPaid || 0
                                        const dueAmount = p.stats?.totalDue || 0

                                        return (
                                            <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="font-mono text-slate-400">{idx + 1}</td>
                                                <td>
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
                                                            {p.name ? p.name.charAt(0).toUpperCase() : p.email?.charAt(0).toUpperCase() || 'P'}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-900 text-sm">{p.name || "Unnamed Partner"}</div>
                                                            <div className="text-[11px] text-slate-400">{p.email}</div>
                                                            {p.phone && <div className="text-[10px] text-teal-700 font-semibold">{p.phone}</div>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    {p.role === "agent" ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                                            <UserCheck size={12} className="text-teal-600" /> Agent
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                                            <Building2 size={12} className="text-blue-600" /> B2B Partner
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className="font-bold text-teal-900">
                                                        {bookingsCount} Booking{bookingsCount !== 1 ? 's' : ''}
                                                    </span>
                                                </td>
                                                <td className="font-bold text-emerald-800 text-sm">
                                                    ৳{salesAmount.toLocaleString()}
                                                </td>
                                                <td>
                                                    <div className="text-slate-700 font-semibold">
                                                        <span className="text-emerald-700">৳{paidAmount.toLocaleString()}</span>
                                                        {dueAmount > 0 && (
                                                            <span className="text-orange-600 block text-[10px] font-bold">Due: ৳{dueAmount.toLocaleString()}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="text-slate-500 text-[11px]">
                                                    {p.created_At ? formatDate(p.created_At) : "N/A"}
                                                </td>
                                                <td className="text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedWorkflowUser(p)}
                                                        className="btn btn-xs btn-primary text-white gap-1 rounded-lg shadow-2xs font-bold"
                                                        title="Inspect full workflow, reservation history, and timeline activities"
                                                    >
                                                        <Activity size={12} /> View Workflow
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                        </div>
                    </div>
                </div>

                {/* Workflow Modal Pop-up */}
                {selectedWorkflowUser && (
                    <UserWorkflowModal
                        user={selectedWorkflowUser}
                        isOpen={!!selectedWorkflowUser}
                        onClose={() => setSelectedWorkflowUser(null)}
                    />
                )}
            </div>
        )
    }

    // Personal Sales overview for Agent / B2B Staff Roles
    const isPartnerStaff = role === "agent" || role === "b2b"
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
    const pending = userBookings.filter(b => b.status === "request_booking" || b.status === "payment_waiting" || b.status === "pending").length
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
                                        <span className={`badge badge-xs font-bold border-none ${
                                            sell.status === "booking_confirmed" || sell.status === "confirmed" ? "bg-[#5261d6] text-white" :
                                            sell.status === "checked_id" || sell.status === "checked_in" ? "bg-[#01966e] text-white" :
                                            sell.status === "payment_waiting" ? "bg-rose-600 text-white" :
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
