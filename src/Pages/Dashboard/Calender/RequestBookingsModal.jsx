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
    EllipsisVertical,
    AlertCircle,
    ExternalLink
} from 'lucide-react'
import { getBookingDateSummary, getBookingGuestTotals, getBookingRooms, getBookingTotal, getRoomName } from '../../../utils/bookingUtils'
import ConfirmBookingModal from '../Bookings/ConfirmBookingModal'
import EditBookingModal from '../Bookings/EditBookingModal'
import CancelBookingModal from '../Bookings/CancelBookingModal'

const RequestBookingsModal = ({ isOpen, onClose, requestBookings = [], role, currentUser }) => {
    const axiosSecure = useAxiosSecure()
    const queryClient = useQueryClient()

    // Sub-modals
    const [confirmModalData, setConfirmModalData] = useState(null) // { booking, targetStatus }
    const [editBooking, setEditBooking] = useState(null)
    const [cancelBooking, setCancelBooking] = useState(null)

    const canDelete = role === "admin" || role === "manager"

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const res = await axiosSecure.delete(`/booking/${id}`)
            return res.data
        },
        onMutate: () => ({ toastId: toast.loading("Deleting request reservation...") }),
        onSuccess: async (_, __, context) => {
            await queryClient.invalidateQueries({ queryKey: ["requestBookings"] })
            await queryClient.invalidateQueries({ queryKey: ["bookings"] })
            await queryClient.invalidateQueries({ queryKey: ["admin-overview"] })
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
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-amber-100 bg-amber-50/70 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                            <Clock size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-900 text-base sm:text-lg">Pending Booking Requests</h3>
                                <span className="badge badge-sm bg-amber-500 text-white font-bold">
                                    {requestBookings.length} Request{requestBookings.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                Review new guest requests, change status to Payment Waiting or Confirm, edit, or cancel.
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
                <div className="p-6 overflow-y-auto space-y-4 flex-1">
                    {requestBookings.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 space-y-2">
                            <Clock size={40} className="mx-auto opacity-40 text-amber-500" />
                            <p className="font-medium text-slate-600">No pending booking requests at this moment.</p>
                            <p className="text-xs text-slate-400">All guest booking requests have been processed.</p>
                        </div>
                    ) : (
                        <div className="space-y-3.5">
                            {requestBookings.map((b) => {
                                const bookingRooms = getBookingRooms(b)
                                const guestTotals = getBookingGuestTotals(b)
                                const roomTitle = bookingRooms.map(room => getRoomName(room)).join(", ") || b.roomName || b.roomCategory
                                const dateSummary = getBookingDateSummary(b) || `${b.checkIn || ""} to ${b.checkOut || ""}`
                                const totalAmount = getBookingTotal(b)

                                return (
                                    <div 
                                        key={b._id} 
                                        className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-amber-300 transition-all shadow-xs hover:shadow-md space-y-3"
                                    >
                                        {/* Top Card Info */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    to={`/dashboard/bookings/${b._id}`}
                                                    className="font-mono text-xs font-bold text-amber-800 bg-amber-100/80 hover:bg-amber-200 px-2.5 py-1 rounded-lg border border-amber-300/60 inline-flex items-center gap-1 transition-colors"
                                                    title="View Full Booking Details"
                                                >
                                                    <span>{b.bookingId}</span>
                                                    <ExternalLink size={11} />
                                                </Link>
                                                <Link
                                                    to={`/dashboard/bookings/${b._id}`}
                                                    className="font-bold text-slate-900 text-sm sm:text-base hover:text-teal-700 transition-colors"
                                                    title="Click to view details"
                                                >
                                                    {b.name}
                                                </Link>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <span className="badge badge-sm bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
                                                    <Clock size={11} className="mr-1" /> Request Booking
                                                </span>
                                                <span className="font-extrabold text-slate-900 text-sm sm:text-base">
                                                    ৳{Number(totalAmount || 0).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Details Grid */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-600 bg-slate-50/80 p-3 rounded-xl">
                                            <div className="space-y-1">
                                                <p className="flex items-center gap-1.5"><Phone size={13} className="text-teal-600" /> {b.mobile}</p>
                                                {b.userEmail && <p className="text-[11px] text-slate-500 truncate">{b.userEmail}</p>}
                                                {b.address && <p className="text-[11px] text-slate-400 truncate">{b.address}</p>}
                                            </div>

                                            <div className="space-y-1">
                                                <p className="flex items-center gap-1.5 font-semibold text-slate-800">
                                                    <BedDouble size={13} className="text-teal-600" /> 
                                                    <span className="truncate">{roomTitle}</span>
                                                </p>
                                                <p className="flex items-center gap-1.5">
                                                    <UsersIcon size={13} className="text-teal-600" /> 
                                                    {guestTotals.adults} Adults {guestTotals.babies > 0 ? `• ${guestTotals.babies} Baby` : ""}
                                                </p>
                                            </div>

                                            <div className="space-y-1 sm:text-right">
                                                <p className="flex items-center sm:justify-end gap-1.5 font-medium text-slate-800">
                                                    <Calendar size={13} className="text-teal-600" /> {dateSummary}
                                                </p>
                                                {b.createdAt && (
                                                    <p className="text-[11px] text-slate-400">
                                                        Requested: {new Date(b.createdAt).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Action Bar */}
                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                            <div className="flex items-center gap-1.5">
                                                <Link
                                                    to={`/dashboard/bookings/${b._id}`}
                                                    className="btn btn-xs btn-outline border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg gap-1"
                                                >
                                                    <Eye size={12} /> View Details
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditBooking(b)}
                                                    className="btn btn-xs btn-ghost text-teal-700 hover:bg-teal-50 rounded-lg gap-1"
                                                >
                                                    <Pencil size={12} /> Edit
                                                </button>
                                                {canDelete && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(b)}
                                                        className="btn btn-xs btn-ghost text-rose-600 hover:bg-rose-50 rounded-lg gap-1"
                                                        title="Delete booking (Admin/Manager only)"
                                                    >
                                                        <Trash2 size={12} /> Delete
                                                    </button>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setCancelBooking(b)}
                                                    className="btn btn-xs btn-outline border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg gap-1"
                                                >
                                                    <XCircle size={12} /> Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmModalData({ booking: b, targetStatus: "payment_waiting" })}
                                                    className="btn btn-xs btn-info text-white rounded-lg gap-1 font-bold shadow-xs"
                                                >
                                                    <CreditCard size={12} /> Payment Waiting
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmModalData({ booking: b, targetStatus: "booking_confirmed" })}
                                                    className="btn btn-xs btn-primary text-white rounded-lg gap-1 font-bold shadow-xs"
                                                >
                                                    <CheckCircle2 size={12} /> Booking Confirmed
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/60 shrink-0">
                    <span className="text-xs text-slate-500">
                        {canDelete ? "🔒 Admin & Manager delete access enabled." : "👀 View & status modification access."}
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-sm btn-ghost rounded-xl px-4"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Sub-modals */}
            {confirmModalData && (
                <ConfirmBookingModal
                    booking={confirmModalData.booking}
                    targetStatus={confirmModalData.targetStatus}
                    isOpen={!!confirmModalData}
                    onClose={() => setConfirmModalData(null)}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ["requestBookings"] })
                        queryClient.invalidateQueries({ queryKey: ["bookings"] })
                        queryClient.invalidateQueries({ queryKey: ["admin-overview"] })
                    }}
                />
            )}

            {editBooking && (
                <EditBookingModal
                    booking={editBooking}
                    isOpen={!!editBooking}
                    onClose={() => setEditBooking(null)}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ["requestBookings"] })
                        queryClient.invalidateQueries({ queryKey: ["bookings"] })
                        queryClient.invalidateQueries({ queryKey: ["admin-overview"] })
                    }}
                />
            )}

            {cancelBooking && (
                <CancelBookingModal
                    booking={cancelBooking}
                    isOpen={!!cancelBooking}
                    onClose={() => setCancelBooking(null)}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ["requestBookings"] })
                        queryClient.invalidateQueries({ queryKey: ["bookings"] })
                        queryClient.invalidateQueries({ queryKey: ["admin-overview"] })
                    }}
                    currentUser={currentUser}
                    role={role}
                />
            )}
        </div>,
        document.body
    )
}

export default RequestBookingsModal
