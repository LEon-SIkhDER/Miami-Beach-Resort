import React, { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
    BedDouble,
    Search,
    ChevronLeft,
    ChevronRight,
    ArrowRight,
    Sparkles,
    Image as ImageIcon,
    Video,
    SlidersHorizontal,
    ArrowUpDown
} from 'lucide-react'
import { parseFacilityList, parseRoomNumbers } from '../Dashboard/Category&Pricing/categoryRoomUtils'

const Rooms = () => {
    const SERVER_URL = import.meta.env.VITE_SERVER_URL || ""

    const [searchQuery, setSearchQuery] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')
    const [sortBy, setSortBy] = useState('default')
    const [activeImageIndices, setActiveImageIndices] = useState({})

    // Debounce search query by 300ms
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    // Fetch all categories once for the dropdown options
    const { data: allCategories = [] } = useQuery({
        queryKey: ["public-categories-all"],
        queryFn: async () => {
            if (!SERVER_URL) return []
            try {
                const res = await axios.get(`${SERVER_URL}/categoryandroom`)
                return Array.isArray(res.data) ? res.data : []
            } catch (err) {
                console.error("Categories fetch error:", err)
                return []
            }
        },
        staleTime: 5 * 60 * 1000
    })

    // Fetch filtered categories via server API
    const {
        data: rawCategories = [],
        isLoading: categoriesLoading,
        isFetching: categoriesFetching,
        isPlaceholderData
    } = useQuery({
        queryKey: ["public-categories-filtered", debouncedSearch, categoryFilter, sortBy],
        queryFn: async () => {
            if (!SERVER_URL) return []
            try {
                const params = {}
                if (debouncedSearch.trim()) params.search = debouncedSearch.trim()
                if (categoryFilter) params.category = categoryFilter
                if (sortBy && sortBy !== 'default') params.sort = sortBy
                const res = await axios.get(`${SERVER_URL}/categoryandroom`, { params })
                return Array.isArray(res.data) ? res.data : []
            } catch (err) {
                console.error("Filtered categories fetch error:", err)
                return []
            }
        },
        staleTime: 5 * 60 * 1000,
        placeholderData: (previousData) => previousData,
    })

    const categories = Array.isArray(rawCategories) ? rawCategories : []
    const isFiltering = Boolean(isPlaceholderData || (searchQuery !== debouncedSearch))
    const isSearching = (searchQuery !== debouncedSearch) || (Boolean(isPlaceholderData) && Boolean(debouncedSearch.trim()))

    // Image navigation handlers
    const handlePrevImage = (e, catId, total) => {
        e.preventDefault()
        e.stopPropagation()
        setActiveImageIndices(prev => ({
            ...prev,
            [catId]: ((prev[catId] || 0) - 1 + total) % total
        }))
    }

    const handleNextImage = (e, catId, total) => {
        e.preventDefault()
        e.stopPropagation()
        setActiveImageIndices(prev => ({
            ...prev,
            [catId]: ((prev[catId] || 0) + 1) % total
        }))
    }

    return (
        <div className="min-h-screen relative bg-[#f7f4ed] text-slate-800 overflow-hidden">
            {/* Subtle radial luxury pattern backdrop matching Concierge / Contact section */}
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#c5a880_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

            {/* ══════════════════════════════════════════════════════
                ROOMS LISTING & FILTER SECTION
            ══════════════════════════════════════════════════════ */}
            <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
                {/* Section Heading & Breadcrumb */}
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <Link to="/" className="hover:text-[#04261f] transition-colors">Home</Link>
                        <span>/</span>
                        <span className="text-slate-800">Suites & Rooms</span>
                    </div>

                    <div className="flex items-end justify-between gap-3">
                        <div>
                            <span className="text-xs font-bold text-[#04261f] uppercase tracking-widest block mb-1">
                                Available Accommodations
                            </span>
                            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 flex items-center gap-3">
                                Explore All Rooms
                                <span className="text-sm font-bold bg-[#04261f]/8 text-[#04261f] px-3 py-0.5 rounded-full border border-[#04261f]/15 font-sans flex items-center gap-1">
                                    {(isFiltering || (categoriesLoading && categories.length === 0))
                                        ? <span className="loading loading-spinner loading-xs" />
                                        : categories.length
                                    }
                                </span>
                            </h1>
                        </div>
                    </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search rooms or amenities..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-2.5 bg-slate-50 hover:bg-white focus:bg-white rounded-xl border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#04261f] transition-colors"
                        />
                        {isSearching && (
                            <span className="loading loading-spinner loading-xs text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        )}
                    </div>

                    <div className="h-px sm:h-8 w-full sm:w-px bg-slate-200 shrink-0" />

                    {/* Category Dropdown */}
                    <div className="relative flex items-center gap-2 shrink-0">
                        <SlidersHorizontal size={13} className="text-slate-400 shrink-0" />
                        <select
                            className="select select-sm rounded-xl bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#04261f] transition-colors cursor-pointer pr-8"
                            value={categoryFilter}
                            onChange={e => setCategoryFilter(e.target.value)}
                        >
                            <option value="">All Categories</option>
                            {allCategories.map(cat => (
                                <option key={cat._id} value={cat.name}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Sort Dropdown */}
                    <div className="relative flex items-center gap-2 shrink-0">
                        <ArrowUpDown size={13} className="text-slate-400 shrink-0" />
                        <select
                            className="select select-sm rounded-xl bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#04261f] transition-colors cursor-pointer pr-8"
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value)}
                        >
                            <option value="default">Sort: Default</option>
                            <option value="price-asc">Price: Low to High</option>
                            <option value="price-desc">Price: High to Low</option>
                            <option value="name-asc">Name: A to Z</option>
                        </select>
                    </div>
                </div>

                {/* Rooms Grid */}
                {categoriesLoading && categories.length === 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {[1, 2, 3, 4, 5, 6].map(n => (
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
                ) : categories.length === 0 && !isFiltering && !categoriesLoading ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
                        <BedDouble size={48} className="mx-auto text-slate-300 mb-2" />
                        <h3 className="text-xl font-bold text-slate-700 font-serif">No accommodations found</h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            No room categories match your current search or filter criteria.
                        </p>
                        {(searchQuery || categoryFilter || sortBy !== 'default') && (
                            <button
                                onClick={() => { setSearchQuery(''); setCategoryFilter(''); setSortBy('default') }}
                                className="btn btn-sm btn-ghost text-teal-700 underline font-bold mt-2 cursor-pointer"
                            >
                                Reset all filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 transition-opacity duration-200 ${isFiltering ? 'opacity-60' : 'opacity-100'}`}>
                        {categories.map(cat => {
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
                                    className="group bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xs hover:shadow-xl royal-card-hover flex flex-col justify-between transition-all duration-300"
                                >
                                    <div>
                                        {/* Photo Carousel Container */}
                                        <Link to={`/room/${cat._id}`} className="relative h-60 sm:h-64 bg-slate-100 overflow-hidden select-none block">
                                            {currentImgSrc ? (
                                                <img
                                                    src={currentImgSrc}
                                                    alt={cat.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-100">
                                                    <ImageIcon size={40} />
                                                    <span className="text-xs mt-1 font-medium font-serif">Miami Beach Resort</span>
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

                                            {/* Carousel arrows */}
                                            {photos.length > 1 && (
                                                <>
                                                    <button
                                                        onClick={e => handlePrevImage(e, cat._id, photos.length)}
                                                        className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#021813]/70 text-white flex items-center justify-center hover:bg-[#04261f] transition-colors z-10 cursor-pointer"
                                                        aria-label="Previous photo"
                                                    >
                                                        <ChevronLeft size={16} />
                                                    </button>
                                                    <button
                                                        onClick={e => handleNextImage(e, cat._id, photos.length)}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#021813]/70 text-white flex items-center justify-center hover:bg-[#04261f] transition-colors z-10 cursor-pointer"
                                                        aria-label="Next photo"
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

                                        {/* Room Card Body */}
                                        <div className="p-5 sm:p-6 space-y-3">
                                            <Link to={`/room/${cat._id}`}>
                                                <h3 className="text-lg sm:text-xl font-bold text-slate-900 font-serif group-hover:text-[#064e3b] transition-colors">
                                                    {cat.name}
                                                </h3>
                                            </Link>
                                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-light">
                                                {cat.description || "Comfortable beachfront accommodation with modern amenities and sea view."}
                                            </p>

                                            {/* Amenities Badges */}
                                            {amenities.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 min-h-8">
                                                    {amenities.slice(0, 4).map(a => (
                                                        <span
                                                            key={a}
                                                            className="uppercase badge badge-sm bg-[#04261f]/5 text-[#04261f] border border-[#c5a880]/30 font-semibold text-[10px]"
                                                        >
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

                                    {/* Action Buttons: Details + Book Now */}
                                    <div className="p-5 sm:p-6 pt-0 flex items-center gap-2.5">
                                        <Link
                                            to={`/room/${cat._id}`}
                                            className="btn btn-sm btn-outline border-slate-300 text-slate-700 hover:bg-slate-50 rounded-2xl text-xs px-4"
                                        >
                                            Details
                                        </Link>
                                        <Link
                                            to={`/room/${cat._id}`}
                                            className="btn btn-sm flex-1 rounded-2xl gap-1.5 font-bold shadow-xs bg-gradient-to-r from-[#dfc89e] via-[#c5a880] to-[#ad8a57] text-[#03221b] border-none hover:brightness-110 text-xs cursor-pointer"
                                        >
                                            <span>Book Now</span>
                                            <ArrowRight size={14} />
                                        </Link>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    )
}

export default Rooms
