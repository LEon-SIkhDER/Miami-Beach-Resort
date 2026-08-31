import React, { useContext, useState } from 'react'
import { Link } from 'react-router'
import { AuthContext } from '../../../Context/AuthContext'
import useRole from '../../../hooks/useRole'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { showConfirmAlert } from '../../../utils/customSwal'
import {
    Calendar,
    Users as UsersIcon,
    Phone,
    Trash2,
    Search,
    BedDouble,
    Clock,
    Eye,
    MapPin,
    EllipsisVertical,
    CreditCard,
    CheckCircle2,
    LogIn,
    LogOut,
    XCircle,
    Pencil
} from 'lucide-react'
import { getBookingDateSummary, getBookingGuestTotals, getBookingRooms, getBookingTotal, getRoomName } from '../../../utils/bookingUtils'
import ConfirmBookingModal from './ConfirmBookingModal'
import EditBookingModal from './EditBookingModal'
import CancelBookingModal from './CancelBookingModal'

const BOOKING_STATUS = {
    REQUEST_BOOKING: "request_booking",
    PAYMENT_WAITING: "payment_waiting",
    BOOKING_CONFIRMED: "booking_confirmed",
    CHECKED_IN: "checked_id",
    CHECKED_OUT: "checked_out",
    CANCEL: "cancel"
}

const STATUS_OPTIONS = [
    { value: BOOKING_STATUS.REQUEST_BOOKING, label: "Request Booking" },
    { value: BOOKING_STATUS.PAYMENT_WAITING, label: "Payment Waiting" },
    { value: BOOKING_STATUS.BOOKING_CONFIRMED, label: "Booking Confirmed" },
    { value: BOOKING_STATUS.CHECKED_IN, label: "Checked In" },
    { value: BOOKING_STATUS.CHECKED_OUT, label: "Checked Out" },
    { value: BOOKING_STATUS.CANCEL, label: "Cancel" }
]

const statusText = (status) => {
    return STATUS_OPTIONS.find(option => option.value === status)?.label || status || "Unknown"
}

const Bookings = () => {
    const { user: currentUser } = useContext(AuthContext)
    const { role } = useRole()
    const axiosSecure = useAxiosSecure()
    const queryClient = useQueryClient()
    const [statusFilter, setStatusFilter] = useState("")
    const [search, setSearch] = useState("")

    // Modals state
    const [confirmModalData, setConfirmModalData] = useState(null) // { booking, targetStatus }
    const [editModalBooking, setEditModalBooking] = useState(null)
    const [cancelModalBooking, setCancelModalBooking] = useState(null)

    const isAdmin = role === "admin"

    const { data: bookings = [], isLoading } = useQuery({
        queryKey: ["bookings", currentUser?.email, role, statusFilter],
        enabled: !!currentUser && role !== undefined,
        queryFn: async () => {
            const params = new URLSearchParams()
            if (!isAdmin) params.set("email", currentUser.email)
            if (statusFilter) params.set("status", statusFilter)
            const res = await axiosSecure.get(`/bookings?${params.toString()}`)
            return res.data
        }
    })

    const statusMutation = useMutation({
        mutationFn: async ({ id, status }) => {
            const res = await axiosSecure.patch(`/booking/${id}`, { 
                status, 
                requestedByRole: role || "user",
                changedBy: {
                    name: currentUser?.displayName || "Admin / Staff",
                    email: currentUser?.email || "",
                    role: role || "admin"
                }
            })
            return res.data
        },
        onMutate: ({ status }) => {
            return { toastId: toast.loading(`Changing status to ${statusText(status)}...`) }
        },
        onSuccess: async (_, variables, context) => {
            await queryClient.invalidateQueries({ queryKey: ["bookings"] })
            await queryClient.invalidateQueries({ queryKey: ["user-bookings-summary"] })
            await queryClient.invalidateQueries({ queryKey: ["admin-overview"] })
            await queryClient.invalidateQueries({ queryKey: ["reserved-dates"] })
            toast.dismiss(context?.toastId)
            toast.success(`Status changed to ${statusText(variables.status)}.`)
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
            toast.success("Reservation deleted.")
        },
        onError: (_, __, context) => {
            toast.dismiss(context?.toastId)
            toast.error("Failed to delete reservation.")
        }
    })

    const handleStatusChange = (booking, status) => {
        // Payment Waiting or Booking Confirmed opens the interactive modal
        if (status === BOOKING_STATUS.PAYMENT_WAITING || status === BOOKING_STATUS.BOOKING_CONFIRMED) {
            setConfirmModalData({ booking, targetStatus: status })
            return
        }

        // Cancel opens the cancel modal with reason input
        if (status === BOOKING_STATUS.CANCEL) {
            setCancelModalBooking(booking)
            return
        }

        showConfirmAlert(
            `Change ${booking.bookingId} to ${statusText(status)}?`,
            "This will update the reservation status.",
            "Yes, update status"
        ).then(result => {
            if (result.isConfirmed) {
                statusMutation.mutate({ id: booking._id, status })
            }
        })
    }

    const handleDelete = (booking) => {
        showConfirmAlert(
            `Delete Record ${booking.bookingId}?`,
            "This will permanently delete this booking from the system.",
            "Yes, delete record",
            true
        ).then(result => {
            if (result.isConfirmed) deleteMutation.mutate(booking._id)
        })
    }

    const statusBadge = (status) => {
        const baseClass = "inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold border whitespace-nowrap"

        switch (status) {
            case BOOKING_STATUS.PAYMENT_WAITING:
                return <span className={`${baseClass} bg-sky-50 text-sky-700 border-sky-200 rounded-full`}><CreditCard size={12} /> Payment Waiting</span>
            case BOOKING_STATUS.BOOKING_CONFIRMED:
                return <span className={`${baseClass} bg-emerald-50 text-emerald-700 border-emerald-200 rounded-full`}><CheckCircle2 size={12} /> Booking Confirmed</span>
            case BOOKING_STATUS.CHECKED_IN:
                return <span className={`${baseClass} bg-indigo-50 text-indigo-700 border-indigo-200 rounded-full`}><LogIn size={12} /> Checked In</span>
            case BOOKING_STATUS.CHECKED_OUT:
                return <span className={`${baseClass} bg-slate-50 text-slate-700 border-slate-200 rounded-full`}><LogOut size={12} /> Checked Out</span>
            case BOOKING_STATUS.CANCEL:
                return <span className={`${baseClass} bg-rose-50 text-rose-700 border-rose-200 rounded-full`}><XCircle size={12} /> Cancel</span>
            default:
                return <span className={`${baseClass} bg-amber-50 text-amber-700 border-amber-200 rounded-full`}><Clock size={12} /> Request Booking</span>
        }
    }

    const getStatusActions = (booking) => {
        switch (booking.status) {
            case BOOKING_STATUS.REQUEST_BOOKING:
                return [BOOKING_STATUS.PAYMENT_WAITING, BOOKING_STATUS.CANCEL]
            case BOOKING_STATUS.PAYMENT_WAITING:
                return [BOOKING_STATUS.BOOKING_CONFIRMED, BOOKING_STATUS.CANCEL]
            case BOOKING_STATUS.BOOKING_CONFIRMED:
                return [BOOKING_STATUS.CHECKED_IN, BOOKING_STATUS.CANCEL]
            case BOOKING_STATUS.CHECKED_IN:
                return [BOOKING_STATUS.CHECKED_OUT]
            default:
                return []
        }
    }

    const filteredBookings = bookings.filter(b => {
        if (!search) return true
        const s = search.toLowerCase()
        const roomText = getBookingRooms(b).map(room => getRoomName(room)).join(" ").toLowerCase()
        return b.name?.toLowerCase().includes(s) ||
            b.mobile?.toLowerCase().includes(s) ||
            b.address?.toLowerCase().includes(s) ||
            b.bookingId?.toLowerCase().includes(s) ||
            b.roomName?.toLowerCase().includes(s) ||
            b.roomCategory?.toLowerCase().includes(s) ||
            roomText.includes(s)
    })

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight">
                        {isAdmin ? "All Guest Bookings" : "My Reservations"}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        {isAdmin ? "Manage, confirm, edit, and review customer reservations." : "View stay history and booking confirmations."}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
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

                    <select
                        className="select select-sm select-bordered rounded-xl bg-white text-xs font-semibold"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        {STATUS_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white border border-slate-200 shadow-xs rounded-2xl overflow-hidden">
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
                                <th className="text-center whitespace-nowrap min-w-[120px]">Actions</th>
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
                                        <td><div className="h-4 bg-slate-200 w-20"></div></td>
                                        <td><div className="h-4 bg-slate-200 w-16"></div></td>
                                        <td><div className="h-5 bg-slate-200 w-24"></div></td>
                                        <td className="text-center"><div className="h-7 bg-slate-200 w-10 mx-auto"></div></td>
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
                                filteredBookings.map(b => {
                                    const bookingRooms = getBookingRooms(b)
                                    const guestTotals = getBookingGuestTotals(b)
                                    const roomTitle = bookingRooms.map(room => {
                                        const rName = getRoomName(room)
                                        return room.roomNo ? `${rName} (Room ${room.roomNo})` : rName
                                    }).join(", ") || b.roomName || b.roomCategory
                                    const dateSummary = getBookingDateSummary(b) || `${b.checkIn || ""} to ${b.checkOut || ""}`
                                    const totalAmount = getBookingTotal(b)

                                    return (
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
                                            {b.address && <p className="text-[11px] text-slate-400 max-w-[220px] truncate">{b.address}</p>}
                                        </td>
                                        <td>
                                            <span className="text-xs font-semibold text-slate-700 line-clamp-1 max-w-[220px]" title={roomTitle}>
                                                {bookingRooms.length > 1 ? `${bookingRooms.length} Rooms` : roomTitle}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <p className="font-medium text-xs text-slate-800">{dateSummary}</p>
                                        </td>
                                        <td className="text-xs text-slate-600 whitespace-nowrap">
                                            {guestTotals.adults} Adults {guestTotals.babies > 0 ? `- ${guestTotals.babies} Baby` : ""}
                                        </td>
                                        <td className="font-bold text-slate-900 whitespace-nowrap">
                                            ৳{Number(totalAmount || 0).toLocaleString()}
                                        </td>
                                        <td className="whitespace-nowrap">
                                            {statusBadge(b.status)}
                                        </td>
                                        <td className="text-center whitespace-nowrap">
                                            <div className="dropdown dropdown-left">
                                                <div tabIndex={0} role="button" className="cursor-pointer rounded-full hover:bg-gray-100 p-2 border border-transparent hover:border-gray-200 inline-flex">
                                                    <EllipsisVertical size={18} />
                                                </div>
                                                <ul tabIndex={-1} className="dropdown-content menu bg-base-100 rounded-box z-10 w-56 p-2 shadow-lg border border-slate-100">
                                                    <li>
                                                        <Link to={`/dashboard/bookings/${b._id}`} className="text-slate-600 hover:text-teal-700 hover:bg-teal-50">
                                                            <Eye size={15} /> View Details
                                                        </Link>
                                                    </li>
                                                    {isAdmin && (
                                                        <li>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => setEditModalBooking(b)} 
                                                                className="text-slate-600 hover:text-teal-700 hover:bg-teal-50"
                                                            >
                                                                <Pencil size={15} /> Edit Reservation
                                                            </button>
                                                        </li>
                                                    )}
                                                    {getStatusActions(b).map(status => (
                                                        <li key={status}>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStatusChange(b, status)}
                                                                className={status === BOOKING_STATUS.CANCEL ? "text-rose-600 hover:bg-rose-50" : status === BOOKING_STATUS.BOOKING_CONFIRMED ? "text-emerald-700 hover:bg-emerald-50 font-semibold" : status === BOOKING_STATUS.PAYMENT_WAITING ? "text-sky-700 hover:bg-sky-50 font-semibold" : "text-slate-600 hover:text-teal-700 hover:bg-teal-50"}
                                                            >
                                                                {status === BOOKING_STATUS.CANCEL ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                                                                {statusText(status)}
                                                            </button>
                                                        </li>
                                                    ))}
                                                    {isAdmin && (
                                                        <li>
                                                            <button type="button" onClick={() => handleDelete(b)} className="text-rose-600 hover:bg-rose-50">
                                                                <Trash2 size={15} /> Delete
                                                            </button>
                                                        </li>
                                                    )}
                                                </ul>
                                            </div>
                                        </td>
                                    </tr>
                                )})
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
                {isLoading ? (
                    [1, 2, 3].map(n => (
                        <div key={n} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs animate-pulse space-y-3">
                            <div className="h-4 bg-slate-200 rounded w-24"></div>
                            <div className="h-20 bg-slate-100 rounded-xl"></div>
                        </div>
                    ))
                ) : filteredBookings.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl text-center text-slate-400 border border-slate-200">
                        No bookings found.
                    </div>
                ) : (
                    filteredBookings.map(b => {
                        const bookingRooms = getBookingRooms(b)
                        const guestTotals = getBookingGuestTotals(b)
                        const roomTitle = bookingRooms.map(room => {
                            const rName = getRoomName(room)
                            return room.roomNo ? `${rName} (Room ${room.roomNo})` : rName
                        }).join(", ") || b.roomName || b.roomCategory
                        const dateSummary = getBookingDateSummary(b) || `${b.checkIn || ""} to ${b.checkOut || ""}`
                        const totalAmount = getBookingTotal(b)

                        return (
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
                                {b.address && <p className="flex items-start gap-2"><MapPin size={13} className="text-teal-600 shrink-0 mt-0.5" /> <span>{b.address}</span></p>}
                                <p className="flex items-center gap-2"><BedDouble size={13} className="text-teal-600 shrink-0" /> {bookingRooms.length > 1 ? `${bookingRooms.length} Rooms - ${roomTitle}` : roomTitle}</p>
                                <p className="flex items-center gap-2"><Calendar size={13} className="text-teal-600 shrink-0" /> {dateSummary}</p>
                                <p className="flex items-center gap-2"><UsersIcon size={13} className="text-teal-600 shrink-0" /> {guestTotals.adults} Adults {guestTotals.babies > 0 ? `- ${guestTotals.babies} Baby` : ""}</p>
                                <p className="pt-1 font-bold text-teal-900">Total: ৳{Number(totalAmount || 0).toLocaleString()}</p>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-2">
                                    <Link
                                        to={`/dashboard/bookings/${b._id}`}
                                        className="btn btn-sm btn-outline border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl gap-1"
                                    >
                                        <Eye size={15} /> Details
                                    </Link>
                                    {isAdmin && (
                                        <button
                                            type="button"
                                            onClick={() => setEditModalBooking(b)}
                                            className="btn btn-sm btn-ghost text-teal-700 hover:bg-teal-50 rounded-xl gap-1"
                                        >
                                            <Pencil size={14} /> Edit
                                        </button>
                                    )}
                                </div>
                                <div className="dropdown dropdown-left">
                                    <div tabIndex={0} role="button" className="cursor-pointer rounded-full hover:bg-gray-100 p-2 border border-transparent hover:border-gray-200">
                                        <EllipsisVertical size={18} />
                                    </div>
                                    <ul tabIndex={-1} className="dropdown-content menu bg-base-100 rounded-box z-10 w-56 p-2 shadow-lg border border-slate-100">
                                        {getStatusActions(b).map(status => (
                                            <li key={status}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleStatusChange(b, status)}
                                                    className={status === BOOKING_STATUS.CANCEL ? "text-rose-600 hover:bg-rose-50" : status === BOOKING_STATUS.BOOKING_CONFIRMED ? "text-emerald-700 hover:bg-emerald-50 font-semibold" : status === BOOKING_STATUS.PAYMENT_WAITING ? "text-sky-700 hover:bg-sky-50 font-semibold" : "text-slate-600 hover:text-teal-700 hover:bg-teal-50"}
                                                >
                                                    {status === BOOKING_STATUS.CANCEL ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                                                    {statusText(status)}
                                                </button>
                                            </li>
                                        ))}
                                        {isAdmin && (
                                            <li>
                                                <button type="button" onClick={() => handleDelete(b)} className="text-rose-600 hover:bg-rose-50">
                                                    <Trash2 size={15} /> Delete
                                                </button>
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )})
                )}
            </div>

            {/* Payment Waiting / Confirm Booking Modal (createPortal) */}
            {confirmModalData && (
                <ConfirmBookingModal
                    booking={confirmModalData.booking}
                    targetStatus={confirmModalData.targetStatus}
                    isOpen={!!confirmModalData}
                    onClose={() => setConfirmModalData(null)}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ["bookings"] })
                        queryClient.invalidateQueries({ queryKey: ["admin-overview"] })
                    }}
                />
            )}

            {/* Edit Booking Modal (createPortal) */}
            {editModalBooking && (
                <EditBookingModal
                    booking={editModalBooking}
                    isOpen={!!editModalBooking}
                    onClose={() => setEditModalBooking(null)}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ["bookings"] })
                        queryClient.invalidateQueries({ queryKey: ["admin-overview"] })
                    }}
                />
            )}

            {/* Cancel Booking Modal (createPortal) */}
            {cancelModalBooking && (
                <CancelBookingModal
                    booking={cancelModalBooking}
                    isOpen={!!cancelModalBooking}
                    onClose={() => setCancelModalBooking(null)}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ["bookings"] })
                        queryClient.invalidateQueries({ queryKey: ["admin-overview"] })
                    }}
                    currentUser={currentUser}
                    role={role}
                />
            )}
        </div>
    )
}

export default Bookings
