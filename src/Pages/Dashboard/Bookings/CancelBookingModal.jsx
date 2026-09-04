import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQueryClient } from '@tanstack/react-query'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
import toast from 'react-hot-toast'
import { XCircle, X, AlertTriangle, FileText, Wallet } from 'lucide-react'
import { getBookingDateSummary, getBookingPaidAmount, getBookingTotal } from '../../../utils/bookingUtils'

const CancelBookingModal = ({ booking, isOpen, onClose, onSuccess, currentUser, role }) => {
    const axiosSecure = useAxiosSecure()
    const queryClient = useQueryClient()
    const [cancelReason, setCancelReason] = useState('')
    const [refundAmount, setRefundAmount] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    if (!isOpen || !booking) return null

    const currentPaid = getBookingPaidAmount(booking)
    const totalBill = getBookingTotal(booking)

    const handleCancelSubmit = async (e) => {
        e.preventDefault()
        
        const refundNum = Number(refundAmount || 0)
        if (isNaN(refundNum) || refundNum < 0) {
            toast.error("Please enter a valid refund amount (0 or more).")
            return
        }

        if (refundNum > currentPaid) {
            toast.error(`Refund amount cannot exceed total paid amount (৳${currentPaid.toLocaleString()}).`)
            return
        }

        setIsSubmitting(true)
        const toastId = toast.loading("Cancelling reservation...")

        try {
            const newPaidAmount = Math.max(0, currentPaid - refundNum)
            const payload = {
                status: "cancel",
                cancelReason: cancelReason.trim() || "No reason provided",
                refundAmount: refundNum,
                paidAmount: newPaidAmount,
                changedBy: {
                    name: currentUser?.displayName || "Admin / Staff",
                    email: currentUser?.email || "",
                    role: role || "admin"
                }
            }

            const res = await axiosSecure.patch(`/booking/${booking._id}`, payload)
            if (res.data) {
                onClose()
                toast.success(
                    refundNum > 0 
                        ? `Reservation cancelled & refund of ৳${refundNum.toLocaleString()} processed.` 
                        : "Reservation cancelled.", 
                    { id: toastId }
                )
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ["requestBookings"] }),
                    queryClient.invalidateQueries({ queryKey: ["all-bookings-for-calendar"] }),
                    queryClient.invalidateQueries({ queryKey: ["bookings"] }),
                    queryClient.invalidateQueries({ queryKey: ["cancelledBookings"] }),
                    queryClient.invalidateQueries({ queryKey: ["admin-overview"] }),
                    queryClient.invalidateQueries({ queryKey: ["booking", booking._id] })
                ])
                if (onSuccess) {
                    try {
                        await onSuccess()
                    } catch (e) {
                        console.error("onSuccess callback error:", e)
                    }
                }
            }
        } catch (err) {
            console.error(err)
            toast.error(err.response?.data?.message || "Failed to cancel reservation", { id: toastId })
        } finally {
            setIsSubmitting(false)
        }
    }

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-rose-50/60 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                            <XCircle size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-base">Cancel Reservation</h3>
                            <p className="text-xs text-rose-700 font-mono font-semibold">
                                {booking.bookingId}
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

                {/* Form */}
                <form onSubmit={handleCancelSubmit} className="p-6 space-y-4 text-xs sm:text-sm">
                    <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
                        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-bold">Are you sure you want to cancel this booking?</p>
                            <p className="text-amber-800/80 mt-0.5">
                                Guest: <span className="font-semibold text-slate-900">{booking.name}</span> ({getBookingDateSummary(booking)})
                            </p>
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-medium">Total Bill:</span>
                            <span className="font-mono font-bold text-slate-800">৳{totalBill.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-medium">Total Paid / Advance:</span>
                            <span className="font-mono font-bold text-emerald-700">৳{currentPaid.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Refund Amount Input */}
                    <div className="form-control">
                        <label className="label py-1">
                            <span className="label-text font-semibold text-slate-700 text-xs flex items-center justify-between w-full">
                                <span className="flex items-center gap-1">
                                    <Wallet size={13} className="text-emerald-600" /> Refund Amount (৳)
                                </span>
                                <span className="text-[11px] text-slate-500 font-normal">
                                    Max: <strong className="text-emerald-700 font-mono font-bold">৳{currentPaid.toLocaleString()}</strong>
                                </span>
                            </span>
                        </label>
                        <input
                            type="number"
                            min="0"
                            max={currentPaid}
                            step="any"
                            value={refundAmount}
                            onChange={e => setRefundAmount(e.target.value)}
                            placeholder="0"
                            className="input input-bordered input-sm w-full rounded-xl bg-white text-xs font-mono font-bold text-slate-800"
                        />
                        {Number(refundAmount || 0) > 0 && (
                            <p className="text-[11px] text-slate-500 mt-1">
                                Remaining Net Paid after refund: <strong className="font-mono text-slate-800">৳{Math.max(0, currentPaid - Number(refundAmount || 0)).toLocaleString()}</strong>
                            </p>
                        )}
                    </div>

                    {/* Cancellation Reason */}
                    <div className="form-control">
                        <label className="label py-1">
                            <span className="label-text font-semibold text-slate-700 text-xs flex items-center gap-1">
                                <FileText size={13} className="text-slate-500" /> Reason for Cancellation (Optional)
                            </span>
                        </label>
                        <textarea
                            value={cancelReason}
                            onChange={e => setCancelReason(e.target.value)}
                            placeholder="e.g. Guest requested cancellation, no payment received, schedule change..."
                            rows={3}
                            className="textarea textarea-bordered textarea-sm w-full rounded-xl bg-white text-xs"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="btn btn-sm btn-ghost rounded-xl px-4 text-slate-600"
                        >
                            Keep Booking
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn btn-sm btn-error text-white rounded-xl px-5 font-bold shadow-md shadow-rose-600/20"
                        >
                            {isSubmitting ? <span className="loading loading-spinner loading-sm" /> : "Confirm Cancellation"}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}

export default CancelBookingModal
