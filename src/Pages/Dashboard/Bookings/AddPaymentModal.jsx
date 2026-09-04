import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
import toast from 'react-hot-toast'
import {
    DollarSign,
    CreditCard,
    X,
    Receipt,
    UserCheck,
    FileText,
    CheckCircle2,
    AlertCircle,
    Wallet
} from 'lucide-react'
import { 
    getBookingTotal, 
    getBookingSubtotal, 
    getBookingDiscount, 
    getBookingPaidAmount, 
    getBookingDueAmount 
} from '../../../utils/bookingUtils'

const PAYMENT_METHODS = [
    { value: "bKash", label: "bKash (Mobile)" },
    { value: "Nagad", label: "Nagad (Mobile)" },
    { value: "Rocket", label: "Rocket (DBBL)" },
    { value: "Upay", label: "Upay (UCB)" },
    { value: "Card / POS", label: "Card / POS (Visa/Master/Amex)" },
    { value: "Cash", label: "Cash (Front Desk)" },
    { value: "Bank Cheque", label: "Bank Cheque / Cheque" },
    { value: "Bank Transfer", label: "Bank Transfer / EFT / BEFTN" },
    { value: "Online Gateway", label: "Online Payment Gateway" },
    { value: "Other", label: "Other" }
]

const AddPaymentModal = ({
    isOpen,
    onClose,
    booking,
    currentUser,
    role,
    onSuccess
}) => {
    const axiosSecure = useAxiosSecure()
    const queryClient = useQueryClient()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const subtotal = booking ? getBookingSubtotal(booking) : 0
    const discountAmount = booking ? getBookingDiscount(booking) : 0
    const payableTotal = booking ? getBookingTotal(booking) : 0
    const alreadyPaid = booking ? getBookingPaidAmount(booking) : 0
    const dueBalance = booking ? getBookingDueAmount(booking) : 0

    const [amount, setAmount] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('')
    const [reference, setReference] = useState('')
    const [transactionId, setTransactionId] = useState('')
    const [note, setNote] = useState('')

    // Staff/Admin users for reference dropdown
    const { data: allUsers = [] } = useQuery({
        queryKey: ["all-users-for-payment-modal"],
        queryFn: async () => {
            const res = await axiosSecure.get("/users")
            return res.data
        },
        enabled: isOpen
    })

    const eligibleReferences = allUsers.filter(u => u.role && u.role !== "user")

    useEffect(() => {
        if (isOpen && booking) {
            setAmount('')
            setPaymentMethod('')
            setReference(booking.reference || '')
            setTransactionId('')
            setNote('')
        }
    }, [isOpen, booking, dueBalance])

    if (!isOpen || !booking) return null

    const handleSubmit = async (e) => {
        e.preventDefault()
        const payAmount = Number(amount)
        if (isNaN(payAmount) || payAmount <= 0) {
            toast.error("Please enter a valid payment amount.")
            return
        }

        if (dueBalance <= 0) {
            toast.error("This booking has no outstanding due balance.")
            return
        }

        if (payAmount > dueBalance) {
            toast.error(`Payment amount (৳${payAmount.toLocaleString()}) cannot be greater than current due balance (৳${dueBalance.toLocaleString()}).`)
            return
        }

        if (!paymentMethod) {
            toast.error("Please select a payment method.")
            return
        }

        const isDigitalPayment = !["Cash", "Other"].includes(paymentMethod)
        if (isDigitalPayment && !transactionId.trim()) {
            toast.error(`Transaction ID / Receipt No is required for ${paymentMethod}.`)
            return
        }

        setIsSubmitting(true)
        const toastId = toast.loading("Processing payment...")

        try {
            const payload = {
                amount: payAmount,
                paymentMethod,
                reference: reference.trim(),
                transactionId: transactionId.trim() || (paymentMethod === "Cash" ? "Cash / Front Desk" : (paymentMethod === "Other" ? "Other / Direct" : "")),
                note: note.trim(),
                collectedBy: {
                    name: currentUser?.displayName || "Admin / Staff",
                    email: currentUser?.email || "",
                    role: role || "admin"
                }
            }

            const res = await axiosSecure.post(`/booking/${booking._id}/add-payment`, payload)
            if (res.data) {
                onClose()
                toast.success(`Payment of ৳${payAmount.toLocaleString()} recorded successfully! 🎉`, { id: toastId })
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ["requestBookings"] }),
                    queryClient.invalidateQueries({ queryKey: ["all-bookings-for-calendar"] }),
                    queryClient.invalidateQueries({ queryKey: ["bookings"] }),
                    queryClient.invalidateQueries({ queryKey: ["admin-overview"] }),
                    queryClient.invalidateQueries({ queryKey: ["calendar-booking-detail", booking._id] }),
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
            console.error("Add payment error:", err)
            toast.error(err.response?.data?.message || "Failed to record payment.", { id: toastId })
        } finally {
            setIsSubmitting(false)
        }
    }

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-100 bg-emerald-50/70 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                            <Wallet size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-base">Record Payment / Due Collection</h3>
                            <p className="text-xs text-slate-500 font-mono font-semibold">
                                {booking.bookingId} · {booking.name}
                            </p>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        disabled={isSubmitting}
                        className="btn btn-ghost btn-sm btn-circle text-slate-400 hover:text-slate-700"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs sm:text-sm">
                    {/* Financial Overview Card */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-600">
                            <span>Room Total:</span>
                            <strong className="text-slate-900 font-bold">৳{subtotal.toLocaleString()}</strong>
                        </div>
                        {discountAmount > 0 && (
                            <div className="flex justify-between text-emerald-700 font-medium">
                                <span>Special Discount:</span>
                                <strong>-৳{discountAmount.toLocaleString()}</strong>
                            </div>
                        )}
                        {discountAmount > 0 && (
                            <div className="flex justify-between text-slate-700 font-bold border-t border-slate-200/60 pt-1">
                                <span>Net Payable Total:</span>
                                <strong className="text-teal-900 font-extrabold">৳{payableTotal.toLocaleString()}</strong>
                            </div>
                        )}
                        <div className="flex justify-between text-slate-600">
                            <span>Already Paid:</span>
                            <strong className="text-emerald-700 font-bold">৳{alreadyPaid.toLocaleString()}</strong>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-1.5">
                            <span className="font-bold text-slate-800">Current Due Balance:</span>
                            <span className={`font-black text-sm ${dueBalance > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                                ৳{dueBalance.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Amount to Pay */}
                    <div className="form-control">
                        <label className="label py-0.5">
                            <span className="label-text font-bold text-slate-800 text-xs flex items-center gap-1">
                                <DollarSign size={14} className="text-teal-600" /> Amount to Add (৳) <span className="text-red-500 font-bold">*</span>
                            </span>
                        </label>
                        <input
                            type="number"
                            required
                            min="1"
                            max={dueBalance > 0 ? dueBalance : 0}
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder={dueBalance > 0 ? `Max ৳${dueBalance.toLocaleString()}` : "0"}
                            disabled={dueBalance <= 0}
                            className={`input input-sm input-bordered rounded-xl bg-white text-xs font-bold ${
                                Number(amount) > dueBalance ? 'border-red-500 text-red-700' : 'text-teal-800'
                            }`}
                        />
                        {Number(amount) > dueBalance && (
                            <span className="text-[11px] text-red-600 font-bold mt-1 block">
                                ⚠️ Amount cannot exceed current due balance of ৳{dueBalance.toLocaleString()}
                            </span>
                        )}
                        {dueBalance > 0 && (
                            <div className="flex gap-2 mt-1.5">
                                <button
                                    type="button"
                                    onClick={() => setAmount(String(dueBalance))}
                                    className="btn btn-2xs btn-outline border-orange-300 text-orange-700 hover:bg-orange-50 rounded-lg text-[10px]"
                                >
                                    Pay Full Due (৳{dueBalance.toLocaleString()})
                                </button>
                                {dueBalance > 1000 && (
                                    <button
                                        type="button"
                                        onClick={() => setAmount(String(Math.round(dueBalance / 2)))}
                                        className="btn btn-2xs btn-outline border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg text-[10px]"
                                    >
                                        Pay 50% (৳{Math.round(dueBalance / 2).toLocaleString()})
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Payment Method */}
                    <div className="form-control">
                        <label className="label py-0.5">
                            <span className="label-text font-bold text-slate-800 text-xs flex items-center gap-1">
                                <CreditCard size={14} className="text-teal-600" /> Payment Method <span className="text-red-500 font-bold">*</span>
                            </span>
                        </label>
                        <select
                            value={paymentMethod}
                            onChange={e => setPaymentMethod(e.target.value)}
                            className="select select-sm select-bordered rounded-xl bg-white text-xs font-semibold"
                        >
                            <option value="">-- Select Payment Method --</option>
                            {PAYMENT_METHODS.map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Reference */}
                        <div className="form-control">
                            <label className="label py-0.5">
                                <span className="label-text font-semibold text-slate-700 text-xs flex items-center gap-1">
                                    <UserCheck size={13} className="text-teal-600" /> Reference
                                </span>
                            </label>
                            <select
                                value={reference}
                                onChange={e => setReference(e.target.value)}
                                className="select select-sm select-bordered rounded-xl bg-white text-xs font-medium"
                            >
                                <option value="">-- Optional --</option>
                                {eligibleReferences.map(u => (
                                    <option key={u._id} value={u.name || u.email}>
                                        {u.name || u.email} ({u.role || "staff"})
                                    </option>
                                ))}
                                {eligibleReferences.length === 0 && (
                                    <>
                                        <option value="Direct Frontdesk">Direct Frontdesk (frontdesk)</option>
                                        <option value="Admin Management">Admin Management (admin)</option>
                                    </>
                                )}
                            </select>
                        </div>

                        {/* Transaction ID */}
                        <div className="form-control">
                            <label className="label py-0.5">
                                <span className="label-text font-bold text-slate-800 text-xs flex items-center justify-between w-full">
                                    <span className="flex items-center gap-1">
                                        <Receipt size={13} className="text-teal-600" /> Trx / Receipt No
                                    </span>
                                    {paymentMethod && !["Cash", "Other"].includes(paymentMethod) && (
                                        <span className="text-red-500 font-bold text-[10px]">* Required</span>
                                    )}
                                </span>
                            </label>
                            <input
                                type="text"
                                required={Boolean(paymentMethod && !["Cash", "Other"].includes(paymentMethod))}
                                value={transactionId}
                                onChange={e => setTransactionId(e.target.value)}
                                placeholder={paymentMethod === "Cash" || paymentMethod === "Other" ? "Optional for Cash / Other" : "e.g. TRX-938201 / Slip No"}
                                className={`input input-sm input-bordered rounded-xl bg-white text-xs font-semibold ${paymentMethod && !["Cash", "Other"].includes(paymentMethod) && !transactionId.trim() ? 'border-amber-400' : ''}`}
                            />
                        </div>
                    </div>

                    {/* Note */}
                    <div className="form-control">
                        <label className="label py-0.5">
                            <span className="label-text font-semibold text-slate-700 text-xs flex items-center gap-1">
                                <FileText size={13} className="text-teal-600" /> Payment Note (Optional)
                            </span>
                        </label>
                        <input
                            type="text"
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder="e.g. Collected remaining cash at front desk"
                            className="input input-sm input-bordered rounded-xl bg-white text-xs"
                        />
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="btn btn-sm btn-ghost rounded-xl px-4 text-slate-600"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || dueBalance <= 0 || (amount !== '' && Number(amount) > dueBalance)}
                            className="btn btn-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-5 shadow-xs border-none disabled:opacity-50"
                        >
                            {isSubmitting ? <span className="loading loading-spinner loading-xs" /> : <CheckCircle2 size={15} />}
                            <span>Confirm Payment</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}

export default AddPaymentModal
