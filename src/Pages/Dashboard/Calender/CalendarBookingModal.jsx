import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import toast from 'react-hot-toast'
import { 
    X, 
    Plus, 
    Trash2, 
    User, 
    Phone, 
    BedDouble, 
    CreditCard, 
    Receipt, 
    UserCheck, 
    CheckCircle2, 
    Clock, 
    Lock,
    FileText
} from 'lucide-react'

const formatLocalDate = (date) => {
    if (!date) return ''
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

const getRoomNights = (entry) => {
    if (!entry.checkInDate || !entry.checkOutDate) return 0
    const start = new Date(entry.checkInDate)
    const end = new Date(entry.checkOutDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return 0
    const diffTime = Math.abs(end - start)
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
}

const CalendarBookingModal = ({ 
    isOpen, 
    onClose, 
    initialData, 
    categories = [], 
    onSuccess, 
    currentUser, 
    role 
}) => {
    const axiosSecure = useAxiosSecure()
    const [submittingStatus, setSubmittingStatus] = useState(null)

    // Form states
    const [name, setName] = useState('')
    const [mobile, setMobile] = useState('')
    const [userEmail, setUserEmail] = useState('')
    const [address, setAddress] = useState('')

    // Rooms list
    const [bookingRooms, setBookingRooms] = useState([])

    // Payment / Confirmation fields
    const [paymentMethod, setPaymentMethod] = useState('bKash')
    const [reference, setReference] = useState('')
    const [customTotalAmount, setCustomTotalAmount] = useState('')
    const [paidAmount, setPaidAmount] = useState('')
    const [transactionId, setTransactionId] = useState('')
    const [notes, setNotes] = useState('')

    // Staff/Admin users for reference dropdown
    const { data: allUsers = [] } = useQuery({
        queryKey: ["all-users-for-calendar-booking"],
        queryFn: async () => {
            const res = await axiosSecure.get("/users")
            return res.data
        },
        enabled: isOpen
    })

    // Active bookings for room conflict check
    const { data: activeBookings = [] } = useQuery({
        queryKey: ["active-bookings-for-calendar-modal"],
        queryFn: async () => {
            const res = await axiosSecure.get("/bookings")
            return res.data
        },
        enabled: isOpen
    })

    // Out of order rooms check
    const { data: outOfOrderList = [] } = useQuery({
        queryKey: ["out-of-order-calendar-booking-modal"],
        queryFn: async () => {
            const res = await axiosSecure.get("/out-of-order")
            return res.data
        },
        enabled: isOpen
    })

    const eligibleReferences = allUsers.filter(u => u.role && u.role !== "user")

    const isRoomOutOfOrder = (roomNo, checkIn, checkOut) => {
        if (!roomNo || !checkIn || !checkOut) return false
        return outOfOrderList.some(ooo => {
            if (!ooo || ooo.status !== "active") return false
            return String(ooo.roomNo).trim() === String(roomNo).trim() && ooo.startDate < checkOut && ooo.endDate > checkIn
        })
    }

    // Helper: is a physical roomNo occupied for dates [checkIn, checkOut]
    const isRoomNoOccupied = (roomNo, checkIn, checkOut, currentRoomIndex) => {
        if (!roomNo || !checkIn || !checkOut) return false

        // Check in same form
        const assignedInSameForm = bookingRooms.some((r, idx) => {
            if (idx === currentRoomIndex) return false
            const rIn = formatLocalDate(r.checkInDate)
            const rOut = formatLocalDate(r.checkOutDate)
            return r.roomNo === roomNo && rIn < checkOut && rOut > checkIn
        })
        if (assignedInSameForm) return true

        // Check against active bookings
        return activeBookings.some(b => {
            if (["cancel", "cancelled"].includes(b.status)) return false
            const bRooms = Array.isArray(b.rooms) ? b.rooms : [b]
            return bRooms.some(r => {
                const rIn = r.checkIn
                const rOut = r.checkOut
                return String(r.roomNo).trim() === String(roomNo).trim() && rIn < checkOut && rOut > checkIn
            })
        })
    }

    // Initialize initial room from clicked cell
    useEffect(() => {
        if (isOpen && initialData) {
            const clickedCat = categories.find(c => String(c._id) === String(initialData.categoryId) || c.name === initialData.categoryName) || categories[0]
            const clickedDate = initialData.checkInDate ? new Date(initialData.checkInDate) : new Date()
            const nextDay = new Date(clickedDate.getTime() + 24 * 60 * 60 * 1000)

            const firstRoom = {
                itemId: `room-${Date.now()}-1`,
                categoryId: clickedCat?._id || "",
                categoryName: clickedCat?.name || initialData.categoryName || "Category",
                roomNo: String(initialData.roomNo || "").trim(),
                checkInDate: clickedDate,
                checkOutDate: nextDay,
                adults: 2,
                babies: 0,
                sameCategory: true,
                pricePerNight: Number(clickedCat?.price || 0)
            }

            setBookingRooms([firstRoom])
            setName('')
            setMobile('')
            setUserEmail('')
            setAddress('')
            setBookingRooms([firstRoom])
            setName('')
            setMobile('')
            setUserEmail('')
            setAddress('')
            setReference('')
            setCustomTotalAmount('')
            setPaidAmount('')
            setTransactionId('')
            setNotes('')
            setSubmittingStatus(null)
        }
    }, [isOpen, initialData, categories])

    if (!isOpen || !initialData) return null

    // Standard base calculation (sum of original category prices * nights)
    const standardTotal = bookingRooms.reduce((sum, room) => {
        const cat = categories.find(c => String(c._id) === String(room.categoryId))
        const price = Number(cat?.price || room.pricePerNight || 0)
        const nights = getRoomNights(room)
        return sum + (price * nights)
    }, 0)

    // Final total bill (standard or custom authority price)
    const finalTotal = customTotalAmount !== '' ? Number(customTotalAmount) : standardTotal

    // If authority lowered the price, difference is automatically treated as discount
    const discountAmount = Math.max(0, standardTotal - finalTotal)

    // Payment done by guest
    const effectivePaid = paidAmount !== '' ? Number(paidAmount) : 0

    // Live remaining payment due
    const dueAmount = Math.max(0, finalTotal - effectivePaid)

    const handleAddRoom = () => {
        const firstCatId = bookingRooms[0]?.categoryId || categories[0]?._id || ""
        const firstCat = categories.find(c => String(c._id) === String(firstCatId)) || categories[0]
        const firstIn = bookingRooms[0]?.checkInDate || new Date()
        const firstOut = bookingRooms[0]?.checkOutDate || new Date(firstIn.getTime() + 24 * 60 * 60 * 1000)

        const newRoom = {
            itemId: `room-${Date.now()}-${bookingRooms.length + 1}`,
            categoryId: firstCatId,
            categoryName: firstCat?.name || "Category",
            roomNo: "",
            checkInDate: new Date(firstIn),
            checkOutDate: new Date(firstOut),
            adults: 2,
            babies: 0,
            sameCategory: true,
            pricePerNight: Number(firstCat?.price || 0)
        }

        setBookingRooms(prev => [...prev, newRoom])
    }

    const handleRemoveRoom = (itemId) => {
        if (bookingRooms.length <= 1) return
        setBookingRooms(prev => prev.filter(r => r.itemId !== itemId))
    }

    const handleRoomChange = (itemId, changes) => {
        setBookingRooms(prev => prev.map(r => {
            if (r.itemId !== itemId) return r
            const next = { ...r, ...changes }
            if (changes.categoryId) {
                const cat = categories.find(c => String(c._id) === String(changes.categoryId))
                next.categoryName = cat?.name || ""
                next.pricePerNight = Number(cat?.price || 0)
                next.roomNo = "" // Reset physical room selection when category changes
            }
            if (changes.sameCategory !== undefined && changes.sameCategory) {
                const firstCat = categories.find(c => String(c._id) === String(bookingRooms[0]?.categoryId))
                if (firstCat) {
                    next.categoryId = firstCat._id
                    next.categoryName = firstCat.name
                    next.pricePerNight = Number(firstCat.price || 0)
                    next.roomNo = ""
                }
            }
            return next
        }))
    }

    const handleSubmit = async (targetStatus) => {
        if (!name.trim()) {
            toast.error("Guest name is required.")
            return
        }
        if (!mobile.trim()) {
            toast.error("Guest mobile number is required.")
            return
        }

        // Validate dates for all rooms
        for (let i = 0; i < bookingRooms.length; i++) {
            const r = bookingRooms[i]
            if (!r.checkInDate || !r.checkOutDate || r.checkInDate >= r.checkOutDate) {
                toast.error(`Invalid stay dates for Room ${i + 1}. Check-out must be after check-in.`)
                return
            }
            // If confirming, physical roomNo is mandatory
            if (targetStatus === "booking_confirmed" && !r.roomNo) {
                toast.error(`Please select a physical room number for Room ${i + 1} to confirm booking.`)
                return
            }
        }

        setSubmittingStatus(targetStatus)
        const loadingLabels = {
            request_booking: "Saving as Request Booking...",
            payment_waiting: "Creating reservation as Payment Waiting...",
            booking_confirmed: "Confirming reservation..."
        }
        const toastId = toast.loading(loadingLabels[targetStatus] || "Processing reservation...")

        try {
            const normalizedRooms = bookingRooms.map(r => {
                const cat = categories.find(c => String(c._id) === String(r.categoryId))
                return {
                    roomId: r.categoryId,
                    categoryId: r.categoryId,
                    categoryName: cat?.name || r.categoryName || "Category",
                    roomNo: r.roomNo || "",
                    checkIn: formatLocalDate(r.checkInDate),
                    checkOut: formatLocalDate(r.checkOutDate),
                    adults: Number(r.adults || 2),
                    babies: Number(r.babies || 0),
                    pricePerNight: Number(cat?.price || r.pricePerNight || 0),
                    nights: getRoomNights(r)
                }
            })

            const submittedPaid = paidAmount !== '' ? Number(paidAmount) : (targetStatus === "booking_confirmed" ? finalTotal : 0)
            const submittedDue = Math.max(0, finalTotal - submittedPaid)

            const payload = {
                name: name.trim(),
                mobile: mobile.trim(),
                userEmail: userEmail.trim(),
                address: address.trim(),
                rooms: normalizedRooms,
                status: targetStatus,
                totalAmount: Number(finalTotal || 0),
                discountAmount: Number(discountAmount || 0),
                paidAmount: Number(submittedPaid || 0),
                dueAmount: Number(submittedDue || 0),
                advanceAmount: Number(submittedPaid || 0),
                paymentMethod: paymentMethod || "Cash",
                reference: reference.trim(),
                transactionId: transactionId.trim(),
                notes: notes.trim(),
                requestedByRole: role || "admin",
                changedBy: {
                    name: currentUser?.displayName || "Admin / Staff",
                    email: currentUser?.email || "",
                    role: role || "admin"
                }
            }

            const res = await axiosSecure.post("/bookings", payload)
            if (res.data) {
                // AWAIT the table update refetch before showing success toast and closing modal
                if (onSuccess) {
                    await onSuccess()
                }

                const successLabels = {
                    request_booking: "Saved as Request Booking! 📋",
                    payment_waiting: "Reservation set to Payment Waiting! ⏳",
                    booking_confirmed: "Reservation confirmed successfully! 🎉"
                }
                toast.success(successLabels[targetStatus] || "Reservation saved successfully!", { id: toastId })
                onClose()
            }
        } catch (err) {
            console.error("Booking submit error:", err)
            const errorMsg = err.response?.data?.message || err.message || "Failed to create reservation"
            toast.error(errorMsg, { id: toastId })
        } finally {
            setSubmittingStatus(null)
        }
    }

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-teal-100 bg-teal-50/60 shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
                            <BedDouble size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                                Create Calendar Reservation
                            </h3>
                            <p className="text-xs text-teal-800 font-semibold">
                                Room {initialData.roomNo} ({initialData.categoryName}) · {initialData.checkInDate}
                            </p>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        disabled={submittingStatus !== null}
                        className="btn btn-ghost btn-sm btn-circle text-slate-400 hover:text-slate-700"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Modal Form Body */}
                <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm flex-1">
                    {/* Guest Information Section */}
                    <div className="space-y-3">
                        <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                            <User size={14} className="text-teal-600" /> Guest Details *
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="form-control">
                                <label className="label py-0.5">
                                    <span className="label-text font-semibold text-slate-700 text-xs">Guest Full Name *</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. Tanvir Ahmed"
                                    className="input input-sm input-bordered rounded-xl bg-white text-xs"
                                />
                            </div>

                            <div className="form-control">
                                <label className="label py-0.5">
                                    <span className="label-text font-semibold text-slate-700 text-xs">Mobile / WhatsApp *</span>
                                </label>
                                <input
                                    type="tel"
                                    required
                                    value={mobile}
                                    onChange={e => setMobile(e.target.value)}
                                    placeholder="e.g. 01700000000"
                                    className="input input-sm input-bordered rounded-xl bg-white text-xs"
                                />
                            </div>

                            <div className="form-control">
                                <label className="label py-0.5">
                                    <span className="label-text font-semibold text-slate-700 text-xs">Email (Optional)</span>
                                </label>
                                <input
                                    type="email"
                                    value={userEmail}
                                    onChange={e => setUserEmail(e.target.value)}
                                    placeholder="guest@example.com"
                                    className="input input-sm input-bordered rounded-xl bg-white text-xs"
                                />
                            </div>

                            <div className="form-control">
                                <label className="label py-0.5">
                                    <span className="label-text font-semibold text-slate-700 text-xs">Address / City (Optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                                    placeholder="e.g. Dhaka, Bangladesh"
                                    className="input input-sm input-bordered rounded-xl bg-white text-xs"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Room Booking Entries */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-1.5">
                                <BedDouble size={14} className="text-teal-600" /> Booked Rooms ({bookingRooms.length})
                            </h4>
                            <button
                                type="button"
                                onClick={handleAddRoom}
                                className="btn btn-xs btn-outline border-teal-300 text-teal-700 hover:bg-teal-50 rounded-lg gap-1"
                            >
                                <Plus size={13} /> Add Another Room
                            </button>
                        </div>

                        <div className="space-y-3">
                            {bookingRooms.map((room, index) => {
                                const isFirstRoom = index === 0
                                const currentCat = categories.find(c => String(c._id) === String(room.categoryId))
                                const availableRoomNumbers = Array.isArray(currentCat?.roomNumbers) ? currentCat.roomNumbers : []
                                const nights = getRoomNights(room)

                                return (
                                    <div 
                                        key={room.itemId} 
                                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 relative"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="badge badge-sm bg-teal-600 text-white font-bold">
                                                    Room {index + 1}
                                                </span>
                                                {isFirstRoom && (
                                                    <span className="badge badge-xs bg-amber-100 text-amber-900 border-none font-semibold flex items-center gap-0.5">
                                                        <Lock size={10} /> Selected from Calendar
                                                    </span>
                                                )}
                                            </div>

                                            {!isFirstRoom && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveRoom(room.itemId)}
                                                    className="btn btn-ghost btn-xs text-rose-600 hover:bg-rose-50"
                                                    title="Remove room"
                                                >
                                                    <Trash2 size={13} /> Remove
                                                </button>
                                            )}
                                        </div>

                                        {/* Room fields */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {/* Category */}
                                            <div className="form-control">
                                                <label className="label py-0.5">
                                                    <span className="label-text font-semibold text-slate-700 text-xs">Room Category</span>
                                                </label>
                                                {isFirstRoom ? (
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        disabled
                                                        value={room.categoryName}
                                                        className="input input-sm input-bordered rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-not-allowed"
                                                    />
                                                ) : (
                                                    <select
                                                        value={room.categoryId}
                                                        onChange={e => handleRoomChange(room.itemId, { categoryId: e.target.value })}
                                                        className="select select-sm select-bordered rounded-xl bg-white text-xs font-semibold"
                                                    >
                                                        {categories.map(c => (
                                                            <option key={c._id} value={c._id}>
                                                                {c.name} - ৳{Number(c.price || 0).toLocaleString()}/night
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>

                                            {/* Assigned Physical Room No */}
                                            <div className="form-control">
                                                <label className="label py-0.5">
                                                    <span className="label-text font-semibold text-slate-700 text-xs">Physical Room No</span>
                                                </label>
                                                {isFirstRoom ? (
                                                    <div className="input input-sm input-bordered rounded-xl bg-slate-100 flex items-center gap-1.5 text-xs font-bold text-teal-800 cursor-not-allowed">
                                                        <Lock size={12} className="text-slate-400" />
                                                        <span>Room {room.roomNo}</span>
                                                    </div>
                                                ) : (
                                                    <select
                                                        value={room.roomNo || ""}
                                                        onChange={e => handleRoomChange(room.itemId, { roomNo: e.target.value })}
                                                        className="select select-sm select-bordered rounded-xl bg-white text-xs font-medium"
                                                    >
                                                        <option value="">-- Choose Physical Room --</option>
                                                        {availableRoomNumbers.map(num => {
                                                            const ooo = isRoomOutOfOrder(
                                                                num,
                                                                formatLocalDate(room.checkInDate),
                                                                formatLocalDate(room.checkOutDate)
                                                            )
                                                            const occupied = isRoomNoOccupied(
                                                                num, 
                                                                formatLocalDate(room.checkInDate), 
                                                                formatLocalDate(room.checkOutDate), 
                                                                index
                                                            )
                                                            return (
                                                                <option key={num} value={num} disabled={ooo || occupied}>
                                                                    {num} {ooo ? "(Out of Order - Maintenance)" : occupied ? "(Occupied)" : "(Available)"}
                                                                </option>
                                                            )
                                                        })}
                                                    </select>
                                                )}
                                            </div>

                                            {/* Check-In Date */}
                                            <div className="form-control">
                                                <label className="label py-0.5">
                                                    <span className="label-text font-semibold text-slate-700 text-xs">Check-In Date</span>
                                                </label>
                                                {isFirstRoom ? (
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        disabled
                                                        value={formatLocalDate(room.checkInDate)}
                                                        className="input input-sm input-bordered rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-not-allowed"
                                                    />
                                                ) : (
                                                    <DatePicker
                                                        selected={room.checkInDate}
                                                        onChange={date => handleRoomChange(room.itemId, { checkInDate: date })}
                                                        selectsStart
                                                        startDate={room.checkInDate}
                                                        endDate={room.checkOutDate}
                                                        minDate={new Date()}
                                                        dateFormat="dd MMM yyyy"
                                                        className="input input-sm input-bordered rounded-xl bg-white text-xs w-full cursor-pointer"
                                                        onChangeRaw={e => e.preventDefault()}
                                                    />
                                                )}
                                            </div>

                                            {/* Check-Out Date */}
                                            <div className="form-control">
                                                <label className="label py-0.5">
                                                    <span className="label-text font-semibold text-slate-700 text-xs">Check-Out Date *</span>
                                                </label>
                                                <DatePicker
                                                    selected={room.checkOutDate}
                                                    onChange={date => handleRoomChange(room.itemId, { checkOutDate: date })}
                                                    selectsEnd
                                                    startDate={room.checkInDate}
                                                    endDate={room.checkOutDate}
                                                    minDate={new Date(new Date(room.checkInDate).getTime() + 24 * 60 * 60 * 1000)}
                                                    dateFormat="dd MMM yyyy"
                                                    className="input input-sm input-bordered rounded-xl bg-white text-xs w-full cursor-pointer font-bold text-teal-800"
                                                    onChangeRaw={e => e.preventDefault()}
                                                />
                                            </div>

                                            {/* Guests */}
                                            <div className="form-control">
                                                <label className="label py-0.5">
                                                    <span className="label-text font-semibold text-slate-700 text-xs">Adults</span>
                                                </label>
                                                <select
                                                    value={room.adults}
                                                    onChange={e => handleRoomChange(room.itemId, { adults: Number(e.target.value) })}
                                                    className="select select-sm select-bordered rounded-xl bg-white text-xs"
                                                >
                                                    {[1, 2, 3, 4, 5, 6].map(n => (
                                                        <option key={n} value={n}>{n} Adult{n > 1 ? 's' : ''}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="form-control">
                                                <label className="label py-0.5">
                                                    <span className="label-text font-semibold text-slate-700 text-xs">Babies / Children</span>
                                                </label>
                                                <select
                                                    value={room.babies}
                                                    onChange={e => handleRoomChange(room.itemId, { babies: Number(e.target.value) })}
                                                    className="select select-sm select-bordered rounded-xl bg-white text-xs"
                                                >
                                                    {[0, 1, 2, 3, 4].map(n => (
                                                        <option key={n} value={n}>{n} {n === 1 ? 'Baby' : 'Babies'}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="text-[11px] text-slate-500 pt-1 flex justify-between">
                                            <span>Duration: <strong className="text-slate-800">{nights} night(s)</strong></span>
                                            <span>Subtotal: <strong className="text-teal-800">৳{Number((room.pricePerNight || 0) * nights).toLocaleString()}</strong></span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Financials & Payment Fields */}
                    <div className="space-y-3 pt-1">
                        <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                            <CreditCard size={14} className="text-teal-600" /> Billing, Discount & Payment Details
                        </h4>

                        {/* Financial Calculation Card */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                            <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
                                <span className="text-slate-600 font-semibold">Standard Room Subtotal:</span>
                                <strong className="text-slate-900 font-bold">৳{standardTotal.toLocaleString()}</strong>
                            </div>

                            {/* Final Total Bill & Payment Done Fields */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Final Total Bill Input */}
                                <div className="form-control">
                                    <label className="label py-0.5">
                                        <span className="label-text font-bold text-slate-800 text-xs flex items-center gap-1">
                                            <CreditCard size={13} className="text-teal-600" /> Final Total Bill (৳) *
                                        </span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={customTotalAmount !== '' ? customTotalAmount : standardTotal}
                                        onChange={e => setCustomTotalAmount(e.target.value)}
                                        placeholder={String(standardTotal)}
                                        className="input input-sm input-bordered rounded-xl bg-white text-xs font-bold text-teal-800"
                                    />
                                    {discountAmount > 0 ? (
                                        <span className="text-[11px] text-emerald-700 font-bold mt-1">
                                            🎉 Discount Given: -৳{discountAmount.toLocaleString()} ({Math.round((discountAmount / standardTotal) * 100)}% off)
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
                                        className="input input-sm input-bordered rounded-xl bg-white text-xs font-bold text-emerald-800"
                                    />
                                    {/* Quick payment helper buttons */}
                                    <div className="flex justify-between mt-1.5">
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

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Payment Method */}
                            <div className="form-control">
                                <label className="label py-0.5">
                                    <span className="label-text font-semibold text-slate-700 text-xs flex items-center gap-1">
                                        <CreditCard size={13} className="text-teal-600" /> Payment Method
                                    </span>
                                </label>
                                <select
                                    value={paymentMethod}
                                    onChange={e => setPaymentMethod(e.target.value)}
                                    className="select select-sm select-bordered rounded-xl bg-white text-xs font-semibold"
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

                            {/* Staff Reference */}
                            <div className="form-control">
                                <label className="label py-0.5">
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

                            {/* Transaction ID */}
                            <div className="form-control">
                                <label className="label py-0.5">
                                    <span className="label-text font-semibold text-slate-700 text-xs flex items-center gap-1">
                                        <Receipt size={13} className="text-teal-600" /> Transaction ID / Cheque No
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    value={transactionId}
                                    onChange={e => setTransactionId(e.target.value)}
                                    placeholder="e.g. TRX-129482 / Cheque #..."
                                    className="input input-sm input-bordered rounded-xl bg-white text-xs"
                                />
                            </div>

                            {/* Notes */}
                            <div className="form-control sm:col-span-3 flex flex-col">
                                <label className="label py-0.5">
                                    <span className="label-text font-semibold text-slate-700 text-xs flex items-center gap-1">
                                        <FileText size={13} className="text-teal-600" /> Internal Notes
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Special requests, advance notes..."
                                    className="input w-full input-bordered rounded-xl bg-white text-xs"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer with THREE Confirm Buttons & Targeted Loading */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/70 shrink-0">
                    <div className='w-max'>
                        <div className="text-xs text-slate-500 font-medium">
                            Total: <strong className="text-teal-900 font-extrabold text-sm">৳{Number(finalTotal || 0).toLocaleString()}</strong>
                            {dueAmount > 0 && (
                                <span className="ml-2 text-orange-600 font-bold">(Due: ৳{dueAmount.toLocaleString()})</span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Button 1: Save as Request Booking */}
                        <button
                            type="button"
                            onClick={() => handleSubmit("request_booking")}
                            disabled={submittingStatus !== null}
                            className="btn btn-sm bg-[#f59e0b] hover:bg-amber-600 text-white font-bold rounded-xl px-3 shadow-xs border-none"
                        >
                            {submittingStatus === "request_booking" ? (
                                <span className="loading loading-spinner loading-xs" />
                            ) : (
                                <Clock size={14} />
                            )}
                            <span>Request Booking</span>
                        </button>

                        {/* Button 2: Set to Payment Waiting */}
                        <button
                            type="button"
                            onClick={() => handleSubmit("payment_waiting")}
                            disabled={submittingStatus !== null}
                            className="btn btn-sm bg-[#eab308] hover:bg-yellow-500 text-amber-950 font-bold rounded-xl px-3 shadow-xs border-none"
                        >
                            {submittingStatus === "payment_waiting" ? (
                                <span className="loading loading-spinner loading-xs" />
                            ) : (
                                <CreditCard size={14} />
                            )}
                            <span>Payment Waiting</span>
                        </button>

                        {/* Button 3: Booking Confirmed */}
                        <button
                            type="button"
                            onClick={() => handleSubmit("booking_confirmed")}
                            disabled={submittingStatus !== null}
                            className="btn btn-sm bg-[#5261d6] hover:bg-[#4351be] text-white font-bold rounded-xl px-4 shadow-xs border-none"
                        >
                            {submittingStatus === "booking_confirmed" ? (
                                <span className="loading loading-spinner loading-xs" />
                            ) : (
                                <CheckCircle2 size={14} />
                            )}
                            <span>Confirm Booking</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default CalendarBookingModal
