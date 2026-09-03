import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
import toast from 'react-hot-toast'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { addDays } from 'date-fns'
import {
    Pencil,
    X,
    BedDouble,
    CreditCard,
    User,
    Phone,
    MapPin,
    Calendar,
    Plus,
    Trash2,
    CheckCircle2,
    Receipt,
    UserCheck,
    FileText
} from 'lucide-react'
import { getBookingRooms, getBookingTotal } from '../../../utils/bookingUtils'

const formatLocalDate = (date) => {
    if (!date) return ''
    if (typeof date === 'string') return date
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

const parseLocalDate = (str) => {
    if (!str) return null
    if (str instanceof Date) return str
    const [y, m, d] = str.split('-').map(Number)
    return new Date(y, m - 1, d)
}

const STATUS_OPTIONS = [
    { value: "request_booking", label: "Request Booking" },
    { value: "payment_waiting", label: "Payment Waiting" },
    { value: "booking_confirmed", label: "Booking Confirmed" },
    { value: "checked_id", label: "Checked In" },
    { value: "checked_out", label: "Checked Out" },
    { value: "cancel", label: "Cancel" }
]

const EditBookingModal = ({ booking, isOpen, onClose, onSuccess }) => {
    const axiosSecure = useAxiosSecure()
    const queryClient = useQueryClient()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [name, setName] = useState('')
    const [mobile, setMobile] = useState('')
    const [address, setAddress] = useState('')
    const [userEmail, setUserEmail] = useState('')
    const [status, setStatus] = useState('request_booking')
    const [reference, setReference] = useState('')
    const [transactionId, setTransactionId] = useState('')
    const [discountAmount, setDiscountAmount] = useState('')
    const [paidAmount, setPaidAmount] = useState('')
    const [advanceAmount, setAdvanceAmount] = useState(0)
    const [notes, setNotes] = useState('')
    const [rooms, setRooms] = useState([])

    // Fetch all categories for room assignment & pricing
    const { data: categories = [] } = useQuery({
        queryKey: ["all-categories-for-edit-booking"],
        queryFn: async () => {
            const res = await axiosSecure.get("/categoryandroom")
            return res.data
        },
        enabled: isOpen && !!booking
    })

    // Fetch users for reference
    const { data: allUsers = [] } = useQuery({
        queryKey: ["all-users-for-edit-booking-reference"],
        queryFn: async () => {
            const res = await axiosSecure.get("/users")
            return res.data
        },
        enabled: isOpen && !!booking
    })

    const eligibleReferences = allUsers.filter(u => u.role && u.role !== "user")

    // Fetch active bookings to verify room occupancy
    const { data: activeBookings = [] } = useQuery({
        queryKey: ["active-bookings-for-edit-modal"],
        queryFn: async () => {
            const res = await axiosSecure.get("/bookings")
            return res.data
        },
        enabled: isOpen && !!booking
    })

    // Fetch Out of Order records
    const { data: outOfOrderList = [] } = useQuery({
        queryKey: ["out-of-order-for-edit-modal"],
        queryFn: async () => {
            const res = await axiosSecure.get("/out-of-order")
            return res.data
        },
        enabled: isOpen && !!booking
    })

    const isRoomOutOfOrder = (roomNo, checkInDate, checkOutDate) => {
        if (!roomNo || !checkInDate || !checkOutDate) return false
        const checkIn = formatLocalDate(checkInDate)
        const checkOut = formatLocalDate(checkOutDate)
        return outOfOrderList.some(ooo => {
            if (!ooo || ooo.status !== "active") return false
            return String(ooo.roomNo).trim() === String(roomNo).trim() && ooo.startDate < checkOut && ooo.endDate > checkIn
        })
    }

    const isRoomNoOccupied = (roomNo, checkInDate, checkOutDate, currentBookingId, currentRoomIndex) => {
        if (!roomNo || !checkInDate || !checkOutDate) return false
        const checkIn = formatLocalDate(checkInDate)
        const checkOut = formatLocalDate(checkOutDate)

        // 1. Check if another room inside the SAME edit form has assigned this room number for overlapping dates
        const assignedInSameForm = rooms.some((r, idx) => {
            if (idx === currentRoomIndex) return false
            if (!r.roomNo || !r.checkInDate || !r.checkOutDate) return false
            const rIn = formatLocalDate(r.checkInDate)
            const rOut = formatLocalDate(r.checkOutDate)
            return String(r.roomNo).trim() === String(roomNo).trim() && rIn < checkOut && rOut > checkIn
        })
        if (assignedInSameForm) return true

        // 2. Check against other confirmed/active reservations in database
        return activeBookings.some(b => {
            if (String(b._id) === String(currentBookingId) || String(b.bookingId) === String(currentBookingId)) return false
            if (["cancel", "cancelled", "checked_out"].includes(b.status)) return false

            const otherRooms = getBookingRooms(b)
            return otherRooms.some(r => {
                if (!r.roomNo || !r.checkIn || !r.checkOut) return false
                return String(r.roomNo).trim() === String(roomNo).trim() && r.checkIn < checkOut && r.checkOut > checkIn
            })
        })
    }

    useEffect(() => {
        if (booking && isOpen) {
            setName(booking.name || '')
            setMobile(booking.mobile || '')
            setAddress(booking.address || '')
            setUserEmail(booking.userEmail || booking.email || '')
            setStatus(booking.status || 'request_booking')
            const existingTrxId = booking.transactionId || 
                booking.paymentHistory?.[0]?.transactionId || 
                booking.paymentHistory?.find(p => p.transactionId)?.transactionId || ''
            setTransactionId(existingTrxId)
            setNotes(booking.notes || '')
            
            const rawRooms = getBookingRooms(booking)
            setRooms(rawRooms.map(r => ({
                ...r,
                checkInDate: parseLocalDate(r.checkIn),
                checkOutDate: parseLocalDate(r.checkOut),
                adults: Number(r.adults || 2),
                babies: Number(r.children !== undefined ? r.children : (r.babies || 0)),
                children: Number(r.children !== undefined ? r.children : (r.babies || 0)),
                pricePerNight: Number(r.pricePerNight || 0),
                roomNo: r.roomNo || ''
            })))

            const initialDiscount = Number(booking.discountAmount || booking.discount || booking.specialDiscount || 0)
            setDiscountAmount(initialDiscount > 0 ? String(initialDiscount) : '')
            const initialPaid = booking.paidAmount !== undefined ? booking.paidAmount : (booking.advanceAmount || 0)
            setPaidAmount(initialPaid !== undefined && initialPaid !== null ? String(initialPaid) : '0')
            setAdvanceAmount(booking.advanceAmount || 0)
        }
    }, [booking, isOpen])

    if (!isOpen || !booking) return null

    const standardTotal = rooms.reduce((sum, r) => {
        if (!r.checkInDate || !r.checkOutDate) return sum
        const nights = Math.ceil((r.checkOutDate - r.checkInDate) / (1000 * 60 * 60 * 24))
        return sum + (nights > 0 ? nights * Number(r.pricePerNight || 0) : 0)
    }, 0)

    const discount = discountAmount !== '' ? Number(discountAmount) : 0
    const netPayable = Math.max(0, standardTotal - discount)
    const effectivePaid = paidAmount !== '' ? Number(paidAmount) : 0
    const dueAmount = Math.max(0, netPayable - effectivePaid)

    const handleRoomChange = (index, changes) => {
        setRooms(prev => prev.map((r, idx) => {
            if (idx !== index) return r
            const updated = { ...r, ...changes }
            if (changes.categoryId) {
                const cat = categories.find(c => String(c._id) === String(changes.categoryId))
                if (cat) {
                    updated.categoryName = cat.name
                    updated.pricePerNight = Number(cat.price || updated.pricePerNight)
                }
                // Reset room number — it belongs to the old category and is invalid for the new one
                updated.roomNo = ""
            }
            if (changes.checkInDate && updated.checkOutDate && changes.checkInDate >= updated.checkOutDate) {
                updated.checkOutDate = addDays(changes.checkInDate, 1)
            }
            return updated
        }))
    }

    const handleAddRoom = () => {
        const firstRoomCat = categories.find(c => String(c._id) === String(rooms[0]?.categoryId)) || categories[0]
        const defaultCat = firstRoomCat || categories[0]
        const checkIn = rooms[0]?.checkInDate || new Date()
        const checkOut = rooms[0]?.checkOutDate || addDays(new Date(), 1)
        const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24)))
        const pricePerNight = Number(defaultCat?.price || 0)
        const newRoomPrice = pricePerNight * nights

        setRooms(prev => [...prev, {
            roomId: defaultCat?._id || "",
            categoryId: defaultCat?._id || "",
            categoryName: defaultCat?.name || "Suite",
            roomNo: "",
            checkInDate: checkIn,
            checkOutDate: checkOut,
            adults: 2,
            babies: 0,
            children: 0,
            pricePerNight: pricePerNight
        }])
        toast.success(`Added ${defaultCat?.name || 'Room'} (+৳${newRoomPrice.toLocaleString()})`)
    }

    const handleRemoveRoom = (index) => {
        if (rooms.length <= 1) return
        setRooms(prev => prev.filter((_, idx) => idx !== index))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        // Validate room occupancy conflicts
        for (let i = 0; i < rooms.length; i++) {
            const r = rooms[i]
            if (r.roomNo) {
                const isOccupied = isRoomNoOccupied(r.roomNo, r.checkInDate, r.checkOutDate, booking._id, i)
                const isOOO = isRoomOutOfOrder(r.roomNo, r.checkInDate, r.checkOutDate)
                if (isOccupied) {
                    toast.error(`Room ${r.roomNo} (Room ${i + 1}) is already occupied for the selected stay dates!`)
                    return
                }
                if (isOOO) {
                    toast.error(`Room ${r.roomNo} (Room ${i + 1}) is Out of Order for the selected stay dates!`)
                    return
                }
            }
        }

        // Require physical room number if advancing beyond request_booking
        if (status !== "request_booking" && status !== "cancel") {
            const missingRoom = rooms.find(r => !r.roomNo || !String(r.roomNo).trim())
            if (missingRoom) {
                toast.error("Please assign a physical room number for all rooms.")
                return
            }
        }

        if (status === "checked_out" && dueAmount > 0.01) {
            toast.error(`Cannot check out: Outstanding balance of ৳${dueAmount.toLocaleString()} is remaining. Please clear all dues before checking out.`)
            return
        }

        const prevPaid = Number(booking.paidAmount || booking.advanceAmount || 0)
        const isPaymentIncreasing = effectivePaid > prevPaid
        const isConfirmedStatus = ["booking_confirmed", "checked_id", "checked_in", "checked_out", "confirmed"].includes(status)
        if (isConfirmedStatus && isPaymentIncreasing && !transactionId.trim() && booking.paymentMethod !== "Cash") {
            toast.error("Transaction ID / Receipt No is required when confirming with new payment.")
            return
        }

        setIsSubmitting(true)
        const toastId = toast.loading("Updating reservation...")

        try {
            const normalizedRooms = rooms.map(r => ({
                roomId: r.categoryId || r.roomId,
                categoryId: r.categoryId || r.roomId,
                categoryName: r.categoryName,
                roomNo: r.roomNo ? r.roomNo.trim() : "",
                checkIn: formatLocalDate(r.checkInDate),
                checkOut: formatLocalDate(r.checkOutDate),
                adults: Number(r.adults || 1),
                babies: Number(r.children !== undefined ? r.children : (r.babies || 0)),
                children: Number(r.children !== undefined ? r.children : (r.babies || 0)),
                pricePerNight: Number(r.pricePerNight || 0)
            }))

            const payload = {
                name: name.trim(),
                mobile: mobile.trim(),
                address: address.trim(),
                userEmail: userEmail.trim(),
                status,
                rooms: normalizedRooms,
                totalAmount: standardTotal,
                discountAmount: discount,
                paidAmount: effectivePaid,
                dueAmount: dueAmount,
                advanceAmount: effectivePaid,
                reference: reference.trim(),
                transactionId: transactionId.trim(),
                notes: notes.trim()
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
                toast.success("Reservation updated successfully! 🎉", { id: toastId })
                onClose()
            }
        } catch (err) {
            console.error(err)
            toast.error(err.response?.data?.message || "Failed to update reservation", { id: toastId })
        } finally {
            setIsSubmitting(false)
        }
    }

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                            <Pencil size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-base sm:text-lg">Edit Booking Details</h3>
                            <p className="text-xs text-slate-500 font-mono">
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

                {/* Body Form */}
                <form onSubmit={handleSubmit} noValidate className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm flex-1">
                    {/* Guest Information */}
                    <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3.5">
                        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <User size={14} className="text-teal-600" /> Guest Details
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="form-control">
                                <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Guest Name *</span></label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="input input-sm input-bordered w-full rounded-xl bg-white text-xs"
                                />
                            </div>
                            <div className="form-control">
                                <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Mobile (WhatsApp) *</span></label>
                                <input
                                    type="tel"
                                    required
                                    value={mobile}
                                    onChange={e => setMobile(e.target.value)}
                                    className="input input-sm input-bordered w-full rounded-xl bg-white text-xs"
                                />
                            </div>
                            <div className="form-control">
                                <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">User Email</span></label>
                                <input
                                    type="email"
                                    value={userEmail}
                                    onChange={e => setUserEmail(e.target.value)}
                                    className="input input-sm input-bordered w-full rounded-xl bg-white text-xs"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="form-control">
                                <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Guest Address</span></label>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                                    className="input input-sm input-bordered w-full rounded-xl bg-white text-xs"
                                />
                            </div>
                            <div className="form-control">
                                <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs flex items-center gap-1"><FileText size={13} className="text-teal-600" /> Internal Notes / Guest Requests</span></label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Special requests, advance notes..."
                                    className="input input-sm input-bordered w-full rounded-xl bg-white text-xs"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Room Breakdown Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                <BedDouble size={14} className="text-teal-600" /> Booked Rooms ({rooms.length})
                            </h4>
                            <button
                                type="button"
                                onClick={handleAddRoom}
                                className="btn btn-xs btn-outline btn-primary rounded-xl gap-1"
                            >
                                <Plus size={13} /> Add Another Room
                            </button>
                        </div>

                        <div className="space-y-3">
                            {rooms.map((room, index) => {
                                const cat = categories.find(c => String(c._id) === String(room.categoryId))
                                const availableRoomNumbers = Array.isArray(cat?.roomNumbers) ? cat.roomNumbers : []

                                return (
                                    <div key={index} className="p-4 bg-teal-50/30 border border-teal-100 rounded-2xl space-y-3">
                                        <div className="flex items-center justify-between pb-2 border-b border-teal-100/80">
                                            <span className="badge badge-sm bg-teal-600 text-white font-bold">
                                                Room {index + 1}
                                            </span>
                                            {rooms.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveRoom(index)}
                                                    className="btn btn-xs btn-ghost text-red-500 hover:bg-red-50 rounded-lg gap-1"
                                                >
                                                    <Trash2 size={12} /> Remove
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="form-control md:col-span-2">
                                                <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Category *</span></label>
                                                <select
                                                    value={room.categoryId}
                                                    onChange={e => handleRoomChange(index, { categoryId: e.target.value })}
                                                    className="select select-sm select-bordered w-full rounded-xl bg-white text-xs font-medium"
                                                >
                                                    {categories.map(c => (
                                                        <option key={c._id} value={c._id}>
                                                            {c.name} (৳{Number(c.price).toLocaleString()}/night)
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="form-control md:col-span-2">
                                                <label className="label py-0.5">
                                                    <span className="label-text font-semibold text-slate-700 text-xs flex items-center justify-between w-full">
                                                        <span>Assigned Room No</span>
                                                        {room.roomNo && isRoomNoOccupied(room.roomNo, room.checkInDate, room.checkOutDate, booking._id, index) && (
                                                            <span className="text-rose-600 font-bold text-[10px]">Occupied on these dates!</span>
                                                        )}
                                                    </span>
                                                </label>
                                                <select
                                                    value={room.roomNo || ""}
                                                    onChange={e => handleRoomChange(index, { roomNo: e.target.value })}
                                                    className={`select select-sm select-bordered w-full rounded-xl bg-white text-xs font-medium ${
                                                        room.roomNo && isRoomNoOccupied(room.roomNo, room.checkInDate, room.checkOutDate, booking._id, index)
                                                            ? 'border-rose-400 bg-rose-50/50 text-rose-900'
                                                            : ''
                                                    }`}
                                                >
                                                    <option value="">-- Select Room No (Optional) --</option>
                                                    {availableRoomNumbers.map(num => {
                                                        const isOccupied = isRoomNoOccupied(num, room.checkInDate, room.checkOutDate, booking._id, index)
                                                        const isOOO = isRoomOutOfOrder(num, room.checkInDate, room.checkOutDate)
                                                        const isCurrentlyAssigned = String(room.roomNo) === String(num)
                                                        const isDisabled = (isOccupied || isOOO) && !isCurrentlyAssigned

                                                        return (
                                                            <option 
                                                                key={num} 
                                                                value={num}
                                                                disabled={isDisabled}
                                                                className={isDisabled ? "text-rose-400 bg-slate-100 font-normal" : "font-semibold text-slate-800"}
                                                            >
                                                                Room {num} {isOOO ? "— (Out of Order)" : isOccupied ? (isCurrentlyAssigned ? "— (Current Room)" : "— (Occupied / Booked)") : "— (Available)"}
                                                            </option>
                                                        )
                                                    })}
                                                    {room.roomNo && !availableRoomNumbers.includes(room.roomNo) && (
                                                        <option value={room.roomNo}>Room {room.roomNo} (Assigned)</option>
                                                    )}
                                                </select>
                                            </div>

                                            <div className="form-control">
                                                <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Check-In *</span></label>
                                                <DatePicker
                                                    selected={room.checkInDate}
                                                    onChange={date => handleRoomChange(index, { checkInDate: date })}
                                                    dateFormat="dd MMM yyyy"
                                                    className="input input-sm input-bordered w-full rounded-xl bg-white text-xs cursor-pointer"
                                                    wrapperClassName="w-full"
                                                />
                                            </div>

                                            <div className="form-control">
                                                <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Check-Out *</span></label>
                                                <DatePicker
                                                    selected={room.checkOutDate}
                                                    onChange={date => handleRoomChange(index, { checkOutDate: date })}
                                                    dateFormat="dd MMM yyyy"
                                                    className="input input-sm input-bordered w-full rounded-xl bg-white text-xs cursor-pointer"
                                                    wrapperClassName="w-full"
                                                />
                                            </div>

                                            <div className="form-control">
                                                <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Adults</span></label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={room.adults}
                                                    onChange={e => handleRoomChange(index, { adults: e.target.value })}
                                                    className="input input-sm input-bordered w-full rounded-xl bg-white text-xs"
                                                />
                                            </div>

                                            <div className="form-control">
                                                <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Children</span></label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={room.children !== undefined ? room.children : (room.babies || 0)}
                                                    onChange={e => handleRoomChange(index, { babies: e.target.value, children: e.target.value })}
                                                    className="input input-sm input-bordered w-full rounded-xl bg-white text-xs"
                                                />
                                            </div>

                                            <div className="form-control">
                                                <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Rate / Night (৳)</span></label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={room.pricePerNight}
                                                    onChange={e => handleRoomChange(index, { pricePerNight: e.target.value })}
                                                    className="input input-sm input-bordered w-full rounded-xl bg-white text-xs"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Financials & Status Section */}
                    <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3.5">
                        <div className="flex items-center justify-between">
                            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                                <CreditCard size={14} className="text-teal-600" /> Billing, Discount & Payment
                            </h4>
                            <span className="text-xs font-semibold text-slate-500">
                                {rooms.length} Room{rooms.length > 1 ? 's' : ''} Booked
                            </span>
                        </div>

                        {/* Financial Calculation Card */}
                        <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
                            {/* Gross Room Total Header */}
                            <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2.5">
                                <span className="text-slate-600 font-semibold">Total Room Bill (Gross Subtotal):</span>
                                <strong className="text-slate-900 font-extrabold text-sm sm:text-base font-mono">৳{standardTotal.toLocaleString()}</strong>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                {/* Dedicated Special Discount Input Field */}
                                <div className="form-control">
                                    <label className="label py-0.5">
                                        <span className="label-text font-bold text-slate-800 text-xs flex items-center gap-1">
                                            <Receipt size={13} className="text-emerald-600" /> Special Discount (৳)
                                        </span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={standardTotal}
                                        value={discountAmount}
                                        onChange={e => setDiscountAmount(e.target.value)}
                                        placeholder="0"
                                        className="input input-sm input-bordered w-full rounded-xl bg-white text-xs font-bold text-emerald-800"
                                    />
                                    {discount > 0 ? (
                                        <span className="text-[10px] text-emerald-700 font-bold mt-0.5">
                                            🎉 -৳{discount.toLocaleString()} ({Math.round((discount / (standardTotal || 1)) * 100)}% off)
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-slate-400 mt-0.5">
                                            Enter discount in ৳
                                        </span>
                                    )}
                                </div>

                                {/* Paid Amount */}
                                <div className="form-control">
                                    <label className="label py-0.5">
                                        <span className="label-text font-bold text-slate-800 text-xs flex items-center gap-1">
                                            <CreditCard size={13} className="text-teal-600" /> Paid / Received (৳)
                                        </span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={paidAmount}
                                        onChange={e => setPaidAmount(e.target.value)}
                                        placeholder="0"
                                        className="input input-sm input-bordered w-full rounded-xl bg-white text-xs font-bold text-emerald-800"
                                    />
                                    <div className="flex gap-1.5 mt-1">
                                        <button
                                            type="button"
                                            onClick={() => setPaidAmount(String(netPayable))}
                                            className="btn btn-2xs btn-outline border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-lg text-[9px] font-bold"
                                        >
                                            Full (৳{netPayable.toLocaleString()})
                                        </button>
                                        {netPayable > 1000 && (
                                            <button
                                                type="button"
                                                onClick={() => setPaidAmount(String(Math.round(netPayable / 2)))}
                                                className="btn btn-2xs btn-outline border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg text-[9px]"
                                            >
                                                50%
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="form-control">
                                    <label className="label py-0.5">
                                        <span className="label-text font-semibold text-slate-700 text-xs">Reservation Status</span>
                                    </label>
                                    <select
                                        value={status}
                                        onChange={e => setStatus(e.target.value)}
                                        className="select select-sm select-bordered w-full rounded-xl bg-white text-xs font-bold capitalize text-slate-800"
                                    >
                                        {STATUS_OPTIONS.map(opt => {
                                            const isCheckedOutDisabled = opt.value === "checked_out" && dueAmount > 0.01
                                            return (
                                                <option 
                                                    key={opt.value} 
                                                    value={opt.value}
                                                    disabled={isCheckedOutDisabled}
                                                >
                                                    {opt.label} {isCheckedOutDisabled ? "(Requires full payment)" : ""}
                                                </option>
                                            )
                                        })}
                                    </select>
                                </div>
                            </div>

                            {/* Live Calculation Summary Banner */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-3">
                                        <span className="text-slate-500">Gross: <strong>৳{standardTotal.toLocaleString()}</strong></span>
                                        {discount > 0 && <span className="text-emerald-700 font-semibold">Discount: -৳{discount.toLocaleString()}</span>}
                                        <span className="text-teal-900 font-extrabold text-xs sm:text-sm">Net Payable: ৳{netPayable.toLocaleString()}</span>
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="form-control">
                                <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs flex items-center gap-1"><UserCheck size={13} /> Reference</span></label>
                                <select
                                    value={reference}
                                    onChange={e => setReference(e.target.value)}
                                    className="select select-sm select-bordered w-full rounded-xl bg-white text-xs"
                                >
                                    <option value="">-- Choose Reference --</option>
                                    {eligibleReferences.map(u => (
                                        <option key={u._id} value={u.name || u.email}>
                                            {u.name || u.email} ({u.role || "staff"})
                                        </option>
                                    ))}
                                    {reference && !eligibleReferences.some(u => (u.name === reference || u.email === reference)) && (
                                        <option value={reference}>{reference}</option>
                                    )}
                                </select>
                            </div>
                            <div className="form-control">
                                <label className="label py-0.5">
                                    <span className="label-text font-semibold text-slate-700 text-xs flex items-center justify-between w-full">
                                        <span className="flex items-center gap-1">
                                            <Receipt size={13} /> Transaction ID
                                        </span>
                                        {["booking_confirmed", "checked_id", "checked_in", "checked_out", "confirmed"].includes(status) && effectivePaid > 0 ? (
                                            <span className="text-rose-600 font-bold text-[10px]">* Required</span>
                                        ) : (
                                            <span className="text-slate-400 text-[10px]">(Optional for Request/Waiting)</span>
                                        )}
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    value={transactionId}
                                    onChange={e => setTransactionId(e.target.value)}
                                    placeholder="TrxID / Receipt No"
                                    className={`input input-sm input-bordered w-full rounded-xl bg-white text-xs ${["booking_confirmed", "checked_id", "checked_in", "checked_out", "confirmed"].includes(status) && effectivePaid > 0 && !transactionId.trim() ? 'border-amber-400' : ''}`}
                                />
                            </div>
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
                                "Save Changes"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}

export default EditBookingModal
