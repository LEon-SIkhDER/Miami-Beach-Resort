import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
import toast from 'react-hot-toast'
import { showConfirmAlert } from '../../../utils/customSwal'
import {
    X,
    User,
    Phone,
    Mail,
    MapPin,
    BedDouble,
    Calendar,
    Users as UsersIcon,
    CreditCard,
    CheckCircle2,
    Clock,
    XCircle,
    Pencil,
    Trash2,
    Eye,
    ExternalLink,
    Receipt,
    UserCheck,
    FileText,
    Copy,
    Check,
    History,
    LogIn,
    LogOut,
    ArrowRight
} from 'lucide-react'
import { 
    getBookingRooms, 
    getBookingTotal, 
    getNightCount, 
    getRoomName,
    getBookingGuestTotals 
} from '../../../utils/bookingUtils'
import ConfirmBookingModal from '../Bookings/ConfirmBookingModal'
import EditBookingModal from '../Bookings/EditBookingModal'
import CancelBookingModal from '../Bookings/CancelBookingModal'
import AddPaymentModal from '../Bookings/AddPaymentModal'

const getStatusBadge = (status) => {
    switch (status) {
        case "request_booking":
            return <span className="badge badge-sm bg-amber-500 text-white font-bold border-none">Request Booking</span>
        case "payment_waiting":
            return <span className="badge badge-sm bg-sky-500 text-white font-bold border-none">Payment Waiting</span>
        case "booking_confirmed":
        case "confirmed":
            return <span className="badge badge-sm bg-blue-600 text-white font-bold border-none">Confirmed</span>
        case "checked_id":
            return <span className="badge badge-sm bg-indigo-600 text-white font-bold border-none">Checked In</span>
        case "checked_out":
            return <span className="badge badge-sm bg-slate-500 text-white font-bold border-none">Checked Out</span>
        case "cancel":
        case "cancelled":
            return <span className="badge badge-sm bg-rose-600 text-white font-bold border-none">Cancelled</span>
        default:
            return <span className="badge badge-sm bg-slate-200 text-slate-700 font-bold">{status}</span>
    }
}

const CalendarBookingDetailsModal = ({
    isOpen,
    onClose,
    bookingId,
    currentUser,
    role,
    onSuccess
}) => {
    const axiosSecure = useAxiosSecure()
    const queryClient = useQueryClient()

    // Sub-modals
    const [confirmModalData, setConfirmModalData] = useState(null)
    const [editBooking, setEditBooking] = useState(null)
    const [cancelBooking, setCancelBooking] = useState(null)
    const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false)
    const [copiedId, setCopiedId] = useState(null)
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

    const canDelete = role === "admin" || role === "manager"

    // Fetch live complete booking details
    const { 
        data: booking, 
        isLoading, 
        refetch: refetchBookingDetails 
    } = useQuery({
        queryKey: ["calendar-booking-detail", bookingId],
        queryFn: async () => {
            if (!bookingId) return null
            const res = await axiosSecure.get(`/booking/${bookingId}`)
            return res.data
        },
        enabled: !!isOpen && !!bookingId
    })

    const handleCopyBookingId = (bId) => {
        if (!bId) return
        navigator.clipboard.writeText(bId)
        setCopiedId(bId)
        toast.success(`Copied ID: ${bId}`)
        setTimeout(() => setCopiedId(null), 2000)
    }

    // Direct Fast Status Mutation (for Checked In / Checked Out)
    const handleQuickStatusChange = async (newStatus, actionLabel) => {
        if (!booking?._id) return

        const confirmed = await showConfirmAlert(
            `Mark as ${actionLabel}?`,
            `Change booking status of ${booking.name} to ${actionLabel}.`,
            `Yes, set ${actionLabel}`
        )
        if (!confirmed.isConfirmed) return

        setIsUpdatingStatus(true)
        const toastId = toast.loading(`Updating status to ${actionLabel}...`)

        try {
            const payload = {
                status: newStatus,
                changedBy: {
                    name: currentUser?.displayName || "Admin / Staff",
                    email: currentUser?.email || "",
                    role: role || "admin"
                }
            }

            const res = await axiosSecure.patch(`/booking/${booking._id}`, payload)
            if (res.data) {
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ["requestBookings"] }),
                    queryClient.invalidateQueries({ queryKey: ["all-bookings-for-calendar"] }),
                    queryClient.invalidateQueries({ queryKey: ["bookings"] }),
                    queryClient.invalidateQueries({ queryKey: ["admin-overview"] }),
                    refetchBookingDetails(),
                    onSuccess?.()
                ])
                toast.success(`Reservation marked as ${actionLabel}!`, { id: toastId })
            }
        } catch (err) {
            console.error("Quick status change error:", err)
            toast.error(err.response?.data?.message || `Failed to update to ${actionLabel}`, { id: toastId })
        } finally {
            setIsUpdatingStatus(false)
        }
    }

    const handleDelete = () => {
        if (!canDelete) {
            toast.error("Only Admin and Manager can delete bookings.")
            return
        }

        showConfirmAlert(
            `Delete Booking ${booking.bookingId}?`,
            `Permanently delete booking record for ${booking.name}.`,
            "Yes, delete record",
            true
        ).then(async (result) => {
            if (result.isConfirmed) {
                const toastId = toast.loading("Deleting reservation...")
                try {
                    await axiosSecure.delete(`/booking/${booking._id}`)
                    await Promise.all([
                        queryClient.invalidateQueries({ queryKey: ["requestBookings"] }),
                        queryClient.invalidateQueries({ queryKey: ["all-bookings-for-calendar"] }),
                        queryClient.invalidateQueries({ queryKey: ["bookings"] }),
                        queryClient.invalidateQueries({ queryKey: ["admin-overview"] }),
                        onSuccess?.()
                    ])
                    toast.success("Reservation deleted successfully.", { id: toastId })
                    onClose()
                } catch (err) {
                    console.error(err)
                    toast.error("Failed to delete reservation.", { id: toastId })
                }
            }
        })
    }

    if (!isOpen || !bookingId) return null

    const bookingRooms = booking ? getBookingRooms(booking) : []
    const guestTotals = booking ? getBookingGuestTotals(booking) : { adults: 0, babies: 0 }
    const totalAmount = booking ? getBookingTotal(booking) : 0
    const paidAmount = Number(booking?.paidAmount || booking?.advanceAmount || 0)
    const dueAmount = Math.max(0, totalAmount - paidAmount)

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs">
                            <BedDouble size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                                    Reservation Details
                                </h3>
                                {booking?.status && getStatusBadge(booking.status)}
                            </div>
                            <p className="text-xs text-slate-500 font-mono">
                                {booking?.bookingId || bookingId}
                            </p>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="btn btn-ghost btn-sm btn-circle text-slate-400 hover:text-slate-700"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs sm:text-sm">
                    {isLoading || !booking ? (
                        <div className="text-center py-16 text-slate-400 space-y-2">
                            <div className="loading loading-spinner loading-lg text-teal-600 mx-auto" />
                            <p className="font-medium text-slate-600">Loading reservation information...</p>
                        </div>
                    ) : (
                        <>
                            {/* Top Summary Banner */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-teal-50/50 border border-teal-100">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleCopyBookingId(booking.bookingId)}
                                            className="font-mono text-xs font-bold text-teal-900 bg-teal-100 hover:bg-teal-200 px-2.5 py-1 rounded-xl border border-teal-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                                            title="Click to copy Booking ID"
                                        >
                                            <span>{booking.bookingId}</span>
                                            {copiedId === booking.bookingId ? <Check size={12} className="text-emerald-700" /> : <Copy size={12} />}
                                        </button>
                                        <h4 className="font-extrabold text-slate-900 text-base sm:text-lg">
                                            {booking.name}
                                        </h4>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Created: {booking.createdAt ? new Date(booking.createdAt).toLocaleString() : "N/A"}
                                        {booking.requestedByRole && ` · By ${booking.requestedByRole.toUpperCase()}`}
                                    </p>
                                </div>

                                <div className="sm:text-right">
                                    <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Total Bill</span>
                                    <span className="font-black text-teal-900 text-lg sm:text-xl">
                                        ৳{Number(totalAmount || 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Guest Details */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-2.5 text-slate-700">
                                    <Phone size={15} className="text-teal-600 shrink-0" />
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Mobile</span>
                                        <a href={`tel:${booking.mobile}`} className="font-bold hover:text-teal-700 transition-colors">
                                            {booking.mobile || "N/A"}
                                        </a>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2.5 text-slate-700">
                                    <Mail size={15} className="text-teal-600 shrink-0" />
                                    <div className="min-w-0">
                                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Email</span>
                                        <span className="truncate block font-medium">
                                            {booking.userEmail || "Not provided"}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2.5 text-slate-700">
                                    <MapPin size={15} className="text-teal-600 shrink-0" />
                                    <div className="min-w-0">
                                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Address</span>
                                        <span className="truncate block font-medium">
                                            {booking.address || "Not provided"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Accommodation Breakdown */}
                            <div className="space-y-2.5">
                                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <BedDouble size={14} className="text-teal-600" />
                                    <span>Rooms Reserved ({bookingRooms.length})</span>
                                </h5>

                                <div className="grid grid-cols-1 gap-2">
                                    {bookingRooms.map((room, rIdx) => {
                                        const categoryName = getRoomName(room)
                                        const nights = getNightCount(room.checkIn, room.checkOut)
                                        const pricePerNight = Number(room.pricePerNight || room.price || 0)
                                        const roomSubtotal = pricePerNight * nights

                                        return (
                                            <div 
                                                key={rIdx} 
                                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-white border border-slate-200 text-xs shadow-2xs"
                                            >
                                                <div className="space-y-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="badge badge-sm bg-teal-600 text-white font-bold">
                                                            Room {rIdx + 1}
                                                        </span>
                                                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                                            {categoryName}
                                                        </span>
                                                        {room.roomNo ? (
                                                            <span className="badge badge-xs bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">
                                                                Room No: {room.roomNo}
                                                            </span>
                                                        ) : (
                                                            <span className="badge badge-xs bg-amber-100 text-amber-900 font-semibold border border-amber-300">
                                                                Unassigned
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-3 text-[11px] text-slate-600 pt-0.5">
                                                        <span className="flex items-center gap-1 font-medium">
                                                            <Calendar size={12} className="text-teal-600" />
                                                            {room.checkIn} → {room.checkOut} ({nights} Night{nights !== 1 ? 's' : ''})
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <UsersIcon size={12} className="text-teal-600" />
                                                            {room.adults || 1} Adult{Number(room.adults) > 1 ? 's' : ''}
                                                            {Number(room.babies) > 0 ? ` • ${room.babies} Baby` : ''}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="sm:text-right shrink-0">
                                                    <span className="text-[10px] text-slate-400 block">
                                                        ৳{pricePerNight.toLocaleString()} / night
                                                    </span>
                                                    <span className="font-extrabold text-teal-900 text-xs sm:text-sm">
                                                        ৳{roomSubtotal.toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Payment & Staff Reference Details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 text-xs">
                                <div className="space-y-1.5">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Total Bill:</span>
                                        <strong className="text-slate-900">৳{totalAmount.toLocaleString()}</strong>
                                    </div>
                                    {Number(booking.discountAmount || 0) > 0 && (
                                        <div className="flex justify-between text-emerald-700 font-medium">
                                            <span>Special Discount:</span>
                                            <strong>-৳{Number(booking.discountAmount).toLocaleString()}</strong>
                                        </div>
                                    )}
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Paid / Done:</span>
                                        <strong className="text-emerald-700">৳{paidAmount.toLocaleString()}</strong>
                                    </div>
                                    <div className="flex justify-between border-t border-slate-200 pt-1">
                                        <span className="text-slate-500 font-semibold">Due Balance:</span>
                                        <strong className={`font-bold ${dueAmount > 0 ? 'text-orange-600' : 'text-emerald-700'}`}>
                                            ৳{dueAmount.toLocaleString()}
                                        </strong>
                                    </div>
                                    <div className="pt-1">
                                        {dueAmount > 0 ? (
                                            <button
                                                type="button"
                                                onClick={() => setIsAddPaymentOpen(true)}
                                                className="btn btn-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-1 border-none shadow-xs w-full"
                                            >
                                                <CreditCard size={12} />
                                                <span>Collect Due Payment (৳{dueAmount.toLocaleString()})</span>
                                            </button>
                                        ) : (
                                            <span className="badge badge-xs bg-emerald-100 text-emerald-800 font-bold border-none">
                                                Fully Paid ✅
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1.5 sm:border-l sm:border-slate-200 sm:pl-3">
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Reference:</span>
                                        <span className="font-medium text-slate-800">{booking.reference || "None"}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Transaction ID:</span>
                                        <span className="font-medium text-slate-800">{booking.transactionId || "None"}</span>
                                    </div>
                                    {booking.notes && (
                                        <div>
                                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Notes:</span>
                                            <span className="italic text-slate-600">"{booking.notes}"</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Latest Status Change Audit */}
                            {Array.isArray(booking.statusHistory) && booking.statusHistory.length > 0 && (
                                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] text-slate-500 space-y-1">
                                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                                        <History size={13} className="text-teal-600" /> Latest Status Log
                                    </div>
                                    {(() => {
                                        const lastLog = booking.statusHistory[booking.statusHistory.length - 1]
                                        return (
                                            <p>
                                                Status set to <strong className="text-slate-800">{lastLog.status}</strong> on {lastLog.time ? new Date(lastLog.time).toLocaleString() : "N/A"}
                                                {lastLog.changedBy?.name && ` by ${lastLog.changedBy.name} (${lastLog.changedBy.role || "staff"})`}.
                                            </p>
                                        )
                                    })()}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer Controls & Status Change Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 px-6 py-4 border-t border-slate-100 bg-slate-50/70 shrink-0">
                    <div className="flex items-center gap-2">
                        {/* View Full Details Page Button */}
                        <Link
                            to={`/dashboard/bookings/${bookingId}`}
                            className="btn btn-sm btn-outline border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl gap-1 font-bold"
                            title="Go to full reservation audit and receipt page"
                        >
                            <Eye size={14} />
                            <span>View Full Details Page</span>
                            <ExternalLink size={12} className="opacity-60" />
                        </Link>

                        {booking && (
                            <button
                                type="button"
                                onClick={() => setEditBooking(booking)}
                                className="btn btn-sm btn-ghost text-teal-700 hover:bg-teal-50 rounded-xl gap-1"
                            >
                                <Pencil size={13} /> Edit
                            </button>
                        )}

                        {booking && canDelete && (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="btn btn-sm btn-ghost text-rose-600 hover:bg-rose-50 rounded-xl gap-1"
                                title="Delete reservation"
                            >
                                <Trash2 size={13} /> Delete
                            </button>
                        )}
                    </div>

                    {booking && (
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Cancel Booking */}
                            {!["cancel", "cancelled", "checked_out"].includes(booking.status) && (
                                <button
                                    type="button"
                                    onClick={() => setCancelBooking(booking)}
                                    className="btn btn-sm btn-outline border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl gap-1"
                                >
                                    <XCircle size={14} /> Cancel
                                </button>
                            )}

                            {/* Action: Set to Payment Waiting */}
                            {booking.status === "request_booking" && (
                                <button
                                    type="button"
                                    onClick={() => setConfirmModalData({ booking, targetStatus: "payment_waiting" })}
                                    className="btn btn-sm bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl gap-1 shadow-xs border-none"
                                >
                                    <Clock size={14} /> Payment Waiting
                                </button>
                            )}

                            {/* Action: Confirm Booking */}
                            {["request_booking", "payment_waiting"].includes(booking.status) && (
                                <button
                                    type="button"
                                    onClick={() => setConfirmModalData({ booking, targetStatus: "booking_confirmed" })}
                                    className="btn btn-sm bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl gap-1 shadow-xs border-none"
                                >
                                    <CheckCircle2 size={14} /> Confirm Booking
                                </button>
                            )}

                            {/* Action: Check In */}
                            {["booking_confirmed", "confirmed"].includes(booking.status) && (
                                <button
                                    type="button"
                                    disabled={isUpdatingStatus}
                                    onClick={() => handleQuickStatusChange("checked_id", "Checked In")}
                                    className="btn btn-sm bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl gap-1 shadow-xs border-none"
                                >
                                    <LogIn size={14} /> Check In
                                </button>
                            )}

                            {/* Action: Check Out */}
                            {booking.status === "checked_id" && (
                                <button
                                    type="button"
                                    disabled={isUpdatingStatus}
                                    onClick={() => handleQuickStatusChange("checked_out", "Checked Out")}
                                    className="btn btn-sm bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl gap-1 shadow-xs border-none"
                                >
                                    <LogOut size={14} /> Check Out
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Nested Status Change Confirm Modal */}
            {confirmModalData && (
                <ConfirmBookingModal
                    isOpen={!!confirmModalData}
                    onClose={() => setConfirmModalData(null)}
                    booking={confirmModalData.booking}
                    targetStatus={confirmModalData.targetStatus}
                    currentUser={currentUser}
                    role={role}
                    onSuccess={async () => {
                        await Promise.all([
                            refetchBookingDetails(),
                            onSuccess?.()
                        ])
                    }}
                />
            )}

            {/* Nested Edit Booking Modal */}
            {editBooking && (
                <EditBookingModal
                    isOpen={!!editBooking}
                    onClose={() => setEditBooking(null)}
                    booking={editBooking}
                    currentUser={currentUser}
                    role={role}
                    onSuccess={async () => {
                        await Promise.all([
                            refetchBookingDetails(),
                            onSuccess?.()
                        ])
                    }}
                />
            )}

            {/* Nested Cancel Reason Modal */}
            {cancelBooking && (
                <CancelBookingModal
                    isOpen={!!cancelBooking}
                    onClose={() => setCancelBooking(null)}
                    booking={cancelBooking}
                    currentUser={currentUser}
                    role={role}
                    onSuccess={async () => {
                        await Promise.all([
                            refetchBookingDetails(),
                            onSuccess?.()
                        ])
                    }}
                />
            )}

            {/* Nested Add Payment Modal */}
            {isAddPaymentOpen && (
                <AddPaymentModal
                    isOpen={isAddPaymentOpen}
                    onClose={() => setIsAddPaymentOpen(false)}
                    booking={booking}
                    currentUser={currentUser}
                    role={role}
                    onSuccess={async () => {
                        await Promise.all([
                            refetchBookingDetails(),
                            onSuccess?.()
                        ])
                    }}
                />
            )}
        </div>,
        document.body
    )
}

export default CalendarBookingDetailsModal
