import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
import {
    X,
    User,
    CalendarCheck,
    CheckCircle2,
    Clock,
    XCircle,
    DollarSign,
    TrendingUp,
    Phone,
    Mail,
    Calendar,
    BedDouble,
    Eye,
    Shield,
    Briefcase,
    Building2,
    UserCheck,
    History,
    Receipt,
    Search
} from 'lucide-react'
import { 
    formatDate, 
    formatDateTime, 
    getBookingDateSummary, 
    getBookingRooms, 
    getBookingTotal, 
    getBookingPaidAmount,
    getBookingDueAmount,
    getRoomName 
} from '../../../utils/bookingUtils'

const UserWorkflowModal = ({ user, isOpen, onClose }) => {
    const axiosSecure = useAxiosSecure()
    const [activeTab, setActiveTab] = useState('bookings') // 'bookings' or 'activity'
    const [search, setSearch] = useState('')

    const userId = user?._id || user?.uid || user?.email

    const { data: workflowData, isLoading } = useQuery({
        queryKey: ["user-workflow-details", userId],
        queryFn: async () => {
            const res = await axiosSecure.get(`/admin/user-workflow/${encodeURIComponent(userId)}`)
            return res.data
        },
        enabled: isOpen && !!userId
    })

    if (!isOpen || !user) return null

    const targetUser = workflowData?.user || user
    const metrics = workflowData?.metrics || user.stats || {}
    const bookings = workflowData?.bookings || []
    const activities = workflowData?.activities || []

    const filteredBookings = bookings.filter(b => {
        if (!search) return true
        const s = search.toLowerCase()
        return b.name?.toLowerCase().includes(s) ||
            b.mobile?.toLowerCase().includes(s) ||
            b.bookingId?.toLowerCase().includes(s)
    })

    const getRoleBadge = (role) => {
        switch (role) {
            case "admin":
                return <span className="badge badge-sm bg-amber-100 text-amber-900 border-amber-300 font-bold gap-1"><Shield size={12} /> Admin</span>
            case "manager":
                return <span className="badge badge-sm bg-purple-100 text-purple-900 border-purple-300 font-bold gap-1"><Briefcase size={12} /> Manager</span>
            case "agent":
                return <span className="badge badge-sm bg-teal-100 text-teal-900 border-teal-300 font-bold gap-1"><UserCheck size={12} /> Agent</span>
            case "b2b":
                return <span className="badge badge-sm bg-blue-100 text-blue-900 border-blue-300 font-bold gap-1"><Building2 size={12} /> B2B Partner</span>
            default:
                return <span className="badge badge-sm bg-slate-100 text-slate-700 border-slate-300 font-semibold gap-1"><User size={12} /> Guest / User</span>
        }
    }

    const getStatusBadge = (status) => {
        switch (status) {
            case "booking_confirmed":
            case "confirmed":
                return <span className="badge badge-xs bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">Confirmed</span>
            case "payment_waiting":
                return <span className="badge badge-xs bg-sky-50 text-sky-700 border-sky-200 font-bold">Payment Waiting</span>
            case "checked_id":
                return <span className="badge badge-xs bg-indigo-50 text-indigo-700 border-indigo-200 font-bold">Checked In</span>
            case "checked_out":
                return <span className="badge badge-xs bg-slate-50 text-slate-700 border-slate-200 font-bold">Checked Out</span>
            case "cancel":
            case "cancelled":
                return <span className="badge badge-xs bg-rose-50 text-rose-700 border-rose-200 font-bold">Cancelled</span>
            default:
                return <span className="badge badge-xs bg-amber-50 text-amber-700 border-amber-200 font-bold">Request</span>
        }
    }

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-teal-600 text-white font-black text-base flex items-center justify-center shadow-xs">
                            {targetUser.name ? targetUser.name.charAt(0).toUpperCase() : targetUser.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                                    {targetUser.name || "User Workflow"}
                                </h3>
                                {getRoleBadge(targetUser.role)}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                <span className="flex items-center gap-1"><Mail size={12} /> {targetUser.email}</span>
                                {targetUser.phone && <span className="flex items-center gap-1">• <Phone size={12} /> {targetUser.phone}</span>}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="btn btn-sm btn-ghost btn-circle text-slate-400 hover:text-slate-700"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    {/* Summary Metric Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-100 space-y-1">
                            <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider">Total Bookings</span>
                            <p className="text-xl font-black text-teal-900">{metrics.totalBookings || 0}</p>
                            <p className="text-[10px] text-teal-600 font-medium">{metrics.confirmedBookings || 0} Confirmed</p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 space-y-1">
                            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Total Sales</span>
                            <p className="text-xl font-black text-emerald-900">৳{(metrics.totalSales || 0).toLocaleString()}</p>
                            <p className="text-[10px] text-emerald-600 font-medium">Revenue Volume</p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-100 space-y-1">
                            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Total Paid</span>
                            <p className="text-xl font-black text-blue-900">৳{(metrics.totalPaid || 0).toLocaleString()}</p>
                            <p className="text-[10px] text-blue-600 font-medium">Collected</p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-orange-50 border border-orange-100 space-y-1">
                            <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">Pending Due</span>
                            <p className="text-xl font-black text-orange-900">৳{(metrics.totalDue || 0).toLocaleString()}</p>
                            <p className="text-[10px] text-orange-600 font-medium">Remaining Due</p>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 col-span-2 sm:col-span-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status Flow</span>
                            <p className="text-xs font-bold text-slate-700 pt-1">
                                {metrics.pendingBookings || 0} Req / {metrics.cancelledBookings || 0} Can
                            </p>
                            <p className="text-[10px] text-slate-400">Activity status</p>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setActiveTab('bookings')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                                    activeTab === 'bookings'
                                        ? 'bg-teal-600 text-white shadow-xs'
                                        : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                Bookings Created / Referred ({bookings.length})
                            </button>
                            {activities.length > 0 && (
                                <button
                                    onClick={() => setActiveTab('activity')}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
                                        activeTab === 'activity'
                                            ? 'bg-teal-600 text-white shadow-xs'
                                            : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                    Audit Activity Logs ({activities.length})
                                </button>
                            )}
                        </div>

                        {activeTab === 'bookings' && (
                            <div className="relative">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search user bookings..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="input input-xs input-bordered pl-8 rounded-lg w-44 bg-white"
                                />
                            </div>
                        )}
                    </div>

                    {/* Tab 1: Bookings List */}
                    {activeTab === 'bookings' && (
                        <div>
                            {isLoading ? (
                                <div className="py-12 text-center text-slate-400">
                                    <span className="loading loading-spinner loading-md text-teal-600 mb-2"></span>
                                    <p className="text-xs">Loading user workflow...</p>
                                </div>
                            ) : filteredBookings.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                                    <CalendarCheck size={36} className="mx-auto mb-2 opacity-50 text-slate-300" />
                                    <p className="text-sm font-semibold text-slate-600">No bookings recorded for this user</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Reservations booked or referenced by this account will appear here.</p>
                                </div>
                            ) : (
                                <div className="border border-slate-200 shadow-xs">
                                    <table className="table table-sm w-full text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                                                <th>Booking ID</th>
                                                <th>Guest Name</th>
                                                <th>Room / Category</th>
                                                <th>Dates</th>
                                                <th>Total</th>
                                                <th>Paid / Due</th>
                                                <th>Status</th>
                                                <th className="text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {filteredBookings.map(b => {
                                                const bRooms = getBookingRooms(b)
                                                const dateSummary = getBookingDateSummary(b) || `${b.checkIn || ""} → ${b.checkOut || ""}`
                                                const bTotal = getBookingTotal(b)
                                                const bPaid = getBookingPaidAmount(b)
                                                const bDue = getBookingDueAmount(b)

                                                return (
                                                    <tr key={b._id} className="hover:bg-slate-50/80">
                                                        <td className="font-mono font-bold text-teal-700">
                                                            {b.bookingId}
                                                        </td>
                                                        <td>
                                                            <p className="font-bold text-slate-900">{b.name}</p>
                                                            <p className="text-[11px] text-slate-400">{b.mobile}</p>
                                                        </td>
                                                        <td className="max-w-[150px] truncate" title={bRooms.map(r => getRoomName(r)).join(", ")}>
                                                            {bRooms.length > 1 ? `${bRooms.length} Rooms` : getRoomName(bRooms[0]) || "Room"}
                                                        </td>
                                                        <td className="whitespace-nowrap text-slate-600">
                                                            {dateSummary}
                                                        </td>
                                                        <td className="font-bold text-slate-900 whitespace-nowrap">
                                                            ৳{Number(bTotal).toLocaleString()}
                                                        </td>
                                                        <td className="whitespace-nowrap">
                                                            <span className="text-emerald-700 font-semibold">৳{bPaid.toLocaleString()}</span>
                                                            {bDue > 0 && <span className="text-orange-600 text-[10px] block font-bold">Due: ৳{bDue.toLocaleString()}</span>}
                                                        </td>
                                                        <td>
                                                            {getStatusBadge(b.status)}
                                                        </td>
                                                        <td className="text-center">
                                                            <Link
                                                                to={`/dashboard/bookings/${b._id}`}
                                                                onClick={onClose}
                                                                className="btn btn-xs btn-ghost text-teal-700 hover:bg-teal-50 gap-1 rounded-lg"
                                                                title="Open Full Details"
                                                            >
                                                                <Eye size={13} /> View
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 2: Audit Activities */}
                    {activeTab === 'activity' && (
                        <div className="space-y-3">
                            <p className="text-xs text-slate-500">Actions and updates performed by this staff / agent account:</p>
                            <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                                {activities.map((act, i) => (
                                    <div key={i} className="p-3.5 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between text-xs gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                                                {act.type === "payment_collection" ? <Receipt size={16} /> : <History size={16} />}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">
                                                    {act.type === "payment_collection"
                                                        ? `Collected payment of ৳${Number(act.amount || 0).toLocaleString()} (${act.method})`
                                                        : `Updated status to "${act.status}"`}
                                                </p>
                                                <p className="text-[11px] text-slate-500">
                                                    Booking: <Link to={`/dashboard/bookings/${act.bookingDbId}`} onClick={onClose} className="font-mono text-teal-700 font-bold hover:underline">{act.bookingId}</Link> • Guest: {act.guestName}
                                                </p>
                                                {act.note && <p className="text-[11px] text-slate-600 bg-white p-1 rounded-md border border-slate-100 mt-1">{act.note}</p>}
                                            </div>
                                        </div>
                                        <span className="text-[11px] text-slate-400 shrink-0">
                                            {act.time ? formatDateTime(act.time) : "—"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
                    <span className="text-xs text-slate-400">Account ID: {userId}</span>
                    <button
                        onClick={onClose}
                        className="btn btn-sm btn-primary rounded-xl text-white font-bold"
                    >
                        Close Workflow
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default UserWorkflowModal
