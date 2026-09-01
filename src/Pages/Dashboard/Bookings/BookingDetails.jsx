import React, { useContext, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { AuthContext } from '../../../Context/AuthContext'
import useRole from '../../../hooks/useRole'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { showConfirmAlert } from '../../../utils/customSwal'
import logo from '../../../assets/logo.png'
import { 
    CalendarCheck, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    Trash2, 
    ArrowLeft, 
    Printer, 
    Phone, 
    User, 
    Calendar, 
    BedDouble, 
    CreditCard, 
    Copy, 
    Check, 
    MapPin, 
    Pencil, 
    UserCheck, 
    Receipt, 
    FileText,
    History,
    AlertCircle,
    Building2,
    Briefcase,
    Shield
} from 'lucide-react'
import { 
    formatDate, 
    formatDateTime, 
    getBookingGuestTotals, 
    getBookingRooms, 
    getBookingTotal, 
    getBookingSubtotal,
    getBookingDiscount,
    getBookingPaidAmount,
    getBookingDueAmount,
    getNightCount, 
    getRoomName, 
    getRoomTotal 
} from '../../../utils/bookingUtils'
import ConfirmBookingModal from './ConfirmBookingModal'
import EditBookingModal from './EditBookingModal'
import CancelBookingModal from './CancelBookingModal'
import AddPaymentModal from './AddPaymentModal'
import ReservationVoucherModal from '../Calender/ReservationVoucherModal'

const BookingDetails = () => {
    const { id } = useParams()
    const { user: currentUser } = useContext(AuthContext)
    const { role } = useRole()
    const axiosSecure = useAxiosSecure()
    const queryClient = useQueryClient()
    const navigate = useNavigate()
    const [copied, setCopied] = useState(false)

    // Modals
    const [confirmModalTarget, setConfirmModalTarget] = useState(null) // "payment_waiting" or "booking_confirmed"
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [isCancelOpen, setIsCancelOpen] = useState(false)
    const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false)
    const [isVoucherOpen, setIsVoucherOpen] = useState(false)

    const canEdit = ["admin", "manager", "agent"].includes(role)
    const canDelete = ["admin", "manager"].includes(role)
    const canRecordPayment = ["admin", "manager", "agent"].includes(role)
    const canConfirm = ["admin", "manager", "agent"].includes(role)
    const canSetPaymentWaiting = ["admin", "manager", "agent", "b2b"].includes(role)
    const canCancel = ["admin", "manager", "agent"].includes(role)

    // Fetch booking details by ID
    const { data: booking, isLoading, isError } = useQuery({
        queryKey: ["booking-details", id],
        enabled: !!currentUser && !!id,
        queryFn: async () => {
            try {
                const res = await axiosSecure.get(`/booking/${id}`)
                if (res.data) return res.data
            } catch (e) {
                console.log("Direct booking fetch fallback", e)
            }
            const listRes = await axiosSecure.get(`/bookings`)
            const matched = listRes.data.find(b => b._id === id || b.bookingId === id)
            if (!matched) throw new Error("Booking not found")
            return matched
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async () => {
            const res = await axiosSecure.delete(`/booking/${booking._id}`)
            return res.data
        },
        onMutate: () => ({ toastId: toast.loading("Deleting reservation...") }),
        onSuccess: async (_, __, context) => {
            await queryClient.invalidateQueries({ queryKey: ["bookings"] })
            await queryClient.invalidateQueries({ queryKey: ["admin-overview"] })
            toast.dismiss(context?.toastId)
            toast.success("🗑️ Reservation deleted successfully.")
            navigate("/dashboard/bookings")
        },
        onError: (_, __, context) => {
            toast.dismiss(context?.toastId)
            toast.error("Failed to delete reservation.")
        }
    })

    const handleDelete = () => {
        showConfirmAlert(
            `Delete Booking Record ${booking?.bookingId}?`,
            "This will permanently remove this booking record from the system.",
            "Yes, delete record",
            true
        ).then(result => {
            if (result.isConfirmed) deleteMutation.mutate()
        })
    }

    const handleCopyId = () => {
        if (booking?.bookingId) {
            navigator.clipboard.writeText(booking.bookingId)
            setCopied(true)
            toast.success("Booking ID copied!")
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handlePrint = () => {
        window.print()
    }

    const statusBadge = (status) => {
        switch (status) {
            case "booking_confirmed":
            case "confirmed":
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={14} /> Booking Confirmed
                    </span>
                )
            case "checked_id":
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <CheckCircle2 size={14} /> Checked In
                    </span>
                )
            case "checked_out":
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200">
                        <Clock size={14} /> Checked Out
                    </span>
                )
            case "cancel":
            case "cancelled":
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle size={14} /> Cancelled
                    </span>
                )
            case "payment_waiting":
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                        <CreditCard size={14} /> Payment Waiting
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock size={14} /> Request Booking
                    </span>
                )
        }
    }

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
                return <span className="badge badge-xs bg-slate-200 text-slate-700 border-none">User</span>
        }
    }

    if (isLoading) {
        return (
            <div className="space-y-6 max-w-4xl mx-auto animate-pulse">
                <div className="h-8 bg-slate-200 rounded w-48"></div>
                <div className="bg-white rounded-3xl p-8 border border-slate-200 h-96"></div>
            </div>
        )
    }

    if (isError || !booking) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
                <CalendarCheck size={56} className="text-slate-300 mb-4" />
                <h2 className="text-2xl font-bold text-slate-800 font-serif">Reservation Not Found</h2>
                <p className="text-slate-500 text-sm mt-1 max-w-md">
                    We could not locate the booking details for reference: {id}
                </p>
                <Link to="/dashboard/bookings" className="btn btn-primary rounded-xl text-white mt-6 gap-2">
                    <ArrowLeft size={16} /> Back to All Bookings
                </Link>
            </div>
        )
    }

    const bookingRooms = getBookingRooms(booking)
    const guestTotals = getBookingGuestTotals(booking)
    const totalAmount = getBookingTotal(booking)
    const sortedCheckIns = bookingRooms.map(room => room.checkIn).filter(Boolean).sort()
    const sortedCheckOuts = bookingRooms.map(room => room.checkOut).filter(Boolean).sort()
    const firstCheckIn = sortedCheckIns[0] || booking.checkIn
    const lastCheckOut = sortedCheckOuts[sortedCheckOuts.length - 1] || booking.checkOut
    const statusHistory = Array.isArray(booking.statusHistory) ? booking.statusHistory : []
    const isCancelled = ["cancel", "cancelled"].includes(booking.status)

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Top Navigation & Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                <Link 
                    to="/dashboard/bookings" 
                    className="btn btn-sm btn-ghost gap-2 rounded-xl text-slate-600 hover:text-slate-900 w-fit"
                >
                    <ArrowLeft size={16} /> Back to Bookings
                </Link>

                <div className="flex flex-wrap items-center gap-2">
                    {canEdit && (
                        <button 
                            onClick={() => setIsEditOpen(true)}
                            className="btn btn-sm btn-outline border-teal-300 text-teal-700 hover:bg-teal-50 gap-1.5 rounded-xl"
                        >
                            <Pencil size={15} /> Edit Reservation
                        </button>
                    )}

                    {canSetPaymentWaiting && booking.status === "request_booking" && (
                        <button 
                            onClick={() => setConfirmModalTarget("payment_waiting")}
                            className="btn btn-sm bg-[#eab308] hover:bg-yellow-500 text-amber-950 font-bold gap-1.5 rounded-xl shadow-xs border-none"
                        >
                            <CreditCard size={15} /> Set to Payment Waiting
                        </button>
                    )}

                    {/* Reservation Confirmation Voucher / Letter */}
                    {["booking_confirmed", "confirmed", "checked_id", "checked_in", "checked_out"].includes(booking.status) && (
                        <button 
                            onClick={() => setIsVoucherOpen(true)}
                            className="btn btn-sm bg-[#5261d6] hover:bg-[#4351be] text-white gap-1.5 rounded-xl shadow-xs border-none"
                            title="Print / Download A4 Reservation Letter PDF"
                        >
                            <Printer size={15} /> Reservation Letter (PDF)
                        </button>
                    )}

                    {canConfirm && ["request_booking", "payment_waiting", "pending"].includes(booking.status) && (
                        <button 
                            onClick={() => setConfirmModalTarget("booking_confirmed")}
                            className="btn btn-sm bg-[#5261d6] hover:bg-[#4351be] text-white font-bold gap-1.5 rounded-xl shadow-xs border-none"
                        >
                            <CheckCircle2 size={15} /> Confirm Booking
                        </button>
                    )}

                    {!isCancelled && canRecordPayment && (
                        <button 
                            onClick={() => setIsAddPaymentOpen(true)}
                            className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 rounded-xl shadow-xs border-none"
                        >
                            <CreditCard size={15} /> Record Payment
                        </button>
                    )}

                    {!isCancelled && canCancel && booking.status !== "checked_out" && (
                        <button 
                            onClick={() => setIsCancelOpen(true)}
                            className="btn btn-sm btn-outline border-rose-300 text-rose-600 hover:bg-rose-50 gap-1.5 rounded-xl"
                        >
                            <XCircle size={15} /> Cancel Booking
                        </button>
                    )}

                    {canDelete && (
                        <button 
                            onClick={handleDelete}
                            className="btn btn-sm btn-ghost text-slate-400 hover:text-rose-600 rounded-xl"
                            title="Delete record permanently"
                        >
                            <Trash2 size={15} />
                        </button>
                    )}
                </div>
            </div>

            {/* Cancellation Banner if Cancelled */}
            {isCancelled && (
                <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm">
                        <XCircle size={18} className="text-rose-600" />
                        <span>This Reservation was Cancelled</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                        <div>
                            <span className="text-rose-700/80">Cancelled Date:</span>{" "}
                            <span className="font-semibold">{booking.cancelledAt ? new Date(booking.cancelledAt).toLocaleString() : "—"}</span>
                        </div>
                        <div>
                            <span className="text-rose-700/80">Cancelled By:</span>{" "}
                            <span className="font-semibold">{booking.cancelledBy?.name || booking.cancelledBy?.email || "System"}</span>{" "}
                            {booking.cancelledBy?.role && getActorRoleBadge(booking.cancelledBy.role)}
                        </div>
                    </div>
                    {booking.cancelReason && (
                        <div className="text-xs bg-white/70 p-2.5 rounded-xl border border-rose-100 mt-1">
                            <span className="font-bold text-rose-900">Reason:</span> {booking.cancelReason}
                        </div>
                    )}
                </div>
            )}

            {/* Main Reservation Voucher Card */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 sm:p-10 space-y-8 print:border-none print:shadow-none print:p-0">
                {/* Header with Resort Logo and Booking ID */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <img src={logo} alt="Miami Beach Resort" className="h-12 w-auto object-contain" />
                        <div>
                            <h2 className="text-xl font-extrabold text-slate-900 font-serif">Miami Beach Resort</h2>
                            <p className="text-xs text-slate-500">📍 Dolphin Mor, Kolatoli Beach, Cox's Bazar</p>
                        </div>
                    </div>

                    <div className="text-left sm:text-right">
                        <div className="inline-flex items-center gap-1.5 bg-teal-50 border border-teal-200/60 px-3 py-1 rounded-xl text-teal-800 font-mono font-bold text-sm">
                            <span>{booking.bookingId}</span>
                            <button onClick={handleCopyId} className="hover:text-teal-600 text-teal-500" title="Copy ID">
                                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                            </button>
                        </div>
                        <div className="mt-1.5">
                            {statusBadge(booking.status)}
                        </div>
                    </div>
                </div>

                {/* Guest & Stay Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Guest Information */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3 text-xs sm:text-sm">
                        <h3 className="font-bold text-slate-900 font-serif flex items-center gap-2 text-sm sm:text-base">
                            <User size={16} className="text-teal-600" /> Guest Details
                        </h3>
                        <div className="space-y-2 text-slate-600 pt-1">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Primary Guest:</span>
                                <span className="font-bold text-slate-900">{booking.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Contact / WhatsApp:</span>
                                <span className="font-semibold text-slate-800">{booking.mobile}</span>
                            </div>
                            {booking.address && (
                                <div className="flex justify-between gap-4">
                                    <span className="text-slate-400">Address:</span>
                                    <span className="font-semibold text-slate-800 text-right">{booking.address}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-slate-400">Guests:</span>
                                <span className="font-semibold text-slate-800">
                                    {guestTotals.adults} Adults {(guestTotals.children || guestTotals.babies) > 0 ? `• ${guestTotals.children || guestTotals.babies} ${(guestTotals.children || guestTotals.babies) === 1 ? 'Child' : 'Children'}` : ""}
                                </span>
                            </div>
                            {booking.createdAt && (
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Booked On:</span>
                                    <span className="text-slate-700">{formatDateTime(booking.createdAt)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stay Information */}
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3 text-xs sm:text-sm">
                        <h3 className="font-bold text-slate-900 font-serif flex items-center gap-2 text-sm sm:text-base">
                            <Calendar size={16} className="text-teal-600" /> Stay Schedule
                        </h3>
                        <div className="space-y-2 text-slate-600 pt-1">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Check-In Date:</span>
                                <span className="font-bold text-slate-900">{formatDate(firstCheckIn)} (from 1:00 PM)</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Final Check-Out:</span>
                                <span className="font-bold text-slate-900">{formatDate(lastCheckOut)} (until 11:00 AM)</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Total Booked:</span>
                                <span className="font-semibold text-teal-800 bg-teal-100/60 px-2.5 py-0.5 rounded-md">
                                    {bookingRooms.length} Room{bookingRooms.length > 1 ? 's' : ''}
                                </span>
                            </div>
                            {booking.reference && (
                                <div className="flex justify-between pt-1 border-t border-slate-200">
                                    <span className="text-slate-400 flex items-center gap-1"><UserCheck size={13} /> Reference / Agent:</span>
                                    <span className="font-bold text-teal-900">{booking.reference}</span>
                                </div>
                            )}
                            {(booking.bookedBy?.name || booking.createdBy?.name) && (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400 flex items-center gap-1"><User size={13} /> Booked By:</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-semibold text-slate-800">
                                            {booking.bookedBy?.name || booking.createdBy?.name}
                                        </span>
                                        {getActorRoleBadge(booking.bookedBy?.role || booking.createdBy?.role || booking.requestedByRole || "user")}
                                    </div>
                                </div>
                            )}
                            {booking.transactionId && (
                                <div className="flex justify-between">
                                    <span className="text-slate-400 flex items-center gap-1"><Receipt size={13} /> Trx ID:</span>
                                    <span className="font-mono font-bold text-slate-800">{booking.transactionId}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Reserved Room Item Table */}
                <div className="border border-slate-200">
                    <table className="table w-full text-xs sm:text-sm">
                        <thead>
                            <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                                <th>Reserved Accommodation</th>
                                <th>Assigned Room No</th>
                                <th>Stay Duration</th>
                                <th className="text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {bookingRooms.map((roomItem, index) => {
                                const nights = getNightCount(roomItem.checkIn, roomItem.checkOut)
                                return (
                                    <tr key={`${roomItem.roomId || index}-${index}`}>
                                        <td>
                                            <div className="flex items-center gap-3 py-1">
                                                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                                                    <BedDouble size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{getRoomName(roomItem)}</p>
                                                    <p className="text-xs text-slate-400">
                                                        {roomItem.room?.category || roomItem.categoryName || "Category Room"} • {roomItem.adults} Adults {roomItem.babies > 0 ? `• ${roomItem.babies} Babies` : ""}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            {roomItem.roomNo ? (
                                                <span className="badge badge-sm bg-teal-100 text-teal-900 border-teal-200 font-bold font-mono">
                                                    Room {roomItem.roomNo}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-amber-600 font-medium">
                                                    Pending Assignment
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <p className="font-semibold text-slate-800">{formatDate(roomItem.checkIn)} → {formatDate(roomItem.checkOut)}</p>
                                            <p className="text-xs text-slate-400">{nights} night(s) x ৳{Number(roomItem.pricePerNight || 0).toLocaleString()}</p>
                                        </td>
                                        <td className="text-right font-extrabold text-slate-900 text-sm sm:text-base">
                                            ৳{Number(getRoomTotal(roomItem) || 0).toLocaleString()}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Notes if any */}
                {booking.notes && (
                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-900 space-y-1">
                        <p className="font-bold flex items-center gap-1.5">
                            <FileText size={14} className="text-amber-700" /> Internal Notes:
                        </p>
                        <p className="pl-5 text-amber-800 whitespace-pre-line">{booking.notes}</p>
                    </div>
                )}

                {/* Bill Summary and Policies Footer */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                    <div className="space-y-2 text-xs text-slate-500">
                        <p className="font-bold text-slate-800 text-sm">Resort Guidelines:</p>
                        <p>• Valid government photo ID/Passport is required for check-in.</p>
                        <p>• Check-in time: 01:00 PM | Check-out time: 11:00 AM.</p>
                        <p>• For queries or transport help, call / WhatsApp: +8801616472282.</p>
                    </div>

                    {(() => {
                        const subtotal = getBookingSubtotal(booking)
                        const discountAmount = getBookingDiscount(booking)
                        const payableTotal = getBookingTotal(booking)
                        const paidAmount = getBookingPaidAmount(booking)
                        const dueAmount = getBookingDueAmount(booking)

                        return (
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3 text-xs sm:text-sm">
                                <div className="flex justify-between items-center text-slate-600">
                                    <span>Total Bill:</span>
                                    <span className="font-bold text-slate-900">৳{subtotal.toLocaleString()}</span>
                                </div>
                                {discountAmount > 0 && (
                                    <div className="flex justify-between items-center text-emerald-700 font-semibold">
                                        <span>Special Discount:</span>
                                        <span>-৳{discountAmount.toLocaleString()}</span>
                                    </div>
                                )}
                                {discountAmount > 0 && (
                                    <div className="flex justify-between items-center text-slate-700 font-bold border-t border-slate-200/60 pt-1.5">
                                        <span>Net Payable Bill:</span>
                                        <span className="font-extrabold text-teal-900">৳{payableTotal.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-slate-600">
                                    <span>Paid / Done:</span>
                                    <span className="text-emerald-700 font-semibold">৳{paidAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                                    <span className="font-bold text-slate-700">Due Balance:</span>
                                    <span className={`font-extrabold text-sm sm:text-base ${dueAmount > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                                        ৳{dueAmount.toLocaleString()}
                                    </span>
                                </div>
                                {dueAmount > 0 && !isCancelled && (
                                    <button
                                        onClick={() => setIsAddPaymentOpen(true)}
                                        className="btn btn-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-1 border-none shadow-xs w-full"
                                    >
                                        <CreditCard size={12} />
                                        <span>Collect Due Payment (৳{dueAmount.toLocaleString()})</span>
                                    </button>
                                )}
                            </div>
                        )
                    })()}
                </div>
            </div>

            {/* STATUS HISTORY TIMELINE (Who Changed Status & When) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-5 print:hidden">
                <div className="flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 font-serif flex items-center gap-2">
                        <History size={18} className="text-teal-600" /> Status Change History & Audit Log
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">
                        {statusHistory.length} Event{statusHistory.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {statusHistory.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No status change events recorded yet.</p>
                ) : (
                    <div className="relative pl-6 border-l-2 border-slate-200 space-y-6 my-2">
                        {statusHistory.map((hist, i) => {
                            const actor = hist.changedBy || {}
                            return (
                                <div key={i} className="relative group">
                                    {/* Timeline dot */}
                                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-teal-600 border-4 border-white ring-2 ring-teal-200" />

                                    <div className="bg-slate-50 border border-slate-200/70 p-3.5 rounded-2xl space-y-1.5 text-xs">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                {statusBadge(hist.status)}
                                            </div>
                                            <span className="text-[11px] text-slate-400">
                                                {hist.time ? formatDateTime(hist.time) : "—"}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 text-slate-700 pt-1">
                                            <span className="text-slate-400">Changed by:</span>
                                            <span className="font-bold text-slate-900">{actor.name || actor.email || "System"}</span>
                                            {actor.role && getActorRoleBadge(actor.role)}
                                            {actor.email && actor.email !== actor.name && (
                                                <span className="text-slate-400 text-[11px]">({actor.email})</span>
                                            )}
                                        </div>

                                        {hist.note && (
                                            <p className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-100">
                                                <strong>Note:</strong> {hist.note}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Confirm / Payment Waiting Modal */}
            {confirmModalTarget && (
                <ConfirmBookingModal
                    booking={booking}
                    targetStatus={confirmModalTarget}
                    isOpen={!!confirmModalTarget}
                    onClose={() => setConfirmModalTarget(null)}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ["booking-details", id] })
                        queryClient.invalidateQueries({ queryKey: ["bookings"] })
                    }}
                />
            )}

            {/* Edit Booking Modal */}
            {isEditOpen && (
                <EditBookingModal
                    booking={booking}
                    isOpen={isEditOpen}
                    onClose={() => setIsEditOpen(false)}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ["booking-details", id] })
                        queryClient.invalidateQueries({ queryKey: ["bookings"] })
                    }}
                />
            )}

            {/* Cancel Booking Modal */}
            {isCancelOpen && (
                <CancelBookingModal
                    booking={booking}
                    isOpen={isCancelOpen}
                    onClose={() => setIsCancelOpen(false)}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ["booking-details", id] })
                        queryClient.invalidateQueries({ queryKey: ["bookings"] })
                    }}
                    currentUser={currentUser}
                    role={role}
                />
            )}

            {/* Add Due Payment Modal */}
            {isAddPaymentOpen && (
                <AddPaymentModal
                    booking={booking}
                    isOpen={isAddPaymentOpen}
                    onClose={() => setIsAddPaymentOpen(false)}
                    onSuccess={async () => {
                        await Promise.all([
                            queryClient.invalidateQueries({ queryKey: ["booking-details", id] }),
                            queryClient.invalidateQueries({ queryKey: ["bookings"] }),
                            queryClient.invalidateQueries({ queryKey: ["all-bookings-for-calendar"] })
                        ])
                    }}
                    currentUser={currentUser}
                    role={role}
                />
            )}

            {/* Reservation Voucher / Letter Modal */}
            {isVoucherOpen && (
                <ReservationVoucherModal
                    isOpen={isVoucherOpen}
                    onClose={() => setIsVoucherOpen(false)}
                    bookingId={booking?._id || id}
                    initialBooking={booking}
                />
            )}
        </div>
    )
}

export default BookingDetails
