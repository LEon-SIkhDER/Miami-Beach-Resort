import React, { useState, useEffect, useContext } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AuthContext } from '../../../Context/AuthContext'
import useRole from '../../../hooks/useRole'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
import toast from 'react-hot-toast'
import { 
    CheckCircle2, 
    CreditCard, 
    X, 
    BedDouble, 
    UserCheck, 
    Receipt, 
    Clock
} from 'lucide-react'
import { getBookingRooms, getBookingTotal, getBookingDateSummary } from '../../../utils/bookingUtils'

const ConfirmBookingModal = ({ booking, isOpen, onClose, onSuccess, targetStatus = "booking_confirmed" }) => {
    const { user: currentUser } = useContext(AuthContext)
    const { role } = useRole()
    const axiosSecure = useAxiosSecure()
    const queryClient = useQueryClient()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [assignedRooms, setAssignedRooms] = useState([])
    const [paymentMethod, setPaymentMethod] = useState('bKash')
    const [reference, setReference] = useState('')
    const [customTotalAmount, setCustomTotalAmount] = useState('')
    const [paidAmount, setPaidAmount] = useState('')
    const [transactionId, setTransactionId] = useState('')

    const isPaymentWaiting = targetStatus === "payment_waiting"

    // Fetch all categories to get room numbers under each category
    const { data: categories = [] } = useQuery({
        queryKey: ["all-categories-for-confirm"],
        queryFn: async () => {
            const res = await axiosSecure.get("/categoryandroom")
            return res.data
        },
        enabled: isOpen && !!booking
    })

    // Fetch all staff/admin users for reference dropdown (role !== 'user')
    const { data: allUsers = [] } = useQuery({
        queryKey: ["all-users-for-reference"],
        queryFn: async () => {
            const res = await axiosSecure.get("/users")
            return res.data
        },
        enabled: isOpen && !!booking
    })

    // Fetch active bookings to check which specific physical room numbers are occupied
    const { data: activeBookings = [] } = useQuery({
        queryKey: ["active-bookings-for-conflict"],
        queryFn: async () => {
            const res = await axiosSecure.get("/bookings")
            return res.data
        },
        enabled: isOpen && !!booking
    })

    const eligibleReferences = allUsers.filter(u => u.role && u.role !== "user")

    // Initialize state when modal opens with booking data
    useEffect(() => {
        if (booking && isOpen) {
            const rawRooms = getBookingRooms(booking)
            setAssignedRooms(rawRooms.map((r) => ({
                ...r,
                roomNo: r.roomNo || ""
            })))
            const defaultTotal = getBookingTotal(booking) || 0
            const initialTotal = booking.totalAmount !== undefined ? booking.totalAmount : defaultTotal
            setCustomTotalAmount(initialTotal || '')
            setPaidAmount(booking.paidAmount !== undefined ? String(booking.paidAmount) : (targetStatus === 'payment_waiting' ? '0' : String(initialTotal)))
            setPaymentMethod(booking.paymentMethod || 'bKash')
            setReference(booking.reference || "")
            setTransactionId(booking.transactionId || "")
        }
    }, [booking, isOpen, targetStatus])

    // Out of order rooms check
    const { data: outOfOrderList = [] } = useQuery({
        queryKey: ["out-of-order-for-confirm-modal"],
        queryFn: async () => {
            const res = await axiosSecure.get("/out-of-order")
            return res.data
        },
        enabled: isOpen
    })

    const isRoomOutOfOrder = (roomNo, checkIn, checkOut) => {
        if (!roomNo || !checkIn || !checkOut) return false
        return outOfOrderList.some(ooo => {
            if (!ooo || ooo.status !== "active") return false
            return String(ooo.roomNo).trim() === String(roomNo).trim() && ooo.startDate < checkOut && ooo.endDate > checkIn
        })
    }

    const handleRoomNoChange = (index, val) => {
        setAssignedRooms(prev => prev.map((r, idx) => idx === index ? { ...r, roomNo: val } : r))
    }

    // Helper: is a physical roomNo occupied for dates [checkIn, checkOut] by other bookings
    const isRoomNoOccupied = (roomNo, checkIn, checkOut, currentBookingId, currentRoomIndex) => {
        if (!roomNo || !checkIn || !checkOut) return false

        // Check if another room in the SAME active booking confirmation is assigned this roomNo
        const assignedInSameForm = assignedRooms.some((r, idx) => 
            idx !== currentRoomIndex && 
            r.roomNo === roomNo && 
            r.checkIn < checkOut && 
            r.checkOut > checkIn
        )
        if (assignedInSameForm) return true

        // Check against other confirmed/active bookings in database
        return activeBookings.some(b => {
            if (b._id === currentBookingId || b.bookingId === currentBookingId) return false
            if (["cancel", "cancelled"].includes(b.status)) return false

            const otherRooms = getBookingRooms(b)
            return otherRooms.some(r => 
                r.roomNo === roomNo && 
                r.checkIn < checkOut && 
                r.checkOut > checkIn
            )
        })
    }

    const totalRooms = assignedRooms.length
    const originalTotal = getBookingTotal(booking)
    const standardTotal = originalTotal || 0
    const finalTotal = customTotalAmount !== '' ? Number(customTotalAmount) : standardTotal
    const discountAmount = Math.max(0, standardTotal - finalTotal)
    const effectivePaid = paidAmount !== '' ? Number(paidAmount) : 0
    const dueAmount = Math.max(0, finalTotal - effectivePaid)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)
        const toastId = toast.loading(isPaymentWaiting ? "Setting to Payment Waiting..." : "Confirming booking...")

        try {
            const payload = {
                status: targetStatus,
                rooms: assignedRooms,
                totalAmount: Number(finalTotal || 0),
                discountAmount: Number(discountAmount || 0),
                paidAmount: Number(effectivePaid || 0),
                dueAmount: Number(dueAmount || 0),
                advanceAmount: Number(effectivePaid || 0),
                paymentMethod: paymentMethod || "Cash",
                reference: reference.trim(),
                transactionId: transactionId.trim(),
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
                    queryClient.invalidateQueries({ queryKey: ["booking", booking._id] })
                ])
                if (onSuccess) await onSuccess()
                toast.success(isPaymentWaiting ? "Status updated to Payment Waiting! ⏳" : "Booking confirmed successfully! 🎉", { id: toastId })
                onClose()
            }
        } catch (err) {
            console.error(err)
            toast.error(err.response?.data?.message || "Failed to update booking", { id: toastId })
        } finally {
            setIsSubmitting(false)
        }
    }

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
                    isPaymentWaiting ? 'border-sky-100 bg-sky-50/60' : 'border-emerald-100 bg-emerald-50/50'
                }`}>
                    <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isPaymentWaiting ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                            {isPaymentWaiting ? <Clock size={20} /> : <CheckCircle2 size={20} />}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                                {isPaymentWaiting ? "Set to Payment Waiting" : "Booking Confirmed"}
                            </h3>
                            <p className="text-xs text-slate-500 font-mono">
                                {booking.bookingId} · {booking.name}
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

                {/* Body Form */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm flex-1">
                    {/* Booking Summary Card */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1.5 text-xs">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Guest:</span>
                            <span className="font-bold text-slate-900">{booking.name} ({booking.mobile})</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Stay Dates:</span>
                            <span className="font-semibold text-slate-800">{getBookingDateSummary(booking)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Booked Rooms:</span>
                            <span className="font-bold text-teal-800">{totalRooms} Room{totalRooms > 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-200">
                            <span className="text-slate-500 font-medium">Standard Total Bill:</span>
                            <span className="font-bold text-slate-900">৳{Number(originalTotal || 0).toLocaleString()}</span>
                        </div>
                    </div>

                    {isPaymentWaiting && (
                        <p className="text-[11px] text-sky-800 bg-sky-50 border border-sky-200 rounded-xl p-2.5">
                            💡 <strong>Optional:</strong> You can assign room numbers, payment, and transaction details now or skip them. Any entered information will be saved and pre-filled for final confirmation.
                        </p>
                    )}

                    {/* Room Assignment (Multiple fields for each booked room) */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs uppercase tracking-wider">
                            <BedDouble size={15} className="text-teal-600" />
                            <span>Assign Room Number{totalRooms > 1 ? 's' : ''} {!isPaymentWaiting ? '*' : '(Optional)'}</span>
                        </div>

                        <div className="space-y-2.5">
                            {assignedRooms.map((room, index) => {
                                const cat = categories.find(c => String(c._id) === String(room.categoryId || room.roomId)) ||
                                             categories.find(c => c.name === room.categoryName)
                                const availableRoomNumbers = Array.isArray(cat?.roomNumbers) ? cat.roomNumbers : []

                                return (
                                    <div key={index} className="p-3.5 bg-teal-50/40 border border-teal-100 rounded-2xl space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="badge badge-sm bg-teal-600 text-white font-bold">
                                                Room {index + 1}
                                            </span>
                                            <span className="font-semibold text-teal-900">
                                                {cat?.name || room.categoryName || "Category Room"}
                                            </span>
                                            <span className="text-slate-500 text-[11px]">
                                                {room.checkIn} → {room.checkOut}
                                            </span>
                                        </div>

                                        <div className="form-control">
                                            <label className="label py-0.5">
                                                <span className="label-text font-semibold text-slate-700 text-xs">
                                                    Select Room Number {!isPaymentWaiting && "*"}
                                                </span>
                                            </label>
                                            <select
                                                required={!isPaymentWaiting}
                                                value={room.roomNo || ""}
                                                onChange={e => handleRoomNoChange(index, e.target.value)}
                                                className="select select-sm select-bordered w-full rounded-xl bg-white text-xs font-medium"
                                            >
                                                <option value="">-- Choose Physical Room Number --</option>
                                                {availableRoomNumbers.length > 0 ? (
                                                    availableRoomNumbers.map(num => {
                                                        const ooo = isRoomOutOfOrder(num, room.checkIn, room.checkOut)
                                                        const occupied = isRoomNoOccupied(
                                                            num, 
                                                            room.checkIn, 
                                                            room.checkOut, 
                                                            booking._id, 
                                                            index
                                                        )
                                                        const disabled = (ooo || occupied) && room.roomNo !== num
                                                        return (
                                                            <option 
                                                                key={num} 
                                                                value={num} 
                                                                disabled={disabled}
                                                            >
                                                                {num} {ooo ? "(Out of Order - Maintenance)" : occupied && room.roomNo !== num ? "(Occupied on these dates)" : "(Available)"}
                                                            </option>
                                                        )
                                                    })
                                                ) : (
                                                    <option value="Standard">Standard Assigned</option>
                                                )}
                                            </select>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Reference Dropdown (Anyone without 'user' role) */}
                    <div className="form-control">
                        <label className="label py-0.5">
                            <span className="label-text font-semibold text-slate-700 text-xs flex items-center gap-1">
                                <UserCheck size={14} className="text-teal-600" /> Reference (Staff / Admin)
                            </span>
                        </label>
                        <select
                            value={reference}
                            onChange={e => setReference(e.target.value)}
                            className="select select-sm select-bordered w-full rounded-xl bg-white text-xs font-medium"
                        >
                            <option value="">-- Select Reference (Optional) --</option>
                            {eligibleReferences.map(u => (
                                <option key={u._id} value={u.name || u.email}>
                                    {u.name || u.email} ({u.role || "staff"})
                                </option>
                            ))}
                            {eligibleReferences.length === 0 && (
                                <>
                                    <option value="Direct Frontdesk">Direct Frontdesk</option>
                                    <option value="Admin Management">Admin Management</option>
                                </>
                            )}
                        </select>
                    </div>

                    {/* Financial Calculation Card */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
                            <span className="text-slate-600 font-semibold">Standard Room Subtotal:</span>
                            <strong className="text-slate-900 font-bold">৳{standardTotal.toLocaleString()}</strong>
                        </div>

                        {/* Final Total Bill & Payment Done Fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {/* Final Total Bill Input */}
                            <div className="form-control">
                                <label className="label py-0.5">
                                    <span className="label-text font-bold text-slate-800 text-xs flex items-center gap-1">
                                        <CreditCard size={13} className="text-teal-600" /> Final Total Bill (৳) *
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={customTotalAmount !== '' ? customTotalAmount : standardTotal}
                                    onChange={e => setCustomTotalAmount(e.target.value)}
                                    placeholder={String(standardTotal)}
                                    className="input input-sm input-bordered w-full rounded-xl bg-white text-xs font-bold text-teal-800"
                                />
                                {discountAmount > 0 ? (
                                    <span className="text-[11px] text-emerald-700 font-bold mt-1">
                                        🎉 Discount Given: -৳{discountAmount.toLocaleString()} ({Math.round((discountAmount / (standardTotal || 1)) * 100)}% off)
                                    </span>
                                ) : (
                                    <span className="text-[10px] text-slate-400 mt-0.5">
                                        Standard total is ৳{standardTotal.toLocaleString()}. Modify to apply discount.
                                    </span>
                                )}
                            </div>

                            {/* Payment Done / Received Input */}
                            <div className="form-control">
                                <label className="label py-0.5">
                                    <span className="label-text font-bold text-slate-800 text-xs flex items-center gap-1">
                                        <CreditCard size={13} className="text-emerald-600" /> Payment Done / Received (৳)
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max={finalTotal * 2}
                                    value={paidAmount}
                                    onChange={e => setPaidAmount(e.target.value)}
                                    placeholder="0"
                                    className="input input-sm input-bordered w-full rounded-xl bg-white text-xs font-bold text-emerald-800"
                                />
                                {/* Quick payment helper buttons */}
                                <div className="flex gap-1.5 mt-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setPaidAmount(String(finalTotal))}
                                        className="btn btn-xs btn-outline border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-lg text-[10px]"
                                    >
                                        Full Paid (৳{finalTotal.toLocaleString()})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaidAmount('0')}
                                        className="btn btn-xs btn-outline border-orange-300 text-orange-700 hover:bg-orange-50 rounded-lg text-[10px]"
                                    >
                                        ৳0 / Full Due
                                    </button>
                                    {finalTotal > 1000 && (
                                        <button
                                            type="button"
                                            onClick={() => setPaidAmount(String(Math.round(finalTotal / 2)))}
                                            className="btn btn-xs btn-outline border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg text-[10px]"
                                        >
                                            50% (৳{Math.round(finalTotal / 2).toLocaleString()})
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Live Payment Due Display */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                            <span className="font-bold text-slate-700">Remaining Payment Due:</span>
                            <span className={`px-2.5 py-1 rounded-xl text-xs font-extrabold ${
                                dueAmount > 0 
                                    ? 'bg-orange-100 text-orange-800 border border-orange-300' 
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}>
                                {dueAmount > 0 ? `⚠️ Due: ৳${dueAmount.toLocaleString()}` : '✅ Fully Paid (৳0 Due)'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Payment Method */}
                        <div className="form-control">
                            <label className="label py-0.5">
                                <span className="label-text font-semibold text-slate-700 text-xs flex items-center gap-1">
                                    <CreditCard size={14} className="text-teal-600" /> Payment Method
                                </span>
                            </label>
                            <select
                                value={paymentMethod}
                                onChange={e => setPaymentMethod(e.target.value)}
                                className="select select-sm select-bordered w-full rounded-xl bg-white text-xs font-semibold"
                            >
                                <option value="bKash">bKash (Mobile)</option>
                                <option value="Nagad">Nagad (Mobile)</option>
                                <option value="Rocket">Rocket (DBBL)</option>
                                <option value="Upay">Upay (UCB)</option>
                                <option value="Card / POS">Card / POS (Visa/Master/Amex)</option>
                                <option value="Cash">Cash (Front Desk)</option>
                                <option value="Bank Cheque">Bank Cheque / Cheque</option>
                                <option value="Bank Transfer">Bank Transfer / EFT / BEFTN</option>
                                <option value="Online Gateway">Online Payment Gateway</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        {/* Transaction ID */}
                        <div className="form-control">
                            <label className="label py-0.5">
                                <span className="label-text font-semibold text-slate-700 text-xs flex items-center gap-1">
                                    <Receipt size={14} className="text-teal-600" /> Transaction ID / Receipt
                                </span>
                            </label>
                            <input
                                type="text"
                                value={transactionId}
                                onChange={e => setTransactionId(e.target.value)}
                                placeholder="e.g. TRX-982314 / Cash / Cheque"
                                className="input input-sm input-bordered w-full rounded-xl bg-white text-xs"
                            />
                        </div>
                    </div>

                    {/* Submit Actions */}
                    <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
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
                            disabled={isSubmitting}
                            className={`btn btn-sm rounded-xl px-5 font-bold shadow-md border-none ${
                                isPaymentWaiting 
                                    ? 'bg-[#eab308] hover:bg-yellow-500 text-amber-950 shadow-amber-500/20' 
                                    : 'bg-[#5261d6] hover:bg-[#4351be] text-white shadow-indigo-600/20'
                            }`}
                        >
                            {isSubmitting ? (
                                <span className="loading loading-spinner loading-sm" />
                            ) : (
                                isPaymentWaiting ? "Save & Set Payment Waiting" : "Confirm Booking"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}

export default ConfirmBookingModal
