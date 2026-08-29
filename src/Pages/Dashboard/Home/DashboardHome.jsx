import React, { useContext } from 'react'
import { AuthContext } from '../../../Context/AuthContext'
import useRole from '../../../hooks/useRole'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { CalendarCheck, CheckCircle2, Clock, XCircle, DollarSign, TrendingUp, BedDouble } from 'lucide-react'

const DashboardHome = () => {
    const { user } = useContext(AuthContext)
    const { role } = useRole()
    const axiosSecure = useAxiosSecure()

    // user bookings summary
    const { data: userBookings = [], isLoading: userBookingsLoading } = useQuery({
        queryKey: ["user-bookings-summary", user?.email],
        enabled: !!user?.email && role !== undefined && role !== "admin",
        queryFn: async () => {
            const res = await axiosSecure.get(`/bookings?email=${user.email}`)
            return res.data
        }
    })

    // admin overview
    const { data: overview = {}, isLoading: overviewLoading } = useQuery({
        queryKey: ["admin-overview"],
        enabled: role === "admin",
        queryFn: async () => {
            const res = await axiosSecure.get("/admin/overview")
            return res.data
        }
    })

    if (role === "admin") {
        if (overviewLoading) {
            return (
                <div className="space-y-8 animate-pulse">
                    <div className="space-y-2">
                        <div className="h-7 bg-slate-200 rounded-lg w-48"></div>
                        <div className="h-4 bg-slate-200 rounded w-72"></div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        {[1, 2, 3, 4, 5].map(n => (
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
                badge: "All Time"
            },
            {
                title: "Confirmed",
                value: overview.confirmedCount || 0,
                icon: <CheckCircle2 size={22} className="text-emerald-600" />,
                bg: "bg-emerald-50",
                border: "border-emerald-100",
                badge: "Active Guests"
            },
            {
                title: "Pending Action",
                value: overview.pendingCount || 0,
                icon: <Clock size={22} className="text-amber-600" />,
                bg: "bg-amber-50",
                border: "border-amber-100",
                badge: "Needs Review"
            },
            {
                title: "Cancelled",
                value: overview.cancelledCount || 0,
                icon: <XCircle size={22} className="text-rose-600" />,
                bg: "bg-rose-50",
                border: "border-rose-100",
                badge: "Refunded/Void"
            },
            {
                title: "Confirmed Revenue",
                value: `৳${(overview.totalRevenue || 0).toLocaleString()}`,
                icon: <DollarSign size={22} className="text-indigo-600" />,
                bg: "bg-indigo-50",
                border: "border-indigo-100",
                badge: "Earnings"
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

        return (
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight">
                            Admin Overview
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Live reservation metrics and occupancy statistics for Miami Beach Resort.
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 shadow-xs">
                        <TrendingUp size={14} className="text-teal-600" /> Real-time Analytics
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                    {stats.map((stat, i) => (
                        <div 
                            key={i} 
                            className={`p-5 rounded-2xl bg-white border ${stat.border} shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-3`}
                        >
                            <div className="flex items-center justify-between">
                                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                                    {stat.icon}
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{stat.badge}</span>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500">{stat.title}</p>
                                <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5 tracking-tight">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Visual Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Bookings per day */}
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
                                <h3 className="font-bold text-slate-900 text-base font-serif">Bookings by Room</h3>
                                <p className="text-xs text-slate-500">Distribution across room suites</p>
                            </div>
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
            </div>
        )
    }

    // Guest User Dashboard
    const confirmed = userBookings.filter(b => b.status === "confirmed").length
    const pending = userBookings.filter(b => b.status === "pending").length
    const cancelled = userBookings.filter(b => b.status === "cancelled").length

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
