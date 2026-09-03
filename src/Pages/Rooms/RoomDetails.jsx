import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { addDays } from 'date-fns'
import toast from 'react-hot-toast'
import { showSuccessAlert, showErrorAlert } from '../../utils/customSwal'
import { getYouTubeEmbedUrl, parseFacilityList, parseRoomNumbers } from '../Dashboard/Category&Pricing/categoryRoomUtils'
import { 
    BedDouble, 
    Calendar, 
    Users, 
    ShieldCheck, 
    Phone, 
    Clock, 
    Sparkles, 
    MapPin, 
    ArrowLeft,
    X,
    ChevronLeft,
    ChevronRight,
    Share2,
    Check,
    Video,
    Image as ImageIcon,
    Star,
    Plus,
    Trash2,
    AlertTriangle,
    ArrowRight
} from 'lucide-react'

// Format Date object to "YYYY-MM-DD"
const formatLocalDate = (date) => {
    if (!date) return ''
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

const createRoomEntry = (initialCategoryId = "", initialSameCategory = false) => ({
    itemId: `room-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    categoryId: initialCategoryId,
    sameCategory: initialSameCategory,
    checkInDate: null,
    checkOutDate: null,
    adults: '',
    babies: 0,
})

const RoomDetails = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const SERVER_URL = import.meta.env.VITE_SERVER_URL || ""

    const [selectedImgIndex, setSelectedImgIndex] = useState(0)
    const [bookingModalOpen, setBookingModalOpen] = useState(false)
    const [bookingRooms, setBookingRooms] = useState([])
    const [formData, setFormData] = useState({ name: '', mobile: '', address: '' })
    const [formErrors, setFormErrors] = useState({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [availabilityMsg, setAvailabilityMsg] = useState(null)
    const [copied, setCopied] = useState(false)

    // Fetch Category or Room by ID
    const { data: item, isLoading, isError } = useQuery({
        queryKey: ["room-details", id],
        queryFn: async () => {
            if (!SERVER_URL) throw new Error("Server URL not configured")
            try {
                const res = await axios.get(`${SERVER_URL}/categoryandroom/${id}`)
                if (res.data && typeof res.data === 'object') return res.data
            } catch (_) {}

            try {
                const res2 = await axios.get(`${SERVER_URL}/room/${id}`)
                if (res2.data && typeof res2.data === 'object') return res2.data
            } catch (_) {}

            const allRes = await axios.get(`${SERVER_URL}/categoryandroom`)
            if (Array.isArray(allRes.data)) {
                const matched = allRes.data.find(r => r._id === id)
                if (matched) return matched
            }
            throw new Error("Item not found")
        }
    })

    const { data: rawCategories = [] } = useQuery({
        queryKey: ["all-categories-for-details"],
        queryFn: async () => {
            if (!SERVER_URL) return []
            try {
                const res = await axios.get(`${SERVER_URL}/categoryandroom`)
                return Array.isArray(res.data) ? res.data : []
            } catch (_) {
                return []
            }
        }
    })

    const categories = Array.isArray(rawCategories) ? rawCategories : []

    const photos = item?.images?.length
        ? item.images.map(img => typeof img === 'string' ? img : img.url)
        : item?.imageUrl ? [item.imageUrl] : []

    const amenities = parseFacilityList(item?.amenities || item?.facility || "")
    const roomNumbers = parseRoomNumbers(item?.roomNumbers || [])
    const youtubeEmbedUrl = getYouTubeEmbedUrl(item?.video)
    const youtubeVideoId = youtubeEmbedUrl ? youtubeEmbedUrl.split("/embed/")[1]?.split("?")[0] : ""

    const galleryItems = [
        ...(youtubeEmbedUrl ? [{
            type: "video",
            src: youtubeEmbedUrl,
            thumb: youtubeVideoId ? `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg` : "",
        }] : []),
        ...photos.map(img => ({ type: "image", src: img, thumb: img }))
    ]
    const currentGalleryItem = galleryItems[selectedImgIndex] || galleryItems[0]

    const getRoomNights = (entry) => {
        if (!entry.checkInDate || !entry.checkOutDate) return 0
        const n = Math.ceil((entry.checkOutDate - entry.checkInDate) / (1000 * 60 * 60 * 24))
        return n > 0 ? n : 0
    }

    const getRoomPrice = (entry) => {
        const cat = categories.find(c => c._id === entry.categoryId) || item
        return Number(cat?.price || 0)
    }

    const getRoomTotal = (entry) => {
        return getRoomNights(entry) * getRoomPrice(entry)
    }

    const grandTotal = bookingRooms.reduce((sum, entry) => sum + getRoomTotal(entry), 0)

    const handleOpenBookingModal = () => {
        setBookingRooms([createRoomEntry(item?._id || "", false)])
        setFormData({ name: '', mobile: '', address: '' })
        setFormErrors({})
        setAvailabilityMsg(null)
        setBookingModalOpen(true)
    }

    const handleCloseModal = () => {
        setBookingModalOpen(false)
        setBookingRooms([])
        setAvailabilityMsg(null)
    }

    const handleAddRoom = () => {
        const defaultCatId = item?._id || categories[0]?._id || ""
        setBookingRooms(prev => [...prev, createRoomEntry(defaultCatId, true)])
    }

    const handleRemoveRoom = (itemId) => {
        if (bookingRooms.length <= 1) return
        setBookingRooms(prev => prev.filter(r => r.itemId !== itemId))
        setAvailabilityMsg(null)
    }

    const handleRoomChange = (itemId, changes) => {
        setBookingRooms(prev => prev.map(entry => {
            if (entry.itemId !== itemId) return entry
            const next = { ...entry, ...changes }
            if (changes.sameCategory !== undefined) {
                if (changes.sameCategory) {
                    next.categoryId = item?._id || categories[0]?._id || ""
                }
            }
            if (changes.checkInDate && next.checkOutDate && changes.checkInDate >= next.checkOutDate) {
                next.checkOutDate = null
            }
            return next
        }))
        setAvailabilityMsg(null)
    }

    const handleInput = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
        setFormErrors(prev => ({ ...prev, [e.target.name]: '' }))
    }

    const handleShare = () => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href)
            setCopied(true)
            toast.success("Link copied to clipboard!")
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const validate = () => {
        const errs = {}
        if (!formData.name.trim()) errs.name = 'Name is required'
        if (!formData.mobile.trim()) errs.mobile = 'Mobile is required'
        if (!bookingRooms.length) errs.rooms = 'At least 1 room is required'

        bookingRooms.forEach((entry, index) => {
            if (!entry.categoryId) errs[`category-${entry.itemId}`] = `Select category for Room ${index + 1}`
            if (!entry.checkInDate) errs[`checkIn-${entry.itemId}`] = `Select check-in for Room ${index + 1}`
            if (!entry.checkOutDate) errs[`checkOut-${entry.itemId}`] = `Select check-out for Room ${index + 1}`
            if (entry.checkInDate && entry.checkOutDate && entry.checkOutDate <= entry.checkInDate) {
                errs[`checkOut-${entry.itemId}`] = 'Check-out must be after check-in'
            }
        })

        setFormErrors(errs)
        return Object.keys(errs).length === 0
    }

    const onSubmit = async (e) => {
        e.preventDefault()
        if (!validate()) return
        setIsSubmitting(true)
        setAvailabilityMsg(null)

        // Availability checking
        for (let i = 0; i < bookingRooms.length; i++) {
            const entry = bookingRooms[i]
            const cat = categories.find(c => c._id === entry.categoryId) || item
            const checkIn = formatLocalDate(entry.checkInDate)
            const checkOut = formatLocalDate(entry.checkOutDate)

            try {
                const availRes = await axios.get(`${SERVER_URL}/check-category-availability`, {
                    params: { categoryId: entry.categoryId, checkIn, checkOut }
                })
                if (!availRes.data.available) {
                    setAvailabilityMsg({ 
                        ok: false, 
                        text: `Room ${i + 1} (${cat?.name || "Category"}): ${availRes.data.message}` 
                    })
                    setIsSubmitting(false)
                    return
                }
            } catch (_) {}
        }

        const normalizedRooms = bookingRooms.map(entry => {
            const cat = categories.find(c => c._id === entry.categoryId) || item
            return {
                roomId: entry.categoryId,
                categoryId: entry.categoryId,
                categoryName: cat?.name || "Category",
                checkIn: formatLocalDate(entry.checkInDate),
                checkOut: formatLocalDate(entry.checkOutDate),
                adults: entry.adults !== '' && entry.adults !== undefined ? Number(entry.adults) : 0,
                babies: Number(entry.children !== undefined ? entry.children : (entry.babies || 0)),
                children: Number(entry.children !== undefined ? entry.children : (entry.babies || 0)),
                pricePerNight: Number(cat?.price || 0),
                nights: getRoomNights(entry)
            }
        })

        const bookingData = {
            name: formData.name,
            mobile: formData.mobile,
            address: formData.address,
            rooms: normalizedRooms,
            advanceAmount: 0,
        }

        try {
            const res = await axios.post(`${SERVER_URL}/bookings`, bookingData)
            const roomLines = normalizedRooms.map((r, index) => [
                `Room ${index + 1}: ${r.categoryName}`,
                `Dates: ${r.checkIn} to ${r.checkOut} (${r.nights} nights)`,
                `Guests: ${r.adults} adults${(r.children || r.babies) > 0 ? `, ${r.children || r.babies} ${(r.children || r.babies) === 1 ? 'child' : 'children'}` : ""}`,
                `Rate: ৳${r.pricePerNight.toLocaleString()}/night`
            ].join("\n")).join("\n\n")

            const whatsappMsg = [
                "Booking Request",
                "",
                `Booking ID: ${res.data.bookingId}`,
                `Guest Name: ${formData.name}`,
                `Mobile: ${formData.mobile}`,
                `Address: ${formData.address || "N/A"}`,
                "",
                `Total Rooms: ${normalizedRooms.length}`,
                "",
                roomLines,
                "",
                `Grand Total: ৳${grandTotal.toLocaleString()}`,
            ].join("\n")

            window.open(`https://wa.me/8801616472282?text=${encodeURIComponent(whatsappMsg)}`, "_blank", "noopener,noreferrer")
            handleCloseModal()
            showSuccessAlert(
                "Reservation Confirmed! 🎉",
                "",
                `<div class="space-y-1.5 text-left bg-slate-50 p-4 rounded-xl border border-slate-200 mt-2 text-xs sm:text-sm">
                    <p><strong>Booking ID:</strong> <span class="font-mono text-teal-700 font-bold">${res.data.bookingId}</span></p>
                    <p><strong>Guest:</strong> ${formData.name}</p>
                    <p><strong>Rooms Booked:</strong> ${normalizedRooms.length}</p>
                    <p><strong>Grand Total:</strong> ৳${grandTotal.toLocaleString()}</p>
                 </div>
                 <p class="mt-3 text-xs text-slate-500">We will contact you on WhatsApp at <strong>+8801616472282</strong> to finalize your check-in.</p>`
            )
        } catch (err) {
            showErrorAlert("Booking Failed", err.response?.data?.message || "Failed to submit booking. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-8 animate-pulse">
                <div className="h-8 bg-slate-200 rounded w-48" />
                <div className="h-[420px] bg-slate-200 rounded-3xl" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-4">
                        <div className="h-8 bg-slate-200 rounded w-3/4" />
                        <div className="h-4 bg-slate-200 rounded w-full" />
                        <div className="h-4 bg-slate-200 rounded w-5/6" />
                    </div>
                    <div className="h-64 bg-slate-200 rounded-2xl" />
                </div>
            </div>
        )
    }

    if (isError || !item) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
                <BedDouble size={56} className="text-slate-300 mb-4" />
                <h2 className="text-2xl font-bold text-slate-800 font-serif">Suite Not Found</h2>
                <p className="text-slate-500 text-sm mt-1 max-w-md">
                    The room category you are looking for may have been removed or the ID is invalid.
                </p>
                <Link to="/" className="btn btn-primary rounded-xl text-white mt-6 gap-2">
                    <ArrowLeft size={16} /> Back to All Suites
                </Link>
            </div>
        )
    }

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

                {/* Main Photo / Video Hero Gallery */}
                <div className="space-y-3">
                    <div className="relative h-[360px] sm:h-[500px] md:h-[560px] rounded-3xl overflow-hidden bg-slate-900 shadow-md border border-slate-200">
                        {currentGalleryItem?.type === "video" ? (
                            <iframe
                                src={currentGalleryItem.src}
                                title={`${item.name} video`}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                            />
                        ) : currentGalleryItem?.src ? (
                            <img 
                                src={currentGalleryItem.src} 
                                alt={item.name} 
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-800">
                                <BedDouble size={56} />
                                <span className="text-sm mt-2">Miami Beach Resort</span>
                            </div>
                        )}

                        {/* Top Badges */}
                        <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-10">
                            <span className="badge badge-md bg-slate-900/80 backdrop-blur-md text-white border-none font-semibold">
                                {item.name}
                            </span>
                            {roomNumbers.length > 0 && (
                                <span className="badge badge-md bg-teal-600/90 backdrop-blur-md text-white border-none font-semibold">
                                    {roomNumbers.length} Rooms Available
                                </span>
                            )}
                        </div>

                        {/* Arrows for multi-photo */}
                        {galleryItems.length > 1 && (
                            <>
                                <button 
                                    onClick={() => setSelectedImgIndex((selectedImgIndex - 1 + galleryItems.length) % galleryItems.length)}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/70 text-white flex items-center justify-center hover:bg-slate-900 transition-colors shadow-lg z-10"
                                >
                                    <ChevronLeft size={22} />
                                </button>
                                <button 
                                    onClick={() => setSelectedImgIndex((selectedImgIndex + 1) % galleryItems.length)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/70 text-white flex items-center justify-center hover:bg-slate-900 transition-colors shadow-lg z-10"
                                >
                                    <ChevronRight size={22} />
                                </button>
                                <div className="absolute bottom-4 left-4 bg-slate-900/75 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-bold text-white z-10">
                                    {selectedImgIndex + 1} / {galleryItems.length}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Thumbnail Strip */}
                    {galleryItems.length > 1 && (
                        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1">
                            {galleryItems.map((gItem, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedImgIndex(idx)}
                                    className={`relative w-20 h-16 sm:w-28 sm:h-20 rounded-2xl overflow-hidden shrink-0 border-2 transition-all ${
                                        selectedImgIndex === idx ? "border-teal-600 ring-2 ring-teal-500/20 scale-102" : "border-slate-200 opacity-70 hover:opacity-100"
                                    }`}
                                >
                                    {gItem.thumb ? (
                                        <img src={gItem.thumb} alt={`Thumb ${idx}`} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-800" />
                                    )}
                                    {gItem.type === "video" && (
                                        <span className="absolute inset-0 flex items-center justify-center bg-slate-900/40 text-white text-[10px] font-bold uppercase tracking-wider">
                                            Video
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Details Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Info, Amenities, Description */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-wider text-teal-600">Miami Beach Resort</span>
                                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif mt-1">{item.name}</h1>
                                </div>
                                <div className="text-left sm:text-right bg-teal-50 px-4 py-2 rounded-2xl border border-teal-100/80">
                                    <p className="text-2xl font-bold text-teal-700">৳{Number(item.price).toLocaleString()}</p>
                                    <p className="text-xs text-slate-500">per night</p>
                                </div>
                            </div>

                            {item.description && (
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm mb-2">About This Suite</h3>
                                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{item.description}</p>
                                </div>
                            )}

                            {/* Amenities */}
                            {amenities.length > 0 && (
                                <div className="pt-4 border-t border-slate-100">
                                    <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-1.5">
                                        <Star size={16} className="text-amber-500" /> Amenities & Facilities
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {amenities.map(a => (
                                            <span key={a} className="badge badge-md bg-teal-50 text-teal-700 border border-teal-200/70 font-semibold px-3 py-1.5">
                                                {a}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>


                    </div>

                    {/* Right: Booking Sticky Card */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-md sticky top-6 space-y-5">
                            <div className="border-b border-slate-100 pb-4">
                                <span className="text-xs text-slate-400">Starting from</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-extrabold text-teal-700">৳{Number(item.price).toLocaleString()}</span>
                                    <span className="text-xs text-slate-500">/ night</span>
                                </div>
                            </div>

                            <div className="space-y-3 text-xs text-slate-600">
                                <div className="flex items-center gap-2">
                                    <Clock size={15} className="text-teal-600 shrink-0" />
                                    <span>Check-in: 1:00 PM | Check-out: 11:00 AM</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin size={15} className="text-teal-600 shrink-0" />
                                    <span>Dolphin Mor, Kolatoli, Cox's Bazar</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone size={15} className="text-teal-600 shrink-0" />
                                    <span>WhatsApp: +8801616472282</span>
                                </div>
                            </div>

                            <button
                                onClick={handleOpenBookingModal}
                                className="btn btn-primary w-full rounded-2xl gap-2 font-bold shadow-md shadow-teal-600/20 text-white text-sm"
                            >
                                <span>Book This Suite</span><ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── MULTI-ROOM BOOKING MODAL ── */}
            {bookingModalOpen && (
                <dialog open className="modal modal-open z-50">
                    <div className="modal-box w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl p-4 sm:p-7 shadow-2xl border border-slate-100">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                            <div className="min-w-0 pr-2">
                                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-teal-600 block">Reservation Form</span>
                                <h3 className="font-bold text-lg sm:text-xl font-serif text-slate-900 truncate">
                                    {bookingRooms.length > 1 ? `Booking ${bookingRooms.length} Rooms` : item?.name}
                                </h3>
                            </div>
                            <button onClick={handleCloseModal} className="btn btn-ghost btn-sm btn-circle shrink-0"><X size={18} /></button>
                        </div>

                        {/* Grand Total Summary */}
                        <div className="bg-teal-50/80 border border-teal-100 rounded-2xl p-3.5 sm:p-4 mb-5 text-xs">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <p className="font-bold text-teal-900 text-sm">
                                        {bookingRooms.length} Room{bookingRooms.length > 1 ? 's' : ''} Selected
                                    </p>
                                    <p className="text-teal-700 text-[11px] mt-0.5">
                                        Click "+ Add Room" to book multiple rooms in this reservation.
                                    </p>
                                </div>
                                <div className="font-bold text-sm text-teal-800 bg-white/80 px-3 py-1.5 rounded-xl border border-teal-200/60 text-right shrink-0">
                                    Total ৳{grandTotal.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        {/* Availability error */}
                        {availabilityMsg && !availabilityMsg.ok && (
                            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-xs text-red-700">
                                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-500" />
                                <p className="font-semibold leading-relaxed">{availabilityMsg.text}</p>
                            </div>
                        )}

                        <form onSubmit={onSubmit} className="space-y-5 text-xs sm:text-sm">
                            {/* Guest Details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
                                <div className="form-control">
                                    <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Guest Full Name <span className="text-red-500 font-bold">*</span></span></label>
                                    <input
                                        name="name" value={formData.name} onChange={handleInput}
                                        type="text" placeholder="Your full name"
                                        className={`input input-sm sm:input-md input-bordered w-full rounded-xl bg-white text-xs sm:text-sm ${formErrors.name ? "input-error" : ""}`}
                                    />
                                    {formErrors.name && <span className="text-error text-[11px] mt-0.5">{formErrors.name}</span>}
                                </div>
                                <div className="form-control">
                                    <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Mobile (WhatsApp) <span className="text-red-500 font-bold">*</span></span></label>
                                    <input
                                        name="mobile" value={formData.mobile} onChange={handleInput}
                                        type="tel" placeholder="+88017..."
                                        className={`input input-sm sm:input-md input-bordered w-full rounded-xl bg-white text-xs sm:text-sm ${formErrors.mobile ? "input-error" : ""}`}
                                    />
                                    {formErrors.mobile && <span className="text-error text-[11px] mt-0.5">{formErrors.mobile}</span>}
                                </div>
                            </div>

                            {/* Room Selection Section */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                        <BedDouble size={16} className="text-teal-600" />
                                        Room Details ({bookingRooms.length})
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={handleAddRoom}
                                        className="btn btn-xs sm:btn-sm btn-primary rounded-xl gap-1 text-white shadow-xs"
                                    >
                                        <Plus size={14} /> Add Room
                                    </button>
                                </div>

                                {formErrors.rooms && <p className="text-error text-[11px]">{formErrors.rooms}</p>}

                                {/* Room Items List */}
                                <div className="space-y-3.5">
                                    {bookingRooms.map((entry, index) => {
                                        const nights = getRoomNights(entry)
                                        const roomTotal = getRoomTotal(entry)
                                        const currentCat = categories.find(c => c._id === entry.categoryId) || item

                                        return (
                                            <div
                                                key={entry.itemId}
                                                className="rounded-2xl border border-teal-100 bg-teal-50/30 p-4 space-y-3 transition-all"
                                            >
                                                {/* Room Header */}
                                                <div className="flex items-center justify-between pb-2 border-b border-teal-100/70">
                                                    <div className="flex items-center gap-2">
                                                        <span className="badge badge-sm bg-teal-600 text-white font-bold">
                                                            Room {index + 1}
                                                        </span>
                                                        <span className="font-bold text-slate-800 text-xs">
                                                            {currentCat?.name || "Select Category"}
                                                        </span>
                                                    </div>
                                                    {bookingRooms.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveRoom(entry.itemId)}
                                                            className="btn btn-xs btn-ghost text-red-500 hover:bg-red-50 rounded-lg gap-1"
                                                            title="Remove Room"
                                                        >
                                                            <Trash2 size={13} /> Remove
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Field 1: Category Dropdown & "Same category" Checkbox (only for additional rooms: index > 0) */}
                                                {index > 0 && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                                        <div className="form-control sm:col-span-8">
                                                            <label className="label py-0.5">
                                                                <span className="label-text font-semibold text-slate-700 text-xs">Category <span className="text-red-500 font-bold">*</span></span>
                                                            </label>
                                                            <select
                                                                value={entry.categoryId}
                                                                onChange={e => handleRoomChange(entry.itemId, { categoryId: e.target.value, sameCategory: false })}
                                                                disabled={entry.sameCategory}
                                                                className="select select-sm select-bordered w-full rounded-xl bg-white text-xs font-medium"
                                                            >
                                                                {categories.map(c => (
                                                                    <option key={c._id} value={c._id}>
                                                                        {c.name} — ৳{Number(c.price).toLocaleString()}/night
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            {formErrors[`category-${entry.itemId}`] && (
                                                                <span className="text-error text-[11px] mt-0.5">{formErrors[`category-${entry.itemId}`]}</span>
                                                            )}
                                                        </div>

                                                        {/* "Same category" Checkbox */}
                                                        <div className="sm:col-span-4 flex items-center sm:pt-6">
                                                            <label className="cursor-pointer flex items-center gap-2 text-xs font-semibold text-slate-700 select-none">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={entry.sameCategory}
                                                                    onChange={e => handleRoomChange(entry.itemId, { sameCategory: e.target.checked })}
                                                                    className="checkbox checkbox-xs checkbox-primary rounded"
                                                                />
                                                                <span>Same category</span>
                                                            </label>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Field 2 & 3: Check-In & Check-Out */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div className="form-control">
                                                        <label className="label py-0.5">
                                                            <span className="label-text font-semibold text-slate-700 text-xs">Check-In <span className="text-red-500 font-bold">*</span></span>
                                                        </label>
                                                        <DatePicker
                                                            selected={entry.checkInDate}
                                                            onChange={date => handleRoomChange(entry.itemId, { checkInDate: date })}
                                                            minDate={new Date()}
                                                            placeholderText="Select check-in date"
                                                            dateFormat="dd MMM yyyy"
                                                            className={`input input-sm input-bordered w-full rounded-xl bg-white text-xs cursor-pointer ${formErrors[`checkIn-${entry.itemId}`] ? "input-error" : ""}`}
                                                            wrapperClassName="w-full"
                                                            autoComplete="off"
                                                        />
                                                        {formErrors[`checkIn-${entry.itemId}`] && (
                                                            <span className="text-error text-[11px] mt-0.5">{formErrors[`checkIn-${entry.itemId}`]}</span>
                                                        )}
                                                    </div>

                                                    <div className="form-control">
                                                        <label className="label py-0.5">
                                                            <span className="label-text font-semibold text-slate-700 text-xs">Check-Out <span className="text-red-500 font-bold">*</span></span>
                                                        </label>
                                                        <DatePicker
                                                            selected={entry.checkOutDate}
                                                            onChange={date => handleRoomChange(entry.itemId, { checkOutDate: date })}
                                                            minDate={entry.checkInDate ? addDays(entry.checkInDate, 1) : addDays(new Date(), 1)}
                                                            placeholderText="Select check-out date"
                                                            dateFormat="dd MMM yyyy"
                                                            className={`input input-sm input-bordered w-full rounded-xl bg-white text-xs cursor-pointer ${formErrors[`checkOut-${entry.itemId}`] ? "input-error" : ""}`}
                                                            wrapperClassName="w-full"
                                                            autoComplete="off"
                                                            disabled={!entry.checkInDate}
                                                        />
                                                        {formErrors[`checkOut-${entry.itemId}`] && (
                                                            <span className="text-error text-[11px] mt-0.5">{formErrors[`checkOut-${entry.itemId}`]}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Field 4 & 5: Adults & Children */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="form-control">
                                                        <label className="label py-0.5">
                                                            <span className="label-text font-semibold text-slate-700 text-xs">Adults</span>
                                                        </label>
                                                        <input
                                                            type="number" min="0" value={entry.adults !== undefined ? entry.adults : ''}
                                                            placeholder="0"
                                                            onChange={e => handleRoomChange(entry.itemId, { adults: e.target.value })}
                                                            className="input input-sm input-bordered w-full rounded-xl bg-white text-xs"
                                                        />
                                                    </div>
                                                    <div className="form-control">
                                                        <label className="label py-0.5">
                                                            <span className="label-text font-semibold text-slate-700 text-xs">Children</span>
                                                        </label>
                                                        <input
                                                            type="number" min="0" value={entry.children !== undefined ? entry.children : (entry.babies || '')}
                                                            placeholder="0"
                                                            onChange={e => handleRoomChange(entry.itemId, { babies: e.target.value, children: e.target.value })}
                                                            className="input input-sm input-bordered w-full rounded-xl bg-white text-xs"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Room Subtotal */}
                                                <div className="flex items-center justify-between text-[11px] text-slate-600 border-t border-teal-100/60 pt-2">
                                                    <span>{nights} night{nights === 1 ? "" : "s"} × ৳{getRoomPrice(entry).toLocaleString()}</span>
                                                    <span className="font-bold text-teal-800">৳{roomTotal.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Address */}
                            <div className="form-control">
                                <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Address</span></label>
                                <textarea
                                    name="address" value={formData.address} onChange={handleInput}
                                    placeholder="Guest address"
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
                                    {isSubmitting ? <span className="loading loading-spinner loading-sm" /> : `Confirm Reservation (৳${grandTotal.toLocaleString()})`}
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
