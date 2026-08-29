import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { addDays, isWithinInterval, eachDayOfInterval } from 'date-fns'
import toast from 'react-hot-toast'
import { showSuccessAlert, showErrorAlert } from '../../utils/customSwal'
import { 
    BedDouble, 
    Calendar, 
    Users, 
    ShieldCheck, 
    Phone, 
    Clock, 
    Sparkles, 
    MapPin, 
    Waves,
    ArrowLeft,
    CheckCircle2,
    Wifi,
    Tv,
    Wind,
    Coffee,
    X,
    ChevronLeft,
    ChevronRight,
    Share2,
    Check
} from 'lucide-react'

// Parse "YYYY-MM-DD" as LOCAL midnight
const parseLocalDate = (str) => {
    if (!str) return null
    const [y, m, d] = str.split('-').map(Number)
    return new Date(y, m - 1, d)
}

// Format Date object to "YYYY-MM-DD"
const formatLocalDate = (date) => {
    if (!date) return ''
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

const RoomDetails = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [selectedImgIndex, setSelectedImgIndex] = useState(0)
    const [bookingModalOpen, setBookingModalOpen] = useState(false)
    const [checkInDate, setCheckInDate] = useState(null)
    const [checkOutDate, setCheckOutDate] = useState(null)
    const [calcNights, setCalcNights] = useState(0)
    const [calcTotal, setCalcTotal] = useState(0)
    const [formData, setFormData] = useState({ name: '', mobile: '', adults: 2, babies: 0, specialNeeds: '' })
    const [formErrors, setFormErrors] = useState({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [copied, setCopied] = useState(false)

    // Fetch Room by ID (with fallback to searching all rooms)
    const { data: room, isLoading, isError } = useQuery({
        queryKey: ["room-details", id],
        queryFn: async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_SERVER_URL}/room/${id}`)
                if (res.data) return res.data
            } catch (e) {
                console.log("Direct room fetch fallback to /rooms", e)
            }
            const allRes = await axios.get(`${import.meta.env.VITE_SERVER_URL}/rooms`)
            const matched = allRes.data.find(r => r._id === id)
            if (!matched) throw new Error("Room not found")
            return matched
        }
    })

    // Fetch reserved date ranges for this room
    const { data: reservedRanges = [] } = useQuery({
        queryKey: ["reserved-dates", id],
        queryFn: async () => {
            if (!id) return []
            const res = await axios.get(`${import.meta.env.VITE_SERVER_URL}/bookings/reserved-dates`, {
                params: { roomId: id }
            })
            return res.data
        },
        enabled: !!id
    })

    const bookedDates = React.useMemo(() => {
        const dates = []
        reservedRanges.forEach(range => {
            try {
                const start = parseLocalDate(range.checkIn)
                const lastOccupied = addDays(parseLocalDate(range.checkOut), -1)
                if (start <= lastOccupied) {
                    eachDayOfInterval({ start, end: lastOccupied }).forEach(d => dates.push(d))
                }
            } catch (_) {}
        })
        return dates
    }, [reservedRanges])

    const isDateBooked = (date) => {
        return reservedRanges.some(range => {
            try {
                const start = parseLocalDate(range.checkIn)
                const lastOccupied = addDays(parseLocalDate(range.checkOut), -1)
                return isWithinInterval(date, { start, end: lastOccupied })
            } catch (_) { return false }
        })
    }

    const rangeHasConflict = (start, end) => {
        return reservedRanges.some(range => {
            try {
                const rStart = parseLocalDate(range.checkIn)
                const rEnd = parseLocalDate(range.checkOut)
                return start < rEnd && end > rStart
            } catch (_) { return false }
        })
    }

    useEffect(() => {
        if (checkInDate && checkOutDate && room) {
            const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24))
            setCalcNights(nights > 0 ? nights : 0)
            setCalcTotal(nights > 0 ? nights * room.price : 0)
        } else {
            setCalcNights(0)
            setCalcTotal(0)
        }
    }, [checkInDate, checkOutDate, room])

    const handleOpenBookingModal = () => {
        setCheckInDate(null)
        setCheckOutDate(null)
        setFormData({ name: '', mobile: '', adults: room?.capacity || 2, babies: 0, specialNeeds: '' })
        setFormErrors({})
        setBookingModalOpen(true)
    }

    const handleCloseModal = () => {
        setBookingModalOpen(false)
        setCheckInDate(null)
        setCheckOutDate(null)
    }

    const handleInput = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
        setFormErrors(prev => ({ ...prev, [e.target.name]: '' }))
    }

    const handleShare = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href)
            setCopied(true)
            toast.success("Room link copied to clipboard!")
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const validate = () => {
        const errs = {}
        if (!formData.name.trim()) errs.name = 'Name is required'
        if (!formData.mobile.trim()) errs.mobile = 'Mobile is required'
        if (!checkInDate) errs.checkIn = 'Select check-in date'
        if (!checkOutDate) errs.checkOut = 'Select check-out date'
        if (checkInDate && checkOutDate && checkOutDate <= checkInDate) errs.checkOut = 'Check-out must be after check-in'
        setFormErrors(errs)
        return Object.keys(errs).length === 0
    }

    const onSubmit = async (e) => {
        e.preventDefault()
        if (!validate()) return
        setIsSubmitting(true)

        const checkInStr = formatLocalDate(checkInDate)
        const checkOutStr = formatLocalDate(checkOutDate)

        if (rangeHasConflict(checkInDate, checkOutDate)) {
            showErrorAlert("Dates Unavailable!", "The selected dates overlap with an existing reservation. Please choose different dates.")
            setIsSubmitting(false)
            return
        }

        const checkToast = toast.loading("Verifying real-time room availability...")
        try {
            const availRes = await axios.get(`${import.meta.env.VITE_SERVER_URL}/check-room-availability`, {
                params: { roomId: room._id, checkIn: checkInStr, checkOut: checkOutStr }
            })
            toast.dismiss(checkToast)
            if (!availRes.data.available) {
                showErrorAlert("Room Already Reserved!", availRes.data.message)
                setIsSubmitting(false)
                return
            }
        } catch (err) {
            toast.dismiss(checkToast)
            console.log("Availability check error:", err)
        }

        const bookingData = {
            roomId: room._id,
            roomName: room.name,
            roomCategory: `${room.name} – ${room.category} (${room.view})`,
            name: formData.name,
            mobile: formData.mobile,
            adults: Number(formData.adults),
            babies: Number(formData.babies || 0),
            specialNeeds: formData.specialNeeds,
            checkIn: checkInStr,
            checkOut: checkOutStr,
            totalAmount: calcTotal,
            advanceAmount: 0,
        }

        try {
            const res = await axios.post(`${import.meta.env.VITE_SERVER_URL}/bookings`, bookingData)
            handleCloseModal()
            showSuccessAlert(
                "Reservation Confirmed! 🎉",
                "",
                `<div class="space-y-1.5 text-left bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2 text-xs sm:text-sm">
                    <p><strong>Booking ID:</strong> <span class="font-mono text-teal-700 font-bold">${res.data.bookingId}</span></p>
                    <p><strong>Guest:</strong> ${formData.name}</p>
                    <p><strong>Room:</strong> ${room?.name}</p>
                    <p><strong>Dates:</strong> ${checkInStr} → ${checkOutStr} (${calcNights} night${calcNights > 1 ? 's' : ''})</p>
                 </div>
                 <p class="mt-3 text-xs text-slate-500">We will contact you on WhatsApp at <strong>+8801616472282</strong> to finalize your check-in.</p>`
            )
        } catch (err) {
            console.log(err)
            showErrorAlert("Booking Failed", err.response?.data?.message || "Failed to submit booking. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8 animate-pulse">
                <div className="h-8 bg-slate-200 rounded w-48"></div>
                <div className="h-[400px] bg-slate-200 rounded-3xl"></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-4">
                        <div className="h-8 bg-slate-200 rounded w-3/4"></div>
                        <div className="h-4 bg-slate-200 rounded w-full"></div>
                        <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                    </div>
                    <div className="h-64 bg-slate-200 rounded-2xl"></div>
                </div>
            </div>
        )
    }

    if (isError || !room) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
                <BedDouble size={56} className="text-slate-300 mb-4" />
                <h2 className="text-2xl font-bold text-slate-800 font-serif">Suite Not Found</h2>
                <p className="text-slate-500 text-sm mt-1 max-w-md">
                    The room you are looking for may have been removed or the ID ({id}) is invalid.
                </p>
                <Link to="/" className="btn btn-primary rounded-xl text-white mt-6 gap-2">
                    <ArrowLeft size={16} /> Back to All Rooms
                </Link>
            </div>
        )
    }

    const allImages = room.images?.length
        ? room.images.map(img => typeof img === 'string' ? img : img.url)
        : room.imageUrl ? [room.imageUrl] : []
    const currentImgSrc = allImages[selectedImgIndex] || room.imageUrl

    const amenitiesList = [
        { icon: <Wind size={16} className="text-teal-600" />, label: "Air Conditioned" },
        { icon: <Wifi size={16} className="text-teal-600" />, label: "High-Speed Wi-Fi" },
        { icon: <Tv size={16} className="text-teal-600" />, label: "Smart LED TV" },
        { icon: <Waves size={16} className="text-teal-600" />, label: "Sea View Balcony" },
        { icon: <Coffee size={16} className="text-teal-600" />, label: "Complimentary Tea/Water" },
        { icon: <ShieldCheck size={16} className="text-teal-600" />, label: "24/7 Security & Power Backup" },
    ]

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-3 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Navigation and Actions */}
                <div className="flex items-center justify-between gap-4">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="btn btn-sm btn-ghost gap-2 rounded-xl text-slate-600 hover:text-slate-900"
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleShare}
                            className="btn btn-sm btn-outline border-slate-300 gap-1.5 rounded-xl text-slate-700 hover:bg-slate-100"
                        >
                            {copied ? <Check size={14} className="text-emerald-600" /> : <Share2 size={14} />}
                            <span>{copied ? "Copied" : "Share"}</span>
                        </button>
                    </div>
                </div>

                {/* Main Photo Gallery Hero */}
                <div className="space-y-3">
                    <div className="relative h-[320px] sm:h-[450px] md:h-[500px] rounded-3xl overflow-hidden bg-slate-900 shadow-md border border-slate-200">
                        {currentImgSrc ? (
                            <img 
                                src={currentImgSrc} 
                                alt={room.name} 
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-800">
                                <BedDouble size={56} />
                                <span className="text-sm mt-2">Miami Beach Resort</span>
                            </div>
                        )}

                        {/* Top Badges */}
                        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                            <span className="badge badge-md bg-slate-900/80 backdrop-blur-md text-white border-none font-semibold">
                                {room.category}
                            </span>
                            <span className="badge badge-md bg-teal-600/90 backdrop-blur-md text-white border-none font-semibold">
                                {room.view}
                            </span>
                            {room.status === "active" ? (
                                <span className="badge badge-md bg-emerald-600/90 backdrop-blur-md text-white border-none font-semibold">
                                    Available Now
                                </span>
                            ) : (
                                <span className="badge badge-md bg-rose-600/90 backdrop-blur-md text-white border-none font-semibold">
                                    Deactivated
                                </span>
                            )}
                        </div>

                        {/* Arrows for multi-photo */}
                        {allImages.length > 1 && (
                            <>
                                <button 
                                    onClick={() => setSelectedImgIndex((selectedImgIndex - 1 + allImages.length) % allImages.length)}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/70 text-white flex items-center justify-center hover:bg-slate-900 transition-colors shadow-lg"
                                >
                                    <ChevronLeft size={22} />
                                </button>
                                <button 
                                    onClick={() => setSelectedImgIndex((selectedImgIndex + 1) % allImages.length)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/70 text-white flex items-center justify-center hover:bg-slate-900 transition-colors shadow-lg"
                                >
                                    <ChevronRight size={22} />
                                </button>
                                <div className="absolute bottom-4 left-4 bg-slate-900/75 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-bold text-white">
                                    {selectedImgIndex + 1} / {allImages.length} Photos
                                </div>
                            </>
                        )}
                    </div>

                    {/* Thumbnail Strips */}
                    {allImages.length > 1 && (
                        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 scrollbar-none">
                            {allImages.map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedImgIndex(idx)}
                                    className={`relative w-20 h-16 sm:w-28 sm:h-20 rounded-2xl overflow-hidden shrink-0 border-2 transition-all ${
                                        selectedImgIndex === idx ? "border-teal-600 ring-2 ring-teal-500/20 scale-102" : "border-slate-200 opacity-70 hover:opacity-100"
                                    }`}
                                >
                                    <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Details Grid: Left Content & Right Sticky Card */}
                <div className="grid grid-cols-1 gap-8">
                    {/* Left: Info, Specs, Amenities, Policies */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-teal-600">Miami Beach Resort Suite</span>
                                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif mt-1">
                                        {room.name}
                                    </h1>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl sm:text-3xl font-extrabold text-teal-800 font-serif">
                                        ৳{room.price?.toLocaleString()}
                                    </span>
                                    <span className="text-xs text-slate-500 block">per night</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2.5 pt-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700">
                                    <BedDouble size={14} className="text-teal-600" /> {room.category}
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200/50">
                                    <Waves size={14} className="text-teal-600" /> {room.view}
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700">
                                    <Users size={14} className="text-teal-600" /> Up to {room.capacity} Persons
                                </span>
                            </div>

                            <hr className="border-slate-100 my-4" />

                            <div>
                                <h3 className="font-bold text-slate-900 text-base font-serif mb-2">Room Overview</h3>
                                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">
                                    {room.description || "Enjoy premium hospitality, serene coastal decor, and relaxing beachfront views. This suite includes modern en-suite washroom with hot & cold water, comfortable bedding, and dedicated guest assistance."}
                                </p>
                            </div>
                        </div>

                        {/* Amenities */}
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
                            <h3 className="font-bold text-slate-900 text-base font-serif">Included Amenities & Perks</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pt-2">
                                {amenitiesList.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-medium text-slate-800">
                                        {item.icon}
                                        <span>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Stay Policies */}
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
                            <h3 className="font-bold text-slate-900 text-base font-serif">Resort Policies</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
                                <div className="flex gap-3 items-start">
                                    <Clock size={16} className="text-teal-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-slate-900">Check-in & Check-out</p>
                                        <p>Check-in: 01:00 PM | Check-out: 11:00 AM</p>
                                    </div>
                                </div>
                                <div className="flex gap-3 items-start">
                                    <Calendar size={16} className="text-teal-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-slate-900">Rescheduling & Cancellation</p>
                                        <p>35% cancellation charge. Free date reschedule with 24hr advance notice.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3 items-start">
                                    <ShieldCheck size={16} className="text-teal-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-slate-900">Identification Required</p>
                                        <p>NID/Passport must be presented at the reception desk upon check-in.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3 items-start">
                                    <Phone size={16} className="text-teal-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-slate-900">24/7 Front Desk Help</p>
                                        <p>Direct WhatsApp support: +8801616472282</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Booking Summary / CTA Card */}
                    {/* <div className="lg:col-span-1">
                        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-md sticky top-24 space-y-5">
                            <div>
                                <span className="text-[11px] font-bold text-teal-600 uppercase tracking-wider">Book Online</span>
                                <h3 className="text-xl font-bold font-serif text-slate-900 mt-0.5">Reserve This Suite</h3>
                                <p className="text-xs text-slate-500 mt-1">Instant confirmation & WhatsApp check-in assistance.</p>
                            </div>

                            <div className="bg-teal-50/70 p-4 rounded-2xl border border-teal-100 space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-600">Base Rate:</span>
                                    <span className="font-bold text-slate-900">৳{room.price?.toLocaleString()} / night</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-600">Capacity:</span>
                                    <span className="font-bold text-slate-900">Max {room.capacity} Persons</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-600">Room Category:</span>
                                    <span className="font-bold text-slate-900">{room.category}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-600">Location:</span>
                                    <span className="font-bold text-teal-800">Dolphin Mor, Cox's Bazar</span>
                                </div>
                            </div>

                            {room.status === "active" ? (
                                <button
                                    onClick={handleOpenBookingModal}
                                    className="btn btn-primary w-full rounded-2xl text-white font-bold py-3 shadow-md shadow-teal-600/20 text-sm"
                                >
                                    Book Now
                                </button>
                            ) : (
                                <button disabled className="btn btn-disabled w-full rounded-2xl text-sm">
                                    Currently Unavailable
                                </button>
                            )}

                            <div className="text-center text-[11px] text-slate-400">
                                🔒 Secure reservation directly managed by Miami Beach Resort.
                            </div>
                        </div>
                    </div> */}
                </div>
            </div>

            {/* ── BOOKING MODAL ── */}
            {bookingModalOpen && (
                <dialog open className="modal modal-open z-50">
                    <div className="modal-box w-full max-w-xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl p-4 sm:p-7 shadow-2xl border border-slate-100">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                            <div className="min-w-0 pr-2">
                                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-teal-600 block">Reservation Form</span>
                                <h3 className="font-bold text-lg sm:text-xl font-serif text-slate-900 truncate">{room?.name}</h3>
                            </div>
                            <button onClick={handleCloseModal} className="btn btn-ghost btn-sm btn-circle shrink-0"><X size={18} /></button>
                        </div>

                        {/* Room summary */}
                        <div className="bg-teal-50/80 border border-teal-100 rounded-2xl p-3 sm:p-4 mb-5 text-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <p className="font-bold text-teal-900">{room.category} ({room.view})</p>
                                    <p className="text-teal-700 text-[11px]">৳{room.price?.toLocaleString()} / night • Max {room.capacity} Guests</p>
                                </div>
                                {calcNights > 0 && (
                                    <div className="font-semibold text-teal-800 bg-white/60 px-2.5 py-1 rounded-xl text-right">
                                        {calcNights} Night{calcNights > 1 ? 's' : ''} = ৳{calcTotal.toLocaleString()}
                                    </div>
                                )}
                            </div>
                            {bookedDates.length > 0 && (
                                <p className="mt-2 text-[11px] text-rose-600 font-semibold flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 inline-block"></span>
                                    Red dates are already reserved — you cannot select them.
                                </p>
                            )}
                        </div>

                        <form onSubmit={onSubmit} className="space-y-4 text-xs sm:text-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div className="form-control">
                                    <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Guest Full Name *</span></label>
                                    <input
                                        name="name" value={formData.name} onChange={handleInput}
                                        type="text" placeholder="Your full name"
                                        className={`input input-sm sm:input-md input-bordered w-full rounded-xl bg-slate-50 focus:bg-white text-xs sm:text-sm ${formErrors.name ? "input-error" : ""}`}
                                    />
                                    {formErrors.name && <span className="text-error text-[11px] mt-0.5">{formErrors.name}</span>}
                                </div>

                                <div className="form-control">
                                    <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Mobile (WhatsApp) *</span></label>
                                    <input
                                        name="mobile" value={formData.mobile} onChange={handleInput}
                                        type="tel" placeholder="+88017..."
                                        className={`input input-sm sm:input-md input-bordered w-full rounded-xl bg-slate-50 focus:bg-white text-xs sm:text-sm ${formErrors.mobile ? "input-error" : ""}`}
                                    />
                                    {formErrors.mobile && <span className="text-error text-[11px] mt-0.5">{formErrors.mobile}</span>}
                                </div>

                                <div className="form-control">
                                    <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Check-In Date *</span></label>
                                    <DatePicker
                                        selected={checkInDate}
                                        onChange={(date) => {
                                            setCheckInDate(date)
                                            if (checkOutDate && date >= checkOutDate) setCheckOutDate(null)
                                        }}
                                        minDate={new Date()}
                                        excludeDates={bookedDates}
                                        placeholderText="Select check-in"
                                        dateFormat="dd MMM yyyy"
                                        className={`input input-sm sm:input-md input-bordered w-full rounded-xl bg-slate-50 focus:bg-white text-xs sm:text-sm cursor-pointer ${formErrors.checkIn ? "input-error" : ""}`}
                                        calendarClassName="booking-calendar"
                                        dayClassName={(date) => isDateBooked(date) ? "booked-day" : undefined}
                                        wrapperClassName="w-full"
                                        autoComplete="off"
                                    />
                                    {formErrors.checkIn && <span className="text-error text-[11px] mt-0.5">{formErrors.checkIn}</span>}
                                </div>

                                <div className="form-control">
                                    <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Check-Out Date *</span></label>
                                    <DatePicker
                                        selected={checkOutDate}
                                        onChange={(date) => setCheckOutDate(date)}
                                        minDate={checkInDate ? addDays(checkInDate, 1) : addDays(new Date(), 1)}
                                        excludeDates={bookedDates}
                                        filterDate={(date) => {
                                            if (!checkInDate) return true
                                            if (rangeHasConflict(checkInDate, date)) return false
                                            return true
                                        }}
                                        placeholderText="Select check-out"
                                        dateFormat="dd MMM yyyy"
                                        className={`input input-sm sm:input-md input-bordered w-full rounded-xl bg-slate-50 focus:bg-white text-xs sm:text-sm cursor-pointer ${formErrors.checkOut ? "input-error" : ""}`}
                                        calendarClassName="booking-calendar"
                                        dayClassName={(date) => isDateBooked(date) ? "booked-day" : undefined}
                                        wrapperClassName="w-full"
                                        autoComplete="off"
                                        disabled={!checkInDate}
                                    />
                                    {formErrors.checkOut && <span className="text-error text-[11px] mt-0.5">{formErrors.checkOut}</span>}
                                </div>

                                <div className="form-control">
                                    <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Adults</span></label>
                                    <input
                                        name="adults" value={formData.adults} onChange={handleInput}
                                        type="number" min="1" placeholder="2"
                                        className="input input-sm sm:input-md input-bordered w-full rounded-xl bg-slate-50 focus:bg-white text-xs sm:text-sm"
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Children / Babies</span></label>
                                    <input
                                        name="babies" value={formData.babies} onChange={handleInput}
                                        type="number" min="0" placeholder="0"
                                        className="input input-sm sm:input-md input-bordered w-full rounded-xl bg-slate-50 focus:bg-white text-xs sm:text-sm"
                                    />
                                </div>
                            </div>

                            <div className="form-control">
                                <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Special Requests / Notes</span></label>
                                <textarea
                                    name="specialNeeds" value={formData.specialNeeds} onChange={handleInput}
                                    placeholder="Arrival time, extra mattress (paid), floor preference..."
                                    className="textarea textarea-bordered w-full rounded-xl bg-slate-50 focus:bg-white text-xs sm:text-sm"
                                    rows={2}
                                />
                            </div>

                            <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                🚫 Identification documents must be submitted at check-in. Reservation is subject to date availability.
                            </p>

                            <div className="flex items-center gap-3 pt-2">
                                <button type="button" onClick={handleCloseModal} className="btn btn-sm sm:btn-md btn-ghost flex-1 rounded-xl">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="btn btn-sm sm:btn-md btn-primary flex-2 rounded-xl text-white font-bold shadow-md shadow-teal-600/20">
                                    {isSubmitting ? <span className="loading loading-spinner loading-sm" /> : "Confirm Reservation"}
                                </button>
                            </div>
                        </form>
                    </div>
                    <div className="modal-backdrop bg-slate-900/50 backdrop-blur-xs" onClick={handleCloseModal} />
                </dialog>
            )}
        </div>
    )
}

export default RoomDetails
