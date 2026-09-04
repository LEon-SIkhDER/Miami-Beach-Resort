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
import { 
    getBookingRooms, 
    getBookingTotal, 
    getBookingSubtotal, 
    getBookingDiscount, 
    getBookingPaidAmount, 
    getBookingDateSummary, 
    getRoomTotal 
} from '../../../utils/bookingUtils'

const ConfirmBookingModal = ({ booking, isOpen, onClose, onSuccess, targetStatus = "booking_confirmed" }) => {
    const { user: currentUser } = useContext(AuthContext)
    const { role } = useRole()
    const axiosSecure = useAxiosSecure()
    const queryClient = useQueryClient()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [assignedRooms, setAssignedRooms] = useState([])
    const [extraService, setExtraService] = useState('')
    const [extraServiceCost, setExtraServiceCost] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('')
    const [reference, setReference] = useState('')
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
                roomNo: r.roomNo || "",
                adults: r.adults !== undefined && r.adults !== null && r.adults !== '' && Number(r.adults) > 0 ? Number(r.adults) : '',
                children: r.children !== undefined && r.children !== null ? Number(r.children) : (r.babies !== undefined && r.babies !== null ? Number(r.babies) : 0),
                babies: r.babies !== undefined && r.babies !== null ? Number(r.babies) : (r.children !== undefined && r.children !== null ? Number(r.children) : 0)
            })))
            setPaidAmount(booking.paidAmount !== undefined && booking.paidAmount > 0 ? String(booking.paidAmount) : '')
            setPaymentMethod(booking.paymentMethod || '')
            setExtraService(booking.extraService || '')
            setExtraServiceCost(booking.extraServiceCost ? String(booking.extraServiceCost) : '')
            setReference(booking.reference || "")
            const existingTrxId = booking.transactionId || 
                booking.paymentHistory?.[0]?.transactionId || 
                booking.paymentHistory?.find(p => p.transactionId)?.transactionId || ""
            setTransactionId(existingTrxId)
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

    const handleRoomPriceChange = (index, val) => {
        setAssignedRooms(prev => prev.map((r, idx) => idx === index ? { ...r, pricePerNight: val !== '' ? Number(val) : 0 } : r))
    }

    const handleRoomAdultsChange = (index, val) => {
        setAssignedRooms(prev => prev.map((r, idx) => idx === index ? { ...r, adults: val } : r))
    }

    const handleRoomChildrenChange = (index, val) => {
        setAssignedRooms(prev => prev.map((r, idx) => idx === index ? { ...r, children: val, babies: val } : r))
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

        // Check against other confirmed/active bookings in database (exclude cancel and checked_out)
        return activeBookings.some(b => {
            if (String(b._id) === String(currentBookingId || booking?._id) || String(b.bookingId) === String(currentBookingId || booking?.bookingId)) return false
            if (["cancel", "cancelled", "checked_out"].includes(b.status)) return false

            const otherRooms = getBookingRooms(b)
            return otherRooms.some(r => 
                String(r.roomNo).trim() === String(roomNo).trim() && 
                r.checkIn < checkOut && 
                r.checkOut > checkIn
            )
        })
    }

    const totalRooms = assignedRooms.length
    const extraCost = extraServiceCost !== '' ? Math.max(0, Number(extraServiceCost)) : 0
    const roomSubtotal = assignedRooms.reduce((sum, r) => {
        const p = Number(r.pricePerNight !== undefined ? r.pricePerNight : getRoomTotal(r))
        const n = Number(r.nights || 1)
        return sum + (r.pricePerNight !== undefined ? p * n : getRoomTotal(r))
    }, 0) || getBookingSubtotal(booking) || 0
    const standardTotal = roomSubtotal + extraCost
    const finalTotal = standardTotal
    const effectivePaid = paidAmount !== '' ? Number(paidAmount) : 0
    const dueAmount = Math.max(0, finalTotal - effectivePaid)

    const handleSubmit = async (e) => {
        e.preventDefault()

        // Physical room number is mandatory for all steps (Payment Waiting and Booking Confirmed)
        const missingRoom = assignedRooms.find(r => !r.roomNo || !String(r.roomNo).trim())
        if (missingRoom) {
            toast.error("Please assign a physical room number for all rooms.")
            return
        }

        // Strict validation: No Out of Order room can ever be selected/assigned
        const oooRoom = assignedRooms.find(r => isRoomOutOfOrder(r.roomNo, r.checkIn, r.checkOut))
        if (oooRoom) {
            toast.error(`Room ${oooRoom.roomNo} is Out of Order for maintenance during selected stay dates. Please select an available room.`)
            return
        }

        // Strict validation: No occupied room can be double-booked
        const occupiedRoom = assignedRooms.find((r, idx) => isRoomNoOccupied(r.roomNo, r.checkIn, r.checkOut, booking?._id, idx))
        if (occupiedRoom) {
            toast.error(`Room ${occupiedRoom.roomNo} is already occupied on the selected dates.`)
            return
        }

        // Strict required fields when targetStatus is booking_confirmed
        if (!isPaymentWaiting) {
            const missingAdults = assignedRooms.find(r => !r.adults || Number(r.adults) <= 0)
            if (missingAdults) {
                toast.error("Adult guest count is required for all rooms to confirm reservation.")
                return
            }

            const paidNum = Number(paidAmount)
            if (paidAmount === '' || isNaN(paidNum) || paidNum < 0) {
                toast.error("Payment Done (৳) amount must be greater than 0 to confirm booking.")
                return
            }

            if (!paymentMethod.trim()) {
                toast.error("Please select a Payment Method.")
                return
            }

            const isDigitalMethod = !["Cash", "Other"].includes(paymentMethod.trim())
            if (isDigitalMethod && !transactionId.trim()) {
                toast.error(`Transaction ID / Receipt No is required for ${paymentMethod}.`)
                return
            }

            if (!reference.trim()) {
                toast.error("Staff / Admin Reference is required to confirm booking.")
                return
            }
        }

        setIsSubmitting(true)
        const toastId = toast.loading(isPaymentWaiting ? "Setting status to Payment Waiting..." : "Confirming booking...")

        try {
            const normalizedRooms = assignedRooms.map(r => ({
                ...r,
                adults: r.adults !== '' && r.adults !== undefined ? Number(r.adults) : 0,
                children: Number(r.children || 0),
                babies: Number(r.babies || r.children || 0),
                pricePerNight: Number(r.pricePerNight !== undefined ? r.pricePerNight : 0)
            }))

            const payload = {
                status: targetStatus,
                rooms: normalizedRooms,
                totalAmount: finalTotal,
                discountAmount: 0,
                paidAmount: effectivePaid,
                dueAmount: dueAmount,
                advanceAmount: effectivePaid,
                extraService: extraService.trim(),
                extraServiceCost: extraCost,
                paymentMethod: paymentMethod.trim() || (effectivePaid > 0 ? "Cash" : ""),
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
                onClose()
                toast.success(isPaymentWaiting ? "Status updated to Payment Waiting! ⏳" : "Booking confirmed successfully! 🎉", { id: toastId })
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ["requestBookings"] }),
                    queryClient.invalidateQueries({ queryKey: ["all-bookings-for-calendar"] }),
                    queryClient.invalidateQueries({ queryKey: ["bookings"] }),
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
                <form onSubmit={handleSubmit} noValidate className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm flex-1">
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
                            <span className="font-bold text-slate-900">৳{Number(standardTotal || 0).toLocaleString()}</span>
                        </div>
                    </div>

                    {isPaymentWaiting && (
                        <p className="text-[11px] text-sky-800 bg-sky-50 border border-sky-200 rounded-xl p-2.5">
                            💡 <strong>Note:</strong> Room number assignment is required to hold the room on the calendar while waiting for payment. Payment and transaction details can be entered now or during final confirmation.
                        </p>
                    )}

                    {/* Room Assignment (Multiple fields for each booked room) */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-1.5 text-slate-900 font-bold text-xs uppercase tracking-wider">
                            <BedDouble size={15} className="text-teal-600" />
                            <span>Assign Room Number{totalRooms > 1 ? 's' : ''} <span className="text-red-500 font-bold">*</span></span>
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

                                        <div className="space-y-1.5">
                                            <label className="label py-0.5">
                                                <span className="label-text font-bold text-slate-800 text-xs">
                                                    Select Physical Room Number <span className="text-red-500 font-bold">*</span> {room.roomNo ? `(Assigned: Room ${room.roomNo})` : ""}
                                                </span>
                                            </label>
                                            {availableRoomNumbers.length > 0 ? (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                                    {availableRoomNumbers.map(num => {
                                                        const cleanNum = String(num).trim()
                                                        const isSelected = String(room.roomNo || "").trim() === cleanNum
                                                        const ooo = isRoomOutOfOrder(cleanNum, room.checkIn, room.checkOut)
                                                        const occupied = isRoomNoOccupied(
                                                            cleanNum, 
                                                            room.checkIn, 
                                                            room.checkOut, 
                                                            booking._id, 
                                                            index
                                                        )
                                                        const disabled = (ooo || occupied) && !isSelected

                                                        return (
                                                            <label
                                                                key={cleanNum}
                                                                className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                                                                    isSelected
                                                                        ? "bg-[#0f766e] text-white border-[#0f766e] shadow-xs ring-2 ring-teal-500/30 font-bold"
                                                                        : disabled
                                                                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                                                                        : "bg-white text-slate-800 border-slate-200 hover:border-teal-400 hover:bg-teal-50/40"
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        disabled={disabled}
                                                                        onChange={() => handleRoomNoChange(index, isSelected ? "" : cleanNum)}
                                                                        className="checkbox checkbox-sm checkbox-primary rounded-md"
                                                                    />
                                                                    <span className="font-mono text-xs font-bold">
                                                                        Room {cleanNum}
                                                                    </span>
                                                                </div>
                                                                {disabled && (
                                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                                                        ooo ? "bg-amber-100 text-amber-900" : "bg-rose-100 text-rose-900"
                                                                    }`}>
                                                                        {ooo ? "OOO" : "Busy"}
                                                                    </span>
                                                                )}
                                                                {isSelected && (
                                                                    <span className="text-[10px] font-bold text-teal-200">
                                                                        ✓ Assigned
                                                                    </span>
                                                                )}
                                                            </label>
                                                        )
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400 italic bg-white p-2.5 rounded-xl border border-slate-200">
                                                    No physical room numbers configured for this suite category.
                                                </p>
                                            )}
                                        </div>

                                        {/* Room Adults, Children & Negotiate Price */}
                                        <div className="pt-2 border-t border-teal-100/80 space-y-2.5">
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                                {/* Adults Input */}
                                                <div className="form-control">
                                                    <label className="label py-0.5">
                                                        <span className="label-text font-bold text-slate-800 text-xs">
                                                            Adults {!isPaymentWaiting && <span className="text-red-500 font-bold">*</span>}
                                                        </span>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={room.adults !== undefined && room.adults !== null ? room.adults : ''}
                                                        placeholder="0"
                                                        onChange={e => handleRoomAdultsChange(index, e.target.value)}
                                                        className={`input input-xs sm:input-sm input-bordered rounded-xl bg-white text-xs font-semibold ${!isPaymentWaiting && (!room.adults || Number(room.adults) <= 0) ? 'border-amber-400' : ''}`}
                                                    />
                                                </div>

                                                {/* Children Input */}
                                                <div className="form-control">
                                                    <label className="label py-0.5">
                                                        <span className="label-text font-bold text-slate-800 text-xs">Children</span>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={room.children !== undefined && room.children !== null ? room.children : ''}
                                                        placeholder="0"
                                                        onChange={e => handleRoomChildrenChange(index, e.target.value)}
                                                        className="input input-xs sm:input-sm input-bordered rounded-xl bg-white text-xs font-semibold"
                                                    />
                                                </div>

                                                {/* Negotiate Price */}
                                                <div className="form-control">
                                                    <label className="label py-0.5">
                                                        <span className="label-text font-bold text-slate-800 text-xs">Nightly Rate (৳)</span>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={room.pricePerNight !== undefined ? room.pricePerNight : ""}
                                                        onChange={e => handleRoomPriceChange(index, e.target.value)}
                                                        placeholder="0"
                                                        className="input input-xs sm:input-sm input-bordered rounded-xl bg-white text-xs font-bold text-teal-900"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center text-xs pt-1 border-t border-teal-100/50">
                                                <span className="text-slate-500 text-[11px] font-medium">Room Total ({room.nights || 1} night{Number(room.nights || 1) !== 1 ? 's' : ''}):</span>
                                                <strong className="text-teal-900 font-extrabold">
                                                    ৳{Number((room.pricePerNight || 0) * (room.nights || 1)).toLocaleString()}
                                                </strong>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Extra Services Section */}
                    <div className="space-y-2 pt-1">
                        <h4 className="font-bold text-slate-800 uppercase tracking-wider text-xs flex items-center gap-1.5 border-b border-slate-100 pb-1">
                            <CreditCard size={13} className="text-amber-600" /> Extra Services & Amenities (Optional)
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-amber-50/40 border border-amber-200/70">
                            <div className="form-control">
                                <label className="label py-0.5">
                                    <span className="label-text font-bold text-slate-800 text-xs">Extra Service Type</span>
                                </label>
                                <select
                                    value={extraService}
                                    onChange={e => setExtraService(e.target.value)}
                                    className="select select-sm select-bordered w-full rounded-xl bg-white text-xs font-semibold"
                                >
                                    <option value="">-- No Extra Service --</option>
                                    <option value="Swimming Pool Access">Swimming Pool Access</option>
                                    <option value="Extra Bed">Extra Bed</option>
                                    <option value="Swimming Pool Access & Extra Bed">Swimming Pool Access & Extra Bed</option>
                                    <option value="Airport Pickup / Drop">Airport Pickup / Drop</option>
                                    <option value="Sightseeing & Tour Guide">Sightseeing & Tour Guide</option>
                                    <option value="Other Extra Service">Other Extra Service</option>
                                </select>
                            </div>
                            <div className="form-control">
                                <label className="label py-0.5">
                                    <span className="label-text font-bold text-slate-800 text-xs">Extra Service Cost (৳)</span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={extraServiceCost}
                                    onChange={e => setExtraServiceCost(e.target.value)}
                                    placeholder="0"
                                    className="input input-sm input-bordered w-full rounded-xl bg-white text-xs font-bold text-amber-900"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Financial Calculation Card */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs border-b border-slate-200 pb-2">
                            <span className="text-slate-600 font-semibold">
                                Room Tariff: <strong className="text-slate-800">৳{roomSubtotal.toLocaleString()}</strong>
                                {extraCost > 0 && <span className="text-amber-800 font-bold ml-1.5">(+ Extra: ৳{extraCost.toLocaleString()})</span>}
                            </span>
                            <strong className="text-slate-900 font-extrabold text-sm font-mono">Total Payable: ৳{standardTotal.toLocaleString()}</strong>
                        </div>

                        {/* All 3 Payment-Related Fields in 3 Columns */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                            {/* Payment Done / Received Input */}
                            <div className="form-control">
                                <label className="label py-0.5 block">
                                    <span className="label-text font-bold text-slate-800 text-xs flex items-center gap-1">
                                        <CreditCard size={13} className="text-teal-600" /> Payment Done (৳) {!isPaymentWaiting && <span className="text-red-500 font-bold">*</span>}
                                    </span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max={finalTotal * 2}
                                    value={paidAmount}
                                    onChange={e => setPaidAmount(e.target.value)}
                                    placeholder="0"
                                    className={`input input-sm input-bordered w-full rounded-xl bg-white text-xs font-bold text-emerald-800 ${!isPaymentWaiting && effectivePaid <= 0 ? 'border-amber-400' : ''}`}
                                />
                                {/* Quick payment helper buttons */}
                                <div className="flex gap-1.5 mt-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setPaidAmount(String(finalTotal))}
                                        className="btn btn-xs btn-outline border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-lg text-[10px] font-bold"
                                    >
                                        Full Paid (৳{finalTotal.toLocaleString()})
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

                            {/* Payment Method */}
                            <div className="form-control">
                                <label className="label py-0.5">
                                    <span className="label-text font-bold text-slate-800 text-xs flex items-center gap-1">
                                        <CreditCard size={13} className="text-teal-600" /> Payment Method {!isPaymentWaiting && <span className="text-red-500 font-bold">*</span>}
                                    </span>
                                </label>
                                <select
                                    value={paymentMethod}
                                    onChange={e => setPaymentMethod(e.target.value)}
                                    className={`select select-sm select-bordered w-full rounded-xl bg-white text-xs font-semibold ${!isPaymentWaiting && !paymentMethod ? 'border-amber-400' : ''}`}
                                >
                                    <option value="">-- Select Payment Method --</option>
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
                                    <span className="label-text font-bold text-slate-800 text-xs flex items-center justify-between w-full">
                                        <span className="flex items-center gap-1">
                                            <Receipt size={13} className="text-teal-600" /> Trx / Receipt
                                        </span>
                                        {!isPaymentWaiting && paymentMethod && !["Cash", "Other"].includes(paymentMethod) && (
                                            <span className="text-red-500 font-bold text-[10px]">* Required</span>
                                        )}
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    required={!isPaymentWaiting && Boolean(paymentMethod && !["Cash", "Other"].includes(paymentMethod))}
                                    value={transactionId}
                                    onChange={e => setTransactionId(e.target.value)}
                                    placeholder={paymentMethod === "Cash" || paymentMethod === "Other" ? "Optional for Cash / Other" : "e.g. TRX-982314 / Slip No"}
                                    className={`input input-sm input-bordered w-full rounded-xl bg-white text-xs ${!isPaymentWaiting && paymentMethod && !["Cash", "Other"].includes(paymentMethod) && !transactionId.trim() ? 'border-amber-400' : ''}`}
                                />
                            </div>
                        </div>

                        {/* Live Calculation Summary Banner */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-white border border-slate-200 text-xs mt-1">
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-teal-900 font-extrabold text-xs sm:text-sm">Total Payable: ৳{finalTotal.toLocaleString()}</span>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                    Paid: <strong className="text-emerald-700">৳{effectivePaid.toLocaleString()}</strong>
                                </div>
                            </div>
                            <div className="sm:text-right">
                                <span className="font-bold text-slate-700 block text-[11px]">Due Balance:</span>
                                <span className={`font-black text-sm sm:text-base ${dueAmount > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                                    ৳{dueAmount.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Reference Dropdown (Anyone without 'user' role) */}
                    <div className="form-control">
                        <label className="label py-0.5 block">
                            <span className="label-text font-semibold text-slate-700 text-xs flex items-center gap-1">
                                <UserCheck size={14} className="text-teal-600" /> Reference (Staff / Admin) {!isPaymentWaiting && <span className="text-red-500 font-bold">*</span>}
                            </span>
                        </label>
                        <select
                            value={reference}
                            onChange={e => setReference(e.target.value)}
                            className={`select select-sm select-bordered w-full rounded-xl bg-white text-xs font-medium ${!isPaymentWaiting && !reference ? 'border-amber-400' : ''}`}
                        >
                            <option value="">-- Select Reference {!isPaymentWaiting ? "(Required)" : "(Optional)"} --</option>
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
