import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
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
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [name, setName] = useState('')
    const [mobile, setMobile] = useState('')
    const [address, setAddress] = useState('')
    const [userEmail, setUserEmail] = useState('')
    const [status, setStatus] = useState('request_booking')
    const [reference, setReference] = useState('')
    const [transactionId, setTransactionId] = useState('')
    const [totalAmount, setTotalAmount] = useState(0)
    const [paidAmount, setPaidAmount] = useState(0)
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

    useEffect(() => {
        if (booking && isOpen) {
            setName(booking.name || '')
            setMobile(booking.mobile || '')
            setAddress(booking.address || '')
            setUserEmail(booking.userEmail || booking.email || '')
            setStatus(booking.status || 'request_booking')
            setReference(booking.reference || '')
            setTransactionId(booking.transactionId || '')
            setNotes(booking.notes || '')
            
            const rawRooms = getBookingRooms(booking)
            setRooms(rawRooms.map(r => ({
                ...r,
                checkInDate: parseLocalDate(r.checkIn),
                checkOutDate: parseLocalDate(r.checkOut),
                adults: Number(r.adults || 2),
                babies: Number(r.babies || 0),
                pricePerNight: Number(r.pricePerNight || 0),
                roomNo: r.roomNo || ''
            })))

            const initialTotal = booking.totalAmount !== undefined ? booking.totalAmount : getBookingTotal(booking)
            setTotalAmount(initialTotal || 0)
            setPaidAmount(booking.paidAmount || 0)
            setAdvanceAmount(booking.advanceAmount || 0)
        }
    }, [booking, isOpen])

    if (!isOpen || !booking) return null

    const handleRoomChange = (index, changes) => {
        setRooms(prev => prev.map((r, idx) => {
            if (idx !== index) return r
            const updated = { ...r, ...changes }
            if (changes.categoryId) {
                const cat = categories.find(c => c._id === changes.categoryId)
                if (cat) {
                    updated.categoryName = cat.name
                    updated.pricePerNight = Number(cat.price || updated.pricePerNight)
                }
            }
            if (changes.checkInDate && updated.checkOutDate && changes.checkInDate >= updated.checkOutDate) {
                updated.checkOutDate = null
            }
            return updated
        }))
    }

    const handleAddRoom = () => {
        const defaultCat = categories[0]
        setRooms(prev => [...prev, {
            roomId: defaultCat?._id || "",
            categoryId: defaultCat?._id || "",
            categoryName: defaultCat?.name || "Suite",
            roomNo: "",
            checkInDate: rooms[0]?.checkInDate || new Date(),
            checkOutDate: rooms[0]?.checkOutDate || addDays(new Date(), 1),
            adults: 2,
            babies: 0,
            pricePerNight: Number(defaultCat?.price || 0)
        }])
    }

    const handleRemoveRoom = (index) => {
        if (rooms.length <= 1) return
        setRooms(prev => prev.filter((_, idx) => idx !== index))
    }

    const calculateAutoTotal = () => {
        const total = rooms.reduce((sum, r) => {
            if (!r.checkInDate || !r.checkOutDate) return sum
            const nights = Math.ceil((r.checkOutDate - r.checkInDate) / (1000 * 60 * 60 * 24))
            return sum + (nights > 0 ? nights * Number(r.pricePerNight || 0) : 0)
        }, 0)
        setTotalAmount(total)
        toast.success(`Calculated Total: ৳${total.toLocaleString()}`)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
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
                babies: Number(r.babies || 0),
                pricePerNight: Number(r.pricePerNight || 0)
            }))

            const payload = {
                name: name.trim(),
                mobile: mobile.trim(),
                address: address.trim(),
                userEmail: userEmail.trim(),
                status,
                rooms: normalizedRooms,
                totalAmount: Number(totalAmount || 0),
                paidAmount: Number(paidAmount || 0),
                advanceAmount: Number(advanceAmount || 0),
                reference: reference.trim(),
                transactionId: transactionId.trim(),
                notes: notes.trim()
            }

            const res = await axiosSecure.patch(`/booking/${booking._id}`, payload)
            if (res.data) {
                toast.success("Reservation updated successfully! 🎉", { id: toastId })
                onSuccess?.()
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
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm flex-1">
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
                        <div className="form-control">
                            <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Guest Address</span></label>
                            <input
                                type="text"
                                value={address}
                                onChange={e => setAddress(e.target.value)}
                                className="input input-sm input-bordered w-full rounded-xl bg-white text-xs"
                            />
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
                                                <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Assigned Room No</span></label>
                                                <select
                                                    value={room.roomNo || ""}
                                                    onChange={e => handleRoomChange(index, { roomNo: e.target.value })}
                                                    className="select select-sm select-bordered w-full rounded-xl bg-white text-xs font-medium"
                                                >
                                                    <option value="">-- Select Room No --</option>
                                                    {availableRoomNumbers.map(num => (
                                                        <option key={num} value={num}>Room {num}</option>
                                                    ))}
                                                    {room.roomNo && !availableRoomNumbers.includes(room.roomNo) && (
                                                        <option value={room.roomNo}>{room.roomNo}</option>
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
                                <CreditCard size={14} className="text-teal-600" /> Billing & Status
                            </h4>
                            <button
                                type="button"
                                onClick={calculateAutoTotal}
                                className="text-[11px] font-semibold text-teal-700 hover:underline"
                            >
                                Auto-Calculate Total
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div className="form-control">
                                <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Total Bill (৳) *</span></label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    value={totalAmount}
                                    onChange={e => setTotalAmount(e.target.value)}
                                    className="input input-sm input-bordered w-full rounded-xl bg-white text-xs font-bold text-teal-900"
                                />
                            </div>
                            <div className="form-control">
                                <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Paid Amount (৳)</span></label>
                                <input
                                    type="number"
                                    min="0"
                                    value={paidAmount}
                                    onChange={e => setPaidAmount(e.target.value)}
                                    className="input input-sm input-bordered w-full rounded-xl bg-white text-xs"
                                />
                            </div>
                            <div className="form-control">
                                <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Advance Amount (৳)</span></label>
                                <input
                                    type="number"
                                    min="0"
                                    value={advanceAmount}
                                    onChange={e => setAdvanceAmount(e.target.value)}
                                    className="input input-sm input-bordered w-full rounded-xl bg-white text-xs"
                                />
                            </div>
                            <div className="form-control">
                                <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Reservation Status</span></label>
                                <select
                                    value={status}
                                    onChange={e => setStatus(e.target.value)}
                                    className="select select-sm select-bordered w-full rounded-xl bg-white text-xs font-medium"
                                >
                                    {STATUS_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
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
                                <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs flex items-center gap-1"><Receipt size={13} /> Transaction ID</span></label>
                                <input
                                    type="text"
                                    value={transactionId}
                                    onChange={e => setTransactionId(e.target.value)}
                                    placeholder="TrxID / Receipt No"
                                    className="input input-sm input-bordered w-full rounded-xl bg-white text-xs"
                                />
                            </div>
                        </div>

                        <div className="form-control">
                            <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs flex items-center gap-1"><FileText size={13} /> Admin Internal Notes</span></label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Special requests, discount reason, guest preferences..."
                                className="textarea textarea-bordered textarea-sm w-full rounded-xl bg-white text-xs"
                                rows={2}
                            />
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
