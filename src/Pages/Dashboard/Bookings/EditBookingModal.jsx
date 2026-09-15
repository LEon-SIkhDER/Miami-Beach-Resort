import React, { useState, useEffect, useContext, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AuthContext } from '../../../Context/AuthContext'
import useRole from '../../../hooks/useRole'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
import useBillingTypes from '../../../hooks/useBillingTypes'
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
    FileText,
    CheckSquare,
    Sparkles
} from 'lucide-react'
import { getBookingRooms, getBookingTotal } from '../../../utils/bookingUtils'

const formatLocalDate = (date) => {
    if (!date) return ''
    if (typeof date === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date
        const parsed = parseLocalDate(date)
        if (!parsed || isNaN(parsed.getTime())) return date
        date = parsed
    }
    if (!(date instanceof Date) || isNaN(date.getTime())) return ''
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

const parseLocalDate = (str) => {
    if (!str) return null
    if (str instanceof Date) return isNaN(str.getTime()) ? null : str
    if (typeof str === 'number') {
        const d = new Date(str)
        return isNaN(d.getTime()) ? null : d
    }
    if (typeof str !== 'string') return null
    const match = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (match) {
        const y = parseInt(match[1], 10)
        const m = parseInt(match[2], 10) - 1
        const d = parseInt(match[3], 10)
        const date = new Date(y, m, d)
        return isNaN(date.getTime()) ? null : date
    }
    const parsed = new Date(str)
    if (!isNaN(parsed.getTime())) {
        return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
    }
    return null
}

const STATUS_OPTIONS = [
    { value: "request_booking", label: "Request Booking" },
    { value: "booking_confirmed", label: "Booking Confirmed" },
    { value: "checked_id", label: "Checked In" },
    { value: "checked_out", label: "Checked Out" },
    { value: "cancel", label: "Cancelled" }
]

const EMPTY_ARRAY = []

const EditBookingModal = ({ booking, isOpen, onClose, onSuccess }) => {
    const { user: currentUser } = useContext(AuthContext)
    const { role } = useRole()
    const axiosSecure = useAxiosSecure()
    const { getUnitLabel, getInputLabel } = useBillingTypes()
    const queryClient = useQueryClient()
    const lastInitializedBookingId = useRef(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [name, setName] = useState('')
    const [mobile, setMobile] = useState('')
    const [address, setAddress] = useState('')
    const [userEmail, setUserEmail] = useState('')
    const [status, setStatus] = useState('request_booking')
    const [reference, setReference] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('')
    const [transactionId, setTransactionId] = useState('')
    const [selectedExtraServices, setSelectedExtraServices] = useState([])
    const [paidAmount, setPaidAmount] = useState('')
    const [advanceAmount, setAdvanceAmount] = useState(0)
    const [notes, setNotes] = useState('')
    const [categoryBlocks, setCategoryBlocks] = useState([])

    // Fetch extra services from DB
    const { data: dbExtraServices = EMPTY_ARRAY } = useQuery({
        queryKey: ["all-extra-services-for-booking"],
        queryFn: async () => {
            const res = await axiosSecure.get("/extra-services")
            return Array.isArray(res.data) ? res.data : []
        },
        enabled: isOpen && !!booking
    })

    // Fetch all categories for room assignment & pricing
    const { data: categories = EMPTY_ARRAY } = useQuery({
        queryKey: ["all-categories-for-edit-booking"],
        queryFn: async () => {
            const res = await axiosSecure.get("/categoryandroom")
            return res.data
        },
        enabled: isOpen && !!booking
    })

    // Fetch users for reference
    const { data: allUsers = EMPTY_ARRAY } = useQuery({
        queryKey: ["all-users-for-edit-booking-reference"],
        queryFn: async () => {
            const res = await axiosSecure.get("/users")
            return res.data
        },
        enabled: isOpen && !!booking
    })

    const eligibleReferences = allUsers.filter(u => u.role && u.role !== "user")

    // Fetch active bookings to verify room occupancy
    const { data: activeBookings = EMPTY_ARRAY } = useQuery({
        queryKey: ["active-bookings-for-edit-modal"],
        queryFn: async () => {
            const res = await axiosSecure.get("/bookings")
            return res.data
        },
        enabled: isOpen && !!booking
    })

    // Fetch Out of Order records
    const { data: outOfOrderList = EMPTY_ARRAY } = useQuery({
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

    // Check conflict for a physical room number within a category block
    const getRoomConflictInfo = (roomNo, block) => {
        const checkIn = formatLocalDate(block.checkInDate)
        const checkOut = formatLocalDate(block.checkOutDate)
        if (!roomNo || !checkIn || !checkOut) return { disabled: false, reason: "" }

        if (isRoomOutOfOrder(roomNo, block.checkInDate, block.checkOutDate)) {
            return { disabled: true, reason: "Out of Order" }
        }

        // Check against other confirmed/active bookings in db (ignore current booking)
        const isOccupiedOther = activeBookings.some(b => {
            if (String(b._id) === String(booking?._id) || String(b.bookingId) === String(booking?.bookingId)) return false
            if (["cancel", "cancelled", "checked_out"].includes(b.status)) return false

            const otherRooms = getBookingRooms(b)
            return otherRooms.some(r => {
                if (!r.roomNo || !r.checkIn || !r.checkOut) return false
                return String(r.roomNo).trim() === String(roomNo).trim() && r.checkIn < checkOut && r.checkOut > checkIn
            })
        })
        if (isOccupiedOther) {
            return { disabled: true, reason: "Occupied" }
        }

        // Check if room is already selected in another category block with overlapping stay dates
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

    useEffect(() => {
        if (!isOpen || !booking) {
            lastInitializedBookingId.current = null
            return
        }

        const currentBookingKey = String(booking._id || booking.bookingId || "selected")
        if (lastInitializedBookingId.current === currentBookingKey) {
            return
        }
        lastInitializedBookingId.current = currentBookingKey

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
        const blockMap = new Map()

        rawRooms.forEach((r, idx) => {
            const catId = String(r.categoryId || r.roomId || '')
            const checkInStr = r.checkIn ? formatLocalDate(parseLocalDate(r.checkIn)) : ''
            const checkOutStr = r.checkOut ? formatLocalDate(parseLocalDate(r.checkOut)) : ''
            const key = `${catId}_${checkInStr}_${checkOutStr}`

            const cat = categories.find(c => String(c._id) === catId) || categories.find(c => c.name === r.categoryName)
            const cleanRoomNo = r.roomNo ? String(r.roomNo).trim() : ''

            if (!blockMap.has(key)) {
                blockMap.set(key, {
                    blockId: `cat-block-${idx + 1}-${Date.now()}`,
                    categoryId: cat?._id || catId || (categories[0]?._id || ''),
                    categoryName: cat?.name || r.categoryName || 'Category',
                    checkInDate: parseLocalDate(r.checkIn) || new Date(),
                    checkOutDate: parseLocalDate(r.checkOut) || addDays(new Date(), 1),
                    negotiatedPrice: r.pricePerNight !== undefined ? Number(r.pricePerNight) : Number(cat?.price || 0),
                    adults: r.adults !== undefined && r.adults !== null && r.adults !== '' ? r.adults : '',
                    children: Number(r.children !== undefined ? r.children : (r.babies || 0)),
                    selectedRooms: cleanRoomNo ? [cleanRoomNo] : [],
                    isInitial: idx === 0
                })
            } else {
                const existing = blockMap.get(key)
                if (cleanRoomNo && !existing.selectedRooms.includes(cleanRoomNo)) {
                    existing.selectedRooms.push(cleanRoomNo)
                }
            }
        })

        let initialBlocks = Array.from(blockMap.values())
        if (initialBlocks.length === 0) {
            const defaultCat = categories[0]
            initialBlocks = [{
                blockId: `cat-block-1-${Date.now()}`,
                categoryId: defaultCat?._id || '',
                categoryName: defaultCat?.name || 'Category',
                checkInDate: new Date(),
                checkOutDate: addDays(new Date(), 1),
                negotiatedPrice: Number(defaultCat?.price || 0),
                adults: '',
                children: '',
                selectedRooms: [],
                isInitial: true
            }]
        }
        setCategoryBlocks(initialBlocks)

        const initialPaid = booking.paidAmount !== undefined ? booking.paidAmount : (booking.advanceAmount || 0)
        setPaidAmount(initialPaid !== undefined && initialPaid > 0 ? String(initialPaid) : '')
        // Initialize extra services from booking.extraServices or legacy booking.extraService
        if (Array.isArray(booking.extraServices) && booking.extraServices.length > 0) {
            setSelectedExtraServices(booking.extraServices.map((srv, idx) => ({
                id: `es-${idx}-${Date.now()}`,
                serviceId: srv.serviceId || srv.name || '',
                quantity: Math.max(1, Number(srv.quantity) || 1),
                customService: srv
            })))
        } else if (booking.extraServices && typeof booking.extraServices === 'object' && (booking.extraServices.serviceId || booking.extraServices.name)) {
            setSelectedExtraServices([{
                id: `es-0-${Date.now()}`,
                serviceId: booking.extraServices.serviceId || booking.extraServices.name || '',
                quantity: Math.max(1, Number(booking.extraServices.quantity) || 1),
                customService: booking.extraServices
            }])
        } else if (booking.extraService) {
            const legacyNames = String(booking.extraService).split(',').map(s => s.trim()).filter(Boolean)
            if (legacyNames.length > 0) {
                const legacyCostTotal = Number(booking.extraServiceCost || 0)
                const costPerService = legacyCostTotal / legacyNames.length
                setSelectedExtraServices(legacyNames.map((legacyName, idx) => {
                    const matched = dbExtraServices.find(s => s.name?.toLowerCase() === legacyName.toLowerCase())
                    const unitPrice = matched ? Number(matched.price || 0) : costPerService
                    const qty = unitPrice > 0 ? Math.max(1, Math.round(costPerService / unitPrice)) : 1
                    return {
                        id: `es-legacy-${idx}-${Date.now()}`,
                        serviceId: matched ? String(matched._id) : legacyName,
                        quantity: qty,
                        customService: {
                            name: legacyName,
                            price: unitPrice
                        }
                    }
                }))
            } else {
                setSelectedExtraServices([])
            }
        } else {
            setSelectedExtraServices([])
        }
        setAdvanceAmount(booking.advanceAmount || 0)
    }, [booking, isOpen])

    // Flatten all checked rooms across category blocks
    const flatBookedRooms = useMemo(() => {
        const result = []
        categoryBlocks.forEach((block) => {
            const cat = categories.find(c => String(c._id) === String(block.categoryId))
            const defaultPrice = Number(cat?.price || 0)
            const pricePerNight = block.negotiatedPrice !== undefined && block.negotiatedPrice !== ''
                ? Math.max(0, Number(block.negotiatedPrice))
                : defaultPrice
            const nights = Math.max(1, Math.ceil((new Date(block.checkOutDate) - new Date(block.checkInDate)) / (1000 * 60 * 60 * 24)))
            const selected = Array.isArray(block.selectedRooms) ? block.selectedRooms : []

            if (selected.length === 0) {
                // If no physical room numbers checked, retain 1 unassigned placeholder entry for this category
                result.push({
                    blockId: block.blockId,
                    itemId: `${block.blockId}-unassigned`,
                    categoryId: block.categoryId,
                    categoryName: cat?.name || block.categoryName || "Category",
                    roomNo: "",
                    checkInDate: block.checkInDate,
                    checkOutDate: block.checkOutDate,
                    adults: block.adults !== '' && block.adults !== undefined ? Number(block.adults) : 0,
                    children: block.children !== '' && block.children !== undefined ? Number(block.children) : 0,
                    babies: block.children !== '' && block.children !== undefined ? Number(block.children) : 0,
                    pricePerNight: pricePerNight,
                    nights: nights
                })
            } else {
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
            }
        })
        return result
    }, [categoryBlocks, categories])

    const activeDbServices = useMemo(() => {
        return dbExtraServices.filter(s => s.active !== false && s.status !== "Inactive")
    }, [dbExtraServices])

    const defaultStayNights = useMemo(() => {
        if (flatBookedRooms.length > 0) {
            return Math.max(...flatBookedRooms.map(r => r.nights || 1), 1)
        }
        return 1
    }, [flatBookedRooms])

    const defaultGuestCount = useMemo(() => {
        if (flatBookedRooms.length > 0) {
            const guests = flatBookedRooms.reduce((sum, r) => sum + (Number(r.adults) || 0) + (Number(r.children) || 0), 0)
            return Math.max(1, guests)
        }
        return 1
    }, [flatBookedRooms])

    const resolvedExtraServicesList = useMemo(() => {
        return selectedExtraServices
            .filter(item => item.serviceId)
            .map(item => {
                const s = dbExtraServices.find(dbS => String(dbS._id) === String(item.serviceId) || dbS.name === item.serviceId)
                const unitPrice = s ? Number(s.price || 0) : Number(item.customService?.price || item.customService?.unitPrice || 0)
                const name = s?.name || item.customService?.name || item.serviceId || "Extra Service"
                const billingType = s?.billingType || item.customService?.billingType || "One-time"
                const qty = Math.max(1, Number(item.quantity || 1))
                const totalCost = unitPrice * qty
                return {
                    id: item.id,
                    serviceId: item.serviceId,
                    name,
                    billingType,
                    unitPrice,
                    quantity: qty,
                    totalCost,
                    serviceObj: s
                }
            })
    }, [selectedExtraServices, dbExtraServices])

    const extraCost = useMemo(() => {
        return resolvedExtraServicesList.reduce((sum, s) => sum + s.totalCost, 0)
    }, [resolvedExtraServicesList])

    const selectedServiceIds = useMemo(() => {
        return new Set(selectedExtraServices.map(s => String(s.serviceId)).filter(Boolean))
    }, [selectedExtraServices])

    const availableToAdd = useMemo(() => {
        return activeDbServices.filter(s => !selectedServiceIds.has(String(s._id)))
    }, [activeDbServices, selectedServiceIds])

    const hasUnselectedService = useMemo(() => {
        return selectedExtraServices.some(s => !s.serviceId)
    }, [selectedExtraServices])

    const handleAddExtraService = () => {
        if (availableToAdd.length === 0 || hasUnselectedService) return

        setSelectedExtraServices(prev => [
            ...prev,
            {
                id: `es-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                serviceId: "",
                quantity: 1
            }
        ])
    }

    const handleServiceChange = (rowId, newServiceId) => {
        if (!newServiceId) {
            setSelectedExtraServices(prev => prev.map(item => {
                if (item.id !== rowId) return item
                return { ...item, serviceId: "", quantity: 1, customService: null }
            }))
            return
        }

        const service = dbExtraServices.find(s => String(s._id) === String(newServiceId) || s.name === newServiceId)
        let defaultQty = 1
        if (service?.billingType === "Per Night") {
            defaultQty = defaultStayNights
        } else if (service?.billingType === "Per Person") {
            defaultQty = defaultGuestCount
        }

        setSelectedExtraServices(prev => prev.map(item => {
            if (item.id !== rowId) return item
            return {
                ...item,
                serviceId: newServiceId,
                quantity: defaultQty,
                customService: null
            }
        }))
    }

    const handleQuantityChange = (rowId, newQty) => {
        const parsed = Math.max(1, parseInt(newQty) || 1)
        setSelectedExtraServices(prev => prev.map(item => {
            if (item.id !== rowId) return item
            return { ...item, quantity: parsed }
        }))
    }

    const handleRemoveExtraService = (rowId) => {
        setSelectedExtraServices(prev => prev.filter(item => item.id !== rowId))
    }

    const getBillingTypeLabel = (billingType) => {
        return getInputLabel(billingType)
    }

    if (!isOpen || !booking) return null

    const roomSubtotal = flatBookedRooms.reduce((sum, r) => {
        return sum + (r.nights * r.pricePerNight)
    }, 0)
    const standardTotal = roomSubtotal + extraCost
    const netPayable = standardTotal
    const effectivePaid = paidAmount !== '' ? Number(paidAmount) : 0
    const dueAmount = Math.max(0, netPayable - effectivePaid)

    // Toggle physical room checkbox selection
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
        const checkOut = firstBlock?.checkOutDate || addDays(new Date(checkIn), 1)
        const defaultPrice = Number(nextAvailableCat?.price || 0)

        const newBlock = {
            blockId: `cat-block-${Date.now()}-${categoryBlocks.length + 1}`,
            categoryId: nextAvailableCat?._id || "",
            categoryName: nextAvailableCat?.name || "Suite",
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

    // Update fields of a category block
    const handleCategoryBlockChange = (blockId, changes) => {
        setCategoryBlocks(prev => prev.map(block => {
            if (block.blockId !== blockId) return block
            const next = { ...block, ...changes }
            if (changes.categoryId) {
                const cat = categories.find(c => String(c._id) === String(changes.categoryId))
                next.categoryName = cat?.name || ""
                next.selectedRooms = []
                next.negotiatedPrice = Number(cat?.price || next.negotiatedPrice || 0)
            }
            if (changes.checkInDate && next.checkOutDate && changes.checkInDate >= next.checkOutDate) {
                next.checkOutDate = addDays(changes.checkInDate, 1)
            }
            return next
        }))
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

        if (categoryBlocks.length === 0 || flatBookedRooms.length === 0) {
            toast.error("At least one room or category is required.")
            return
        }

        // Validate stay dates and conflicts
        for (let i = 0; i < categoryBlocks.length; i++) {
            const b = categoryBlocks[i]
            if (!b.checkInDate || !b.checkOutDate || b.checkInDate >= b.checkOutDate) {
                toast.error(`Invalid stay dates for ${b.categoryName || `Category ${i + 1}`}. Check-out must be after check-in.`)
                return
            }
        }

        // Validate duplicate category blocks with identical stay dates
        const seenCategoryDates = new Set()
        for (const block of categoryBlocks) {
            const catId = String(block.categoryId || "")
            const inDate = formatLocalDate(block.checkInDate)
            const outDate = formatLocalDate(block.checkOutDate)
            const key = `${catId}_${inDate}_${outDate}`

            if (seenCategoryDates.has(key)) {
                toast.error(`Duplicate category: "${block.categoryName || 'This category'}" has identical Check-In and Check-Out dates in multiple sections. Please select multiple rooms under a single category section instead.`)
                return
            }
            seenCategoryDates.add(key)
        }

        // Extra services validation: must have service selected if row added
        if (hasUnselectedService) {
            toast.error("Please select an extra service type for all added services, or remove the empty service row.")
            return
        }

        // Validate room conflicts
        for (let i = 0; i < flatBookedRooms.length; i++) {
            const r = flatBookedRooms[i]
            if (r.roomNo) {
                const conflict = getRoomConflictInfo(r.roomNo, { blockId: r.blockId, checkInDate: r.checkInDate, checkOutDate: r.checkOutDate })
                if (conflict.disabled) {
                    toast.error(`Room ${r.roomNo} is unavailable (${conflict.reason}) for the selected stay dates!`)
                    return
                }
            }
        }

        // Require physical room number if advancing beyond request_booking
        if (status !== "request_booking" && status !== "cancel") {
            const missingRoom = flatBookedRooms.find(r => !r.roomNo || !String(r.roomNo).trim())
            if (missingRoom) {
                toast.error("Please assign a physical room number for all rooms.")
                return
            }
        }

        // If status is booking_confirmed, checked_id, checked_out:
        const isConfirmedStatus = ["booking_confirmed", "checked_id", "checked_in", "checked_out", "confirmed"].includes(status)
        if (isConfirmedStatus) {
            const missingAdults = flatBookedRooms.find(r => !r.adults || Number(r.adults) <= 0)
            if (missingAdults) {
                toast.error(`Adult guest count is required for Room ${missingAdults.roomNo || ''} for confirmed reservations.`)
                return
            }

            const paidNum = Number(paidAmount)
            if (paidAmount !== '' && (isNaN(paidNum) || paidNum < 0)) {
                toast.error("Payment Done amount cannot be negative.")
                return
            }

            // Only require Payment Method & Transaction ID if payment is provided (> 0)
            if (paidNum > 0) {
                if (!paymentMethod.trim()) {
                    toast.error("Payment Method is required when payment is provided.")
                    return
                }

                const isNoTrxMethod = ["Cash", "Other", "Pay on Arrival", "Pay on Arrival / Unpaid", "Pending"].some(m => m.toLowerCase() === paymentMethod.trim().toLowerCase())
                if (!isNoTrxMethod && !transactionId.trim()) {
                    toast.error(`Transaction ID / Receipt No is required for ${paymentMethod}.`)
                    return
                }
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

        if (effectivePaid > standardTotal + 0.01) {
            toast.error(`Paid amount (৳${effectivePaid.toLocaleString()}) cannot exceed the booking total (৳${standardTotal.toLocaleString()}). Please adjust the paid amount or the room price.`)
            return
        }

        setIsSubmitting(true)
        const toastId = toast.loading("Updating reservation...")

        try {
            const normalizedRooms = flatBookedRooms.map(r => ({
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
                extraServices: resolvedExtraServicesList.map(s => ({
                    serviceId: s.serviceId || "",
                    name: s.name,
                    billingType: s.billingType || "One-time",
                    unitPrice: Number(s.unitPrice || 0),
                    quantity: Number(s.quantity || 1),
                    totalCost: Number(s.totalCost || 0)
                })),
                extraService: resolvedExtraServicesList.map(s => s.name).filter(Boolean).join(", "),
                extraServiceCost: extraCost,
                paymentMethod: effectivePaid > 0 ? (paymentMethod.trim() || "Cash") : (paymentMethod.trim() || "Pay on Arrival / Unpaid"),
                reference: reference.trim(),
                transactionId: effectivePaid > 0 ? transactionId.trim() : "",
                notes: notes.trim(),
                changedBy: {
                    name: currentUser?.displayName || currentUser?.email || "Admin / Staff",
                    email: currentUser?.email || "",
                    role: role || "admin"
                }
            }

            const res = await axiosSecure.patch(`/booking/${booking._id}`, payload)
            if (res.data) {
                onClose()
                toast.success("Reservation updated successfully! 🎉", { id: toastId })
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ["requestBookings"] }),
                    queryClient.invalidateQueries({ queryKey: ["all-bookings-for-calendar"] }),
                    queryClient.invalidateQueries({ queryKey: ["bookings"] }),
                    queryClient.invalidateQueries({ queryKey: ["admin-overview"] }),
                    queryClient.invalidateQueries({ queryKey: ["booking", booking._id] })
                ])
                if (onSuccess) {
                    try {
                        await onSuccess(res.data)
                    } catch (e) {
                        console.error("onSuccess callback error:", e)
                    }
                }
            }
        } catch (err) {
            console.error(err)
            toast.error(err.response?.data?.message || "Failed to update reservation", { id: toastId })
        } finally {
            setIsSubmitting(false)
        }
    }

    return createPortal(
        <div 
            onClick={(e) => {
                if (e.target === e.currentTarget && !isSubmitting) {
                    onClose?.()
                }
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
        >
            <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            >
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
                                <BedDouble size={14} className="text-teal-600" /> Booked Rooms ({flatBookedRooms.length})
                            </h4>
                            <button
                                type="button"
                                onClick={handleAddCategory}
                                className="btn btn-xs btn-outline border-teal-600 text-teal-700 hover:bg-teal-50 rounded-xl gap-1 font-bold"
                            >
                                <Plus size={13} /> Add Another Category
                            </button>
                        </div>

                        <div className="space-y-4">
                            {categoryBlocks.map((block, index) => {
                                const cat = categories.find(c => String(c._id) === String(block.categoryId))
                                const availableRoomNumbers = Array.isArray(cat?.roomNumbers) ? cat.roomNumbers : []
                                const nights = Math.max(1, Math.ceil((new Date(block.checkOutDate) - new Date(block.checkInDate)) / (1000 * 60 * 60 * 24)))
                                const defaultCatPrice = Number(cat?.price || 0)
                                const effectivePricePerNight = block.negotiatedPrice !== undefined && block.negotiatedPrice !== ''
                                    ? Math.max(0, Number(block.negotiatedPrice))
                                    : defaultCatPrice
                                const checkedCount = (block.selectedRooms || []).length
                                const blockMultiplier = Math.max(1, checkedCount)
                                const categoryTotal = effectivePricePerNight * nights * blockMultiplier

                                return (
                                    <div
                                        key={block.blockId}
                                        className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border-2 border-slate-200/90 space-y-3.5 relative shadow-xs"
                                    >
                                        {/* Category Card Header */}
                                        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                            <div className="flex items-center gap-2">
                                                <span className="badge badge-sm bg-teal-700 text-white font-bold">
                                                    Category {index + 1}
                                                </span>
                                                <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                                    {cat?.name || block.categoryName || "Choose Category"}
                                                </span>
                                                <span className="text-[11px] font-bold text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded-md">
                                                    ৳{effectivePricePerNight.toLocaleString()}/night
                                                </span>
                                                {checkedCount > 0 && (
                                                    <span className="badge badge-sm bg-teal-600 text-white font-semibold">
                                                        {checkedCount} Room{checkedCount > 1 ? 's' : ''} Selected
                                                    </span>
                                                )}
                                            </div>

                                            {categoryBlocks.length > 1 && (
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

                                        {/* Row 1: Category Selector, Stay Dates */}
                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                            {/* Category Selector */}
                                            <div className="form-control sm:col-span-6">
                                                <label className="label py-0.5">
                                                    <span className="label-text font-semibold text-slate-700 text-xs">
                                                        Category Type <span className="text-red-500 font-bold">*</span>
                                                    </span>
                                                </label>
                                                <select
                                                    value={block.categoryId}
                                                    onChange={e => handleCategoryBlockChange(block.blockId, { categoryId: e.target.value })}
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
                                                    selected={block.checkInDate}
                                                    onChange={date => handleCategoryBlockChange(block.blockId, { checkInDate: date })}
                                                    selectsStart
                                                    startDate={block.checkInDate}
                                                    endDate={block.checkOutDate}
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
                                                    selected={block.checkOutDate}
                                                    onChange={date => handleCategoryBlockChange(block.blockId, { checkOutDate: date })}
                                                    selectsEnd
                                                    startDate={block.checkInDate}
                                                    endDate={block.checkOutDate}
                                                    minDate={block.checkInDate ? addDays(block.checkInDate, 1) : new Date()}
                                                    dateFormat="dd MMM yyyy"
                                                    wrapperClassName="w-full"
                                                    className="input input-sm input-bordered rounded-xl bg-white text-xs w-full cursor-pointer font-bold text-teal-800"
                                                    onChangeRaw={e => e.preventDefault()}
                                                />
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
                                                    className="input input-sm input-bordered rounded-xl bg-white text-xs font-semibold w-full"
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
                                                    className="input input-sm input-bordered rounded-xl bg-white text-xs font-semibold w-full"
                                                />
                                            </div>

                                            {/* Negotiate Price Field */}
                                            <div className="form-control">
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
                                                    className="input input-sm input-bordered rounded-xl bg-white text-xs font-bold text-teal-900 w-full"
                                                />
                                                <span className="text-[10px] text-slate-400 mt-0.5">
                                                    Default: ৳{defaultCatPrice.toLocaleString()}/n
                                                </span>
                                            </div>

                                            <div className="">
                                                <span className="text-[11px]">Duration: <strong>{nights} night(s)</strong></span>
                                                <div className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-200 w-full flex justify-between items-center">
                                                    <span>Category Total: <strong className="text-teal-800">৳{Number(categoryTotal).toLocaleString()}</strong></span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 3: Physical Room Checkbox Selection Grid */}
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
                                                                className={`relative flex items-center justify-between p-2.5 rounded-xl border cursor-pointer select-none transition-all ${isChecked
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
                                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${conflict.reason === "Out of Order" ? "bg-amber-100 text-amber-900" : "bg-rose-100 text-rose-900"
                                                                        }`}>
                                                                        {conflict.reason === "Out of Order" ? "OOO" : (conflict.reason || "Busy")}
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

                    {/* Section 3: Extra Services & Facilities (Optional) */}
                    <div className="space-y-3 pt-1">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-1.5">
                                    <Sparkles size={14} className="text-amber-500" /> Extra Services & Facilities (Optional)
                                </h4>
                                {resolvedExtraServicesList.length > 0 && (
                                    <span className="badge badge-sm font-bold bg-amber-100 text-amber-900 border-none text-[10px]">
                                        {resolvedExtraServicesList.length} service{resolvedExtraServicesList.length > 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={handleAddExtraService}
                                disabled={availableToAdd.length === 0 || hasUnselectedService}
                                title={
                                    hasUnselectedService
                                        ? "Please select a service type before adding another"
                                        : availableToAdd.length === 0
                                        ? "All available extra services have been added"
                                        : "Add another extra service"
                                }
                                className={`btn btn-xs rounded-xl flex items-center gap-1 cursor-pointer transition-all ${
                                    availableToAdd.length === 0 || hasUnselectedService
                                        ? "btn-disabled bg-slate-100 text-slate-400 border-slate-200"
                                        : "bg-amber-600 hover:bg-amber-700 text-white border-none shadow-xs"
                                }`}
                            >
                                <Plus size={12} />
                                <span>Add Extra Service</span>
                            </button>
                        </div>

                        {selectedExtraServices.length === 0 ? (
                            <div className="p-4 rounded-2xl bg-amber-50/40 border border-dashed border-amber-200 text-center space-y-2">
                                <p className="text-xs text-amber-900/80 font-medium">
                                    No extra services added yet. Click <strong className="text-amber-950 font-bold">Add Extra Service</strong> to include add-on amenities like Extra Bed, Pool Access, or Airport Transfers.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleAddExtraService}
                                    disabled={availableToAdd.length === 0}
                                    className="btn btn-xs bg-amber-600 hover:bg-amber-700 text-white rounded-xl border-none shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                                >
                                    <Plus size={13} /> Add Extra Service
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {selectedExtraServices.map((item, idx) => {
                                    const otherSelectedIds = new Set(
                                        selectedExtraServices.filter(x => x.id !== item.id).map(x => String(x.serviceId)).filter(Boolean)
                                    )
                                    const currentService = dbExtraServices.find(s => String(s._id) === String(item.serviceId) || s.name === item.serviceId)
                                    const unitPrice = currentService ? Number(currentService.price || 0) : Number(item.customService?.price || item.customService?.unitPrice || 0)
                                    const itemCost = unitPrice * (Number(item.quantity) || 1)
                                    const billingType = currentService?.billingType || item.customService?.billingType || "One-time"

                                    return (
                                        <div
                                            key={item.id || idx}
                                            className="p-3 rounded-2xl bg-amber-50/40 border border-amber-200/70 relative transition-all"
                                        >
                                            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-amber-200/50">
                                                <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                                                    <Sparkles size={12} className="text-amber-600" />
                                                    Service #{idx + 1}
                                                    {currentService ? (
                                                        <span className="font-semibold text-amber-700 text-[10px] bg-amber-100/80 px-1.5 py-0.5 rounded">
                                                            {billingType}
                                                        </span>
                                                    ) : (
                                                        <span className="font-medium text-slate-500 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                                                            Select Service
                                                        </span>
                                                    )}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveExtraService(item.id)}
                                                    title="Remove service"
                                                    className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                                                {/* Service Type Selection */}
                                                <div className="form-control">
                                                    <label className="label py-0.5">
                                                        <span className="label-text font-bold text-slate-800 text-xs">Extra Service Type</span>
                                                    </label>
                                                    <select
                                                        value={item.serviceId || ""}
                                                        onChange={e => handleServiceChange(item.id, e.target.value)}
                                                        className="select select-sm select-bordered w-full rounded-xl bg-white text-xs font-semibold"
                                                    >
                                                        <option value="">-- Select Extra Service --</option>
                                                        {activeDbServices.map(s => {
                                                            const isAlreadySelectedInOther = otherSelectedIds.has(String(s._id))
                                                            return (
                                                                <option
                                                                    key={s._id}
                                                                    value={s._id}
                                                                    disabled={isAlreadySelectedInOther}
                                                                >
                                                                    {s.name} (৳{Number(s.price || 0).toLocaleString()} • {s.billingType || "One-time"})
                                                                    {isAlreadySelectedInOther ? " — (Already added)" : ""}
                                                                </option>
                                                            )
                                                        })}
                                                        {item.serviceId && !activeDbServices.some(s => String(s._id) === String(item.serviceId) || s.name === item.serviceId) && (
                                                            <option value={item.serviceId}>
                                                                {item.customService?.name || item.serviceId} (৳{Number(item.customService?.price || 0).toLocaleString()})
                                                            </option>
                                                        )}
                                                    </select>
                                                </div>

                                                {/* Count/Quantity with Dynamic Label */}
                                                {currentService ? (
                                                    <div className="form-control">
                                                        <label className="label py-0.5 flex items-center justify-between">
                                                            <span className="label-text font-bold text-slate-800 text-xs">
                                                                {getBillingTypeLabel(billingType)}
                                                            </span>
                                                            <span className="text-[10px] text-amber-800 font-semibold">
                                                                ৳{unitPrice.toLocaleString()} / {getUnitLabel(billingType)}
                                                            </span>
                                                        </label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={item.quantity}
                                                            onChange={e => handleQuantityChange(item.id, e.target.value)}
                                                            placeholder="Enter count"
                                                            className="input input-sm input-bordered w-full rounded-xl bg-white text-xs font-bold text-amber-900"
                                                        />
                                                        <div className="flex items-center justify-between text-[11px] text-amber-900/90 font-medium mt-1 px-1">
                                                            <span>Subtotal:</span>
                                                            <span className="font-bold font-mono text-amber-950">
                                                                ৳{unitPrice.toLocaleString()} × {item.quantity} = ৳{itemCost.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="form-control justify-center">
                                                        <div className="h-[36px] mt-4 flex items-center px-3 rounded-xl bg-amber-100/40 border border-dashed border-amber-300 text-[11px] text-amber-800 font-medium">
                                                            Select a service type on the left to configure count
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}

                                {selectedExtraServices.length > 0 && (
                                    <div className="flex items-center justify-between px-2 pt-1 text-xs text-amber-900 font-semibold">
                                        <span>Total Extra Services ({selectedExtraServices.length}):</span>
                                        <strong className="font-mono text-amber-950 text-sm">৳{extraCost.toLocaleString()}</strong>
                                    </div>
                                )}
                            </div>
                        )}
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
                                            onClick={() => { setPaidAmount('0'); setPaymentMethod(''); setTransactionId(''); }}
                                            className="btn btn-xs btn-outline border-amber-300 text-amber-800 hover:bg-amber-50 rounded-lg text-[10px] font-bold"
                                            title="Set to 0 (Pay on Arrival / Unpaid)"
                                        >
                                            0 (Unpaid)
                                        </button>
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
                                            <CreditCard size={13} className="text-teal-600" /> Payment Method {effectivePaid > 0 && <span className="text-red-500 font-bold">*</span>}
                                        </span>
                                    </label>
                                    <select
                                        value={paymentMethod}
                                        onChange={e => setPaymentMethod(e.target.value)}
                                        className={`select select-sm select-bordered rounded-xl bg-white text-xs font-semibold ${effectivePaid > 0 && !paymentMethod.trim() ? 'border-amber-400' : ''}`}
                                    >
                                        <option value="">{effectivePaid > 0 ? "-- Select Payment Method --" : "-- Pay on Arrival / Unpaid --"}</option>
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
                                            {effectivePaid > 0 && !["Cash", "Other", "Pay on Arrival", "Pay on Arrival / Unpaid", "Pending"].some(m => m.toLowerCase() === paymentMethod.trim().toLowerCase()) && (
                                                <span className="text-red-500 font-bold text-[10px]">* Required</span>
                                            )}
                                        </span>
                                    </label>
                                    <input
                                        type="text"
                                        value={transactionId}
                                        onChange={e => setTransactionId(e.target.value)}
                                        placeholder="e.g. TRX123456 or Bank Slip No."
                                        className={`input input-sm input-bordered rounded-xl bg-white text-xs ${effectivePaid > 0 && !["Cash", "Other", "Pay on Arrival", "Pay on Arrival / Unpaid", "Pending"].some(m => m.toLowerCase() === paymentMethod.trim().toLowerCase()) && !transactionId.trim() ? 'border-amber-400' : ''}`}
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
                                Total ({flatBookedRooms.length} Room{flatBookedRooms.length !== 1 ? 's' : ''}): <strong className="text-teal-900 font-extrabold text-sm">৳{netPayable.toLocaleString()}</strong>
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
