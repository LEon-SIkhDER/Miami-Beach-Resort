import React, { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { addDays } from 'date-fns'
import toast from 'react-hot-toast'
import { showSuccessAlert, showErrorAlert } from '../../utils/customSwal'
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
    CheckSquare,
    Square,
    Utensils,
    Car,
    Wifi,
    Award,
    HeartHandshake,
    Compass,
    CheckCircle2,
    Quote
} from 'lucide-react'
import { parseFacilityList, parseRoomNumbers } from '../Dashboard/Category&Pricing/categoryRoomUtils'

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

const Home = () => {
    const SERVER_URL = import.meta.env.VITE_SERVER_URL || ""

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

    const handleOpenBookingModal = (category) => {
        setSelectedCategory(category)
        setBookingRooms([createRoomEntry(category?._id || "", false)])
        setFormData({ name: '', mobile: '', address: '' })
        setFormErrors({})
        setAvailabilityMsg(null)
        setBookingModalOpen(true)
    }

    const handleCloseModal = () => {
        setBookingModalOpen(false)
        setSelectedCategory(null)
        setBookingRooms([])
        setAvailabilityMsg(null)
    }

    const handleAddRoom = () => {
        const defaultCatId = selectedCategory?._id || categories[0]?._id || ""
        setBookingRooms(prev => [...prev, createRoomEntry(defaultCatId, true)])
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
        if (!formData.name.trim()) errs.name = 'Name is required'
        if (!formData.mobile.trim()) errs.mobile = 'Mobile is required'
        if (!bookingRooms.length) errs.rooms = 'At least 1 room is required'

        bookingRooms.forEach((item, index) => {
            if (!item.categoryId) errs[`category-${item.itemId}`] = `Select category for Room ${index + 1}`
            if (!item.checkInDate) errs[`checkIn-${item.itemId}`] = `Select check-in for Room ${index + 1}`
            if (!item.checkOutDate) errs[`checkOut-${item.itemId}`] = `Select check-out for Room ${index + 1}`
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
            const roomLines = normalizedRooms.map((r, index) => [
                `Room ${index + 1}: ${r.categoryName}`,
                `Dates: ${r.checkIn} to ${r.checkOut} (${r.nights} nights)`,
                `Guests: ${r.adults} adults${r.babies > 0 ? `, ${r.babies} babies` : ""}`,
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

    return (
        <div className="min-h-screen bg-slate-50 overflow-x-hidden">
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-gradient-to-b from-teal-950 via-slate-900 to-slate-950 text-white py-16 sm:py-24 px-3 sm:px-6 lg:px-8">
                <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#0d9488_1px,transparent_1px)] [background-size:16px_16px]"></div>
                <div className="relative max-w-4xl mx-auto text-center space-y-4 sm:space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-[11px] sm:text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
                        <Sparkles size={13} className="text-amber-400" />
                        Luxury Sea View Living
                    </div>
                    <div className="flex flex-col items-center justify-center gap-3">
                        <img src={logo} alt="Miami Beach Resort" className="h-16 sm:h-20 w-auto object-contain drop-shadow-md" />
                        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight font-serif leading-tight">
                            Miami Beach Resort
                        </h1>
                    </div>
                    <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto font-light px-2">
                        Enjoy prime beachfront comfort, cool ocean breeze, and premium hospitality at Dolphin Mor, Kolatoli Beach, Cox's Bazar.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 pt-2 text-[11px] sm:text-xs text-slate-300">
                        <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10">
                            <MapPin size={13} className="text-teal-400 shrink-0" /> Dolphin Mor, Kolatoli
                        </span>
                        <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10">
                            <Clock size={13} className="text-teal-400 shrink-0" /> Check-in 1:00 PM | Out 11:00 AM
                        </span>
                        <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/10">
                            <Phone size={13} className="text-teal-400 shrink-0" /> +8801616472282
                        </span>
                    </div>
                </div>
            </section>

            {/* Category Grid */}
            <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 sm:mb-10">
                    <div>
                        <div className="flex items-center gap-1.5 text-teal-600 font-bold text-xs sm:text-sm uppercase tracking-wider">
                            <BedDouble size={16} /> Our Room Categories
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight mt-1">
                            Choose and Book Your Suite
                        </h2>
                    </div>

                    {/* Search & Filter */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className="relative flex-1 sm:flex-initial">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search categories..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="input input-sm input-bordered pl-9 rounded-xl w-full sm:w-60 bg-white"
                            />
                        </div>
                        <select
                            className="select select-sm select-bordered rounded-xl bg-white text-xs font-semibold"
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

                {categoriesLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {[1, 2, 3].map(n => (
                            <div key={n} className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm animate-pulse flex flex-col">
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
                                className="btn btn-sm btn-ghost text-teal-700 underline mt-2"
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
                                <div key={cat._id} className="group bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
                                    {/* Photo & Click to details */}
                                    <Link to={`/room/${cat._id}`} className="relative h-60 sm:h-64 bg-slate-100 overflow-hidden select-none block">
                                        {currentImgSrc ? (
                                            <img src={currentImgSrc} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                                                <ImageIcon size={40} /><span className="text-xs mt-1 font-medium">Miami Beach Resort</span>
                                            </div>
                                        )}
                                        {/* badges */}
                                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                                            <span className="badge badge-sm bg-slate-900/80 backdrop-blur-md text-white border-none font-semibold text-[10px]">{cat.name}</span>
                                            {roomNums.length > 0 && (
                                                <span className="badge badge-sm bg-teal-600/90 backdrop-blur-md text-white border-none font-semibold text-[10px]">
                                                    {roomNums.length} Room{roomNums.length > 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                        {cat.video && (
                                            <span className="absolute top-3 right-3 badge badge-sm bg-teal-600 text-white border-none gap-1 z-10">
                                                <Video size={11} /> Video
                                            </span>
                                        )}
                                        {/* carousel nav */}
                                        {photos.length > 1 && (
                                            <>
                                                <button onClick={e => handlePrevImage(e, cat._id, photos.length)} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-900/70 text-white flex items-center justify-center hover:bg-slate-900 transition-colors z-10">
                                                    <ChevronLeft size={16} />
                                                </button>
                                                <button onClick={e => handleNextImage(e, cat._id, photos.length)} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-900/70 text-white flex items-center justify-center hover:bg-slate-900 transition-colors z-10">
                                                    <ChevronRight size={16} />
                                                </button>
                                                <div className="absolute bottom-3 left-3 bg-slate-900/70 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-bold text-white z-10">
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
                                    <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
                                        <div>
                                            <Link to={`/room/${cat._id}`}>
                                                <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-teal-700 transition-colors">{cat.name}</h3>
                                            </Link>
                                            <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                                                {cat.description || "Comfortable suite with premium amenities."}
                                            </p>
                                        </div>
                                        {/* Amenities */}
                                        {amenities.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100 min-h-8">
                                                {amenities.slice(0, 4).map(a => (
                                                    <span key={a} className="uppercase badge badge-sm bg-teal-50 text-teal-700 border border-teal-200/60 font-semibold">
                                                        {a}
                                                    </span>
                                                ))}
                                                {amenities.length > 4 && (
                                                    <span className="badge badge-sm bg-slate-100 text-slate-500 border-none font-medium">+{amenities.length - 4}</span>
                                                )}
                                            </div>
                                        )}
                                        {/* Buttons: Details + Book Now */}
                                        <div className="flex items-center gap-2 pt-1">
                                            <Link
                                                to={`/room/${cat._id}`}
                                                className="btn btn-outline border-slate-300 text-slate-700 hover:bg-slate-50 rounded-2xl text-xs sm:text-sm px-4"
                                            >
                                                Details
                                            </Link>
                                            <button
                                                onClick={() => handleOpenBookingModal(cat)}
                                                className="btn btn-primary flex-1 rounded-2xl gap-1.5 font-bold shadow-sm hover:shadow-md hover:shadow-teal-500/20 text-white text-xs sm:text-sm"
                                            >
                                                <span>Book Now</span><ArrowRight size={15} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </section>

            {/* ── ABOUT US SHOWCASE SECTION ── */}
            <section id="about" className="bg-white py-16 sm:py-24 border-y border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
                        <div className="lg:col-span-7 space-y-6">
                            <div className="inline-flex items-center gap-2 text-teal-700 text-xs font-bold uppercase tracking-widest bg-teal-50 px-3 py-1 rounded-full border border-teal-200/60">
                                <Compass size={14} className="text-teal-600" /> Discover Miami Beach Resort
                            </div>
                            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-serif leading-tight">
                                Your Premier Beachfront Gateway in Cox's Bazar
                            </h2>
                            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                                Located right at <strong>Dolphin Mor, Kolatoli Beach</strong>, Miami Beach Resort combines serene ocean views, modern guest suites, authentic hospitality, and instant access to the Bay of Bengal coastline.
                            </p>
                            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                                Whether you're planning a romantic beach getaway, a joyful family vacation, or a productive business retreat, our 24/7 dedicated concierge and premium amenities ensure total comfort and unforgettable memories.
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2.5">
                                    <CheckCircle2 size={18} className="text-teal-600 shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-slate-900">Prime Spot</p>
                                        <p className="text-[11px] text-slate-500">Dolphin Mor</p>
                                    </div>
                                </div>
                                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2.5">
                                    <CheckCircle2 size={18} className="text-teal-600 shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-slate-900">100m to Beach</p>
                                        <p className="text-[11px] text-slate-500">Kolatoli Sand</p>
                                    </div>
                                </div>
                                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-2.5">
                                    <CheckCircle2 size={18} className="text-teal-600 shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-slate-900">24/7 Service</p>
                                        <p className="text-[11px] text-slate-500">Concierge Desk</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <Link 
                                    to="/about" 
                                    className="btn btn-outline border-teal-600 text-teal-700 hover:bg-teal-50 rounded-2xl text-xs sm:text-sm px-6 font-bold gap-2"
                                >
                                    <span>Learn More About Us</span>
                                    <ArrowRight size={15} />
                                </Link>
                            </div>
                        </div>

                        {/* Stats Banner Right */}
                        <div className="lg:col-span-5 bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl border border-teal-900/40 space-y-6">
                            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                                <img src={logo} alt="Miami Beach Resort" className="h-12 w-auto bg-white/10 p-1.5 rounded-2xl border border-white/10" />
                                <div>
                                    <h4 className="font-serif font-bold text-lg text-white">Miami Beach Resort</h4>
                                    <p className="text-xs text-teal-400 font-semibold">Cox's Bazar Sanctuary</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-5 text-center sm:text-left">
                                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                                    <p className="text-2xl sm:text-3xl font-black text-teal-300 font-serif">50+</p>
                                    <p className="text-[11px] text-slate-400 uppercase font-semibold mt-0.5">Rooms & Suites</p>
                                </div>
                                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                                    <p className="text-2xl sm:text-3xl font-black text-teal-300 font-serif">10k+</p>
                                    <p className="text-[11px] text-slate-400 uppercase font-semibold mt-0.5">Happy Guests</p>
                                </div>
                                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                                    <p className="text-2xl sm:text-3xl font-black text-teal-300 font-serif">4.9 ★</p>
                                    <p className="text-[11px] text-slate-400 uppercase font-semibold mt-0.5">Guest Satisfaction</p>
                                </div>
                                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                                    <p className="text-2xl sm:text-3xl font-black text-teal-300 font-serif">100%</p>
                                    <p className="text-[11px] text-slate-400 uppercase font-semibold mt-0.5">Power Backup</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── SERVICES & AMENITIES SHOWCASE SECTION ── */}
            <section id="services" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
                    <div>
                        <div className="inline-flex items-center gap-2 text-teal-700 text-xs font-bold uppercase tracking-widest bg-teal-50 px-3 py-1 rounded-full border border-teal-200/60 mb-2">
                            <Sparkles size={14} className="text-teal-600" /> Premium Facilities
                        </div>
                        <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-serif leading-tight">
                            Our Resort Services & Amenities
                        </h2>
                    </div>
                    <Link 
                        to="/services" 
                        className="btn btn-sm btn-ghost text-teal-700 font-bold hover:bg-teal-50 rounded-xl gap-1"
                    >
                        <span>View All Services</span>
                        <ArrowRight size={15} />
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                    <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-lg transition-all space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
                            <Utensils size={24} />
                        </div>
                        <h3 className="font-bold text-slate-900 text-base">Seafood & Multi-Cuisine</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Fresh Bay of Bengal seafood, coastal BBQ, and authentic Bengali cuisine with in-room dining options.
                        </p>
                    </div>

                    <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-lg transition-all space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
                            <Compass size={24} />
                        </div>
                        <h3 className="font-bold text-slate-900 text-base">Coastal Tour Assistance</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Guided sightseeing to Marine Drive, Inani Beach, Himchori, and Saint Martin ship ticket bookings.
                        </p>
                    </div>

                    <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-lg transition-all space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
                            <ShieldCheck size={24} />
                        </div>
                        <h3 className="font-bold text-slate-900 text-base">24/7 Power & Security</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Continuous generator power backup, 24/7 CCTV surveillance, and dedicated on-site reception security.
                        </p>
                    </div>

                    <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-lg transition-all space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
                            <Car size={24} />
                        </div>
                        <h3 className="font-bold text-slate-900 text-base">Airport & Bus Pickup</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Convenient chauffeur vehicle transfers to and from Cox's Bazar Airport and Kolatoli bus counters.
                        </p>
                    </div>

                    <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-lg transition-all space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
                            <Wifi size={24} />
                        </div>
                        <h3 className="font-bold text-slate-900 text-base">High-Speed Free Wi-Fi</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Optical fiber internet coverage throughout all guest rooms, lobby, and dining areas.
                        </p>
                    </div>

                    <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-lg transition-all space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
                            <BedDouble size={24} />
                        </div>
                        <h3 className="font-bold text-slate-900 text-base">Daily Housekeeping</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Immaculate room hygiene, fresh crisp bed linens, daily replenishment, and laundry care.
                        </p>
                    </div>
                </div>
            </section>

            {/* ── TESTIMONIALS SECTION ── */}
            <section className="bg-slate-900 text-white py-16 sm:py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
                        <span className="text-teal-400 font-bold text-xs uppercase tracking-widest">Guest Experiences</span>
                        <h2 className="text-2xl sm:text-4xl font-extrabold font-serif">
                            What Our Guests Say
                        </h2>
                        <p className="text-slate-400 text-xs sm:text-sm">
                            Hear from travelers who experienced beachside serenity with Miami Beach Resort.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                        <div className="p-6 sm:p-8 bg-slate-800/80 border border-slate-700 rounded-3xl space-y-4 flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="flex items-center gap-1 text-amber-400">
                                    {[...Array(5)].map((_, i) => <Star key={i} size={15} fill="currentColor" />)}
                                </div>
                                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                                    "The location is unbeatable! Just a minute walk from Kolatoli beach. The rooms were spotless, AC was great, and staff was very polite and helpful."
                                </p>
                            </div>
                            <div className="pt-3 border-t border-slate-700/60">
                                <p className="font-bold text-white text-xs sm:text-sm">Tanvir Ahmed</p>
                                <p className="text-[11px] text-teal-400">Family Vacation • Dhaka</p>
                            </div>
                        </div>

                        <div className="p-6 sm:p-8 bg-slate-800/80 border border-slate-700 rounded-3xl space-y-4 flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="flex items-center gap-1 text-amber-400">
                                    {[...Array(5)].map((_, i) => <Star key={i} size={15} fill="currentColor" />)}
                                </div>
                                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                                    "Superb hospitality and the seafood at the restaurant was mouthwatering. Loved watching the sunset and coming back to a peaceful, cool room."
                                </p>
                            </div>
                            <div className="pt-3 border-t border-slate-700/60">
                                <p className="font-bold text-white text-xs sm:text-sm">Nusrat Jahan</p>
                                <p className="text-[11px] text-teal-400">Couple Stay • Chittagong</p>
                            </div>
                        </div>

                        <div className="p-6 sm:p-8 bg-slate-800/80 border border-slate-700 rounded-3xl space-y-4 flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="flex items-center gap-1 text-amber-400">
                                    {[...Array(5)].map((_, i) => <Star key={i} size={15} fill="currentColor" />)}
                                </div>
                                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                                    "We booked 4 rooms for our annual company retreat. Seamless check-in, continuous power, and great support for arranging Marine Drive jeeps!"
                                </p>
                            </div>
                            <div className="pt-3 border-t border-slate-700/60">
                                <p className="font-bold text-white text-xs sm:text-sm">Mahmud Hasan</p>
                                <p className="text-[11px] text-teal-400">Corporate Group • Sylhet</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Quick Policies */}
            <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-16">
                <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs sm:text-sm">
                    <div className="space-y-1">
                        <p className="font-bold text-slate-900 flex items-center gap-1.5"><Clock size={16} className="text-teal-600 shrink-0" /> Stay Timings</p>
                        <p className="text-slate-500 text-xs">Check-in at 01:00 PM<br/>Check-out at 11:00 AM</p>
                    </div>
                    <div className="space-y-1">
                        <p className="font-bold text-slate-900 flex items-center gap-1.5"><ShieldCheck size={16} className="text-teal-600 shrink-0" /> 100% Security</p>
                        <p className="text-slate-500 text-xs">24/7 reception, CCTV security and generator backup.</p>
                    </div>
                    <div className="space-y-1">
                        <p className="font-bold text-slate-900 flex items-center gap-1.5"><Calendar size={16} className="text-teal-600 shrink-0" /> Date Reschedule</p>
                        <p className="text-slate-500 text-xs">Notify 24 hours prior. Valid up to 60 days.</p>
                    </div>
                    <div className="space-y-1">
                        <p className="font-bold text-slate-900 flex items-center gap-1.5"><Phone size={16} className="text-teal-600 shrink-0" /> Instant Support</p>
                        <p className="text-slate-500 text-xs">WhatsApp: +8801616472282<br/>Direct resort assistance</p>
                    </div>
                </div>
            </section>

            {/* ── MULTI-ROOM BOOKING MODAL ── */}
            {bookingModalOpen && (
                <dialog open className="modal modal-open z-50">
                    <div className="modal-box w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl p-4 sm:p-7 shadow-2xl border border-slate-100">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                            <div className="min-w-0 pr-2">
                                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-teal-600 block">Reservation Form</span>
                                <h3 className="font-bold text-lg sm:text-xl font-serif text-slate-900 truncate">
                                    {bookingRooms.length > 1 ? `Booking ${bookingRooms.length} Rooms` : selectedCategory?.name}
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
                                        Click "+ Add Room" below to book multiple rooms in this reservation.
                                    </p>
                                </div>
                                <div className="font-bold text-sm text-teal-800 bg-white/80 px-3 py-1.5 rounded-xl border border-teal-200/60 text-right shrink-0">
                                    Total ৳{grandTotal.toLocaleString()}
                                </div>
                            </div>
                        </div>

                        {/* Availability error notification banner */}
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
                                    {bookingRooms.map((item, index) => {
                                        const nights = getRoomNights(item)
                                        const roomTotal = getRoomTotal(item)
                                        const currentCat = categories.find(c => c._id === item.categoryId) || selectedCategory

                                        return (
                                            <div
                                                key={item.itemId}
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
                                                            onClick={() => handleRemoveRoom(item.itemId)}
                                                            className="btn btn-xs btn-ghost text-red-500 hover:bg-red-50 rounded-lg gap-1"
                                                            title="Remove Room"
                                                        >
                                                            <Trash2 size={13} /> Remove
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Field 1: Category Dropdown & "Same category" checkbox (only for additional rooms: index > 0) */}
                                                {index > 0 && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                                        <div className="form-control sm:col-span-8">
                                                            <label className="label py-0.5">
                                                                <span className="label-text font-semibold text-slate-700 text-xs">Category <span className="text-red-500 font-bold">*</span></span>
                                                            </label>
                                                            <select
                                                                value={item.categoryId}
                                                                onChange={e => handleRoomChange(item.itemId, { categoryId: e.target.value, sameCategory: false })}
                                                                disabled={item.sameCategory}
                                                                className="select select-sm select-bordered w-full rounded-xl bg-white text-xs font-medium"
                                                            >
                                                                {categories.map(c => (
                                                                    <option key={c._id} value={c._id}>
                                                                        {c.name} — ৳{Number(c.price).toLocaleString()}/night
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            {formErrors[`category-${item.itemId}`] && (
                                                                <span className="text-error text-[11px] mt-0.5">{formErrors[`category-${item.itemId}`]}</span>
                                                            )}
                                                        </div>

                                                        {/* "Same category" Checkbox */}
                                                        <div className="sm:col-span-4 flex items-center sm:pt-6">
                                                            <label className="cursor-pointer flex items-center gap-2 text-xs font-semibold text-slate-700 select-none">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={item.sameCategory}
                                                                    onChange={e => handleRoomChange(item.itemId, { sameCategory: e.target.checked })}
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
                                                            selected={item.checkInDate}
                                                            onChange={date => handleRoomChange(item.itemId, { checkInDate: date })}
                                                            minDate={new Date()}
                                                            placeholderText="Select check-in date"
                                                            dateFormat="dd MMM yyyy"
                                                            className={`input input-sm input-bordered w-full rounded-xl bg-white text-xs cursor-pointer ${formErrors[`checkIn-${item.itemId}`] ? "input-error" : ""}`}
                                                            wrapperClassName="w-full"
                                                            autoComplete="off"
                                                        />
                                                        {formErrors[`checkIn-${item.itemId}`] && (
                                                            <span className="text-error text-[11px] mt-0.5">{formErrors[`checkIn-${item.itemId}`]}</span>
                                                        )}
                                                    </div>

                                                    <div className="form-control">
                                                        <label className="label py-0.5">
                                                            <span className="label-text font-semibold text-slate-700 text-xs">Check-Out <span className="text-red-500 font-bold">*</span></span>
                                                        </label>
                                                        <DatePicker
                                                            selected={item.checkOutDate}
                                                            onChange={date => handleRoomChange(item.itemId, { checkOutDate: date })}
                                                            minDate={item.checkInDate ? addDays(item.checkInDate, 1) : addDays(new Date(), 1)}
                                                            placeholderText="Select check-out date"
                                                            dateFormat="dd MMM yyyy"
                                                            className={`input input-sm input-bordered w-full rounded-xl bg-white text-xs cursor-pointer ${formErrors[`checkOut-${item.itemId}`] ? "input-error" : ""}`}
                                                            wrapperClassName="w-full"
                                                            autoComplete="off"
                                                            disabled={!item.checkInDate}
                                                        />
                                                        {formErrors[`checkOut-${item.itemId}`] && (
                                                            <span className="text-error text-[11px] mt-0.5">{formErrors[`checkOut-${item.itemId}`]}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Field 4 & 5: Adults & Babies */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="form-control">
                                                        <label className="label py-0.5">
                                                            <span className="label-text font-semibold text-slate-700 text-xs">Adults</span>
                                                        </label>
                                                        <input
                                                            type="number" min="0" value={item.adults !== undefined ? item.adults : ''}
                                                            placeholder="0"
                                                            onChange={e => handleRoomChange(item.itemId, { adults: e.target.value })}
                                                            className="input input-sm input-bordered w-full rounded-xl bg-white text-xs"
                                                        />
                                                    </div>
                                                    <div className="form-control">
                                                        <label className="label py-0.5">
                                                            <span className="label-text font-semibold text-slate-700 text-xs">Children / Baby</span>
                                                        </label>
                                                        <input
                                                            type="number" min="0" value={item.babies}
                                                            onChange={e => handleRoomChange(item.itemId, { babies: e.target.value })}
                                                            className="input input-sm input-bordered w-full rounded-xl bg-white text-xs"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Room Subtotal */}
                                                <div className="flex items-center justify-between text-[11px] text-slate-600 border-t border-teal-100/60 pt-2">
                                                    <span>{nights} night{nights === 1 ? "" : "s"} × ৳{getRoomPrice(item).toLocaleString()}</span>
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

export default Home
