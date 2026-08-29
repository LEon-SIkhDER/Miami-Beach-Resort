import React, { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { addDays, isWithinInterval, eachDayOfInterval } from 'date-fns'
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
    Waves,
    ArrowRight,
    X,
    ChevronLeft,
    ChevronRight,
    Search,
    Eye,
    SlidersHorizontal
} from 'lucide-react'
import { getRoomDisplayName, parseFacilityList } from '../Dashboard/Rooms/roomUtils'

// Parse "YYYY-MM-DD" as LOCAL midnight (not UTC midnight).
// parseISO() gives UTC midnight which shifts dates in non-UTC timezones.
const parseLocalDate = (str) => {
    if (!str) return null
    const [y, m, d] = str.split('-').map(Number)
    return new Date(y, m - 1, d) // local midnight — matches datepicker selections
}

// Format Date object to "YYYY-MM-DD" using local calendar date (never shifts to previous day)
const formatLocalDate = (date) => {
    if (!date) return ''
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

const Home = () => {
    const [selectedRoom, setSelectedRoom] = useState(null)
    const [bookingModalOpen, setBookingModalOpen] = useState(false)
    const [checkInDate, setCheckInDate] = useState(null)
    const [checkOutDate, setCheckOutDate] = useState(null)
    const [calcNights, setCalcNights] = useState(0)
    const [calcTotal, setCalcTotal] = useState(0)
    const [activeImageIndices, setActiveImageIndices] = useState({})
    const [formData, setFormData] = useState({ name: '', mobile: '', adults: 2, babies: 0, specialNeeds: '' })
    const [formErrors, setFormErrors] = useState({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('')

    // Fetch active rooms
    const { data: rooms = [], isLoading: roomsLoading } = useQuery({
        queryKey: ["active-rooms"],
        queryFn: async () => {
            const res = await axios.get(`${import.meta.env.VITE_SERVER_URL}/rooms?status=active`)
            return res.data
        }
    })

    const { data: categories = [] } = useQuery({
        queryKey: ["category-and-pricing"],
        queryFn: async () => {
            const res = await axios.get(`${import.meta.env.VITE_SERVER_URL}/categoryandpricing`)
            return res.data
        }
    })

    const filteredRooms = rooms.filter(room => {
        if (selectedCategory && room.category !== selectedCategory) return false
        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            return room.name?.toLowerCase().includes(q) ||
                   room.category?.toLowerCase().includes(q) ||
                   room.facility?.toLowerCase().includes(q) ||
                   room.description?.toLowerCase().includes(q)
        }
        return true
    })

    // Fetch reserved date ranges for selected room
    const { data: reservedRanges = [] } = useQuery({
        queryKey: ["reserved-dates", selectedRoom?._id],
        queryFn: async () => {
            if (!selectedRoom?._id) return []
            const res = await axios.get(`${import.meta.env.VITE_SERVER_URL}/bookings/reserved-dates`, {
                params: { roomId: selectedRoom._id }
            })
            return res.data
        },
        enabled: !!selectedRoom?._id
    })

    // Build flat list of all booked dates (local midnight) so excludeDates works correctly
    const bookedDates = React.useMemo(() => {
        const dates = []
        reservedRanges.forEach(range => {
            try {
                const start = parseLocalDate(range.checkIn)
                // checkOut day is free for check-in, so exclude up to (checkOut - 1 day)
                const lastOccupied = addDays(parseLocalDate(range.checkOut), -1)
                if (start <= lastOccupied) {
                    eachDayOfInterval({ start, end: lastOccupied }).forEach(d => dates.push(d))
                }
            } catch (_) {}
        })
        return dates
    }, [reservedRanges])

    // Helper: is a specific calendar day within any booked interval?
    const isDateBooked = (date) => {
        return reservedRanges.some(range => {
            try {
                const start = parseLocalDate(range.checkIn)
                const lastOccupied = addDays(parseLocalDate(range.checkOut), -1)
                return isWithinInterval(date, { start, end: lastOccupied })
            } catch (_) { return false }
        })
    }

    // Helper: does the selected [checkIn, checkOut) range overlap any booking?
    const rangeHasConflict = (start, end) => {
        return reservedRanges.some(range => {
            try {
                const rStart = parseLocalDate(range.checkIn)
                const rEnd = parseLocalDate(range.checkOut)
                // Overlap: new start < existing end AND new end > existing start
                return start < rEnd && end > rStart
            } catch (_) { return false }
        })
    }

    // Recalculate nights and total when dates change
    useEffect(() => {
        if (checkInDate && checkOutDate && selectedRoom) {
            const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24))
            setCalcNights(nights > 0 ? nights : 0)
            setCalcTotal(nights > 0 ? nights * selectedRoom.price : 0)
        } else {
            setCalcNights(0)
            setCalcTotal(0)
        }
    }, [checkInDate, checkOutDate, selectedRoom])

    const handleOpenBookingModal = (room) => {
        setSelectedRoom(room)
        setCheckInDate(null)
        setCheckOutDate(null)
        setFormData({ name: '', mobile: '', adults: 2, babies: 0, specialNeeds: '' })
        setFormErrors({})
        setBookingModalOpen(true)
    }

    const handleCloseModal = () => {
        setBookingModalOpen(false)
        setSelectedRoom(null)
        setCheckInDate(null)
        setCheckOutDate(null)
    }

    // Carousel handlers
    const handleNextImage = (e, roomId, totalImages) => {
        e.stopPropagation()
        setActiveImageIndices(prev => ({ ...prev, [roomId]: ((prev[roomId] || 0) + 1) % totalImages }))
    }
    const handlePrevImage = (e, roomId, totalImages) => {
        e.stopPropagation()
        setActiveImageIndices(prev => ({ ...prev, [roomId]: ((prev[roomId] || 0) - 1 + totalImages) % totalImages }))
    }

    const handleInput = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
        setFormErrors(prev => ({ ...prev, [e.target.name]: '' }))
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

        // 1. Frontend range conflict check (instant)
        if (rangeHasConflict(checkInDate, checkOutDate)) {
            showErrorAlert("Dates Unavailable!", "The selected dates overlap with an existing reservation. Please choose different dates.")
            setIsSubmitting(false)
            return
        }

        // 2. Double-check with server
        const checkToast = toast.loading("Verifying real-time room availability...")
        try {
            const availRes = await axios.get(`${import.meta.env.VITE_SERVER_URL}/check-room-availability`, {
                params: { roomId: selectedRoom._id, checkIn: checkInStr, checkOut: checkOutStr }
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

        // 3. Submit booking
        const bookingData = {
            roomId: selectedRoom._id,
            roomName: getRoomDisplayName(selectedRoom),
            roomCategory: getRoomDisplayName(selectedRoom),
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
                    <p><strong>Room:</strong> ${selectedRoom?.name}</p>
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

            {/* Rooms Grid */}
            <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-12 sm:py-16">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 sm:mb-10">
                    <div>
                        <div className="flex items-center gap-1.5 text-teal-600 font-bold text-xs sm:text-sm uppercase tracking-wider">
                            <BedDouble size={16} /> Available Suites
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight mt-1">
                            Choose and Book Your Suite
                        </h2>
                    </div>

                    {/* Room Search & Filter Bar */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <div className="relative flex-1 sm:flex-initial">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search suites by name, facility..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="input input-sm input-bordered pl-9 rounded-xl w-full sm:w-60 bg-white"
                            />
                        </div>

                        <select
                            className="select select-sm select-bordered rounded-xl bg-white text-xs font-semibold"
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                        >
                            <option value="">All Categories</option>
                            {categories.map(category => (
                                <option key={category._id} value={category.name}>{category.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {roomsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {[1, 2, 3].map(n => (
                            <div key={n} className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm animate-pulse flex flex-col justify-between">
                                <div className="h-60 sm:h-64 bg-slate-200"></div>
                                <div className="p-5 sm:p-6 space-y-4">
                                    <div className="space-y-2">
                                        <div className="h-6 bg-slate-200 rounded-lg w-3/4"></div>
                                        <div className="h-3.5 bg-slate-200 rounded w-full"></div>
                                        <div className="h-3.5 bg-slate-200 rounded w-4/5"></div>
                                    </div>
                                    <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                                        <div className="h-4 bg-slate-200 rounded w-24"></div>
                                        <div className="h-4 bg-slate-200 rounded w-20"></div>
                                    </div>
                                    <div className="h-11 bg-slate-200 rounded-2xl w-full"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredRooms.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-2">
                        <BedDouble size={48} className="mx-auto text-slate-300 mb-2" />
                        <h3 className="text-lg font-bold text-slate-700">No rooms match your search</h3>
                        <p className="text-xs text-slate-500">Try adjusting your keyword or category filters.</p>
                        {(searchQuery || selectedCategory) && (
                            <button 
                                onClick={() => { setSearchQuery(''); setSelectedCategory(''); }}
                                className="btn btn-sm btn-ghost text-teal-700 underline mt-2"
                            >
                                Reset all filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {filteredRooms.map(room => {
                            const allImages = room.images?.length
                                ? room.images.map(img => typeof img === 'string' ? img : img.url)
                                : room.imageUrl ? [room.imageUrl] : []
                            const currentIdx = activeImageIndices[room._id] || 0
                            const currentImgSrc = allImages[currentIdx] || room.imageUrl
                            const facilities = parseFacilityList(room.facility)
                            console.log(facilities)
                            const roomName = getRoomDisplayName(room)

                            return (
                                <div key={room._id} className="group bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col">
                                    <Link to={`/room/${room._id}`} className="relative h-60 sm:h-64 bg-slate-100 overflow-hidden select-none block">
                                        {currentImgSrc ? (
                                            <img src={currentImgSrc} alt={roomName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                                                <BedDouble size={40} /><span className="text-xs mt-1 font-medium">Miami Beach Resort</span>
                                            </div>
                                        )}
                                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                                            <span className="badge badge-sm bg-slate-900/80 backdrop-blur-md text-white border-none font-semibold text-[10px]">{roomName}</span>
                                            {facilities.slice(0, 1).map(facility => (
                                                <span key={facility} className="badge badge-sm bg-teal-600/90 backdrop-blur-md text-white border-none font-semibold text-[10px]">{facility}</span>
                                            ))}
                                        </div>
                                        {allImages.length > 1 && (
                                            <>
                                                <button onClick={(e) => handlePrevImage(e, room._id, allImages.length)} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-900/70 text-white flex items-center justify-center hover:bg-slate-900 transition-colors z-10">
                                                    <ChevronLeft size={16} />
                                                </button>
                                                <button onClick={(e) => handleNextImage(e, room._id, allImages.length)} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-900/70 text-white flex items-center justify-center hover:bg-slate-900 transition-colors z-10">
                                                    <ChevronRight size={16} />
                                                </button>
                                                <div className="absolute bottom-3 left-3 bg-slate-900/70 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-bold text-white z-10">
                                                    {currentIdx + 1} / {allImages.length}
                                                </div>
                                            </>
                                        )}
                                        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-xl shadow-md font-bold text-slate-900 text-xs sm:text-sm z-10">
                                            ৳{room.price?.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">/ night</span>
                                        </div>
                                    </Link>
                                    <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
                                        <div>
                                            <Link to={`/room/${room._id}`}>
                                                <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-teal-700 transition-colors">{roomName}</h3>
                                            </Link>
                                            <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                                                {room.description || "Room details will be updated soon."}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100 min-h-8">
                                            {facilities.slice(0, 4).map(facility => (
                                                <span key={facility} className="uppercase badge badge-sm bg-teal-50 text-teal-700 border border-teal-200/60 font-semibold">
                                                    {facility}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Link
                                                to={`/room/${room._id}`}
                                                className="btn btn-outline border-slate-300 text-slate-700 hover:bg-slate-50 rounded-2xl text-xs sm:text-sm px-3.5"
                                            >
                                                Details
                                            </Link>
                                            <button
                                                onClick={() => handleOpenBookingModal(room)}
                                                className="btn btn-primary flex-1 rounded-2xl gap-2 font-bold shadow-sm hover:shadow-md hover:shadow-teal-500/20 text-white text-xs sm:text-sm"
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

            {/* Quick Policies */}
            <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-16">
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

            {/* ── BOOKING MODAL ── */}
            {bookingModalOpen && (
                <dialog open className="modal modal-open z-50">
                    <div className="modal-box w-full max-w-xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl p-4 sm:p-7 shadow-2xl border border-slate-100">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                            <div className="min-w-0 pr-2">
                                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-teal-600 block">Reservation Form</span>
                                <h3 className="font-bold text-lg sm:text-xl font-serif text-slate-900 truncate">{selectedRoom?.name}</h3>
                            </div>
                            <button onClick={handleCloseModal} className="btn btn-ghost btn-sm btn-circle shrink-0"><X size={18} /></button>
                        </div>

                        {/* Room summary */}
                        {selectedRoom && (
                            <div className="bg-teal-50/80 border border-teal-100 rounded-2xl p-3 sm:p-4 mb-5 text-xs">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div>
                                        <p className="font-bold text-teal-900">{getRoomDisplayName(selectedRoom)}{selectedRoom.view ? ` (${selectedRoom.view})` : ""}</p>
                                        <p className="text-teal-700 text-[11px]">৳{selectedRoom.price?.toLocaleString()} / night • Max {selectedRoom.capacity} Guests</p>
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
                        )}

                        <form onSubmit={onSubmit} className="space-y-4 text-xs sm:text-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                {/* Name */}
                                <div className="form-control">
                                    <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Guest Full Name *</span></label>
                                    <input
                                        name="name" value={formData.name} onChange={handleInput}
                                        type="text" placeholder="Your full name"
                                        className={`input input-sm sm:input-md input-bordered w-full rounded-xl bg-slate-50 focus:bg-white text-xs sm:text-sm ${formErrors.name ? "input-error" : ""}`}
                                    />
                                    {formErrors.name && <span className="text-error text-[11px] mt-0.5">{formErrors.name}</span>}
                                </div>

                                {/* Mobile */}
                                <div className="form-control">
                                    <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Mobile (WhatsApp) *</span></label>
                                    <input
                                        name="mobile" value={formData.mobile} onChange={handleInput}
                                        type="tel" placeholder="+88017..."
                                        className={`input input-sm sm:input-md input-bordered w-full rounded-xl bg-slate-50 focus:bg-white text-xs sm:text-sm ${formErrors.mobile ? "input-error" : ""}`}
                                    />
                                    {formErrors.mobile && <span className="text-error text-[11px] mt-0.5">{formErrors.mobile}</span>}
                                </div>

                                {/* Check-In Date Picker */}
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
                                        dayClassName={(date) =>
                                            isDateBooked(date) ? "booked-day" : undefined
                                        }
                                        wrapperClassName="w-full"
                                        autoComplete="off"
                                    />
                                    {formErrors.checkIn && <span className="text-error text-[11px] mt-0.5">{formErrors.checkIn}</span>}
                                </div>

                                {/* Check-Out Date Picker */}
                                <div className="form-control">
                                    <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Check-Out Date *</span></label>
                                    <DatePicker
                                        selected={checkOutDate}
                                        onChange={(date) => setCheckOutDate(date)}
                                        minDate={checkInDate ? addDays(checkInDate, 1) : addDays(new Date(), 1)}
                                        excludeDates={bookedDates}
                                        filterDate={(date) => {
                                            if (!checkInDate) return true
                                            // Disallow checkout if any booked date falls inside [checkIn, checkOut)
                                            if (rangeHasConflict(checkInDate, date)) return false
                                            return true
                                        }}
                                        placeholderText="Select check-out"
                                        dateFormat="dd MMM yyyy"
                                        className={`input input-sm sm:input-md input-bordered w-full rounded-xl bg-slate-50 focus:bg-white text-xs sm:text-sm cursor-pointer ${formErrors.checkOut ? "input-error" : ""}`}
                                        calendarClassName="booking-calendar"
                                        dayClassName={(date) =>
                                            isDateBooked(date) ? "booked-day" : undefined
                                        }
                                        wrapperClassName="w-full"
                                        autoComplete="off"
                                        disabled={!checkInDate}
                                    />
                                    {formErrors.checkOut && <span className="text-error text-[11px] mt-0.5">{formErrors.checkOut}</span>}
                                </div>

                                {/* Adults */}
                                <div className="form-control">
                                    <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Adults</span></label>
                                    <input
                                        name="adults" value={formData.adults} onChange={handleInput}
                                        type="number" min="1" placeholder="2"
                                        className="input input-sm sm:input-md input-bordered w-full rounded-xl bg-slate-50 focus:bg-white text-xs sm:text-sm"
                                    />
                                </div>

                                {/* Children */}
                                <div className="form-control">
                                    <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Children / Babies</span></label>
                                    <input
                                        name="babies" value={formData.babies} onChange={handleInput}
                                        type="number" min="0" placeholder="0"
                                        className="input input-sm sm:input-md input-bordered w-full rounded-xl bg-slate-50 focus:bg-white text-xs sm:text-sm"
                                    />
                                </div>
                            </div>

                            {/* Special Needs */}
                            <div className="form-control">
                                <label className="label py-0.5"><span className="label-text font-semibold text-slate-700 text-xs">Special Requests / Notes</span></label>
                                <textarea
                                    name="address" value={formData.specialNeeds} onChange={handleInput}
                                    // placeholder="Arrival time, extra mattress (paid), floor preference..."
                                    placeholder='Address'
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

export default Home
