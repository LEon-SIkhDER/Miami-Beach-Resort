import React, { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { addDays } from 'date-fns'
import toast from 'react-hot-toast'
import { showSuccessAlert, showErrorAlert } from '../../utils/customSwal'
import { saveGuestBookingId } from '../../utils/bookingUtils'
import logo from '../../assets/logo.png'
import { 
    BedDouble, 
    Calendar, 
    Users, 
    ShieldCheck, 
    Phone, 
    Clock, 
    Sparkles, 
    MapPin, 
    ArrowRight,
    X,
    ChevronLeft,
    ChevronRight,
    Search,
    Star,
    Image as ImageIcon,
    Video,
    AlertTriangle,
    Plus,
    Trash2,
    Car,
    Wifi,
    HeartHandshake,
    CheckCircle2,
    Waves,
    Wind,
    Droplets,
    Zap,
    Building,
    Check
} from 'lucide-react'
import { parseFacilityList, parseRoomNumbers } from '../Dashboard/Category&Pricing/categoryRoomUtils'

// Demo luxury resort banner image (easily replaceable with authentic resort photo)
const HERO_BANNER_IMG = "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2000&auto=format&fit=crop"

// Format Date object to "YYYY-MM-DD"
const formatLocalDate = (date) => {
    if (!date) return ''
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

const createRoomEntry = (initialCategoryId = "", initialSameCategory = false, initialCheckIn = null, initialCheckOut = null, initialAdults = '') => ({
    itemId: `room-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    categoryId: initialCategoryId,
    sameCategory: initialSameCategory,
    checkInDate: initialCheckIn,
    checkOutDate: initialCheckOut,
    adults: initialAdults,
    babies: 0,
})

// The 10 specific services requested by user (Icon & Name only)
const resortServices = [
    { id: "pool", title: "Swimming Pool Access", icon: <Waves size={24} className="text-[#dfc89e]" /> },
    { id: "ac", title: "AC Rooms", icon: <Wind size={24} className="text-[#dfc89e]" /> },
    { id: "washroom", title: "Modern Washroom", icon: <Droplets size={24} className="text-[#dfc89e]" /> },
    { id: "wifi", title: "Free WiFi", icon: <Wifi size={24} className="text-[#dfc89e]" /> },
    { id: "toiletries", title: "Complimentary Water & Toiletries", icon: <Sparkles size={24} className="text-[#dfc89e]" /> },
    { id: "lift", title: "Lift Available", icon: <Building size={24} className="text-[#dfc89e]" /> },
    { id: "parking", title: "Free Parking", icon: <Car size={24} className="text-[#dfc89e]" /> },
    { id: "generator", title: "Generator Backup", icon: <Zap size={24} className="text-[#dfc89e]" /> },
    { id: "housekeeping", title: "24/7 Housekeeping", icon: <HeartHandshake size={24} className="text-[#dfc89e]" /> },
    { id: "security", title: "100% Security Hotel", icon: <ShieldCheck size={24} className="text-[#dfc89e]" /> }
]

const Home = () => {
    const SERVER_URL = import.meta.env.VITE_SERVER_URL || ""

    // State for booking modal & room selections
    const [selectedCategory, setSelectedCategory] = useState(null)
    const [bookingModalOpen, setBookingModalOpen] = useState(false)
    const [bookingRooms, setBookingRooms] = useState([])
    const [activeImageIndices, setActiveImageIndices] = useState({})
    const [formData, setFormData] = useState({ name: '', mobile: '', address: '' })
    const [formErrors, setFormErrors] = useState({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [availabilityMsg, setAvailabilityMsg] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')

    // Hero quick booking bar state
    const [heroCheckIn, setHeroCheckIn] = useState(new Date())
    const [heroCheckOut, setHeroCheckOut] = useState(addDays(new Date(), 1))
    const [heroCategory, setHeroCategory] = useState("")
    const [heroAdults, setHeroAdults] = useState("2")

    // Fetch categories safely
    const { data: rawCategories = [], isLoading: categoriesLoading } = useQuery({
        queryKey: ["public-categories"],
        queryFn: async () => {
            if (!SERVER_URL) return []
            try {
                const res = await axios.get(`${SERVER_URL}/categoryandroom`)
                return Array.isArray(res.data) ? res.data : []
            } catch (err) {
                console.error("Categories fetch error:", err)
                return []
            }
        }
    })

    const categories = Array.isArray(rawCategories) ? rawCategories : []

    const filteredCategories = categories.filter(cat => {
        if (!cat) return false
        if (categoryFilter && cat.name !== categoryFilter) return false
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            return cat.name?.toLowerCase().includes(q) ||
                   cat.amenities?.toLowerCase().includes(q) ||
                   cat.description?.toLowerCase().includes(q)
        }
        return true
    })

    const getRoomNights = (item) => {
        if (!item.checkInDate || !item.checkOutDate) return 0
        const n = Math.ceil((item.checkOutDate - item.checkInDate) / (1000 * 60 * 60 * 24))
        return n > 0 ? n : 0
    }

    const getRoomPrice = (item) => {
        const cat = categories.find(c => c._id === item.categoryId) || selectedCategory
        return Number(cat?.price || 0)
    }

    const getRoomTotal = (item) => {
        return getRoomNights(item) * getRoomPrice(item)
    }

    const grandTotal = bookingRooms.reduce((sum, item) => sum + getRoomTotal(item), 0)

    const handleOpenBookingModal = (category, prefilledDates = null) => {
        const cat = category || categories[0] || null
        setSelectedCategory(cat)
        
        const initialCheckIn = prefilledDates?.checkIn || heroCheckIn || null
        const initialCheckOut = prefilledDates?.checkOut || heroCheckOut || (initialCheckIn ? addDays(initialCheckIn, 1) : null)
        const initialAdults = prefilledDates?.adults !== undefined ? prefilledDates.adults : (heroAdults || '2')

        setBookingRooms([createRoomEntry(cat?._id || "", false, initialCheckIn, initialCheckOut, initialAdults)])
        setFormData({ name: '', mobile: '', address: '' })
        setFormErrors({})
        setAvailabilityMsg(null)
        setBookingModalOpen(true)
    }

    const handleHeroBookingSubmit = (e) => {
        e.preventDefault()
        const targetCat = categories.find(c => c._id === heroCategory) || categories[0] || null
        handleOpenBookingModal(targetCat, {
            checkIn: heroCheckIn,
            checkOut: heroCheckOut,
            adults: heroAdults
        })
    }

    const handleCloseModal = () => {
        setBookingModalOpen(false)
        setSelectedCategory(null)
        setBookingRooms([])
        setAvailabilityMsg(null)
    }

    const handleAddRoom = () => {
        const defaultCatId = selectedCategory?._id || categories[0]?._id || ""
        const firstRoom = bookingRooms[0]
        setBookingRooms(prev => [...prev, createRoomEntry(
            defaultCatId, 
            true, 
            firstRoom?.checkInDate || null, 
            firstRoom?.checkOutDate || null, 
            firstRoom?.adults || '2'
        )])
    }

    const handleRemoveRoom = (itemId) => {
        if (bookingRooms.length <= 1) return
        setBookingRooms(prev => prev.filter(r => r.itemId !== itemId))
        setAvailabilityMsg(null)
    }

    const handleRoomChange = (itemId, changes) => {
        setBookingRooms(prev => prev.map(item => {
            if (item.itemId !== itemId) return item
            const next = { ...item, ...changes }
            if (changes.sameCategory !== undefined) {
                if (changes.sameCategory) {
                    next.categoryId = selectedCategory?._id || categories[0]?._id || ""
                }
            }
            if (changes.checkInDate && next.checkOutDate && changes.checkInDate >= next.checkOutDate) {
                next.checkOutDate = addDays(changes.checkInDate, 1)
            }
            return next
        }))
        setAvailabilityMsg(null)
    }

    const handleInput = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
        setFormErrors(prev => ({ ...prev, [e.target.name]: '' }))
    }

    const handleNextImage = (e, id, total) => {
        e.stopPropagation()
        setActiveImageIndices(prev => ({ ...prev, [id]: ((prev[id] || 0) + 1) % total }))
    }
    const handlePrevImage = (e, id, total) => {
        e.stopPropagation()
        setActiveImageIndices(prev => ({ ...prev, [id]: ((prev[id] || 0) - 1 + total) % total }))
    }

    const validate = () => {
        const errs = {}
        if (!formData.name.trim()) errs.name = 'Full Name is required'
        if (!formData.mobile.trim()) errs.mobile = 'Mobile (WhatsApp) number is required'
        if (!bookingRooms.length) errs.rooms = 'At least 1 room is required'

        bookingRooms.forEach((item, index) => {
            if (!item.categoryId) errs[`category-${item.itemId}`] = `Select category for Room ${index + 1}`
            if (!item.checkInDate) errs[`checkIn-${item.itemId}`] = `Select check-in date for Room ${index + 1}`
            if (!item.checkOutDate) errs[`checkOut-${item.itemId}`] = `Select check-out date for Room ${index + 1}`
            if (item.checkInDate && item.checkOutDate && item.checkOutDate <= item.checkInDate) {
                errs[`checkOut-${item.itemId}`] = 'Check-out must be after check-in'
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

        // Verify availability for each selected room
        for (let i = 0; i < bookingRooms.length; i++) {
            const item = bookingRooms[i]
            const cat = categories.find(c => c._id === item.categoryId) || selectedCategory
            const checkIn = formatLocalDate(item.checkInDate)
            const checkOut = formatLocalDate(item.checkOutDate)

            try {
                const availRes = await axios.get(`${SERVER_URL}/check-category-availability`, {
                    params: { categoryId: item.categoryId, checkIn, checkOut }
                })
                if (!availRes.data.available) {
                    setAvailabilityMsg({ 
                        ok: false, 
                        text: `Room ${i + 1} (${cat?.name || "Category"}): ${availRes.data.message}` 
                    })
                    setIsSubmitting(false)
                    return
                }
            } catch (_) {
                // fallback graceful
            }
        }

        const normalizedRooms = bookingRooms.map(item => {
            const cat = categories.find(c => c._id === item.categoryId) || selectedCategory
            return {
                roomId: item.categoryId,
                categoryId: item.categoryId,
                categoryName: cat?.name || "Category",
                checkIn: formatLocalDate(item.checkInDate),
                checkOut: formatLocalDate(item.checkOutDate),
                adults: item.adults !== '' && item.adults !== undefined ? Number(item.adults) : 0,
                babies: Number(item.babies || 0),
                pricePerNight: Number(cat?.price || 0),
                nights: getRoomNights(item)
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
            if (res.data?.bookingId) {
                saveGuestBookingId(res.data.bookingId)
            }
            const roomLines = normalizedRooms.map((r, index) => [
                `Room ${index + 1}: ${r.categoryName}`,
                `Dates: ${r.checkIn} to ${r.checkOut} (${r.nights} night${r.nights === 1 ? '' : 's'})`,
                `Guests: ${r.adults} adults${r.babies > 0 ? `, ${r.babies} babies` : ""}`,
                `Rate: ৳${r.pricePerNight.toLocaleString()}/night`
            ].join("\n")).join("\n\n")

            const whatsappMsg = [
                "👑 RESERVATION REQUEST",
                "Miami Beach Resort — Cox's Bazar",
                "",
                `Booking ID: ${res.data.bookingId}`,
                `Guest Name: ${formData.name}`,
                `Mobile: ${formData.mobile}`,
                `Address: ${formData.address || "N/A"}`,
                "",
                `Total Rooms Booked: ${normalizedRooms.length}`,
                "",
                roomLines,
                "",
                `Grand Total: ৳${grandTotal.toLocaleString()}`,
            ].join("\n")

            window.open(`https://wa.me/8801616472282?text=${encodeURIComponent(whatsappMsg)}`, "_blank", "noopener,noreferrer")
            handleCloseModal()
            showSuccessAlert(
                "Reservation Confirmed! 👑",
                "",
                `<div class="space-y-2 text-left bg-[#03221b] text-white p-5 rounded-2xl border border-[#c5a880]/30 mt-3 text-xs sm:text-sm">
                    <p class="border-b border-[#c5a880]/20 pb-2"><strong>Booking ID:</strong> <span class="font-mono text-[#dfc89e] font-bold text-sm">${res.data.bookingId}</span></p>
                    <p><strong>Guest:</strong> ${formData.name}</p>
                    <p><strong>Rooms:</strong> ${normalizedRooms.length}</p>
                    <p><strong>Grand Total:</strong> <span class="text-[#dfc89e] font-bold">৳${grandTotal.toLocaleString()}</span></p>
                 </div>
                 <p class="mt-3 text-xs text-slate-600">We will connect with you on WhatsApp at <strong>+8801616472282</strong> to finalize your check-in.</p>`
            )
        } catch (err) {
            showErrorAlert("Booking Failed", err.response?.data?.message || "Failed to submit booking. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#fcfbf9] text-slate-800 overflow-x-hidden selection:bg-[#c5a880]/30 selection:text-[#03221b]">
            
            {/* ══════════════════════════════════════════════════════
                1. HERO / BANNER SECTION
            ══════════════════════════════════════════════════════ */}
            <section className="relative bg-[#021813] text-white pt-20 pb-24 sm:pt-28 sm:pb-32 px-4 sm:px-6 lg:px-8 border-b border-[#c5a880]/20 overflow-hidden">
                {/* Background Hero Image */}
                <div 
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
                    style={{ 
                        backgroundImage: `url(${HERO_BANNER_IMG})` 
                    }}
                />

                {/* Multi-layered imperial emerald & midnight dark gradient overlay for crystal-clear readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#021813]/90 via-[#03221b]/80 to-[#021813]/95 backdrop-blur-[1px]" />

                {/* Subtle radial luxury pattern backdrop */}
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#c5a880_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#04261f]/50 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 max-w-5xl mx-auto text-center space-y-6">
                    
                    {/* Royal Badge */}
                    <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#03221b]/80 border border-[#c5a880]/40 text-[#dfc89e] text-xs font-semibold uppercase tracking-[0.25em] backdrop-blur-md shadow-lg">
                        <Sparkles size={14} className="text-[#c5a880]" />
                        <span>Luxury Sea View Living • Cox's Bazar</span>
                    </div>

                    {/* Logo & Headline */}
                    <div className="flex flex-col items-center justify-center gap-4">
                        <img 
                            src={logo} 
                            alt="Miami Beach Resort" 
                            className="h-16 sm:h-20 w-auto object-contain drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]" 
                        />
                        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif font-extrabold tracking-tight text-white leading-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
                            Miami Beach Resort
                        </h1>
                    </div>

                    <p className="text-sm sm:text-base md:text-lg text-slate-200 max-w-2xl mx-auto font-light leading-relaxed px-2 drop-shadow-md">
                        Enjoy prime beachfront comfort, ocean breeze, and premium hospitality at Dolphin Mor, Kolatoli Beach, Cox's Bazar.
                    </p>

                    {/* Key Resort Contact Badges */}
                    <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 pt-1 text-xs text-slate-200">
                        <a 
                            href="https://maps.google.com/?q=Miami+Beach+Resort+Cox's+Bazar"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 bg-[#03221b]/80 hover:bg-[#042e25] px-3.5 py-1.5 rounded-xl border border-[#c5a880]/40 hover:border-[#dfc89e] backdrop-blur-md shadow-md transition-all cursor-pointer group"
                            title="Open in Google Maps"
                        >
                            <MapPin size={14} className="text-[#dfc89e] shrink-0 group-hover:scale-110 transition-transform" />
                            <span className="group-hover:text-white">Dolphin Mor, Kolatoli</span>
                        </a>
                        <span className="flex items-center gap-1.5 bg-[#03221b]/80 px-3.5 py-1.5 rounded-xl border border-[#c5a880]/40 backdrop-blur-md shadow-md">
                            <Clock size={14} className="text-[#dfc89e] shrink-0" /> Check-in 1:00 PM | Out 11:00 AM
                        </span>
                        <a 
                            href="https://wa.me/8801616472282?text=Hello%20Miami%20Beach%20Resort%2C%20I%20would%20like%20to%20inquire%20about%20room%20availability."
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 bg-[#03221b]/80 hover:bg-[#042e25] px-3.5 py-1.5 rounded-xl border border-[#c5a880]/40 hover:border-[#dfc89e] backdrop-blur-md shadow-md transition-all cursor-pointer group"
                            title="Chat on WhatsApp"
                        >
                            <Phone size={14} className="text-[#dfc89e] shrink-0 group-hover:scale-110 transition-transform" />
                            <span className="group-hover:text-white">+8801616472282</span>
                        </a>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
                        <button
                            onClick={() => handleOpenBookingModal(categories[0])}
                            className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-gradient-to-r from-[#dfc89e] via-[#c5a880] to-[#ad8a57] text-[#03221b] font-serif font-bold text-xs uppercase tracking-wider shadow-xl hover:brightness-110 transition-all cursor-pointer"
                        >
                            <span>Book Your Stay</span>
                            <ArrowRight size={15} />
                        </button>
                        <a
                            href="#rooms"
                            className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#03221b]/70 hover:bg-[#03221b]/90 text-[#f5ebd7] font-semibold text-xs tracking-wider uppercase border border-[#c5a880]/40 backdrop-blur-md transition-all cursor-pointer shadow-lg"
                        >
                            <span>Explore Rooms</span>
                        </a>
                    </div>
                </div>
            </section>

            {/* ── FLOATING OVERLAPPING QUICK BOOKING / AVAILABILITY BAR ── */}
            <div className="relative z-30 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 sm:-mt-16">
                <div className="bg-[#03221b] border border-[#c5a880]/50 rounded-3xl p-4 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
                    <form onSubmit={handleHeroBookingSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end text-xs">
                        
                        {/* Check-In */}
                        <div className="lg:col-span-3 space-y-1">
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#dfc89e]">
                                Check-In Date
                            </label>
                            <DatePicker
                                selected={heroCheckIn}
                                onChange={(date) => {
                                    setHeroCheckIn(date)
                                    if (heroCheckOut && date >= heroCheckOut) {
                                        setHeroCheckOut(addDays(date, 1))
                                    }
                                }}
                                minDate={new Date()}
                                dateFormat="dd MMM yyyy"
                                placeholderText="Select Check-In"
                                className="w-full bg-[#021813] text-white border border-[#c5a880]/30 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:border-[#dfc89e] focus:outline-none cursor-pointer"
                                wrapperClassName="w-full"
                                calendarClassName="booking-calendar"
                            />
                        </div>

                        {/* Check-Out */}
                        <div className="lg:col-span-3 space-y-1">
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#dfc89e]">
                                Check-Out Date
                            </label>
                            <DatePicker
                                selected={heroCheckOut}
                                onChange={(date) => setHeroCheckOut(date)}
                                minDate={heroCheckIn ? addDays(heroCheckIn, 1) : addDays(new Date(), 1)}
                                dateFormat="dd MMM yyyy"
                                placeholderText="Select Check-Out"
                                className="w-full bg-[#021813] text-white border border-[#c5a880]/30 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:border-[#dfc89e] focus:outline-none cursor-pointer"
                                wrapperClassName="w-full"
                                calendarClassName="booking-calendar"
                            />
                        </div>

                        {/* Suite Category Selection */}
                        <div className="lg:col-span-3 space-y-1">
                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#dfc89e]">
                                Room Category
                            </label>
                            <select
                                value={heroCategory}
                                onChange={(e) => setHeroCategory(e.target.value)}
                                className="w-full bg-[#021813] text-white border border-[#c5a880]/30 rounded-xl px-3.5 py-2.5 text-xs font-medium focus:border-[#dfc89e] focus:outline-none cursor-pointer"
                            >
                                <option value="">All Room Categories</option>
                                {categories.map(c => (
                                    <option key={c._id} value={c._id}>
                                        {c.name} (৳{Number(c.price).toLocaleString()})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Submit Button */}
                        <div className="lg:col-span-3">
                            <button
                                type="submit"
                                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#dfc89e] via-[#c5a880] to-[#b38728] text-[#03221b] font-bold text-xs uppercase tracking-wider shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <span>Check & Book</span>
                                <ArrowRight size={14} />
                            </button>
                        </div>

                    </form>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════
                2. ROOM / CATEGORY SECTION (#rooms)
            ══════════════════════════════════════════════════════ */}
            <section id="rooms" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 sm:pt-16 sm:pb-24">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div>
                        <div className="inline-flex items-center gap-1.5 text-[#04261f] font-bold text-xs uppercase tracking-wider bg-[#c5a880]/20 px-3 py-1 rounded-full border border-[#c5a880]/40 mb-1.5">
                            <BedDouble size={14} className="text-[#04261f]" /> Room Categories
                        </div>
                        <h2 className="text-2xl sm:text-4xl font-serif font-bold text-[#03221b] tracking-tight">
                            Choose and Book Your Suite
                        </h2>
                    </div>

                    {/* Search & Filter Bar */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className="relative flex-1 sm:flex-initial">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search categories..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#04261f] w-full sm:w-60 shadow-xs"
                            />
                        </div>
                        <select
                            className="py-2 px-4 bg-white rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#04261f] shadow-xs cursor-pointer"
                            value={categoryFilter}
                            onChange={e => setCategoryFilter(e.target.value)}
                        >
                            <option value="">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat._id} value={cat.name}>{cat.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Category Grid */}
                {categoriesLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {[1, 2, 3].map(n => (
                            <div key={n} className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm animate-pulse flex flex-col">
                                <div className="h-60 bg-slate-200" />
                                <div className="p-5 space-y-3">
                                    <div className="h-6 bg-slate-200 rounded w-3/4" />
                                    <div className="h-3.5 bg-slate-200 rounded w-full" />
                                    <div className="h-9 bg-slate-200 rounded-2xl w-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredCategories.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-2">
                        <BedDouble size={48} className="mx-auto text-slate-300 mb-2" />
                        <h3 className="text-lg font-bold text-slate-700">No categories match your search</h3>
                        <p className="text-xs text-slate-500">Try adjusting your filters.</p>
                        {(searchQuery || categoryFilter) && (
                            <button
                                onClick={() => { setSearchQuery(''); setCategoryFilter('') }}
                                className="btn btn-sm btn-ghost text-[#04261f] underline mt-2 cursor-pointer font-bold"
                            >
                                Reset filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {filteredCategories.map(cat => {
                            const photos = cat.images?.length
                                ? cat.images.map(img => typeof img === 'string' ? img : img.url)
                                : cat.imageUrl ? [cat.imageUrl] : []
                            const currentIdx = activeImageIndices[cat._id] || 0
                            const currentImgSrc = photos[currentIdx]
                            const amenities = parseFacilityList(cat.amenities || "")
                            const roomNums = parseRoomNumbers(cat.roomNumbers || [])

                            return (
                                <div 
                                    key={cat._id} 
                                    className="group bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl royal-card-hover flex flex-col justify-between"
                                >
                                    <div>
                                        {/* Photo & Click to details */}
                                        <Link to={`/room/${cat._id}`} className="relative h-60 sm:h-64 bg-slate-100 overflow-hidden select-none block">
                                            {currentImgSrc ? (
                                                <img 
                                                    src={currentImgSrc} 
                                                    alt={cat.name} 
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                                                    <ImageIcon size={40} /><span className="text-xs mt-1 font-medium font-serif">Miami Beach Resort</span>
                                                </div>
                                            )}

                                            {/* Badges */}
                                            <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                                                <span className="badge badge-sm bg-[#04261f]/90 backdrop-blur-md text-[#dfc89e] border-none font-semibold text-[10px]">
                                                    {cat.name}
                                                </span>
                                                {roomNums.length > 0 && (
                                                    <span className="badge badge-sm bg-[#064e3b]/90 backdrop-blur-md text-white border-none font-semibold text-[10px]">
                                                        {roomNums.length} Room{roomNums.length > 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>

                                            {cat.video && (
                                                <span className="absolute top-3 right-3 badge badge-sm bg-[#04261f] text-[#dfc89e] border border-[#c5a880]/40 gap-1 z-10">
                                                    <Video size={11} /> Video
                                                </span>
                                            )}

                                            {/* Carousel nav */}
                                            {photos.length > 1 && (
                                                <>
                                                    <button 
                                                        onClick={e => handlePrevImage(e, cat._id, photos.length)} 
                                                        className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#021813]/70 text-white flex items-center justify-center hover:bg-[#04261f] transition-colors z-10 cursor-pointer"
                                                    >
                                                        <ChevronLeft size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={e => handleNextImage(e, cat._id, photos.length)} 
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#021813]/70 text-white flex items-center justify-center hover:bg-[#04261f] transition-colors z-10 cursor-pointer"
                                                    >
                                                        <ChevronRight size={16} />
                                                    </button>
                                                    <div className="absolute bottom-3 left-3 bg-[#021813]/70 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-bold text-white z-10">
                                                        {currentIdx + 1} / {photos.length}
                                                    </div>
                                                </>
                                            )}

                                            {/* Price tag */}
                                            <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-xl shadow-md font-bold text-slate-900 text-xs sm:text-sm z-10">
                                                ৳{Number(cat.price).toLocaleString()} <span className="text-[10px] font-normal text-slate-500">/ night</span>
                                            </div>
                                        </Link>

                                        {/* Content */}
                                        <div className="p-5 sm:p-6 space-y-3">
                                            <Link to={`/room/${cat._id}`}>
                                                <h3 className="text-lg sm:text-xl font-bold text-slate-900 font-serif group-hover:text-[#064e3b] transition-colors">
                                                    {cat.name}
                                                </h3>
                                            </Link>
                                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-light">
                                                {cat.description || "Comfortable room with modern amenities and sea breeze."}
                                            </p>

                                            {/* Amenities */}
                                            {amenities.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 min-h-8">
                                                    {amenities.slice(0, 4).map(a => (
                                                        <span key={a} className="uppercase badge badge-sm bg-[#04261f]/5 text-[#04261f] border border-[#c5a880]/30 font-semibold text-[10px]">
                                                            {a}
                                                        </span>
                                                    ))}
                                                    {amenities.length > 4 && (
                                                        <span className="badge badge-sm bg-slate-100 text-slate-500 border-none font-medium text-[10px]">
                                                            +{amenities.length - 4}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Buttons: Details + Book Now */}
                                    <div className="p-5 sm:p-6 pt-0 flex items-center gap-2">
                                        <Link
                                            to={`/room/${cat._id}`}
                                            className="btn btn-outline border-slate-300 text-slate-700 hover:bg-slate-50 rounded-2xl text-xs sm:text-sm px-4"
                                        >
                                            Details
                                        </Link>
                                        <button
                                            onClick={() => handleOpenBookingModal(cat)}
                                            className="btn flex-1 rounded-2xl gap-1.5 font-bold shadow-sm bg-gradient-to-r from-[#dfc89e] via-[#c5a880] to-[#ad8a57] text-[#03221b] border-none hover:brightness-110 text-xs sm:text-sm cursor-pointer"
                                        >
                                            <span>Book Now</span>
                                            <ArrowRight size={15} />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

            </section>


            {/* ══════════════════════════════════════════════════════
                3. SERVICES SECTION (#services)
                (EXACTLY THE 10 SERVICES REQUESTED BY USER)
            ══════════════════════════════════════════════════════ */}
            <section id="services" className="bg-[#f5f1e8]/50 py-16 sm:py-20 border-t border-[#c5a880]/20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    
                    {/* Header */}
                    <div className="text-center max-w-2xl mx-auto space-y-2 mb-10">
                        <div className="inline-flex items-center gap-2 text-[#04261f] text-xs font-bold uppercase tracking-[0.25em] bg-[#c5a880]/20 px-3.5 py-1.5 rounded-full border border-[#c5a880]/40">
                            <Sparkles size={14} className="text-[#04261f]" /> Resort Amenities
                        </div>
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#03221b]">
                            Services & Facilities
                        </h2>
                    </div>

                    {/* 10 Services: Clean Icon & Service Name Only */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-5">
                        {resortServices.map((srv) => (
                            <div 
                                key={srv.id}
                                className="bg-white rounded-2xl p-4 sm:p-5 border border-[#c5a880]/30 shadow-xs hover:shadow-md royal-card-hover flex flex-col items-center justify-center text-center space-y-3 group"
                            >
                                <div className="w-12 h-12 rounded-xl bg-[#04261f] flex items-center justify-center border border-[#c5a880]/40 group-hover:scale-110 transition-transform shrink-0">
                                    {srv.icon}
                                </div>
                                <h3 className="text-xs sm:text-sm font-serif font-bold text-[#03221b] leading-snug">
                                    {srv.title}
                                </h3>
                            </div>
                        ))}
                    </div>

                </div>
            </section>


            {/* ══════════════════════════════════════════════════════
                4. LOCATION & CONCIERGE / GOOGLE MAP SECTION (#contact)
            ══════════════════════════════════════════════════════ */}
            <section id="contact" className="relative bg-[#f7f4ed] text-slate-800 py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-[#c5a880]/25 overflow-hidden">
                {/* Subtle radial luxury pattern backdrop */}
                <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#c5a880_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none"></div>

                <div className="relative z-10 max-w-7xl mx-auto">
                    
                    {/* Section Header */}
                    <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14 space-y-3">
                        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#c5a880]/20 border border-[#c5a880]/50 text-[#04261f] text-xs font-bold uppercase tracking-[0.25em] shadow-xs">
                            <MapPin size={13} className="text-[#04261f]" />
                            <span>Prime Beachfront Location</span>
                        </div>
                        <h2 className="text-2xl sm:text-4xl font-serif font-bold text-[#03221b] tracking-tight">
                            Find Us & Connect
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-600 font-light leading-relaxed">
                            Located right at Dolphin Mor, Kolatoli Beach — moments away from the soothing waves and sea breeze of Cox's Bazar.
                        </p>
                    </div>

                    {/* Content Grid: Contact Details & Direct Actions (Left) + Interactive Map (Right) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                        
                        {/* LEFT COLUMN: Resort Details & Action Buttons */}
                        <div className="lg:col-span-5 flex flex-col justify-between space-y-6 bg-white border border-[#c5a880]/40 rounded-3xl p-6 sm:p-8 shadow-xl">
                            
                            <div className="space-y-5">
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9a7b52]">
                                        Resort Location
                                    </span>
                                    <h3 className="font-serif font-bold text-xl sm:text-2xl text-[#03221b] mt-1">
                                        Miami Beach Resort
                                    </h3>
                                    <p className="text-xs sm:text-sm text-slate-600 font-light mt-1 flex items-start gap-2">
                                        <MapPin size={16} className="text-[#04261f] shrink-0 mt-0.5" />
                                        <span>Dolphin Mor, Kolatoli Beach Road, Cox's Bazar 4700, Bangladesh</span>
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                    <div className="bg-[#fcfbf9] p-3.5 rounded-2xl border border-[#c5a880]/25 space-y-1">
                                        <span className="text-[10px] font-bold text-[#9a7b52] uppercase tracking-wider block">
                                            Front Desk
                                        </span>
                                        <span className="text-xs text-[#03221b] font-semibold flex items-center gap-1.5">
                                            <Clock size={13} className="text-[#04261f]" /> 24/7 Concierge
                                        </span>
                                    </div>
                                    <div className="bg-[#fcfbf9] p-3.5 rounded-2xl border border-[#c5a880]/25 space-y-1">
                                        <span className="text-[10px] font-bold text-[#9a7b52] uppercase tracking-wider block">
                                            Check-In / Out
                                        </span>
                                        <span className="text-xs text-[#03221b] font-semibold flex items-center gap-1.5">
                                            <Sparkles size={13} className="text-[#04261f]" /> In 1 PM | Out 11 AM
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Direct Action Buttons */}
                            <div className="space-y-3 pt-4 border-t border-[#c5a880]/20">
                                
                                {/* 1. WhatsApp Button */}
                                <a
                                    href="https://wa.me/8801616472282?text=Hello%20Miami%20Beach%20Resort%2C%20I%20would%20like%20to%20inquire%20about%20room%20booking%20and%20directions."
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full py-3.5 px-5 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                                >
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-5.805 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                                    </svg>
                                    <span>Chat on WhatsApp</span>
                                </a>

                                {/* 2. Direct Call & Map Links */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <a
                                        href="tel:+8801616472282"
                                        className="py-3 px-4 rounded-2xl bg-[#04261f] hover:bg-[#064e3b] text-white border border-[#c5a880]/40 font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                                    >
                                        <Phone size={14} className="text-[#dfc89e]" />
                                        <span>Call Concierge</span>
                                    </a>
                                    <a
                                        href="https://maps.google.com/?q=Miami+Beach+Resort+Cox's+Bazar"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="py-3 px-4 rounded-2xl bg-[#c5a880]/20 hover:bg-[#c5a880]/30 text-[#04261f] border border-[#c5a880]/50 font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all cursor-pointer"
                                    >
                                        <MapPin size={14} className="text-[#04261f]" />
                                        <span>Get Directions</span>
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Interactive Embedded Google Map */}
                        <div className="lg:col-span-7 bg-white border border-[#c5a880]/40 rounded-3xl p-2.5 sm:p-3.5 shadow-xl overflow-hidden flex flex-col min-h-[380px] sm:min-h-[460px]">
                            <iframe 
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3714.4308825401695!2d91.98431847587973!3d21.412302374493578!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x30adc90032b7a657%3A0x6493225bdfeb17a9!2sMiami%20Beach%20Resort%2C%20Cox%E2%80%99s%20Bazar!5e0!3m2!1sen!2sbd!4v1788533913946!5m2!1sen!2sbd" 
                                width="100%" 
                                height="100%" 
                                style={{ border: 0, minHeight: '360px' }} 
                                allowFullScreen="" 
                                loading="lazy" 
                                referrerPolicy="strict-origin-when-cross-origin"
                                className="w-full h-full rounded-2xl flex-1 border border-slate-200"
                                title="Miami Beach Resort Location Map"
                            />
                        </div>

                    </div>

                </div>
            </section>


            {/* ══════════════════════════════════════════════════════
                5. MULTI-ROOM BOOKING MODAL (100% PRESERVED)
            ══════════════════════════════════════════════════════ */}
            {bookingModalOpen && (
                <dialog open className="modal modal-open z-50">
                    <div className="modal-box w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl p-5 sm:p-8 shadow-2xl border border-[#c5a880]/40 text-slate-800">
                        
                        {/* Modal Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-[#c5a880]/20 mb-5">
                            <div className="min-w-0 pr-2">
                                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#9a7b52] block">
                                    Reservation Form
                                </span>
                                <h3 className="font-bold text-xl sm:text-2xl text-[#03221b] truncate mt-0.5">
                                    {bookingRooms.length > 1 ? `Booking ${bookingRooms.length} Rooms` : selectedCategory?.name}
                                </h3>
                            </div>
                            <button onClick={handleCloseModal} className="btn btn-ghost btn-sm btn-circle shrink-0 text-slate-500 hover:text-slate-900 cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Grand Total Summary Card */}
                        <div className="bg-[#04261f] text-white rounded-2xl p-4 sm:p-5 mb-5 border border-[#c5a880]/35 shadow-md">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="font-bold text-base text-[#dfc89e]">
                                        {bookingRooms.length} Room{bookingRooms.length > 1 ? 's' : ''} Selected
                                    </p>
                                    <p className="text-slate-300 text-xs font-light mt-0.5">
                                        Click "+ Add Room" below to book multiple rooms in this reservation.
                                    </p>
                                </div>
                                <div className="text-right shrink-0 bg-[#021813] px-4 py-2 rounded-xl border border-[#c5a880]/40">
                                    <span className="text-[10px] text-[#dfc89e] block uppercase tracking-wider">Total</span>
                                    <span className="font-bold text-base sm:text-lg text-white">
                                        ৳{grandTotal.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Availability error banner */}
                        {availabilityMsg && !availabilityMsg.ok && (
                            <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-2xl p-3.5 mb-5 text-xs text-rose-800">
                                <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                                <p className="font-semibold leading-relaxed">{availabilityMsg.text}</p>
                            </div>
                        )}

                        <form onSubmit={onSubmit} className="space-y-5 text-xs sm:text-sm">
                            
                            {/* Guest Details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#fcfbf9] p-4 sm:p-5 rounded-2xl border border-[#c5a880]/30">
                                <div className="form-control">
                                    <label className="label py-0.5">
                                        <span className="label-text font-bold text-slate-800 text-xs">
                                            Guest Full Name <span className="text-rose-600 font-bold">*</span>
                                        </span>
                                    </label>
                                    <input
                                        name="name" 
                                        value={formData.name} 
                                        onChange={handleInput}
                                        type="text" 
                                        placeholder="Your full name"
                                        className={`input input-sm sm:input-md input-bordered w-full rounded-xl bg-white text-xs sm:text-sm ${formErrors.name ? "input-error" : "border-slate-300"}`}
                                    />
                                    {formErrors.name && <span className="text-rose-600 text-[11px] mt-0.5 font-medium">{formErrors.name}</span>}
                                </div>

                                <div className="form-control">
                                    <label className="label py-0.5">
                                        <span className="label-text font-bold text-slate-800 text-xs">
                                            Mobile (WhatsApp) <span className="text-rose-600 font-bold">*</span>
                                        </span>
                                    </label>
                                    <input
                                        name="mobile" 
                                        value={formData.mobile} 
                                        onChange={handleInput}
                                        type="tel" 
                                        placeholder="+88017..."
                                        className={`input input-sm sm:input-md input-bordered w-full rounded-xl bg-white text-xs sm:text-sm ${formErrors.mobile ? "input-error" : "border-slate-300"}`}
                                    />
                                    {formErrors.mobile && <span className="text-rose-600 text-[11px] mt-0.5 font-medium">{formErrors.mobile}</span>}
                                </div>
                            </div>

                            {/* Room Selection Section */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                                        <BedDouble size={17} className="text-[#04261f]" />
                                        Room Details ({bookingRooms.length})
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={handleAddRoom}
                                        className="btn btn-xs sm:btn-sm bg-[#04261f] hover:bg-[#064e3b] text-[#dfc89e] border-none rounded-xl gap-1.5 font-bold shadow-xs cursor-pointer"
                                    >
                                        <Plus size={14} /> Add Room
                                    </button>
                                </div>

                                {formErrors.rooms && <p className="text-rose-600 text-[11px] font-medium">{formErrors.rooms}</p>}

                                {/* Room Items List */}
                                <div className="space-y-4">
                                    {bookingRooms.map((item, index) => {
                                        const nights = getRoomNights(item)
                                        const roomTotal = getRoomTotal(item)
                                        const currentCat = categories.find(c => c._id === item.categoryId) || selectedCategory

                                        return (
                                            <div
                                                key={item.itemId}
                                                className="rounded-2xl border border-[#c5a880]/35 bg-[#fcfbf9] p-4 sm:p-5 space-y-3.5 transition-all shadow-xs"
                                            >
                                                {/* Room Header */}
                                                <div className="flex items-center justify-between pb-2.5 border-b border-[#c5a880]/20">
                                                    <div className="flex items-center gap-2">
                                                        <span className="badge badge-sm bg-[#04261f] text-[#dfc89e] font-bold px-2.5">
                                                            Room {index + 1}
                                                        </span>
                                                        <span className="font-bold text-slate-800 text-sm">
                                                            {currentCat?.name || "Select Category"}
                                                        </span>
                                                    </div>
                                                    {bookingRooms.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveRoom(item.itemId)}
                                                            className="btn btn-xs btn-ghost text-rose-600 hover:bg-rose-50 rounded-lg gap-1 cursor-pointer"
                                                            title="Remove Room"
                                                        >
                                                            <Trash2 size={13} /> Remove
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Field 1: Category Dropdown & "Same category" Checkbox (for additional rooms: index > 0) */}
                                                {index > 0 && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                                        <div className="form-control sm:col-span-8">
                                                            <label className="label py-0.5">
                                                                <span className="label-text font-bold text-slate-700 text-xs">
                                                                    Category <span className="text-rose-600 font-bold">*</span>
                                                                </span>
                                                            </label>
                                                            <select
                                                                value={item.categoryId}
                                                                onChange={e => handleRoomChange(item.itemId, { categoryId: e.target.value, sameCategory: false })}
                                                                disabled={item.sameCategory}
                                                                className="select select-sm select-bordered w-full rounded-xl bg-white text-xs font-medium border-slate-300"
                                                            >
                                                                {categories.map(c => (
                                                                  <option key={c._id} value={c._id}>
                                                                      {c.name} — ৳{Number(c.price).toLocaleString()}/night
                                                                  </option>
                                                                ))}
                                                            </select>
                                                            {formErrors[`category-${item.itemId}`] && (
                                                                <span className="text-rose-600 text-[11px] mt-0.5">{formErrors[`category-${item.itemId}`]}</span>
                                                            )}
                                                        </div>

                                                        <div className="sm:col-span-4 flex items-center sm:pt-6">
                                                            <label className="cursor-pointer flex items-center gap-2 text-xs font-semibold text-slate-700 select-none">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={item.sameCategory}
                                                                    onChange={e => handleRoomChange(item.itemId, { sameCategory: e.target.checked })}
                                                                    className="checkbox checkbox-xs rounded border-slate-400"
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
                                                            <span className="label-text font-bold text-slate-700 text-xs">
                                                                Check-In <span className="text-rose-600 font-bold">*</span>
                                                            </span>
                                                        </label>
                                                        <DatePicker
                                                            selected={item.checkInDate}
                                                            onChange={date => handleRoomChange(item.itemId, { checkInDate: date })}
                                                            minDate={new Date()}
                                                            placeholderText="Select check-in"
                                                            dateFormat="dd MMM yyyy"
                                                            className={`input input-sm input-bordered w-full rounded-xl bg-white text-xs cursor-pointer ${formErrors[`checkIn-${item.itemId}`] ? "input-error" : "border-slate-300"}`}
                                                            wrapperClassName="w-full"
                                                            calendarClassName="booking-calendar"
                                                            autoComplete="off"
                                                        />
                                                        {formErrors[`checkIn-${item.itemId}`] && (
                                                            <span className="text-rose-600 text-[11px] mt-0.5">{formErrors[`checkIn-${item.itemId}`]}</span>
                                                        )}
                                                    </div>

                                                    <div className="form-control">
                                                        <label className="label py-0.5">
                                                            <span className="label-text font-bold text-slate-700 text-xs">
                                                                Check-Out <span className="text-rose-600 font-bold">*</span>
                                                            </span>
                                                        </label>
                                                        <DatePicker
                                                            selected={item.checkOutDate}
                                                            onChange={date => handleRoomChange(item.itemId, { checkOutDate: date })}
                                                            minDate={item.checkInDate ? addDays(item.checkInDate, 1) : addDays(new Date(), 1)}
                                                            placeholderText="Select check-out"
                                                            dateFormat="dd MMM yyyy"
                                                            className={`input input-sm input-bordered w-full rounded-xl bg-white text-xs cursor-pointer ${formErrors[`checkOut-${item.itemId}`] ? "input-error" : "border-slate-300"}`}
                                                            wrapperClassName="w-full"
                                                            calendarClassName="booking-calendar"
                                                            autoComplete="off"
                                                            disabled={!item.checkInDate}
                                                        />
                                                        {formErrors[`checkOut-${item.itemId}`] && (
                                                            <span className="text-rose-600 text-[11px] mt-0.5">{formErrors[`checkOut-${item.itemId}`]}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Field 4 & 5: Adults & Babies */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="form-control">
                                                        <label className="label py-0.5">
                                                            <span className="label-text font-bold text-slate-700 text-xs">Adults</span>
                                                        </label>
                                                        <input
                                                            type="number" min="0" 
                                                            value={item.adults !== undefined ? item.adults : ''}
                                                            placeholder="0"
                                                            onChange={e => handleRoomChange(item.itemId, { adults: e.target.value })}
                                                            className="input input-sm input-bordered w-full rounded-xl bg-white text-xs border-slate-300"
                                                        />
                                                    </div>
                                                    <div className="form-control">
                                                        <label className="label py-0.5">
                                                            <span className="label-text font-bold text-slate-700 text-xs">Children / Babies</span>
                                                        </label>
                                                        <input
                                                            type="number" min="0" 
                                                            value={item.babies}
                                                            onChange={e => handleRoomChange(item.itemId, { babies: e.target.value })}
                                                            className="input input-sm input-bordered w-full rounded-xl bg-white text-xs border-slate-300"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Room Subtotal */}
                                                <div className="flex items-center justify-between text-xs text-slate-600 border-t border-[#c5a880]/20 pt-2.5">
                                                    <span>{nights} night{nights === 1 ? "" : "s"} × ৳{getRoomPrice(item).toLocaleString()}</span>
                                                    <span className="font-bold text-[#04261f]">৳{roomTotal.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Guest Address */}
                            <div className="form-control">
                                <label className="label py-0.5">
                                    <span className="label-text font-bold text-slate-700 text-xs">Guest Address / Special Notes</span>
                                </label>
                                <textarea
                                    name="address" 
                                    value={formData.address} 
                                    onChange={handleInput}
                                    placeholder="Guest address or special check-in requests..."
                                    className="textarea textarea-bordered w-full rounded-xl bg-white border-slate-300 text-xs sm:text-sm"
                                    rows={2}
                                />
                            </div>

                            <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 font-light leading-relaxed">
                                🚫 Valid identification documents must be presented at check-in. Check-in at 1:00 PM and check-out at 11:00 AM.
                            </p>

                            {/* Submit and Cancel Buttons */}
                            <div className="flex items-center gap-3 pt-2">
                                <button 
                                    type="button" 
                                    onClick={handleCloseModal} 
                                    className="btn btn-sm sm:btn-md btn-ghost flex-1 rounded-xl cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting} 
                                    className="btn btn-sm sm:btn-md flex-2 rounded-xl bg-gradient-to-r from-[#dfc89e] via-[#c5a880] to-[#ad8a57] text-[#03221b] font-bold text-xs sm:text-sm uppercase tracking-wider shadow-lg border-none hover:brightness-110 cursor-pointer"
                                >
                                    {isSubmitting ? (
                                        <span className="loading loading-spinner loading-sm" />
                                    ) : (
                                        `Confirm Reservation (৳${grandTotal.toLocaleString()})`
                                    )}
                                </button>
                            </div>

                        </form>
                    </div>
                    <div className="modal-backdrop bg-[#021813]/70 backdrop-blur-xs" onClick={handleCloseModal} />
                </dialog>
            )}

        </div>
    )
}

export default Home
