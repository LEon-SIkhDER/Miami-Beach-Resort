import React, { useContext, useState } from 'react'
import { Link } from 'react-router'
import { AuthContext } from '../../Context/AuthContext'
import useRole from '../../hooks/useRole'
import useAxiosSecure from '../../hooks/useAxiosSecure'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { showConfirmAlert } from '../../utils/customSwal'
import { 
    CalendarCheck, 
    CheckCircle2, 
    Clock, 
    XCircle, 
    BedDouble, 
    Calendar, 
    CreditCard, 
    Copy, 
    Check, 
    Printer, 
    Search, 
    Phone, 
    ArrowRight, 
    Eye, 
    Sparkles,
    X,
    LogIn,
    LogOut,
    ShieldCheck,
    LayoutDashboard
} from 'lucide-react'
import { 
    formatDate,
    getBookingDateSummary, 
    getBookingGuestTotals, 
    getBookingRooms, 
    getBookingTotal, 
    getNightCount, 
    getRoomName, 
    getRoomTotal 
} from '../../utils/bookingUtils'
import ReservationVoucherModal from '../Dashboard/Calender/ReservationVoucherModal'

const MyBookings = () => {
    const { user } = useContext(AuthContext)
    const { role } = useRole()
    const axiosSecure = useAxiosSecure()
    const queryClient = useQueryClient()

    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [copiedId, setCopiedId] = useState(null)
    const [voucherBooking, setVoucherBooking] = useState(null)
    const [detailsBooking, setDetailsBooking] = useState(null)

    // Fetch personal bookings
    const { data: bookings = [], isLoading } = useQuery({
        queryKey: ["my-bookings", user?.email],
        enabled: !!user?.email,
        queryFn: async () => {
            const res = await axiosSecure.get(`/bookings?email=${encodeURIComponent(user.email)}`)
            return Array.isArray(res.data) ? res.data : []
        }
    })

    // Cancel request mutation
    const cancelMutation = useMutation({
        mutationFn: async ({ id, cancelReason }) => {
            const res = await axiosSecure.patch(`/booking/${id}`, {
                status: "cancel",
                cancelReason: cancelReason || "Cancelled by guest",
                requestedByRole: "user",
                changedBy: {
                    name: user?.displayName || "Guest",
                    email: user?.email || "",
                    role: "user"
                }
            })
            return res.data
        },
        onMutate: () => ({ toastId: toast.loading("Submitting cancellation request...") }),
        onSuccess: async (_, __, context) => {
            await queryClient.invalidateQueries({ queryKey: ["my-bookings"] })
            toast.dismiss(context?.toastId)
            toast.success("Reservation cancelled successfully.")
            setDetailsBooking(null)
        },
        onError: (_, __, context) => {
            toast.dismiss(context?.toastId)
            toast.error("Failed to cancel reservation. Please contact resort support.")
        }
    })

    const handleCopyId = (bId) => {
        if (!bId) return
        navigator.clipboard.writeText(bId)
        setCopiedId(bId)
        toast.success(`Booking ID ${bId} copied!`)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const handleGuestCancel = (booking) => {
        showConfirmAlert(
            `Cancel Reservation ${booking.bookingId}?`,
            "Are you sure you want to cancel this booking request?",
            "Yes, cancel it",
            true
        ).then(result => {
            if (result.isConfirmed) {
                cancelMutation.mutate({ id: booking._id, cancelReason: "Cancelled by guest via My Bookings" })
            }
        })
    }

    const statusBadge = (status) => {
        switch (status) {
            case "booking_confirmed":
            case "confirmed":
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={13} /> Confirmed
                    </span>
                )
            case "checked_id":
            case "checked_in":
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <LogIn size={13} /> Checked In
                    </span>
                )
            case "checked_out":
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">
                        <LogOut size={13} /> Checked Out
                    </span>
                )
            case "payment_waiting":
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                        <CreditCard size={13} /> Payment Waiting
                    </span>
                )
            case "cancel":
            case "cancelled":
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle size={13} /> Cancelled
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock size={13} /> Request In Review
                    </span>
                )
        }
    }

    // Filter bookings
    const filteredBookings = bookings.filter(b => {
        if (statusFilter && b.status !== statusFilter) {
            if (statusFilter === "confirmed" && !["booking_confirmed", "confirmed", "checked_id", "checked_in", "checked_out"].includes(b.status)) return false
            if (statusFilter === "pending" && !["request_booking", "payment_waiting"].includes(b.status)) return false
            if (statusFilter === "cancelled" && !["cancel", "cancelled"].includes(b.status)) return false
        }
        if (search) {
            const q = search.toLowerCase()
            const roomNames = getBookingRooms(b).map(r => getRoomName(r)).join(' ').toLowerCase()
            return b.bookingId?.toLowerCase().includes(q) ||
                   b.name?.toLowerCase().includes(q) ||
                   b.mobile?.toLowerCase().includes(q) ||
                   roomNames.includes(q)
        }
        return true
    })

    const confirmedCount = bookings.filter(b => ["booking_confirmed", "confirmed", "checked_id", "checked_in", "checked_out"].includes(b.status)).length
    const pendingCount = bookings.filter(b => ["request_booking", "payment_waiting"].includes(b.status)).length
    const cancelledCount = bookings.filter(b => ["cancel", "cancelled"].includes(b.status)).length

    return (
        <div className="min-h-screen bg-slate-50 py-8 sm:py-12 px-3 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto space-y-6">
                
                {/* Staff Alert Banner */}
                {["admin", "manager", "agent", "b2b"].includes(role) && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 text-xs shadow-xs">
                        <div className="flex items-center gap-2.5">
                            <ShieldCheck size={18} className="text-amber-700 shrink-0" />
                            <div>
                                <p className="font-bold">Staff Role Detected ({role.toUpperCase()})</p>
                                <p className="text-amber-800 text-[11px]">This page is designed for personal guest reservations. To manage resort reservations, open the Staff Dashboard.</p>
                            </div>
                        </div>
                        <Link 
                            to="/dashboard" 
                            className="btn btn-xs bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl gap-1 border-none shrink-0"
                        >
                            <LayoutDashboard size={13} /> Go to Dashboard
                        </Link>
                    </div>
                )}

                {/* Header Banner */}
                <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-teal-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#0d9488_1px,transparent_1px)] [background-size:16px_16px]"></div>
                    <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-semibold">
                                <Sparkles size={13} className="text-amber-400" /> Guest Portal
                            </div>
                            <h1 className="text-2xl sm:text-4xl font-extrabold font-serif tracking-tight">
                                My Bookings & Reservations
                            </h1>
                            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                                Welcome back, <strong className="text-white font-bold">{user?.displayName || user?.email}</strong>. View your booking details, confirmation letters, and stay schedules.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <Link 
                                to="/" 
                                className="btn btn-sm sm:btn-md bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-2xl shadow-lg border-none gap-2"
                            >
                                <BedDouble size={16} />
                                <span>Book Another Room</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-2">
                            <CalendarCheck size={20} />
                        </div>
                        <p className="text-xs text-slate-500 font-medium">Total Bookings</p>
                        <p className="text-2xl font-bold text-slate-900">{bookings.length}</p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-emerald-200/80 bg-linear-to-br from-emerald-50/30 to-white shadow-xs space-y-1">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2">
                            <CheckCircle2 size={20} />
                        </div>
                        <p className="text-xs text-slate-500 font-medium">Confirmed</p>
                        <p className="text-2xl font-bold text-emerald-700">{confirmedCount}</p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-amber-200/80 bg-linear-to-br from-amber-50/30 to-white shadow-xs space-y-1">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-2">
                            <Clock size={20} />
                        </div>
                        <p className="text-xs text-slate-500 font-medium">In Review</p>
                        <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-rose-200/80 bg-linear-to-br from-rose-50/30 to-white shadow-xs space-y-1">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center mb-2">
                            <XCircle size={20} />
                        </div>
                        <p className="text-xs text-slate-500 font-medium">Cancelled</p>
                        <p className="text-2xl font-bold text-rose-700">{cancelledCount}</p>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by booking ID or room name..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="input input-sm input-bordered w-full pl-10 rounded-xl bg-slate-50 border-slate-200 text-xs sm:text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="select select-sm select-bordered rounded-xl bg-slate-50 border-slate-200 text-xs font-semibold"
                        >
                            <option value="">All Statuses</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="pending">In Review / Pending</option>
                            <option value="payment_waiting">Payment Waiting</option>
                            <option value="cancelled">Cancelled</option>
                        </select>

                        {(search || statusFilter) && (
                            <button
                                onClick={() => { setSearch(''); setStatusFilter('') }}
                                className="btn btn-sm btn-ghost text-slate-500 hover:text-slate-800 rounded-xl text-xs"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Bookings List / Cards */}
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(n => (
                            <div key={n} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs animate-pulse space-y-4">
                                <div className="h-6 bg-slate-200 rounded w-1/4"></div>
                                <div className="h-16 bg-slate-100 rounded-2xl"></div>
                            </div>
                        ))}
                    </div>
                ) : filteredBookings.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs space-y-4">
                        <div className="w-16 h-16 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                            <BedDouble size={32} />
                        </div>
                        <div className="space-y-1 max-w-md mx-auto">
                            <h3 className="text-lg font-bold text-slate-900 font-serif">No Reservations Found</h3>
                            <p className="text-xs text-slate-500">
                                {search || statusFilter 
                                    ? "No bookings match your current search and filter criteria." 
                                    : "You haven't made any reservations at Miami Beach Resort yet."}
                            </p>
                        </div>
                        <Link 
                            to="/" 
                            className="btn btn-primary rounded-2xl text-white font-bold gap-2 shadow-sm hover:shadow-md"
                        >
                            <span>Explore Room Categories</span>
                            <ArrowRight size={15} />
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredBookings.map(b => {
                            const rooms = getBookingRooms(b)
                            const guestTotals = getBookingGuestTotals(b)
                            const totalAmount = getBookingTotal(b)
                            const dateSummary = getBookingDateSummary(b) || `${b.checkIn || ""} to ${b.checkOut || ""}`
                            const isConfirmed = ["booking_confirmed", "confirmed", "checked_id", "checked_in", "checked_out"].includes(b.status)
                            const isPending = ["request_booking", "payment_waiting"].includes(b.status)
                            const paidAmount = Number(b.paidAmount || b.advanceAmount || 0)
                            const dueAmount = Math.max(0, Number(b.totalAmount !== undefined ? b.totalAmount : totalAmount) - paidAmount)

                            return (
                                <div 
                                    key={b._id} 
                                    className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 sm:p-7 space-y-5"
                                >
                                    {/* Top Row: Booking ID + Status Badge */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                                        <div className="flex flex-wrap items-center gap-2.5">
                                            <div className="inline-flex items-center gap-1.5 bg-teal-50 border border-teal-200/70 px-3 py-1 rounded-xl text-teal-900 font-mono font-bold text-xs sm:text-sm">
                                                <span>{b.bookingId}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyId(b.bookingId)}
                                                    className="hover:text-teal-600 text-teal-500 ml-0.5"
                                                    title="Copy Booking ID"
                                                >
                                                    {copiedId === b.bookingId ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                                </button>
                                            </div>

                                            {b.createdAt && (
                                                <span className="text-[11px] text-slate-400">
                                                    Booked on {formatDate(b.createdAt)}
                                                </span>
                                            )}
                                        </div>

                                        <div>
                                            {statusBadge(b.status)}
                                        </div>
                                    </div>

                                    {/* Content Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
                                        {/* Room / Suite Details */}
                                        <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-2">
                                            <p className="font-bold text-slate-900 flex items-center gap-1.5 text-xs text-teal-700 uppercase tracking-wider">
                                                <BedDouble size={14} /> Reserved Accommodation
                                            </p>
                                            <div className="space-y-1.5 pt-1">
                                                {rooms.map((room, idx) => (
                                                    <div key={idx} className="flex justify-between items-start text-xs">
                                                        <span className="font-semibold text-slate-800">
                                                            {getRoomName(room)}
                                                            {room.roomNo && <span className="text-teal-700 font-mono font-bold ml-1">(Room {room.roomNo})</span>}
                                                        </span>
                                                        <span className="text-slate-500 font-mono font-medium">
                                                            ৳{Number(room.pricePerNight || 0).toLocaleString()}/night
                                                        </span>
                                                    </div>
                                                ))}
                                                <div className="pt-2 border-t border-slate-200 text-slate-500 text-[11px] flex items-center justify-between">
                                                    <span>Total Rooms:</span>
                                                    <span className="font-bold text-slate-800">{rooms.length} Room{rooms.length > 1 ? 's' : ''}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stay Dates & Guests */}
                                        <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-2">
                                            <p className="font-bold text-slate-900 flex items-center gap-1.5 text-xs text-teal-700 uppercase tracking-wider">
                                                <Calendar size={14} /> Stay Schedule
                                            </p>
                                            <div className="space-y-1.5 pt-1 text-xs">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Dates:</span>
                                                    <span className="font-semibold text-slate-800">{dateSummary}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Duration:</span>
                                                    <span className="font-semibold text-slate-800">
                                                        {getNightCount(rooms[0]?.checkIn, rooms[0]?.checkOut)} Nights
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Guests:</span>
                                                    <span className="font-semibold text-slate-800">
                                                        {guestTotals.adults} Adults {(guestTotals.children || guestTotals.babies) > 0 ? `• ${guestTotals.children || guestTotals.babies} ${(guestTotals.children || guestTotals.babies) === 1 ? 'Child' : 'Children'}` : ""}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Financial Breakdown */}
                                        <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 space-y-2">
                                            <p className="font-bold text-slate-900 flex items-center gap-1.5 text-xs text-teal-700 uppercase tracking-wider">
                                                <CreditCard size={14} /> Payment & Billing
                                            </p>
                                            <div className="space-y-1.5 pt-1 text-xs">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Total Bill:</span>
                                                    <span className="font-bold text-slate-900">৳{Number(b.totalAmount !== undefined ? b.totalAmount : totalAmount).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-500">Paid:</span>
                                                    <span className="font-semibold text-emerald-700">৳{paidAmount.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between pt-1 border-t border-slate-200">
                                                    <span className="font-bold text-slate-700">Due Balance:</span>
                                                    <span className={`font-bold ${dueAmount > 0 ? "text-orange-600" : "text-emerald-600"}`}>
                                                        {dueAmount > 0 ? `৳${dueAmount.toLocaleString()}` : "Paid Full ✅"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons Footer */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setDetailsBooking(b)}
                                                className="btn btn-sm btn-outline border-slate-300 text-slate-700 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-800 rounded-xl gap-1.5 text-xs font-bold"
                                            >
                                                <Eye size={14} /> View Details
                                            </button>

                                            {/* Confirmation Voucher / Letter button for confirmed bookings */}
                                            {isConfirmed && (
                                                <button
                                                    type="button"
                                                    onClick={() => setVoucherBooking(b)}
                                                    className="btn btn-sm bg-[#5261d6] hover:bg-[#4351be] text-white rounded-xl gap-1.5 text-xs font-bold shadow-xs border-none"
                                                >
                                                    <Printer size={14} /> Reservation Letter (PDF)
                                                </button>
                                            )}

                                            {/* WhatsApp hotline link */}
                                            <a
                                                href={`https://wa.me/8801616472282?text=${encodeURIComponent(`Hello Miami Beach Resort, I am inquiring about my booking ID: ${b.bookingId} (${b.name})`)}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="btn btn-sm btn-ghost text-teal-700 hover:bg-teal-50 rounded-xl gap-1.5 text-xs font-semibold"
                                            >
                                                <Phone size={13} /> Resort WhatsApp
                                            </a>
                                        </div>

                                        {/* Guest Cancel Request Button if pending */}
                                        {isPending && (
                                            <button
                                                type="button"
                                                onClick={() => handleGuestCancel(b)}
                                                className="btn btn-sm btn-ghost text-rose-600 hover:bg-rose-50 rounded-xl gap-1 text-xs"
                                            >
                                                <XCircle size={14} /> Cancel Request
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* View Details Interactive Modal */}
            {detailsBooking && (
                <dialog open className="modal modal-open z-50">
                    <div className="modal-box w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-teal-600">Booking Summary</span>
                                <h3 className="text-lg sm:text-xl font-bold font-serif text-slate-900 flex items-center gap-2 mt-0.5">
                                    <span>{detailsBooking.bookingId}</span>
                                    {statusBadge(detailsBooking.status)}
                                </h3>
                            </div>
                            <button onClick={() => setDetailsBooking(null)} className="btn btn-sm btn-ghost btn-circle"><X size={18} /></button>
                        </div>

                        {/* Guest & Stay Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                            <div className="space-y-1.5">
                                <p><strong className="text-slate-500">Guest Name:</strong> <span className="font-bold text-slate-900">{detailsBooking.name}</span></p>
                                <p><strong className="text-slate-500">Mobile:</strong> <span className="text-slate-800">{detailsBooking.mobile}</span></p>
                                {detailsBooking.address && <p><strong className="text-slate-500">Address:</strong> <span className="text-slate-800">{detailsBooking.address}</span></p>}
                            </div>
                            <div className="space-y-1.5">
                                <p><strong className="text-slate-500">Stay Duration:</strong> <span className="font-bold text-slate-900">{getBookingDateSummary(detailsBooking)}</span></p>
                                <p><strong className="text-slate-500">Check-in / Out:</strong> <span className="text-slate-800">1:00 PM / 11:00 AM</span></p>
                                <p><strong className="text-slate-500">Resort Location:</strong> <span className="text-slate-800">Dolphin Mor, Kolatoli</span></p>
                            </div>
                        </div>

                        {/* Room list */}
                        <div className="space-y-2">
                            <p className="font-bold text-slate-900 text-xs uppercase tracking-wider text-teal-700">Reserved Rooms</p>
                            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white text-xs">
                                {getBookingRooms(detailsBooking).map((r, i) => (
                                    <div key={i} className="p-3 flex items-center justify-between">
                                        <div>
                                            <p className="font-bold text-slate-900">{getRoomName(r)}</p>
                                            <p className="text-[11px] text-slate-500">
                                                {r.roomNo ? `Room Number: ${r.roomNo}` : 'Assigned upon check-in'} • {r.adults || 2} Adults
                                            </p>
                                        </div>
                                        <p className="font-bold text-slate-900 text-sm">
                                            ৳{Number(getRoomTotal(r) || 0).toLocaleString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Total & Policies */}
                        <div className="bg-teal-50/60 p-4 rounded-2xl border border-teal-100 space-y-2 text-xs">
                            <div className="flex justify-between items-center text-sm font-bold text-slate-900">
                                <span>Grand Total:</span>
                                <span>৳{Number(detailsBooking.totalAmount !== undefined ? detailsBooking.totalAmount : getBookingTotal(detailsBooking)).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-600">
                                <span>Paid Amount:</span>
                                <span className="font-semibold text-emerald-700">৳{Number(detailsBooking.paidAmount || detailsBooking.advanceAmount || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Footer Action */}
                        <div className="flex items-center justify-end gap-2 pt-2">
                            {["booking_confirmed", "confirmed", "checked_id", "checked_in", "checked_out"].includes(detailsBooking.status) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setVoucherBooking(detailsBooking)
                                        setDetailsBooking(null)
                                    }}
                                    className="btn btn-sm bg-[#5261d6] hover:bg-[#4351be] text-white rounded-xl gap-1.5 font-bold border-none"
                                >
                                    <Printer size={14} /> Open Reservation Letter (PDF)
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setDetailsBooking(null)}
                                className="btn btn-sm btn-outline border-slate-300 text-slate-700 rounded-xl"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </dialog>
            )}

            {/* Reservation Voucher / Letter Modal */}
            {voucherBooking && (
                <ReservationVoucherModal
                    isOpen={!!voucherBooking}
                    onClose={() => setVoucherBooking(null)}
                    bookingId={voucherBooking._id}
                    initialBooking={voucherBooking}
                />
            )}
        </div>
    )
}

export default MyBookings
