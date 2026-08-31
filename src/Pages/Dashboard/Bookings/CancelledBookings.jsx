import React, { useState, useContext } from 'react'
import { Link } from 'react-router'
import { AuthContext } from '../../../Context/AuthContext'
import useRole from '../../../hooks/useRole'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
import { useQuery } from '@tanstack/react-query'
import {
    XCircle,
    Search,
    Calendar,
    Phone,
    User,
    BedDouble,
    Eye,
    FileText,
    Shield,
    Clock,
    DollarSign,
    UserCheck,
    Briefcase,
    Building2
} from 'lucide-react'
import { getBookingDateSummary, getBookingRooms, getBookingTotal, getRoomName } from '../../../utils/bookingUtils'

const CancelledBookings = () => {
    const { user } = useContext(AuthContext)
    const { role } = useRole()
    const axiosSecure = useAxiosSecure()
    const [search, setSearch] = useState("")

    const { data: bookings = [], isLoading } = useQuery({
        queryKey: ["cancelled-bookings", user?.email, role],
        enabled: !!user && role !== undefined,
        queryFn: async () => {
            const res = await axiosSecure.get(`/bookings?status=cancel`)
            return res.data
        }
    })

    const filteredBookings = bookings.filter(b => {
        if (!search) return true
        const s = search.toLowerCase()
        const roomText = getBookingRooms(b).map(room => getRoomName(room)).join(" ").toLowerCase()
        const cancelledByName = b.cancelledBy?.name?.toLowerCase() || ""
        const cancelledByEmail = b.cancelledBy?.email?.toLowerCase() || ""
        const reason = b.cancelReason?.toLowerCase() || ""
        return (
            b.name?.toLowerCase().includes(s) ||
            b.mobile?.toLowerCase().includes(s) ||
            b.bookingId?.toLowerCase().includes(s) ||
            roomText.includes(s) ||
            cancelledByName.includes(s) ||
            cancelledByEmail.includes(s) ||
            reason.includes(s)
        )
    })

    const getActorRoleBadge = (actorRole) => {
        switch (actorRole) {
            case "admin":
                return <span className="badge badge-xs bg-amber-100 text-amber-800 border-none font-bold">Admin</span>
            case "manager":
                return <span className="badge badge-xs bg-purple-100 text-purple-800 border-none font-bold">Manager</span>
            case "agent":
                return <span className="badge badge-xs bg-teal-100 text-teal-800 border-none font-bold">Agent</span>
            case "b2b":
                return <span className="badge badge-xs bg-blue-100 text-blue-800 border-none font-bold">B2B</span>
            default:
                return <span className="badge badge-xs bg-slate-200 text-slate-700 border-none">Guest / User</span>
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                            <XCircle size={22} />
                        </span>
                        Cancelled Bookings
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Review all cancelled reservations, cancellation reasons, and who cancelled them.
                    </p>
                </div>

                <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by ID, name, reason..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="input input-sm input-bordered pl-9 rounded-xl w-full sm:w-64 bg-white"
                    />
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table table-zebra w-full whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                <th className="whitespace-nowrap min-w-[130px]">Booking ID</th>
                                <th className="whitespace-nowrap">Guest Details</th>
                                <th className="whitespace-nowrap">Room & Stay</th>
                                <th className="whitespace-nowrap">Total Bill</th>
                                <th className="whitespace-nowrap">Cancelled Date</th>
                                <th className="whitespace-nowrap">Cancelled By</th>
                                <th className="whitespace-nowrap">Cancellation Reason</th>
                                <th className="text-center whitespace-nowrap">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {isLoading ? (
                                [1, 2, 3, 4].map(n => (
                                    <tr key={n} className="animate-pulse">
                                        <td><div className="h-5 bg-slate-200 w-24"></div></td>
                                        <td><div className="h-4 bg-slate-200 w-28"></div></td>
                                        <td><div className="h-4 bg-slate-200 w-32"></div></td>
                                        <td><div className="h-4 bg-slate-200 w-16"></div></td>
                                        <td><div className="h-4 bg-slate-200 w-24"></div></td>
                                        <td><div className="h-4 bg-slate-200 w-28"></div></td>
                                        <td><div className="h-4 bg-slate-200 w-36"></div></td>
                                        <td><div className="h-7 bg-slate-200 w-16 mx-auto"></div></td>
                                    </tr>
                                ))
                            ) : filteredBookings.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-slate-400">
                                        <XCircle size={36} className="mx-auto mb-2 opacity-50 text-slate-300" />
                                        No cancelled bookings found.
                                    </td>
                                </tr>
                            ) : (
                                filteredBookings.map(b => {
                                    const bookingRooms = getBookingRooms(b)
                                    const roomTitle = bookingRooms.map(room => getRoomName(room)).join(", ") || b.roomName || b.roomCategory
                                    const dateSummary = getBookingDateSummary(b) || `${b.checkIn || ""} to ${b.checkOut || ""}`
                                    const totalAmount = getBookingTotal(b)
                                    const canceller = b.cancelledBy || {}

                                    return (
                                        <tr key={b._id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="whitespace-nowrap">
                                                <Link
                                                    to={`/dashboard/bookings/${b._id}`}
                                                    className="font-mono text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200/60 inline-flex items-center gap-1.5 whitespace-nowrap"
                                                >
                                                    <span>{b.bookingId}</span>
                                                </Link>
                                            </td>
                                            <td className="whitespace-nowrap">
                                                <p className="font-bold text-slate-900">{b.name}</p>
                                                <p className="text-xs text-slate-500 font-medium">{b.mobile}</p>
                                            </td>
                                            <td>
                                                <p className="text-xs font-semibold text-slate-800 max-w-[200px] truncate">{roomTitle}</p>
                                                <p className="text-[11px] text-slate-400">{dateSummary}</p>
                                            </td>
                                            <td className="font-bold text-slate-900 whitespace-nowrap">
                                                ৳{Number(totalAmount || 0).toLocaleString()}
                                            </td>
                                            <td className="text-xs text-slate-600 whitespace-nowrap">
                                                {b.cancelledAt ? new Date(b.cancelledAt).toLocaleString() : (b.updatedAt ? new Date(b.updatedAt).toLocaleDateString() : "—")}
                                            </td>
                                            <td className="whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <p className="font-semibold text-slate-900 text-xs">
                                                        {canceller.name || canceller.email || "System"}
                                                    </p>
                                                    {canceller.role && getActorRoleBadge(canceller.role)}
                                                </div>
                                                {canceller.email && canceller.email !== canceller.name && (
                                                    <p className="text-[11px] text-slate-400">{canceller.email}</p>
                                                )}
                                            </td>
                                            <td>
                                                <p className="text-xs text-slate-700 max-w-[240px] truncate" title={b.cancelReason || "No reason provided"}>
                                                    {b.cancelReason || <span className="text-slate-400 italic">No reason provided</span>}
                                                </p>
                                            </td>
                                            <td className="text-center whitespace-nowrap">
                                                <Link
                                                    to={`/dashboard/bookings/${b._id}`}
                                                    className="btn btn-xs btn-outline border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg gap-1"
                                                >
                                                    <Eye size={13} /> View
                                                </Link>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Cards View */}
            <div className="lg:hidden space-y-3">
                {isLoading ? (
                    [1, 2, 3].map(n => (
                        <div key={n} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs animate-pulse space-y-3">
                            <div className="h-4 bg-slate-200 rounded w-24"></div>
                            <div className="h-16 bg-slate-100 rounded-xl"></div>
                        </div>
                    ))
                ) : filteredBookings.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl text-center text-slate-400 border border-slate-200">
                        <XCircle size={36} className="mx-auto mb-2 opacity-50" />
                        No cancelled bookings found.
                    </div>
                ) : (
                    filteredBookings.map(b => {
                        const bookingRooms = getBookingRooms(b)
                        const roomTitle = bookingRooms.map(room => getRoomName(room)).join(", ") || b.roomName || b.roomCategory
                        const dateSummary = getBookingDateSummary(b) || `${b.checkIn || ""} to ${b.checkOut || ""}`
                        const totalAmount = getBookingTotal(b)
                        const canceller = b.cancelledBy || {}

                        return (
                            <div key={b._id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <Link
                                            to={`/dashboard/bookings/${b._id}`}
                                            className="font-mono text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/50 inline-block"
                                        >
                                            {b.bookingId}
                                        </Link>
                                        <h3 className="font-bold text-slate-900 text-sm mt-1 truncate">{b.name}</h3>
                                        <p className="text-xs text-slate-500">{b.mobile}</p>
                                    </div>
                                    <span className="badge badge-sm bg-rose-50 text-rose-700 border-rose-200 font-bold">
                                        Cancelled
                                    </span>
                                </div>

                                <div className="text-xs text-slate-600 space-y-1.5 bg-slate-50 p-3 rounded-xl">
                                    <p className="flex items-center gap-1.5"><BedDouble size={13} className="text-teal-600 shrink-0" /> {roomTitle}</p>
                                    <p className="flex items-center gap-1.5"><Calendar size={13} className="text-teal-600 shrink-0" /> {dateSummary}</p>
                                    <p className="font-bold text-slate-900 pt-1">Total Bill: ৳{Number(totalAmount || 0).toLocaleString()}</p>
                                    
                                    <div className="pt-2 border-t border-slate-200/60 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400">Cancelled By:</span>
                                            <span className="font-semibold text-slate-800 flex items-center gap-1">
                                                {canceller.name || canceller.email || "System"} {canceller.role && getActorRoleBadge(canceller.role)}
                                            </span>
                                        </div>
                                        {b.cancelledAt && (
                                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                                                <span>Cancelled On:</span>
                                                <span>{new Date(b.cancelledAt).toLocaleString()}</span>
                                            </div>
                                        )}
                                        {b.cancelReason && (
                                            <div className="pt-1 text-[11px] text-rose-800 bg-rose-50/80 p-2 rounded-lg border border-rose-100">
                                                <strong>Reason:</strong> {b.cancelReason}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-end pt-1">
                                    <Link
                                        to={`/dashboard/bookings/${b._id}`}
                                        className="btn btn-sm btn-outline border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl gap-1 w-full justify-center"
                                    >
                                        <Eye size={14} /> View Details
                                    </Link>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

export default CancelledBookings
