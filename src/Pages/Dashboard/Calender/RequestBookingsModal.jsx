import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
import toast from 'react-hot-toast'
import { showConfirmAlert } from '../../../utils/customSwal'
import {
    Clock,
    X,
    User,
    Phone,
    BedDouble,
    Calendar,
    Users as UsersIcon,
    DollarSign,
    CreditCard,
    CheckCircle2,
    XCircle,
    Pencil,
    Trash2,
    Eye,
    ExternalLink,
    Mail,
    MapPin,
    Tag,
    FileText,
    ShieldAlert,
    Copy,
    Check
} from 'lucide-react'
import { 
    formatDate,
    getBookingDateSummary, 
    getBookingGuestTotals, 
    getBookingRooms, 
    getBookingTotal, 
    getNightCount, 
    getRoomName 
} from '../../../utils/bookingUtils'
import ConfirmBookingModal from '../Bookings/ConfirmBookingModal'
import EditBookingModal from '../Bookings/EditBookingModal'
import CancelBookingModal from '../Bookings/CancelBookingModal'

const getRequestBookingStatusBadge = (status) => {
    switch (status) {
        case "payment_waiting":
            return (
                <span className="badge badge-md bg-rose-600 text-white font-bold border-none shadow-xs">
                    <Clock size={12} className="mr-1" /> Payment Waiting
                </span>
            )
        case "booking_confirmed":
        case "confirmed":
            return (
                <span className="badge badge-md bg-[#5261d6] text-white font-bold border-none shadow-xs">
                    <CheckCircle2 size={12} className="mr-1" /> Confirmed
                </span>
            )
        case "checked_id":
        case "checked_in":
            return (
                <span className="badge badge-md bg-[#01966e] text-white font-bold border-none shadow-xs">
                    <CheckCircle2 size={12} className="mr-1" /> Checked In
                </span>
            )
        default:
            return (
                <span className="badge badge-md bg-[#f59e0b] text-white font-bold border-none shadow-xs">
                    <Clock size={12} className="mr-1" /> Request Booking
                </span>
            )
    }
}

const RequestBookingsModal = ({ isOpen, onClose, requestBookings = [], role, currentUser, onSuccess }) => {
    const axiosSecure = useAxiosSecure()
    const queryClient = useQueryClient()

    // Sub-modals
    const [confirmModalData, setConfirmModalData] = useState(null) // { booking, targetStatus }
    const [editBooking, setEditBooking] = useState(null)
    const [cancelBooking, setCancelBooking] = useState(null)
    const [copiedId, setCopiedId] = useState(null)
    const isB2B = role === "b2b"
    const canDelete = ["admin", "manager"].includes(role)
    const canEdit = ["admin", "manager", "agent"].includes(role)

    const handleCopyBookingId = (bookingId) => {
        if (!bookingId) return
        navigator.clipboard.writeText(bookingId)
        setCopiedId(bookingId)
        toast.success(`Copied ID: ${bookingId}`)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const res = await axiosSecure.delete(`/booking/${id}`)
            return res.data
        },
        onMutate: () => ({ toastId: toast.loading("Deleting request reservation...") }),
        onSuccess: async (_, __, context) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["requestBookings"] }),
                queryClient.invalidateQueries({ queryKey: ["all-bookings-for-calendar"] }),
                queryClient.invalidateQueries({ queryKey: ["bookings"] }),
                queryClient.invalidateQueries({ queryKey: ["admin-overview"] }),
                onSuccess?.()
            ])
            toast.dismiss(context?.toastId)
            toast.success("Reservation deleted successfully.")
        },
        onError: (_, __, context) => {
            toast.dismiss(context?.toastId)
            toast.error("Failed to delete reservation.")
        }
    })

    const handleDelete = (booking) => {
        if (!canDelete) {
            toast.error("Only Admin and Manager can delete bookings.")
            return
        }

        showConfirmAlert(
            `Delete Request ${booking.bookingId}?`,
            `Permanently delete booking request for ${booking.name}.`,
            "Yes, delete record",
            true
        ).then(result => {
            if (result.isConfirmed) deleteMutation.mutate(booking._id)
        })
    }

    if (!isOpen) return null

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-amber-100 bg-amber-50/70 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-sm shadow-amber-500/30">
                            <Clock size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-900 text-base sm:text-lg">Pending Booking Requests</h3>
                                <span className="badge badge-sm bg-amber-500 text-white font-bold border-none">
                                    {requestBookings.length} Request{requestBookings.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                Full details view · Change status, confirm room assignments, edit, or cancel directly.
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
                <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
                    {requestBookings.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 space-y-2">
                            <Clock size={44} className="mx-auto opacity-40 text-amber-500" />
                            <p className="font-bold text-slate-700 text-base">No pending booking requests</p>
                            <p className="text-xs text-slate-400">All guest booking requests have been confirmed or processed.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {requestBookings.map((b) => {
                                const bookingRooms = getBookingRooms(b)
                                const guestTotals = getBookingGuestTotals(b)
                                const totalAmount = getBookingTotal(b)
                                const paidAmount = Number(b.paidAmount || b.advanceAmount || 0)
                                const dueAmount = Math.max(0, totalAmount - paidAmount)

                                return (
                                    <div 
                                        key={b._id} 
                                        className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-amber-400 transition-all shadow-xs hover:shadow-md space-y-4"
                                    >
                                        {/* Header Row: ID, Name, Total, Role */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyBookingId(b.bookingId)}
                                                    className="font-mono text-xs font-bold text-amber-900 bg-amber-100/90 hover:bg-amber-200 px-2.5 py-1 rounded-xl border border-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                                                    title="Click to copy Booking ID"
                                                >
                                                    <span>{b.bookingId}</span>
                                                    {copiedId === b.bookingId ? <Check size={12} className="text-emerald-700" /> : <Copy size={12} />}
                                                </button>

                                                <h4 className="font-extrabold text-slate-900 text-base">
                                                    {b.name}
                                                </h4>

                                                {b.requestedByRole && (
                                                    <span className="badge badge-xs uppercase font-bold tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                                        {b.requestedByRole}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                <div className="text-right">
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">Total Bill</span>
                                                    <span className="font-black text-slate-900 text-base sm:text-lg">
                                                        ৳{Number(totalAmount || 0).toLocaleString()}
                                                    </span>
                                                </div>
                                                {getRequestBookingStatusBadge(b.status)}
                                            </div>
                                        </div>

                                        {/* Guest Contact Details */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
                                            <div className="flex items-center gap-2 text-slate-700">
                                                <Phone size={14} className="text-teal-600 shrink-0" />
                                                <div>
                                                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Mobile</span>
                                                    <a href={`tel:${b.mobile}`} className="font-bold hover:text-teal-700 transition-colors">
                                                        {b.mobile}
                                                    </a>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 text-slate-700">
                                                <Mail size={14} className="text-teal-600 shrink-0" />
                                                <div className="min-w-0">
                                                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Email</span>
                                                    <span className="truncate block font-medium">
                                                        {b.userEmail || "Not provided"}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 text-slate-700">
                                                <MapPin size={14} className="text-teal-600 shrink-0" />
                                                <div className="min-w-0">
                                                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Address</span>
                                                    <span className="truncate block font-medium">
                                                        {b.address || "Not provided"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Booked Rooms & Category Details */}
                                        <div className="space-y-2">
                                            <h5 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                                                <BedDouble size={13} className="text-teal-600" />
                                                <span>Booked Accommodation Breakdown ({bookingRooms.length} Room{bookingRooms.length !== 1 ? 's' : ''})</span>
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
                                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-2xl bg-teal-50/40 border border-teal-100 text-xs"
                                                        >
                                                            {/* Room Category & Room Number */}
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
                                                                            Room No Pending
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                <div className="flex items-center gap-3 text-[11px] text-slate-600 pt-0.5">
                                                                    <span className="flex items-center gap-1 font-medium">
                                                                        <Calendar size={12} className="text-teal-600" />
                                                                        {formatDate(room.checkIn)} → {formatDate(room.checkOut)} ({nights} Night{nights !== 1 ? 's' : ''})
                                                                    </span>
                                                                    <span className="flex items-center gap-1">
                                                                        <UsersIcon size={12} className="text-teal-600" />
                                                                        {room.adults || 1} Adult{Number(room.adults) > 1 ? 's' : ''}
                                                                        {Number(room.babies) > 0 ? ` • ${room.babies} Baby` : ''}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Rate & Subtotal */}
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

                                        {/* Financial / Notes Footer */}
                                        {(b.reference || b.notes || paidAmount > 0) && (
                                            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    {b.reference && (
                                                        <span>
                                                            <strong className="text-slate-800">Reference:</strong> {b.reference}
                                                        </span>
                                                    )}
                                                    {b.transactionId && (
                                                        <span>
                                                            <strong className="text-slate-800">Trx ID:</strong> {b.transactionId}
                                                        </span>
                                                    )}
                                                    {b.notes && (
                                                        <span className="italic text-slate-500">
                                                            <strong className="text-slate-700 not-italic">Note:</strong> "{b.notes}"
                                                        </span>
                                                    )}
                                                </div>

                                                {paidAmount > 0 && (
                                                    <div className="flex items-center gap-2 font-semibold">
                                                        <span className="text-emerald-700">Paid: ৳{paidAmount.toLocaleString()}</span>
                                                        <span className="text-rose-700">Due: ৳{dueAmount.toLocaleString()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Direct Action Buttons */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                                            <div className="flex items-center gap-1.5">
                                                <Link
                                                    to={`/dashboard/bookings/${b._id}`}
                                                    className="btn btn-xs btn-outline border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl gap-1"
                                                    title="View complete booking audit and logs"
                                                >
                                                    <Eye size={12} /> View Page
                                                </Link>
                                                {canEdit && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditBooking(b)}
                                                        className="btn btn-xs btn-ghost text-teal-700 hover:bg-teal-50 rounded-xl gap-1"
                                                    >
                                                        <Pencil size={12} /> Edit
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(b)}
                                                        className="btn btn-xs btn-ghost text-rose-600 hover:bg-rose-50 rounded-xl gap-1"
                                                        title="Delete booking request (Admin/Manager only)"
                                                    >
                                                        <Trash2 size={12} /> Delete
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2">
                                                {!isB2B && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setCancelBooking(b)}
                                                        className="btn btn-xs btn-outline border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl gap-1"
                                                    >
                                                        <XCircle size={13} /> Cancel
                                                    </button>
                                                )}

                                                {/* Status Change Action 1: Payment Waiting (Only for request_booking) */}
                                                {b.status === "request_booking" && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmModalData({ booking: b, targetStatus: "payment_waiting" })}
                                                        className="btn btn-xs bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl gap-1 shadow-xs border-none"
                                                    >
                                                        <Clock size={13} /> Payment Waiting
                                                    </button>
                                                )}

                                                {/* Status Change Action 2: Confirm Booking (Staff only) */}
                                                {!isB2B && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmModalData({ booking: b, targetStatus: "booking_confirmed" })}
                                                        className="btn btn-xs bg-[#5261d6] hover:bg-[#4351be] text-white font-bold rounded-xl gap-1 shadow-xs border-none"
                                                    >
                                                        <CheckCircle2 size={13} /> Confirm Booking
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Status Change Confirm Modal */}
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
                            queryClient.invalidateQueries({ queryKey: ["requestBookings"] }),
                            queryClient.invalidateQueries({ queryKey: ["all-bookings-for-calendar"] }),
                            queryClient.invalidateQueries({ queryKey: ["bookings"] }),
                            queryClient.invalidateQueries({ queryKey: ["admin-overview"] }),
                            onSuccess?.()
                        ])
                    }}
                />
            )}

            {/* Edit Booking Modal */}
            {editBooking && (
                <EditBookingModal
                    isOpen={!!editBooking}
                    onClose={() => setEditBooking(null)}
                    booking={editBooking}
                    currentUser={currentUser}
                    role={role}
                    onSuccess={async () => {
                        await Promise.all([
                            queryClient.invalidateQueries({ queryKey: ["requestBookings"] }),
                            queryClient.invalidateQueries({ queryKey: ["all-bookings-for-calendar"] }),
                            queryClient.invalidateQueries({ queryKey: ["bookings"] }),
                            queryClient.invalidateQueries({ queryKey: ["admin-overview"] }),
                            onSuccess?.()
                        ])
                    }}
                />
            )}

            {/* Cancel Reason Modal */}
            {cancelBooking && (
                <CancelBookingModal
                    isOpen={!!cancelBooking}
                    onClose={() => setCancelBooking(null)}
                    booking={cancelBooking}
                    currentUser={currentUser}
                    role={role}
                    onSuccess={async () => {
                        await Promise.all([
                            queryClient.invalidateQueries({ queryKey: ["requestBookings"] }),
                            queryClient.invalidateQueries({ queryKey: ["all-bookings-for-calendar"] }),
                            queryClient.invalidateQueries({ queryKey: ["bookings"] }),
                            queryClient.invalidateQueries({ queryKey: ["admin-overview"] }),
                            onSuccess?.()
                        ])
                    }}
                />
            )}
        </div>,
        document.body
    )
}

export default RequestBookingsModal
