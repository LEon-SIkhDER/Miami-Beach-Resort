import React, { useContext, useState } from 'react'
import { Link } from 'react-router'
import { AuthContext } from '../../../Context/AuthContext'
import useRole from '../../../hooks/useRole'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { showConfirmAlert } from '../../../utils/customSwal'
import {
    CheckCircle2,
    XCircle,
    Calendar,
    Users as UsersIcon,
    Phone,
    Trash2,
    Search,
    Filter,
    BedDouble,
    Clock,
    FileText,
    Eye
} from 'lucide-react'

const Bookings = () => {
    const { user } = useContext(AuthContext)
    const { role } = useRole()
    const axiosSecure = useAxiosSecure()
    const queryClient = useQueryClient()
    const [statusFilter, setStatusFilter] = useState("")
    const [search, setSearch] = useState("")

    const isAdmin = role === "admin"

    const { data: bookings = [], isLoading } = useQuery({
        queryKey: ["bookings", user?.email, role, statusFilter],
        enabled: !!user && role !== undefined,
        queryFn: async () => {
            const params = new URLSearchParams()
            if (!isAdmin) params.set("email", user.email)
            if (statusFilter) params.set("status", statusFilter)
            const res = await axiosSecure.get(`/bookings?${params.toString()}`)
            return res.data
        }
    })

    const statusMutation = useMutation({
        mutationFn: async ({ id, status }) => {
            const res = await axiosSecure.patch(`/booking/${id}`, { status })
            return res.data
        },
        onMutate: ({ status }) => {
            const label = status === "confirmed" ? "Confirming booking..." : status === "cancelled" ? "Cancelling booking..." : "Updating status..."
            return { toastId: toast.loading(label) }
        },
        onSuccess: async (_, __, context) => {
            await queryClient.invalidateQueries({ queryKey: ["bookings"] })
            await queryClient.invalidateQueries({ queryKey: ["user-bookings-summary"] })
            await queryClient.invalidateQueries({ queryKey: ["admin-overview"] })
            await queryClient.invalidateQueries({ queryKey: ["reserved-dates"] })
            toast.dismiss(context?.toastId)
            const status = _.status || "updated"
            if (status === "confirmed") toast.success("Booking confirmed successfully!")
            else if (status === "cancelled") toast.success("🚫 Booking cancelled.")
            else toast.success("Reservation status updated!")
        },
        onError: (_, __, context) => {
            toast.dismiss(context?.toastId)
            toast.error("Failed to update reservation status.")
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const res = await axiosSecure.delete(`/booking/${id}`)
            return res.data
        },
        onMutate: () => ({ toastId: toast.loading("Deleting reservation...") }),
        onSuccess: async (_, __, context) => {
            await queryClient.invalidateQueries({ queryKey: ["bookings"] })
            await queryClient.invalidateQueries({ queryKey: ["admin-overview"] })
            await queryClient.invalidateQueries({ queryKey: ["reserved-dates"] })
            toast.dismiss(context?.toastId)
            toast.success("🗑️ Reservation deleted.")
        },
        onError: (_, __, context) => {
            toast.dismiss(context?.toastId)
            toast.error("Failed to delete reservation.")
        }
    })

    const handleCancel = (id, bookingId) => {
        showConfirmAlert(
            `Cancel Booking ${bookingId}?`,
            "A 35% cancellation fee applies as per Miami Beach Resort policy. The dates will be freed for other guests.",
            "Yes, cancel reservation",
            true
        ).then(result => {
            if (result.isConfirmed) statusMutation.mutate({ id, status: "cancelled" })
        })
    }

    const handleConfirm = (id, bookingId) => {
        showConfirmAlert(
            `Confirm Booking ${bookingId}?`,
            "This will mark the reservation as officially confirmed.",
            "Yes, confirm booking"
        ).then(result => {
            if (result.isConfirmed) statusMutation.mutate({ id, status: "confirmed" })
        })
    }

    const handleDelete = (id, bookingId) => {
        showConfirmAlert(
            `Delete Record ${bookingId}?`,
            "This will permanently delete this booking from the system.",
            "Yes, delete record",
            true
        ).then(result => {
            if (result.isConfirmed) deleteMutation.mutate(id)
        })
    }

    const statusBadge = (status) => {
        switch (status) {
            case "confirmed":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={12} /> Confirmed
                    </span>
                )
            case "cancelled":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle size={12} /> Cancelled
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock size={12} /> Pending
                    </span>
                )
        }
    }

    const filteredBookings = bookings.filter(b => {
        if (!search) return true
        const s = search.toLowerCase()
        return b.name?.toLowerCase().includes(s) ||
            b.mobile?.toLowerCase().includes(s) ||
            b.bookingId?.toLowerCase().includes(s) ||
            b.roomName?.toLowerCase().includes(s) ||
            b.roomCategory?.toLowerCase().includes(s)
    })

    return (
        <div className="space-y-6">
            {/* Header and Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight">
                        {isAdmin ? "All Guest Bookings" : "My Reservations"}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        {isAdmin ? "Manage, confirm, and review all customer reservations." : "View stay history and booking confirmations."}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Search Input */}
                    <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name, ID..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="input input-sm input-bordered pl-9 rounded-xl w-48 sm:w-56 bg-white"
                        />
                    </div>

                    {/* Status Select */}
                    <select
                        className="select select-sm select-bordered rounded-xl bg-white text-xs font-semibold"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        <option value="request">Request Booking</option>
                        <option value="waiting">Payment Waiting</option>
                        <option value="confirm">Booking Confirm</option>
                        <option value="checked_in">Checked-In</option>
                        <option value="checked_out">Checked-Out</option>
                        <option value="out_of_order">Out Of Order</option>
                    </select>
                </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table table-zebra w-full whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                <th className="whitespace-nowrap min-w-[140px]">Booking ID</th>
                                <th className="whitespace-nowrap">Guest Details</th>
                                <th className="whitespace-nowrap">Room / Suite</th>
                                <th className="whitespace-nowrap">Stay Dates</th>
                                <th className="whitespace-nowrap">Guests</th>
                                <th className="whitespace-nowrap">Total Bill</th>
                                <th className="whitespace-nowrap">Status</th>
                                <th className="text-right whitespace-nowrap min-w-[120px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {isLoading ? (
                                [1, 2, 3, 4].map(n => (
                                    <tr key={n} className="animate-pulse">
                                        <td><div className="h-5 bg-slate-200 rounded w-24"></div></td>
                                        <td>
                                            <div className="space-y-1.5">
                                                <div className="h-4 bg-slate-200 rounded w-28"></div>
                                                <div className="h-3 bg-slate-200 rounded w-20"></div>
                                            </div>
                                        </td>
                                        <td><div className="h-4 bg-slate-200 rounded w-36"></div></td>
                                        <td><div className="h-4 bg-slate-200 rounded w-32"></div></td>
                                        <td><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                                        <td><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                                        <td><div className="h-5 bg-slate-200 rounded-full w-20"></div></td>
                                        <td className="text-right"><div className="h-7 bg-slate-200 rounded-lg w-20 ml-auto"></div></td>
                                    </tr>
                                ))
                            ) : filteredBookings.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-slate-400">
                                        <Calendar size={36} className="mx-auto mb-2 opacity-50" />
                                        No reservations found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredBookings.map(b => (
                                    <tr key={b._id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="whitespace-nowrap">
                                            <Link
                                                to={`/dashboard/bookings/${b._id}`}
                                                className="font-mono text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 hover:text-teal-900 px-2.5 py-1 rounded-lg border border-teal-200/60 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                                                title="View Booking Details"
                                            >
                                                <span>{b.bookingId}</span>
                                            </Link>
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <p className="font-bold text-slate-900">{b.name}</p>
                                            <p className="text-xs text-slate-500 font-medium">{b.mobile}</p>
                                        </td>
                                        <td>
                                            <span className="text-xs font-semibold text-slate-700 line-clamp-1 max-w-[200px]" title={b.roomName || b.roomCategory}>
                                                {b.roomName || b.roomCategory}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <div className="text-xs space-y-0.5">
                                                <p className="font-medium text-slate-800">{b.checkIn} <span className="text-slate-400">→</span> {b.checkOut}</p>
                                            </div>
                                        </td>
                                        <td className="text-xs text-slate-600 whitespace-nowrap">
                                            {b.adults} Adults {b.babies > 0 ? `• ${b.babies} Baby` : ""}
                                        </td>
                                        <td className="font-bold text-slate-900 whitespace-nowrap">
                                            ৳{Number(b.totalAmount || 0).toLocaleString()}
                                        </td>
                                        <td className="whitespace-nowrap">
                                            {statusBadge(b.status)}
                                        </td>
                                        <td className="text-right whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1">
                                                <Link
                                                    to={`/dashboard/bookings/${b._id}`}
                                                    className="btn btn-ghost btn-xs btn-square text-teal-700 hover:bg-teal-50"
                                                    title="View Full Booking Details"
                                                >
                                                    <Eye size={16} />
                                                </Link>
                                                {isAdmin && b.status === "pending" && (
                                                    <button
                                                        onClick={() => handleConfirm(b._id, b.bookingId)}
                                                        className="btn btn-ghost btn-xs btn-square text-emerald-600 hover:bg-emerald-50"
                                                        title="Confirm Reservation"
                                                    >
                                                        <CheckCircle2 size={16} />
                                                    </button>
                                                )}
                                                {b.status === "pending" && (
                                                    <button
                                                        onClick={() => handleCancel(b._id, b.bookingId)}
                                                        className="btn btn-ghost btn-xs btn-square text-rose-500 hover:bg-rose-50"
                                                        title="Cancel Reservation"
                                                    >
                                                        <XCircle size={16} />
                                                    </button>
                                                )}
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => handleDelete(b._id, b.bookingId)}
                                                        className="btn btn-ghost btn-xs btn-square text-slate-400 hover:text-rose-600"
                                                        title="Delete Record"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-4">
                {isLoading ? (
                    [1, 2, 3].map(n => (
                        <div key={n} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs animate-pulse space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1.5">
                                    <div className="h-4 bg-slate-200 rounded w-24"></div>
                                    <div className="h-5 bg-slate-200 rounded w-36"></div>
                                </div>
                                <div className="h-5 bg-slate-200 rounded-full w-20"></div>
                            </div>
                            <div className="bg-slate-50 p-3.5 rounded-xl space-y-2">
                                <div className="h-3.5 bg-slate-200 rounded w-28"></div>
                                <div className="h-3.5 bg-slate-200 rounded w-48"></div>
                                <div className="h-3.5 bg-slate-200 rounded w-40"></div>
                                <div className="h-4 bg-slate-200 rounded w-32 pt-1"></div>
                            </div>
                            <div className="h-9 bg-slate-200 rounded-xl w-full"></div>
                        </div>
                    ))
                ) : filteredBookings.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl text-center text-slate-400 border border-slate-200">
                        No bookings found.
                    </div>
                ) : (
                    filteredBookings.map(b => (
                        <div key={b._id} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <Link
                                        to={`/dashboard/bookings/${b._id}`}
                                        className="font-mono text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded-md border border-teal-200/50 inline-block"
                                    >
                                        {b.bookingId}
                                    </Link>
                                    <h3 className="font-bold text-slate-900 text-sm sm:text-base mt-1.5 truncate">{b.name}</h3>
                                </div>
                                <div className="shrink-0">
                                    {statusBadge(b.status)}
                                </div>
                            </div>

                            <div className="text-xs text-slate-600 space-y-1.5 bg-slate-50 p-3 sm:p-3.5 rounded-xl">
                                <p className="flex items-center gap-2"><Phone size={13} className="text-teal-600 shrink-0" /> {b.mobile}</p>
                                <p className="flex items-center gap-2"><BedDouble size={13} className="text-teal-600 shrink-0" /> {b.roomName || b.roomCategory}</p>
                                <p className="flex items-center gap-2"><Calendar size={13} className="text-teal-600 shrink-0" /> {b.checkIn} to {b.checkOut}</p>
                                <p className="flex items-center gap-2"><UsersIcon size={13} className="text-teal-600 shrink-0" /> {b.adults} Adults {b.babies > 0 ? `• ${b.babies} Baby` : ""}</p>
                                <p className="pt-1 font-bold text-teal-900">Total: ৳{Number(b.totalAmount || 0).toLocaleString()}</p>
                                {b.specialNeeds && <p className="text-[11px] text-slate-500 italic">Notes: {b.specialNeeds}</p>}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                <Link
                                    to={`/dashboard/bookings/${b._id}`}
                                    className="btn btn-sm btn-outline border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl flex-1 gap-1"
                                >
                                    <Eye size={15} /> View Details
                                </Link>
                                {isAdmin && b.status === "pending" && (
                                    <button
                                        onClick={() => handleConfirm(b._id, b.bookingId)}
                                        className="btn btn-sm btn-primary rounded-xl flex-1 text-white gap-1"
                                    >
                                        <CheckCircle2 size={15} /> Confirm
                                    </button>
                                )}
                                {b.status === "pending" && (
                                    <button
                                        onClick={() => handleCancel(b._id, b.bookingId)}
                                        className="btn btn-sm btn-outline border-rose-300 text-rose-600 hover:bg-rose-50 rounded-xl flex-1 gap-1"
                                    >
                                        <XCircle size={15} /> Cancel
                                    </button>
                                )}
                                {isAdmin && (
                                    <button
                                        onClick={() => handleDelete(b._id, b.bookingId)}
                                        className="btn btn-sm btn-ghost text-slate-400 hover:text-rose-600"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default Bookings
