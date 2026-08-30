import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
import toast from 'react-hot-toast'
import { 
    CheckCircle2, 
    X, 
    BedDouble, 
    CreditCard, 
    UserCheck, 
    Hash, 
    Calendar,
    AlertCircle,
    Receipt
} from 'lucide-react'
import { getBookingRooms, getBookingTotal, getBookingDateSummary } from '../../../utils/bookingUtils'

const ConfirmBookingModal = ({ booking, isOpen, onClose, onSuccess }) => {
    const axiosSecure = useAxiosSecure()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [assignedRooms, setAssignedRooms] = useState([])
    const [reference, setReference] = useState('')
    const [paymentAmount, setPaymentAmount] = useState(0)
    const [transactionId, setTransactionId] = useState('')

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
            setAssignedRooms(rawRooms.map((r, idx) => ({
                ...r,
                roomNo: r.roomNo || ""
            })))
            const defaultTotal = getBookingTotal(booking) || 0
            setPaymentAmount(booking.paidAmount !== undefined ? booking.paidAmount : (booking.totalAmount !== undefined ? booking.totalAmount : defaultTotal))
            setReference(booking.reference || "")
            setTransactionId(booking.transactionId || "")
        }
    }, [booking, isOpen])

    if (!isOpen || !booking) return null

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

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsSubmitting(true)
        const toastId = toast.loading("Confirming booking...")

        try {
            const payload = {
                status: "booking_confirmed",
                rooms: assignedRooms,
                totalAmount: Number(paymentAmount || 0),
                paidAmount: Number(paymentAmount || 0),
                reference: reference.trim(),
                transactionId: transactionId.trim()
            }

            const res = await axiosSecure.patch(`/booking/${booking._id}`, payload)
            if (res.data) {
                toast.success("Booking confirmed successfully! 🎉", { id: toastId })
                onSuccess?.()
                onClose()
            }
        } catch (err) {
            console.error(err)
            toast.error(err.response?.data?.message || "Failed to confirm booking", { id: toastId })
        } finally {
            setIsSubmitting(false)
        }
    }

    const totalRooms = assignedRooms.length
    const originalTotal = getBookingTotal(booking)

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <CheckCircle2 size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-base sm:text-lg">Confirm Booking</h3>
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

                    {/* Room Assignment (Multiple fields for each booked room) */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs uppercase tracking-wider">
                            <BedDouble size={15} className="text-teal-600" />
                            <span>Assign Room Number{totalRooms > 1 ? 's' : ''} *</span>
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
                                                    Select Room Number *
                                                </span>
                                            </label>
                                            <select
                                                required
                                                value={room.roomNo || ""}
                                                onChange={e => handleRoomNoChange(index, e.target.value)}
                                                className="select select-sm select-bordered w-full rounded-xl bg-white text-xs font-medium"
                                            >
                                                <option value="">-- Choose Physical Room Number --</option>
                                                {availableRoomNumbers.length > 0 ? (
                                                    availableRoomNumbers.map(num => {
                                                        const occupied = isRoomNoOccupied(
                                                            num, 
                                                            room.checkIn, 
                                                            room.checkOut, 
                                                            booking._id, 
                                                            index
                                                        )
                                                        return (
                                                            <option 
                                                                key={num} 
                                                                value={num} 
                                                                disabled={occupied && room.roomNo !== num}
                                                            >
                                                                {num} {occupied && room.roomNo !== num ? "(Occupied on these dates)" : "(Available)"}
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

                    {/* Payment Amount & Transaction ID */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                        {/* Payment / Final Amount (Default total, admin can reduce) */}
                        <div className="form-control">
                            <label className="label py-0.5">
                                <span className="label-text font-semibold text-slate-700 text-xs flex items-center gap-1">
                                    <CreditCard size={14} className="text-teal-600" /> Final Bill / Payment (৳) *
                                </span>
                            </label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={paymentAmount}
                                onChange={e => setPaymentAmount(e.target.value)}
                                placeholder="Final payment amount"
                                className="input input-sm input-bordered w-full rounded-xl bg-white text-xs sm:text-sm font-bold text-teal-800"
                            />
                            <span className="text-[10px] text-slate-400 mt-0.5">
                                Default is ৳{Number(originalTotal || 0).toLocaleString()} (can be discounted).
                            </span>
                        </div>

                        {/* Transaction ID */}
                        <div className="form-control">
                            <label className="label py-0.5">
                                <span className="label-text font-semibold text-slate-700 text-xs flex items-center gap-1">
                                    <Receipt size={14} className="text-teal-600" /> Transaction ID / TrxID
                                </span>
                            </label>
                            <input
                                type="text"
                                value={transactionId}
                                onChange={e => setTransactionId(e.target.value)}
                                placeholder="e.g. TRX-982314 / Cash"
                                className="input input-sm input-bordered w-full rounded-xl bg-white text-xs sm:text-sm"
                            />
                            <span className="text-[10px] text-slate-400 mt-0.5">
                                Bank, bKash, Nagad or Cash receipt.
                            </span>
                        </div>
                    </div>

                    {/* Submit Actions */}
                    <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="btn btn-sm btn-ghost rounded-xl px-4"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="btn btn-sm btn-primary rounded-xl px-5 text-white font-bold shadow-md shadow-teal-600/20"
                        >
                            {isSubmitting ? (
                                <span className="loading loading-spinner loading-sm" />
                            ) : (
                                "Confirm Reservation"
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
