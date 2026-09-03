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
    const [paymentMethod, setPaymentMethod] = useState('')
    const [transactionId, setTransactionId] = useState('')
    const [extraService, setExtraService] = useState('')
    const [extraServiceCost, setExtraServiceCost] = useState('')
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

    // Helper: Validate room assignment conflicts in Edit Modal
    const isRoomNoOccupied = (roomNo, checkInDate, checkOutDate, currentBookingId, currentRoomIndex) => {
        if (!roomNo || !checkInDate || !checkOutDate) return false
        const checkIn = formatLocalDate(checkInDate)
        const checkOut = formatLocalDate(checkOutDate)

        // 1. Check against other rooms in the SAME edit modal form
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
            const existingMethod = booking.paymentMethod || 
                booking.paymentHistory?.[0]?.paymentMethod || 
                booking.paymentHistory?.find(p => p.paymentMethod)?.paymentMethod || ''
            setPaymentMethod(existingMethod)
            const existingTrxId = booking.transactionId || 
                booking.paymentHistory?.[0]?.transactionId || 
                booking.paymentHistory?.find(p => p.transactionId)?.transactionId || ''
            setTransactionId(existingTrxId)
            setReference(booking.reference || '')
            setNotes(booking.notes || '')
            
            const rawRooms = getBookingRooms(booking)
            setRooms(rawRooms.map(r => ({
                ...r,
                checkInDate: parseLocalDate(r.checkIn),
                checkOutDate: parseLocalDate(r.checkOut),
                adults: r.adults !== undefined && r.adults !== null && r.adults !== '' ? r.adults : '',
                babies: Number(r.children !== undefined ? r.children : (r.babies || 0)),
                children: Number(r.children !== undefined ? r.children : (r.babies || 0)),
                pricePerNight: Number(r.pricePerNight || 0),
                roomNo: r.roomNo || ''
            })))

            const initialPaid = booking.paidAmount !== undefined ? booking.paidAmount : (booking.advanceAmount || 0)
            setPaidAmount(initialPaid !== undefined && initialPaid > 0 ? String(initialPaid) : '')
            setExtraService(booking.extraService || '')
            setExtraServiceCost(booking.extraServiceCost ? String(booking.extraServiceCost) : '')
            setAdvanceAmount(booking.advanceAmount || 0)
        }
    }, [booking, isOpen])

    if (!isOpen || !booking) return null

    const extraCost = extraServiceCost !== '' ? Math.max(0, Number(extraServiceCost)) : 0
    const roomSubtotal = rooms.reduce((sum, r) => {
        if (!r.checkInDate || !r.checkOutDate) return sum
        const nights = Math.ceil((r.checkOutDate - r.checkInDate) / (1000 * 60 * 60 * 24))
        return sum + (nights > 0 ? nights * Number(r.pricePerNight || 0) : 0)
    }, 0)
    const standardTotal = roomSubtotal + extraCost
    const netPayable = standardTotal
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
            adults: '',
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

        if (!name.trim()) {
            toast.error("Guest name is required.")
            return
        }
        if (!mobile.trim()) {
            toast.error("Guest mobile number is required.")
            return
        }

        if (rooms.length === 0) {
            toast.error("At least one room is required.")
            return
        }

        // Validate stay dates and conflicts
        for (let i = 0; i < rooms.length; i++) {
            const r = rooms[i]
            if (!r.checkInDate || !r.checkOutDate || r.checkInDate >= r.checkOutDate) {
                toast.error(`Invalid stay dates for Room ${r.roomNo || i + 1}. Check-out must be after check-in.`)
                return
            }

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

        // If status is booking_confirmed, checked_id, checked_out:
        const isConfirmedStatus = ["booking_confirmed", "checked_id", "checked_in", "checked_out", "confirmed"].includes(status)
        if (isConfirmedStatus) {
            const missingAdults = rooms.find(r => !r.adults || Number(r.adults) <= 0)
            if (missingAdults) {
                toast.error(`Adult guest count is required for Room ${missingAdults.roomNo || ''} for confirmed reservations.`)
                return
            }

            if (effectivePaid <= 0 && status !== "request_booking") {
                toast.error("Payment Done amount is required for confirmed bookings.")
                return
            }

            if (!paymentMethod.trim()) {
                toast.error("Payment Method is required.")
                return
            }

            const isNoTrxMethod = ["Cash", "Other"].includes(paymentMethod.trim())
            if (!isNoTrxMethod && !transactionId.trim()) {
                toast.error(`Transaction ID / Receipt No is required for ${paymentMethod}.`)
                return
            }

            if (!reference.trim()) {
                toast.error("Staff / Admin Reference is required.")
                return
            }
        }

        if (status === "checked_out" && dueAmount > 0.01) {
            toast.error(`Cannot check out: Outstanding balance of ৳${dueAmount.toLocaleString()} is remaining. Please clear all dues before checking out.`)
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
                adults: r.adults !== '' && r.adults !== undefined ? Number(r.adults) : 0,
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
                discountAmount: 0,
                paidAmount: effectivePaid,
                dueAmount: dueAmount,
                advanceAmount: effectivePaid,
                extraService: extraService.trim(),
                extraServiceCost: extraCost,
                paymentMethod: paymentMethod.trim() || booking.paymentMethod || (effectivePaid > 0 ? "Cash" : ""),
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-teal-100 bg-teal-50/60 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
                            <Pencil size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                                Edit Booking Details
                            </h3>
                            <p className="text-xs text-slate-500 font-mono">
                                ID: {booking.bookingId || booking._id}
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
                    {/* Section 1: Guest Information */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
                            <User size={14} className="text-teal-600" /> Guest Details
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                            <div className="form-control sm:col-span-4">
                                <label className="label py-0.5">
                                    <span className="label-text font-semibold text-slate-700 text-xs">
                                        Guest Full Name <span className="text-red-500 font-bold">*</span>
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Enter guest full name"
                                    className="input input-sm input-bordered rounded-xl bg-white text-xs"
                                />
                            </div>
                            <div className="form-control sm:col-span-4">
                                <label className="label py-0.5">
                                    <span className="label-text font-semibold text-slate-700 text-xs">
                                        Mobile / WhatsApp <span className="text-red-500 font-bold">*</span>
                                    </span>
                                </label>
                                <input
                                    type="tel"
                                    required
                                    value={mobile}
                                    onChange={e => setMobile(e.target.value)}
                                    placeholder="01XXXXXXXXX"
                                    className="input input-sm input-bordered rounded-xl bg-white text-xs font-mono"
                                />
                            </div>
                            <div className="form-control sm:col-span-4">
                                <label className="label py-0.5">
                                    <span className="label-text font-semibold text-slate-700 text-xs">Email Address</span>
                                </label>
                                <input
                                    type="email"
                                    value={userEmail}
                                    onChange={e => setUserEmail(e.target.value)}
                                    placeholder="guest@example.com"
                                    className="input input-sm input-bordered rounded-xl bg-white text-xs"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                            <div className="form-control sm:col-span-6">
                                <label className="label py-0.5">
                                    <span className="label-text font-semibold text-slate-700 text-xs">Guest Address</span>
                                </label>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                                    placeholder="City / District"
                                    className="input input-sm input-bordered rounded-xl bg-white text-xs"
                                />
                            </div>
                            <div className="form-control sm:col-span-6">
                                <label className="label py-0.5">
                                    <span className="label-text font-semibold text-slate-700 text-xs flex items-center gap-1">
                                        <FileText size={13} className="text-teal-600" /> Internal Notes / Guest Requests
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Special requests, advance notes..."
                                    className="input input-sm input-bordered rounded-xl bg-white text-xs"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Booked Rooms Breakdown */}
                    <div className="space-y-4 pt-1">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-1.5">
                                <BedDouble size={14} className="text-teal-600" /> Booked Rooms ({rooms.length})
                            </h4>
                            <button
                                type="button"
                                onClick={handleAddRoom}
                                className="btn btn-xs btn-outline border-teal-600 text-teal-700 hover:bg-teal-50 rounded-xl gap-1 font-bold"
                            >
                                <Plus size={13} /> Add Another Room
                            </button>
                        </div>

                        <div className="space-y-4">
                            {rooms.map((room, index) => {
                                const cat = categories.find(c => String(c._id) === String(room.categoryId))
                                const availableRoomNumbers = Array.isArray(cat?.roomNumbers) ? cat.roomNumbers : []
                                const nights = Math.max(1, Math.ceil((new Date(room.checkOutDate) - new Date(room.checkInDate)) / (1000 * 60 * 60 * 24)))
                                const effectivePricePerNight = Number(room.pricePerNight || cat?.price || 0)
                                const defaultCatPrice = Number(cat?.price || 0)

                                return (
                                    <div
                                        key={index}
                                        className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border-2 border-slate-200/90 space-y-3.5 relative shadow-xs"
                                    >
                                        {/* Room Card Header */}
                                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                            <div className="flex items-center gap-2">
                                                <span className="badge badge-sm bg-teal-700 text-white font-bold">
                                                    Room {index + 1}
                                                </span>
                                                <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                                    {cat?.name || "Choose Category"}
                                                </span>
                                                <span className="text-[11px] font-bold text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded-md">
                                                    ৳{effectivePricePerNight.toLocaleString()}/night
                                                </span>
                                            </div>

                                            {rooms.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveRoom(index)}
                                                    className="btn btn-ghost btn-xs text-rose-600 hover:bg-rose-50 rounded-lg gap-1 font-bold"
                                                    title="Remove this room"
                                                >
                                                    <Trash2 size={13} /> Remove Room
                                                </button>
                                            )}
                                        </div>

                                        {/* Row 1: Category Selector, Stay Dates & Negotiated Price */}
                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                            {/* Category Selector */}
                                            <div className="form-control sm:col-span-3">
                                                <label className="label py-0.5">
                                                    <span className="label-text font-semibold text-slate-700 text-xs">
                                                        Category Type <span className="text-red-500 font-bold">*</span>
                                                    </span>
                                                </label>
                                                <select
                                                    value={room.categoryId}
                                                    onChange={e => handleRoomChange(index, { categoryId: e.target.value })}
                                                    className="select select-sm select-bordered rounded-xl bg-white text-xs font-semibold w-full"
                                                >
                                                    {categories.map(c => (
                                                        <option key={c._id} value={c._id}>
                                                            {c.name} (৳{Number(c.price || 0).toLocaleString()}/n)
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Check-In Date */}
                                            <div className="form-control sm:col-span-3">
                                                <label className="label py-0.5 block">
                                                    <span className="label-text font-semibold text-slate-700 text-xs">
                                                        Check-In Date <span className="text-red-500 font-bold">*</span>
                                                    </span>
                                                </label>
                                                <DatePicker
                                                    selected={room.checkInDate}
                                                    onChange={date => handleRoomChange(index, { checkInDate: date })}
                                                    selectsStart
                                                    startDate={room.checkInDate}
                                                    endDate={room.checkOutDate}
                                                    dateFormat="dd MMM yyyy"
                                                    wrapperClassName="w-full"
                                                    className="input input-sm input-bordered rounded-xl bg-white text-xs w-full cursor-pointer"
                                                    onChangeRaw={e => e.preventDefault()}
                                                />
                                            </div>

                                            {/* Check-Out Date */}
                                            <div className="form-control sm:col-span-3">
                                                <label className="label py-0.5">
                                                    <span className="label-text font-semibold text-slate-700 text-xs">
                                                        Check-Out Date <span className="text-red-500 font-bold">*</span>
                                                    </span>
                                                </label>
                                                <DatePicker
                                                    selected={room.checkOutDate}
                                                    onChange={date => handleRoomChange(index, { checkOutDate: date })}
                                                    selectsEnd
                                                    startDate={room.checkInDate}
                                                    endDate={room.checkOutDate}
                                                    minDate={room.checkInDate ? addDays(room.checkInDate, 1) : new Date()}
                                                    dateFormat="dd MMM yyyy"
                                                    wrapperClassName="w-full"
                                                    className="input input-sm input-bordered rounded-xl bg-white text-xs w-full cursor-pointer font-bold text-teal-800"
                                                    onChangeRaw={e => e.preventDefault()}
                                                />
                                            </div>

                                            {/* Negotiate Price Field */}
                                            <div className="form-control sm:col-span-3">
                                                <label className="label py-0.5">
                                                    <span className="label-text font-bold text-slate-800 text-xs flex items-center justify-between">
                                                        <span>Negotiate Price (৳)</span>
                                                        {room.pricePerNight !== undefined && Number(room.pricePerNight) !== defaultCatPrice && (
                                                            <span className="text-[10px] text-teal-700 font-bold">Custom</span>
                                                        )}
                                                    </span>
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={room.pricePerNight}
                                                    onChange={e => handleRoomChange(index, { pricePerNight: e.target.value })}
                                                    placeholder={String(defaultCatPrice)}
                                                    className="input input-sm input-bordered rounded-xl bg-white text-xs font-bold text-teal-900 w-full"
                                                />
                                                <span className="text-[10px] text-slate-400 mt-0.5">
                                                    Default: ৳{defaultCatPrice.toLocaleString()}/n
                                                </span>
                                            </div>
                                        </div>

                                        {/* Row 2: Guests Per Room & Duration/Subtotal Breakdown */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <div className="form-control">
                                                <label className="label py-0.5">
                                                    <span className="label-text font-semibold text-slate-700 text-xs">Adults</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={room.adults !== undefined ? room.adults : ''}
                                                    placeholder="0"
                                                    onChange={e => handleRoomChange(index, { adults: e.target.value })}
                                                    className="input input-sm input-bordered rounded-xl bg-white text-xs font-semibold w-full"
                                                />
                                            </div>

                                            <div className="form-control">
                                                <label className="label py-0.5">
                                                    <span className="label-text font-semibold text-slate-700 text-xs">Children</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={room.children !== undefined ? room.children : (room.babies || '')}
                                                    placeholder="0"
                                                    onChange={e => handleRoomChange(index, { babies: e.target.value, children: e.target.value })}
                                                    className="input input-sm input-bordered rounded-xl bg-white text-xs font-semibold w-full"
                                                />
                                            </div>

                                            <div className="col-span-2 flex items-end">
                                                <div className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-200 w-full flex justify-between items-center">
                                                    <span>Duration: <strong>{nights} night(s)</strong></span>
                                                    <span>Room Total: <strong className="text-teal-800">৳{Number(effectivePricePerNight * nights).toLocaleString()}</strong></span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 3: Physical Room Checkbox Selection Grid */}
                                        <div className="space-y-2 pt-1 border-t border-slate-200/80">
                                            <div className="flex items-center justify-between">
                                                <label className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                                    <BedDouble size={14} className="text-teal-600" />
                                                    Select Physical Room Number <span className="text-red-500 font-bold">*</span>
                                                    {room.roomNo ? ` (Assigned: Room ${room.roomNo})` : ""}
                                                </label>
                                                {room.roomNo && (
                                                    <span className="badge badge-sm bg-teal-50 text-teal-800 border-teal-200 font-bold">
                                                        Assigned: Room {room.roomNo}
                                                    </span>
                                                )}
                                            </div>

                                            {availableRoomNumbers.length === 0 ? (
                                                <p className="text-xs text-slate-400 italic bg-white p-3 rounded-xl border border-slate-200">
                                                    No physical room numbers defined for this suite category.
                                                </p>
                                            ) : (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                                    {availableRoomNumbers.map(num => {
                                                        const cleanNum = String(num).trim()
                                                        const isSelected = String(room.roomNo || "").trim() === cleanNum
                                                        const isOccupied = isRoomNoOccupied(cleanNum, room.checkInDate, room.checkOutDate, booking._id, index)
                                                        const isOOO = isRoomOutOfOrder(cleanNum, room.checkInDate, room.checkOutDate)
                                                        const isDisabled = (isOccupied || isOOO) && !isSelected

                                                        return (
                                                            <label
                                                                key={cleanNum}
                                                                className={`relative flex items-center justify-between p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                                                                    isSelected
                                                                        ? "bg-[#0f766e] text-white border-[#0f766e] shadow-xs ring-2 ring-teal-500/30 font-bold"
                                                                        : isDisabled
                                                                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                                                                        : "bg-white text-slate-800 border-slate-200 hover:border-teal-400 hover:bg-teal-50/40"
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        disabled={isDisabled}
                                                                        onChange={() => handleRoomChange(index, { roomNo: isSelected ? "" : cleanNum })}
                                                                        className="checkbox checkbox-sm checkbox-primary rounded-md"
                                                                    />
                                                                    <span className="font-mono text-xs font-bold">
                                                                        Room {cleanNum}
                                                                    </span>
                                                                </div>

                                                                {isDisabled && (
                                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                                                        isOOO ? "bg-amber-100 text-amber-900" : "bg-rose-100 text-rose-900"
                                                                    }`}>
                                                                        {isOOO ? "OOO" : "Busy"}
                                                                    </span>
                                                                )}
                                                                {isSelected && (
                                                                    <span className="text-[10px] font-bold text-teal-200">
                                                                        ✓ Selected
                                                                    </span>
                                                                )}
                                                            </label>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Section 3: Extra Services & Facilities (Optional) */}
                    <div className="bg-amber-50/40 border border-amber-200/70 rounded-2xl p-4 space-y-3">
                        <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <CreditCard size={14} className="text-amber-600" /> Extra Services & Facilities (Optional)
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                    {/* Section 4: Financials & Payment Details */}
                    <div className="space-y-3 pt-1">
                        <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                            <CreditCard size={14} className="text-teal-600" /> Billing & Payment Details
                        </h4>

                        {/* Financial Calculation Card */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs border-b border-slate-200 pb-2">
                                <span className="text-slate-600 font-semibold">
                                    Room Tariff Subtotal: <strong className="text-slate-800">৳{roomSubtotal.toLocaleString()}</strong>
                                    {extraCost > 0 && <span className="text-amber-800 font-bold ml-2">(+ Extra Service: ৳{extraCost.toLocaleString()})</span>}
                                </span>
                                <strong className="text-slate-900 font-extrabold text-sm font-mono">Total Payable: ৳{standardTotal.toLocaleString()}</strong>
                            </div>

                            {/* All 3 Payment-Related Fields in 3 Columns */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                {/* Payment Done / Received Input */}
                                <div className="form-control">
                                    <label className="label py-0.5 block">
                                        <span className="label-text font-bold text-slate-800 text-xs flex items-center gap-1">
                                            <CreditCard size={13} className="text-teal-600" /> Payment Done (৳)
                                        </span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={netPayable * 2}
                                        value={paidAmount}
                                        onChange={e => setPaidAmount(e.target.value)}
                                        placeholder="0"
                                        className="input input-sm input-bordered rounded-xl bg-white text-xs font-bold text-emerald-800"
                                    />
                                    {/* Quick payment helper buttons */}
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setPaidAmount(String(netPayable))}
                                            className="btn btn-xs btn-outline border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-lg text-[10px] font-bold"
                                        >
                                            Full Paid (৳{netPayable.toLocaleString()})
                                        </button>
                                        {netPayable > 1000 && (
                                            <button
                                                type="button"
                                                onClick={() => setPaidAmount(String(Math.round(netPayable / 2)))}
                                                className="btn btn-xs btn-outline border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg text-[10px]"
                                            >
                                                50% (৳{Math.round(netPayable / 2).toLocaleString()})
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Payment Method */}
                                <div className="form-control">
                                    <label className="label py-0.5">
                                        <span className="label-text font-bold text-slate-800 text-xs flex items-center gap-1">
                                            <CreditCard size={13} className="text-teal-600" /> Payment Method
                                        </span>
                                    </label>
                                    <select
                                        value={paymentMethod}
                                        onChange={e => setPaymentMethod(e.target.value)}
                                        className="select select-sm select-bordered rounded-xl bg-white text-xs font-semibold"
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

                                {/* Transaction ID / Receipt */}
                                <div className="form-control">
                                    <label className="label py-0.5">
                                        <span className="label-text font-bold text-slate-800 text-xs flex items-center justify-between w-full">
                                            <span className="flex items-center gap-1">
                                                <Receipt size={13} className="text-teal-600" /> Transaction ID / Receipt
                                            </span>
                                            {effectivePaid > 0 && !["Cash", "Other"].includes(paymentMethod) && (
                                                <span className="text-red-500 font-bold text-[10px]">* Required</span>
                                            )}
                                        </span>
                                    </label>
                                    <input
                                        type="text"
                                        value={transactionId}
                                        onChange={e => setTransactionId(e.target.value)}
                                        placeholder="e.g. TRX123456 or Bank Slip No."
                                        className={`input input-sm input-bordered rounded-xl bg-white text-xs ${effectivePaid > 0 && !["Cash", "Other"].includes(paymentMethod) && !transactionId.trim() ? 'border-amber-400' : ''}`}
                                    />
                                </div>
                            </div>

                            {/* Live Breakdown & Due Display */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-white border border-slate-200 text-xs mt-1">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2.5">
                                        <span className="text-teal-900 font-extrabold text-xs sm:text-sm">Total Payable: ৳{netPayable.toLocaleString()}</span>
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

                        {/* Status & Staff Reference in 2 Columns */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="form-control">
                                <label className="label py-0.5">
                                    <span className="label-text font-semibold text-slate-700 text-xs">Reservation Status <span className="text-red-500 font-bold">*</span></span>
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

                            <div className="form-control">
                                <label className="label py-0.5 block">
                                    <span className="label-text font-semibold text-slate-700 text-xs flex items-center gap-1">
                                        <UserCheck size={13} className="text-teal-600" /> Reference (Staff / Admin)
                                    </span>
                                </label>
                                <select
                                    value={reference}
                                    onChange={e => setReference(e.target.value)}
                                    className="select select-sm select-bordered rounded-xl bg-white text-xs font-medium"
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
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 bg-slate-50/70 -mx-6 -mb-6 p-6 rounded-b-3xl shrink-0">
                        <div className='w-max'>
                            <div className="text-xs text-slate-500 font-medium leading-tight">
                                Total ({rooms.length} Room{rooms.length !== 1 ? 's' : ''}): <strong className="text-teal-900 font-extrabold text-sm">৳{netPayable.toLocaleString()}</strong>
                                {dueAmount > 0 && (
                                    <>
                                        <br />
                                        <span className="text-orange-600 font-bold text-[11px]">(Due: ৳{dueAmount.toLocaleString()})</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
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
                                className="btn btn-sm bg-[#5261d6] hover:bg-[#4351be] text-white font-bold rounded-xl px-5 shadow-xs border-none disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <span className="loading loading-spinner loading-xs" />
                                ) : (
                                    <CheckCircle2 size={14} />
                                )}
                                <span>Save Changes</span>
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    )
}

export default EditBookingModal
