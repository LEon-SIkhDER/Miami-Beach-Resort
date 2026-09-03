import React, { useState, useEffect, useMemo } from 'react'
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
    FileText,
    Sparkles,
    CheckSquare,
    Square
} from 'lucide-react'
import { formatDate } from '../../../utils/bookingUtils'

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

// Resolve the effective price for a category on a given check-in date.
// Finds the latest scheduledPrice whose effectiveDate <= checkInDate (YYYY-MM-DD).
// Falls back to the category's base price if no scheduled price applies.
const getEffectivePrice = (cat, checkInDate) => {
    const basePrice = Number(cat?.price || 0)
    if (!checkInDate || !Array.isArray(cat?.scheduledPrices) || cat.scheduledPrices.length === 0) {
        return basePrice
    }
    const checkIn = typeof checkInDate === 'string' ? checkInDate : formatLocalDate(checkInDate)
    if (!checkIn) return basePrice

    const applicable = cat.scheduledPrices
        .filter(sp => sp.effectiveDate && sp.effectiveDate <= checkIn)
        .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate)) // latest first

    return applicable.length > 0 ? Number(applicable[0].price || 0) : basePrice
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

    // Category blocks with room checkboxes
    const [categoryBlocks, setCategoryBlocks] = useState([])

    // Payment / Confirmation / Extra Services fields
    const [extraService, setExtraService] = useState('')
    const [extraServiceCost, setExtraServiceCost] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('')
    const [reference, setReference] = useState('')
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

    // Helper: is a physical roomNo occupied in db for dates [checkIn, checkOut]
    const isRoomOccupiedInDb = (roomNo, checkIn, checkOut) => {
        if (!roomNo || !checkIn || !checkOut) return false
        return activeBookings.some(b => {
            if (["cancel", "cancelled", "checked_out"].includes(b.status)) return false
            const bRooms = Array.isArray(b.rooms) ? b.rooms : [b]
            return bRooms.some(r => {
                const rIn = r.checkIn
                const rOut = r.checkOut
                return String(r.roomNo).trim() === String(roomNo).trim() && rIn < checkOut && rOut > checkIn
            })
        })
    }

    // Check conflict for a given room number within a category block
    const getRoomConflictInfo = (roomNo, block) => {
        const checkIn = formatLocalDate(block.checkInDate)
        const checkOut = formatLocalDate(block.checkOutDate)
        if (!roomNo || !checkIn || !checkOut) return { disabled: false, reason: "" }

        if (isRoomOutOfOrder(roomNo, checkIn, checkOut)) {
            return { disabled: true, reason: "Out of Order" }
        }

        if (isRoomOccupiedInDb(roomNo, checkIn, checkOut)) {
            return { disabled: true, reason: "Occupied" }
        }

        // Check if room is already selected in another category block with overlapping dates
        const selectedInOther = categoryBlocks.some(b => {
            if (b.blockId === block.blockId) return false
            const bIn = formatLocalDate(b.checkInDate)
            const bOut = formatLocalDate(b.checkOutDate)
            const isSelected = Array.isArray(b.selectedRooms) && b.selectedRooms.includes(String(roomNo).trim())
            return isSelected && bIn < checkOut && bOut > checkIn
        })
        if (selectedInOther) {
            return { disabled: true, reason: "Selected elsewhere" }
        }

        return { disabled: false, reason: "" }
    }

    // Initialize initial category and pre-checked room from clicked cell
    useEffect(() => {
        if (isOpen && initialData) {
            const clickedCat = categories.find(c => String(c._id) === String(initialData.categoryId) || c.name === initialData.categoryName) || categories[0]
            const clickedDate = initialData.checkInDate ? new Date(initialData.checkInDate) : new Date()
            const nextDay = new Date(clickedDate.getTime() + 24 * 60 * 60 * 1000)
            const initialRoomNo = String(initialData.roomNo || "").trim()
            const defaultPrice = getEffectivePrice(clickedCat, clickedDate)

            const initialBlock = {
                blockId: `cat-block-${Date.now()}-1`,
                categoryId: clickedCat?._id || "",
                categoryName: clickedCat?.name || initialData.categoryName || "Category",
                checkInDate: clickedDate,
                checkOutDate: nextDay,
                negotiatedPrice: defaultPrice,
                adults: '',
                children: '',
                selectedRooms: initialRoomNo ? [initialRoomNo] : [],
                isInitial: true
            }

            setCategoryBlocks([initialBlock])
            setName('')
            setMobile('')
            setUserEmail('')
            setAddress('')
            setExtraService('')
            setExtraServiceCost('')
            setPaymentMethod('')
            setReference('')
            setPaidAmount('')
            setTransactionId('')
            setNotes('')
            setSubmittingStatus(null)
        }
    }, [isOpen, initialData, categories])

    // Flatten all checked rooms across category blocks
    const flatBookedRooms = useMemo(() => {
        const result = []
        categoryBlocks.forEach((block) => {
            const cat = categories.find(c => String(c._id) === String(block.categoryId))
            const defaultPrice = getEffectivePrice(cat, block.checkInDate)
            const pricePerNight = block.negotiatedPrice !== undefined && block.negotiatedPrice !== ''
                ? Math.max(0, Number(block.negotiatedPrice))
                : defaultPrice
            const nights = getRoomNights(block)
            const selected = Array.isArray(block.selectedRooms) ? block.selectedRooms : []

            selected.forEach((roomNo) => {
                result.push({
                    blockId: block.blockId,
                    itemId: `${block.blockId}-${roomNo}`,
                    categoryId: block.categoryId,
                    categoryName: cat?.name || block.categoryName || "Category",
                    roomNo: String(roomNo).trim(),
                    checkInDate: block.checkInDate,
                    checkOutDate: block.checkOutDate,
                    adults: block.adults !== '' && block.adults !== undefined ? Number(block.adults) : 0,
                    children: block.children !== '' && block.children !== undefined ? Number(block.children) : 0,
                    babies: block.children !== '' && block.children !== undefined ? Number(block.children) : 0,
                    pricePerNight: pricePerNight,
                    nights: nights
                })
            })
        })
        return result
    }, [categoryBlocks, categories])

    if (!isOpen || !initialData) return null

    const isB2B = role === "b2b"

    // Standard room subtotal calculation (sum of category prices * nights for all checked rooms)
    const roomSubtotal = flatBookedRooms.reduce((sum, room) => {
        const price = Number(room.pricePerNight || 0)
        const nights = Number(room.nights || 0)
        return sum + (price * nights)
    }, 0)

    const extraCost = extraServiceCost !== '' ? Math.max(0, Number(extraServiceCost)) : 0
    const standardTotal = roomSubtotal + extraCost
    const finalTotal = standardTotal

    // Payment done by guest
    const effectivePaid = paidAmount !== '' ? Number(paidAmount) : 0

    // Live remaining payment due
    const dueAmount = Math.max(0, finalTotal - effectivePaid)

    // Toggle room checkbox inside a category block
    const handleToggleRoom = (blockId, roomNo) => {
        const cleanNo = String(roomNo).trim()
        setCategoryBlocks(prev => prev.map(block => {
            if (block.blockId !== blockId) return block
            const currentSelected = Array.isArray(block.selectedRooms) ? block.selectedRooms : []
            const isChecked = currentSelected.includes(cleanNo)
            const nextSelected = isChecked
                ? currentSelected.filter(r => r !== cleanNo)
                : [...currentSelected, cleanNo]
            return { ...block, selectedRooms: nextSelected }
        }))
    }

    // Add another category block
    const handleAddCategory = () => {
        const usedCategoryIds = new Set(categoryBlocks.map(b => String(b.categoryId)))
        const nextAvailableCat = categories.find(c => !usedCategoryIds.has(String(c._id))) || categories[0]
        const firstBlock = categoryBlocks[0]
        const checkIn = firstBlock?.checkInDate || new Date()
        const checkOut = firstBlock?.checkOutDate || new Date(checkIn.getTime() + 24 * 60 * 60 * 1000)
        const defaultPrice = getEffectivePrice(nextAvailableCat, checkIn)

        const newBlock = {
            blockId: `cat-block-${Date.now()}-${categoryBlocks.length + 1}`,
            categoryId: nextAvailableCat?._id || "",
            categoryName: nextAvailableCat?.name || "Category",
            checkInDate: new Date(checkIn),
            checkOutDate: new Date(checkOut),
            negotiatedPrice: defaultPrice,
            adults: '',
            children: '',
            selectedRooms: [],
            isInitial: false
        }

        setCategoryBlocks(prev => [...prev, newBlock])
        toast.success(`Added ${nextAvailableCat?.name || "Category"} section. Check the room numbers to book.`)
    }

    // Remove a category block
    const handleRemoveCategory = (blockId) => {
        if (categoryBlocks.length <= 1) return
        setCategoryBlocks(prev => prev.filter(b => b.blockId !== blockId))
    }

    // Update fields of a category block (dates, category, guests, negotiatedPrice)
    const handleCategoryBlockChange = (blockId, changes) => {
        setCategoryBlocks(prev => prev.map(block => {
            if (block.blockId !== blockId) return block
            const next = { ...block, ...changes }
            if (changes.categoryId) {
                const cat = categories.find(c => String(c._id) === String(changes.categoryId))
                next.categoryName = cat?.name || ""
                next.selectedRooms = [] // Clear selected rooms when switching category
                next.negotiatedPrice = getEffectivePrice(cat, next.checkInDate)
            }
            if (changes.checkInDate && next.checkOutDate && changes.checkInDate >= next.checkOutDate) {
                next.checkOutDate = new Date(new Date(changes.checkInDate).getTime() + 24 * 60 * 60 * 1000)
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

        // Validate that at least one room is checked
        if (flatBookedRooms.length === 0) {
            toast.error("Please check at least one room number checkbox to book.")
            return
        }

        // Validate stay dates and conflicts for all checked rooms
        for (let i = 0; i < flatBookedRooms.length; i++) {
            const r = flatBookedRooms[i]
            if (!r.checkInDate || !r.checkOutDate || r.checkInDate >= r.checkOutDate) {
                toast.error(`Invalid stay dates for Room ${r.roomNo}. Check-out must be after check-in.`)
                return
            }

            // Strict Out of Order and occupancy conflict validation
            if (r.roomNo) {
                const isOOO = isRoomOutOfOrder(r.roomNo, formatLocalDate(r.checkInDate), formatLocalDate(r.checkOutDate))
                if (isOOO) {
                    toast.error(`Room ${r.roomNo} is Out of Order for maintenance during selected stay dates.`)
                    return
                }
                const isOccupied = isRoomOccupiedInDb(r.roomNo, formatLocalDate(r.checkInDate), formatLocalDate(r.checkOutDate))
                if (isOccupied) {
                    toast.error(`Room ${r.roomNo} is already occupied for the selected stay dates.`)
                    return
                }
            }
        }

        // Strict validation for Confirm Booking (booking_confirmed)
        if (!isB2B && targetStatus === "booking_confirmed") {
            // 1. Adult value required for each booked room / category block
            const missingAdults = flatBookedRooms.find(r => !r.adults || Number(r.adults) <= 0)
            if (missingAdults) {
                toast.error(`Adult guest count is required for Room ${missingAdults.roomNo || ''} to confirm booking.`)
                return
            }

            // 2. Payment Done (৳) required
            if (effectivePaid <= 0) {
                toast.error("Payment Done (৳) amount is required to confirm booking.")
                return
            }

            // 3. Payment Method required
            if (!paymentMethod.trim()) {
                toast.error("Payment Method is required to confirm booking.")
                return
            }

            // 4. Transaction ID / Receipt is required unless payment method does not return a transaction ID (e.g. Cash, Other)
            const isNoTrxMethod = ["Cash", "Other"].includes(paymentMethod.trim())
            if (!isNoTrxMethod && !transactionId.trim()) {
                toast.error(`Transaction ID / Receipt No is required for ${paymentMethod}.`)
                return
            }

            // 5. Reference is required
            if (!reference.trim()) {
                toast.error("Staff / Admin Reference is required to confirm booking.")
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
            const normalizedRooms = flatBookedRooms.map(r => {
                const cat = categories.find(c => String(c._id) === String(r.categoryId))
                return {
                    roomId: r.categoryId,
                    categoryId: r.categoryId,
                    categoryName: cat?.name || r.categoryName || "Category",
                    roomNo: r.roomNo || "",
                    checkIn: formatLocalDate(r.checkInDate),
                    checkOut: formatLocalDate(r.checkOutDate),
                    adults: Number(r.adults || 0),
                    babies: Number(r.children !== undefined ? r.children : 0),
                    children: Number(r.children !== undefined ? r.children : 0),
                    pricePerNight: Number(r.pricePerNight || getEffectivePrice(cat, r.checkInDate) || 0),
                    nights: Number(r.nights || 1)
                }
            })

            const submittedPaid = isB2B ? 0 : (paidAmount !== '' ? Number(paidAmount) : 0)
            const submittedDue = isB2B ? Number(standardTotal || 0) : Math.max(0, finalTotal - submittedPaid)

            const payload = {
                name: name.trim(),
                mobile: mobile.trim(),
                userEmail: userEmail.trim(),
                address: address.trim(),
                rooms: normalizedRooms,
                status: targetStatus,
                totalAmount: Number(isB2B ? standardTotal : finalTotal || 0),
                discountAmount: 0,
                paidAmount: Number(submittedPaid || 0),
                dueAmount: Number(submittedDue || 0),
                advanceAmount: Number(submittedPaid || 0),
                extraService: extraService.trim(),
                extraServiceCost: extraCost,
                paymentMethod: isB2B ? "Pending" : (paymentMethod.trim() || (submittedPaid > 0 ? "Cash" : "")),
                reference: isB2B ? (currentUser?.displayName || currentUser?.email || "B2B Partner") : reference.trim(),
                transactionId: isB2B ? "" : transactionId.trim(),
                notes: notes.trim(),
                requestedByRole: role || "admin",
                changedBy: {
                    name: currentUser?.displayName || (isB2B ? "B2B Partner" : "Admin / Staff"),
                    email: currentUser?.email || "",
                    role: role || "admin"
                }
            }

            const res = await axiosSecure.post("/bookings", payload)
            if (res.data) {
                const successLabels = {
                    request_booking: "Saved as Request Booking! 📋",
                    payment_waiting: "Reservation set to Payment Waiting! ⏳",
                    booking_confirmed: "Reservation confirmed successfully! 🎉"
                }
                toast.success(successLabels[targetStatus] || "Reservation saved successfully!", { id: toastId })
                onClose()

                if (onSuccess) {
                    try {
                        await onSuccess()
                    } catch (refetchErr) {
                        console.error("Refetch error after calendar booking:", refetchErr)
                    }
                }
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
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                                {flatBookedRooms.length} Room{flatBookedRooms.length !== 1 ? 's' : ''} Checked Across {categoryBlocks.length} Category Block{categoryBlocks.length !== 1 ? 's' : ''}
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
                            <User size={14} className="text-teal-600" /> Guest Details <span className="text-red-500 font-bold">*</span>
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="form-control">
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
                                    placeholder="e.g. Tanvir Ahmed"
                                    className="input input-sm input-bordered rounded-xl bg-white text-xs"
                                />
                            </div>

                            <div className="form-control">
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

                            {/* Internal Notes / Special Requests */}
                            <div className="form-control sm:col-span-2">
                                <label className="label py-0.5">
                                    <span className="label-text font-semibold text-slate-700 text-xs flex items-center gap-1">
                                        <FileText size={13} className="text-teal-600" /> Internal Notes / Guest Requests
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="e.g. Special requests, late check-out, VIP, advance notes..."
                                    className="input input-sm input-bordered rounded-xl bg-white text-xs w-full"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Room Category Blocks with Checkboxes & Negotiated Rates */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                            <div>
                                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-1.5">
                                    <BedDouble size={14} className="text-teal-600" /> Suite Categories & Room Selection
                                </h4>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Set negotiated rate (if applicable) and check room numbers to book under each category.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddCategory}
                                className="btn btn-xs bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 rounded-xl gap-1 font-bold shadow-2xs"
                            >
                                <Plus size={13} /> Add Category
                            </button>
                        </div>

                        <div className="space-y-4">
                            {categoryBlocks.map((block, index) => {
                                const isFirstBlock = index === 0
                                const currentCat = categories.find(c => String(c._id) === String(block.categoryId))
                                const availableRoomNumbers = Array.isArray(currentCat?.roomNumbers) ? currentCat.roomNumbers : []
                                const nights = getRoomNights(block)
                                const defaultCatPrice = getEffectivePrice(currentCat, block.checkInDate)
                                const effectivePricePerNight = block.negotiatedPrice !== undefined && block.negotiatedPrice !== ''
                                    ? Math.max(0, Number(block.negotiatedPrice))
                                    : defaultCatPrice
                                const checkedCount = (block.selectedRooms || []).length

                                return (
                                    <div
                                        key={block.blockId}
                                        className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border-2 border-slate-200/90 space-y-3.5 relative shadow-xs"
                                    >
                                        {/* Block Header */}
                                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                            <div className="flex items-center gap-2">
                                                <span className="badge badge-sm bg-teal-700 text-white font-bold">
                                                    Category {index + 1}
                                                </span>
                                                <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                                    {currentCat?.name || "Choose Category"}
                                                </span>
                                                <span className="text-[11px] font-bold text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded-md">
                                                    ৳{effectivePricePerNight.toLocaleString()}/night
                                                </span>
                                            </div>

                                            {!isFirstBlock && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveCategory(block.blockId)}
                                                    className="btn btn-ghost btn-xs text-rose-600 hover:bg-rose-50 rounded-lg gap-1 font-bold"
                                                    title="Remove this category block"
                                                >
                                                    <Trash2 size={13} /> Remove Category
                                                </button>
                                            )}
                                        </div>

                                        {/* Row 1: Category Selector, Stay Dates & Negotiated Price */}
                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                            {/* Category Selector (Dropdown only for additional blocks) */}
                                            <div className="form-control sm:col-span-3">
                                                <label className="label py-0.5">
                                                    <span className="label-text font-semibold text-slate-700 text-xs">Category Type</span>
                                                </label>
                                                {isFirstBlock ? (
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        disabled
                                                        value={block.categoryName}
                                                        className="input input-sm input-bordered rounded-xl bg-slate-100 text-slate-800 font-bold text-xs cursor-not-allowed"
                                                    />
                                                ) : (
                                                    <select
                                                        value={block.categoryId}
                                                        onChange={e => handleCategoryBlockChange(block.blockId, { categoryId: e.target.value })}
                                                        className="select select-sm select-bordered rounded-xl bg-white text-xs font-semibold"
                                                    >
                                                        {categories.map(c => (
                                                            <option key={c._id} value={c._id}>
                                                                {c.name} (৳{Number(c.price || 0).toLocaleString()}/n)
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>

                                            {/* Check-In Date */}
                                            <div className="form-control sm:col-span-3">
                                                <label className="label py-0.5 block">
                                                    <span className="label-text font-semibold text-slate-700 text-xs">Check-In Date</span>
                                                </label>
                                                {isFirstBlock ? (
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        disabled
                                                        value={formatDate(block.checkInDate)}
                                                        className="input input-sm input-bordered rounded-xl bg-slate-100 text-slate-800 font-bold text-xs cursor-not-allowed"
                                                    />
                                                ) : (
                                                    <DatePicker
                                                        selected={block.checkInDate}
                                                        onChange={date => handleCategoryBlockChange(block.blockId, { checkInDate: date })}
                                                        selectsStart
                                                        startDate={block.checkInDate}
                                                        endDate={block.checkOutDate}
                                                        minDate={new Date()}
                                                        dateFormat="dd MMM yyyy"
                                                        wrapperClassName="w-full"
                                                        className="input input-sm input-bordered rounded-xl bg-white text-xs w-full cursor-pointer"
                                                        onChangeRaw={e => e.preventDefault()}
                                                    />
                                                )}
                                            </div>

                                            {/* Check-Out Date */}
                                            <div className="form-control sm:col-span-3">
                                                <label className="label py-0.5">
                                                    <span className="label-text font-semibold text-slate-700 text-xs">
                                                        Check-Out Date <span className="text-red-500 font-bold">*</span>
                                                    </span>
                                                </label>
                                                <DatePicker
                                                    selected={block.checkOutDate}
                                                    onChange={date => handleCategoryBlockChange(block.blockId, { checkOutDate: date })}
                                                    selectsEnd
                                                    startDate={block.checkInDate}
                                                    endDate={block.checkOutDate}
                                                    minDate={new Date(new Date(block.checkInDate).getTime() + 24 * 60 * 60 * 1000)}
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
                                                        {block.negotiatedPrice !== undefined && Number(block.negotiatedPrice) !== defaultCatPrice && (
                                                            <span className="text-[10px] text-teal-700 font-bold">Custom</span>
                                                        )}
                                                    </span>
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={block.negotiatedPrice !== undefined ? block.negotiatedPrice : defaultCatPrice}
                                                    onChange={e => handleCategoryBlockChange(block.blockId, { negotiatedPrice: e.target.value })}
                                                    placeholder={String(defaultCatPrice)}
                                                    className="input input-sm input-bordered rounded-xl bg-white text-xs font-bold text-teal-900"
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
                                                    <span className="label-text font-semibold text-slate-700 text-xs">Adults / Room</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={block.adults !== undefined ? block.adults : ''}
                                                    placeholder="0"
                                                    onChange={e => handleCategoryBlockChange(block.blockId, { adults: e.target.value })}
                                                    className="input input-sm input-bordered rounded-xl bg-white text-xs font-semibold"
                                                />
                                            </div>

                                            <div className="form-control">
                                                <label className="label py-0.5">
                                                    <span className="label-text font-semibold text-slate-700 text-xs">Children / Room</span>
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={block.children !== undefined ? block.children : ''}
                                                    placeholder="0"
                                                    onChange={e => handleCategoryBlockChange(block.blockId, { children: e.target.value })}
                                                    className="input input-sm input-bordered rounded-xl bg-white text-xs font-semibold"
                                                />
                                            </div>

                                            <div className="sm:col-span-2 flex items-end">
                                                <div className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-200 w-full flex justify-between items-center">
                                                    <span>Duration: <strong>{nights} night(s)</strong></span>
                                                    <span>Category Total: <strong className="text-teal-800">৳{Number(effectivePricePerNight * nights * checkedCount).toLocaleString()}</strong></span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 3: Physical Room Checkboxes Grid */}
                                        <div className="space-y-2 pt-1 border-t border-slate-200/80">
                                            <div className="flex items-center justify-between">
                                                <label className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                                    <CheckSquare size={14} className="text-teal-600" />
                                                    Select Physical Rooms (Check to Book) <span className="text-red-500 font-bold">*</span>
                                                </label>
                                                <span className="badge badge-sm bg-teal-50 text-teal-800 border-teal-200 font-bold">
                                                    {checkedCount} Room{checkedCount !== 1 ? 's' : ''} Checked
                                                </span>
                                            </div>

                                            {availableRoomNumbers.length === 0 ? (
                                                <p className="text-xs text-slate-400 italic bg-white p-3 rounded-xl border border-slate-200">
                                                    No physical room numbers defined for this suite category.
                                                </p>
                                            ) : (
                                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                                    {availableRoomNumbers.map(num => {
                                                        const cleanNum = String(num).trim()
                                                        const isChecked = (block.selectedRooms || []).includes(cleanNum)
                                                        const conflict = getRoomConflictInfo(cleanNum, block)
                                                        const isDisabled = conflict.disabled && !isChecked

                                                        return (
                                                            <label
                                                                key={cleanNum}
                                                                className={`relative flex items-center justify-between p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                                                                    isChecked
                                                                        ? "bg-[#0f766e] text-white border-[#0f766e] shadow-xs ring-2 ring-teal-500/30 font-bold"
                                                                        : isDisabled
                                                                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                                                                        : "bg-white text-slate-800 border-slate-200 hover:border-teal-400 hover:bg-teal-50/40"
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        disabled={isDisabled}
                                                                        onChange={() => handleToggleRoom(block.blockId, cleanNum)}
                                                                        className="checkbox checkbox-sm checkbox-primary rounded-md"
                                                                    />
                                                                    <span className="font-mono text-xs font-bold">
                                                                        Room {cleanNum}
                                                                    </span>
                                                                </div>

                                                                {conflict.disabled && !isChecked && (
                                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                                                        conflict.reason === "Out of Order" ? "bg-amber-100 text-amber-900" : "bg-rose-100 text-rose-900"
                                                                    }`}>
                                                                        {conflict.reason === "Out of Order" ? "OOO" : "Busy"}
                                                                    </span>
                                                                )}
                                                                {isChecked && (
                                                                    <span className="text-[10px] font-bold text-teal-200">
                                                                        ✓ Booked
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

                    {/* Extra Services Section */}
                    <div className="space-y-3 pt-1">
                        <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                            <Sparkles size={14} className="text-amber-500" /> Extra Services & Facilities (Optional)
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 rounded-2xl bg-amber-50/40 border border-amber-200/70">
                            {/* Extra Service Selection */}
                            <div className="form-control">
                                <label className="label py-0.5">
                                    <span className="label-text font-bold text-slate-800 text-xs">Extra Service Type</span>
                                </label>
                                <select
                                    value={extraService}
                                    onChange={e => setExtraService(e.target.value)}
                                    className="select select-sm select-bordered rounded-xl bg-white text-xs font-semibold"
                                >
                                    <option value="">-- No Extra Service Selected --</option>
                                    <option value="Swimming Pool Access">Swimming Pool Access</option>
                                    <option value="Extra Bed">Extra Bed</option>
                                    <option value="Swimming Pool Access & Extra Bed">Swimming Pool Access & Extra Bed</option>
                                    {/* <option value="Airport Pickup / Drop">Airport Pickup / Drop</option> */}
                                    {/* <option value="Sightseeing & Tour Guide">Sightseeing & Tour Guide</option> */}
                                    {/* <option value="Other Extra Service">Other Extra Service</option> */}
                                </select>
                            </div>

                            {/* Extra Service Cost */}
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
                                    className="input input-sm input-bordered rounded-xl bg-white text-xs font-bold text-amber-900"
                                />
                                {extraCost > 0 && (
                                    <span className="text-[10px] text-amber-800 font-semibold mt-0.5">
                                        +৳{extraCost.toLocaleString()} added to subtotal
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Financials & Payment Fields */}
                    {role === "b2b" ? (
                        <div className="space-y-3 pt-1">
                            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                                <CreditCard size={14} className="text-teal-600" /> Booking Price Summary
                            </h4>
                            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                <div>
                                    <span className="font-bold text-blue-950 block text-sm">Estimated Total Amount</span>
                                    <span className="text-slate-500">
                                        Rooms: ৳{roomSubtotal.toLocaleString()}{extraCost > 0 ? ` · Extra: +৳${extraCost.toLocaleString()}` : ''} ({flatBookedRooms.length} room(s) · {flatBookedRooms.reduce((acc, r) => acc + (r.nights || 0), 0)} night(s))
                                    </span>
                                </div>
                                <div className="sm:text-right">
                                    <strong className="text-xl font-extrabold text-blue-900">৳{standardTotal.toLocaleString()}</strong>
                                    <span className="text-[10px] text-slate-400 block font-medium">Payment details processed upon staff verification</span>
                                </div>
                            </div>
                        </div>
                    ) : (
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
                                            max={finalTotal * 2}
                                            value={paidAmount}
                                            onChange={e => setPaidAmount(e.target.value)}
                                            placeholder="0"
                                            className="input input-sm input-bordered rounded-xl bg-white text-xs font-bold text-emerald-800"
                                        />
                                        {/* Quick payment helper buttons */}
                                        <div className="flex items-center gap-1.5 mt-1.5">
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

                            {/* Staff Reference */}
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
                    )}
                </div>

                {/* Footer with Confirm / Request Buttons & Targeted Loading */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/70 shrink-0">
                    <div className='w-max'>
                        <div className="text-xs text-slate-500 font-medium leading-tight">
                            Total ({flatBookedRooms.length} Room{flatBookedRooms.length !== 1 ? 's' : ''}): <strong className="text-teal-900 font-extrabold text-sm">৳{Number(role === "b2b" ? standardTotal : (finalTotal || 0)).toLocaleString()}</strong>
                            {role !== "b2b" && dueAmount > 0 && (
                                <>
                                    <br />
                                    <span className="text-orange-600 font-bold text-[11px]">(Due: ৳{dueAmount.toLocaleString()})</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Button 1: Save as Request Booking */}
                        <button
                            type="button"
                            onClick={() => handleSubmit("request_booking")}
                            disabled={submittingStatus !== null || flatBookedRooms.length === 0}
                            className="btn btn-sm bg-[#f59e0b] hover:bg-amber-600 text-white font-bold rounded-xl px-3 shadow-xs border-none disabled:opacity-50"
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
                            disabled={submittingStatus !== null || flatBookedRooms.length === 0}
                            className="btn btn-sm bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl px-3 shadow-xs border-none disabled:opacity-50"
                        >
                            {submittingStatus === "payment_waiting" ? (
                                <span className="loading loading-spinner loading-xs" />
                            ) : (
                                <CreditCard size={14} />
                            )}
                            <span>Payment Waiting</span>
                        </button>

                        {/* Button 3: Booking Confirmed (Staff only) */}
                        {role !== "b2b" && (
                            <button
                                type="button"
                                onClick={() => handleSubmit("booking_confirmed")}
                                disabled={submittingStatus !== null || flatBookedRooms.length === 0}
                                className="btn btn-sm bg-[#5261d6] hover:bg-[#4351be] text-white font-bold rounded-xl px-4 shadow-xs border-none disabled:opacity-50"
                            >
                                {submittingStatus === "booking_confirmed" ? (
                                    <span className="loading loading-spinner loading-xs" />
                                ) : (
                                    <CheckCircle2 size={14} />
                                )}
                                <span>Confirm Booking</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default CalendarBookingModal
