import React, { useState, useEffect, useContext } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
    ArrowLeft,
    BedDouble,
    Star,
    ChevronLeft,
    ChevronRight,
    Video,
    Image as ImageIcon,
    Pencil,
    Trash2,
    Hash,
    Play,
    Wrench,
    CheckCircle2,
    Calendar,
    Plus,
    Clock,
    DollarSign,
    Tag
} from 'lucide-react'
import { parseFacilityList, parseRoomNumbers } from './categoryRoomUtils'
import EditCategory from './EditCategory'
import OutOfOrderModal from '../Calender/OutOfOrderModal'
import { AuthContext } from '../../../Context/AuthContext'
import useRole from '../../../hooks/useRole'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "https://miami-beach-resort.vercel.app"

const CategoryRoomDetails = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useContext(AuthContext)
    const { role } = useRole()
    const queryClient = useQueryClient()

    // mediaType: 'video' | 'image'
    const [mediaType, setMediaType] = useState('video')
    const [activeImageIndex, setActiveImageIndex] = useState(0)

    // Out of Order modal state
    const [isOutOfOrderOpen, setIsOutOfOrderOpen] = useState(false)
    const [selectedOOORoom, setSelectedOOORoom] = useState(null)

    // Schedule Price Form State
    const [scheduleDate, setScheduleDate] = useState('')
    const [schedulePrice, setSchedulePrice] = useState('')
    const [scheduleNote, setScheduleNote] = useState('')
    const [isSavingSchedule, setIsSavingSchedule] = useState(false)

    const { data: category, isLoading, refetch } = useQuery({
        queryKey: ["category-detail", id],
        queryFn: async () => {
            const { data } = await axios.get(`${SERVER_URL}/categoryandroom/${id}`)
            return data
        },
        enabled: !!id
    })

    // Fetch Out of Order records
    const { data: oooList = [], refetch: refetchOOO } = useQuery({
        queryKey: ["out-of-order-for-category-details"],
        queryFn: async () => {
            const { data } = await axios.get(`${SERVER_URL}/out-of-order`)
            return data
        }
    })

    const photos = category?.images?.length
        ? category.images
        : category?.imageUrl
            ? [{ url: category.imageUrl }]
            : []

    // Show video first if exists, otherwise first photo
    useEffect(() => {
        if (category) {
            if (category.video) {
                setMediaType('video')
            } else if (photos.length > 0) {
                setMediaType('image')
                setActiveImageIndex(0)
            }
        }
    }, [category])

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-8 bg-slate-200 rounded-xl w-48" />
                <div className="h-96 bg-slate-200 rounded-3xl" />
                <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map(n => <div key={n} className="h-24 bg-slate-200 rounded-xl" />)}
                </div>
            </div>
        )
    }

    if (!category) {
        return (
            <div className="text-center py-24">
                <BedDouble size={48} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 font-semibold">Category not found</p>
                <Link to="/dashboard/category&room" className="btn btn-sm btn-ghost mt-3 text-teal-700">
                    ← Back to Categories
                </Link>
            </div>
        )
    }

    const roomNumbers = parseRoomNumbers(category.roomNumbers || [])
    const amenities = parseFacilityList(category.amenities || "")
    const scheduledPrices = Array.isArray(category.scheduledPrices) ? category.scheduledPrices : []

    const prevImage = () => {
        if (photos.length === 0) return
        setMediaType('image')
        setActiveImageIndex(p => (p - 1 + photos.length) % photos.length)
    }

    const nextImage = () => {
        if (photos.length === 0) return
        setMediaType('image')
        setActiveImageIndex(p => (p + 1) % photos.length)
    }

    const handleDelete = () => {
        Swal.fire({
            title: "Delete Category?",
            text: `This will permanently remove "${category.name}" and all its photos.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#e11d48",
            cancelButtonColor: "#64748b",
            confirmButtonText: "Yes, delete it!"
        }).then(async (result) => {
            if (result.isConfirmed) {
                const toastId = toast.loading("Deleting category...")
                try {
                    const { data } = await axios.delete(`${SERVER_URL}/categoryandroom/${category._id}`)
                    if (data.deletedCount !== 1) throw new Error("Delete failed")
                    toast.success("Category deleted", { id: toastId })
                    navigate("/dashboard/category&room")
                } catch (error) {
                    toast.error(error.message || "Something went wrong", { id: toastId })
                }
            }
        })
    }

    const handleOpenOOOForRoom = (num) => {
        setSelectedOOORoom({
            roomNo: String(num).trim(),
            categoryId: category._id,
            categoryName: category.name
        })
        setIsOutOfOrderOpen(true)
    }

    const handleResolveOOO = async (oooRecord) => {
        const confirmed = await Swal.fire({
            title: `Resolve Out of Order for Room ${oooRecord.roomNo}?`,
            text: `This will mark Room ${oooRecord.roomNo} as active and available for guest reservations.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Yes, Mark Active",
            confirmButtonColor: "#01966e"
        })
        if (!confirmed.isConfirmed) return

        const toastId = toast.loading("Resolving room maintenance...")
        try {
            await axios.patch(`${SERVER_URL}/out-of-order/${oooRecord._id}`, {
                status: "resolved",
                resolvedBy: {
                    name: user?.displayName || "Staff",
                    email: user?.email || "",
                    role: role || "admin"
                }
            })
            await Promise.all([
                refetchOOO(),
                queryClient.invalidateQueries({ queryKey: ["out-of-order-calendar"] }),
                queryClient.invalidateQueries({ queryKey: ["all-bookings-for-calendar"] })
            ])
            toast.success(`Room ${oooRecord.roomNo} is now Active! 🎉`, { id: toastId })
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to resolve out of order status", { id: toastId })
        }
    }

    const handleSaveSchedulePrice = async (e) => {
        e.preventDefault()
        if (!scheduleDate || !schedulePrice) {
            toast.error("Please enter effective date and price.")
            return
        }

        setIsSavingSchedule(true)
        const toastId = toast.loading("Scheduling price change...")
        try {
            await axios.post(`${SERVER_URL}/categoryandroom/${category._id}/schedule-price`, {
                effectiveDate: scheduleDate,
                price: Number(schedulePrice),
                note: scheduleNote.trim()
            })
            await Promise.all([
                refetch(),
                queryClient.invalidateQueries({ queryKey: ["all-categories-for-calendar"] }),
                queryClient.invalidateQueries({ queryKey: ["categories"] })
            ])
            toast.success(`Price of ৳${Number(schedulePrice).toLocaleString()} scheduled for ${scheduleDate}!`, { id: toastId })
            setScheduleDate('')
            setSchedulePrice('')
            setScheduleNote('')
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to schedule price change", { id: toastId })
        } finally {
            setIsSavingSchedule(false)
        }
    }

    const handleDeleteSchedulePrice = async (effectiveDate) => {
        const toastId = toast.loading("Removing scheduled price...")
        try {
            await axios.delete(`${SERVER_URL}/categoryandroom/${category._id}/schedule-price/${effectiveDate}`)
            await Promise.all([
                refetch(),
                queryClient.invalidateQueries({ queryKey: ["all-categories-for-calendar"] }),
                queryClient.invalidateQueries({ queryKey: ["categories"] })
            ])
            toast.success("Scheduled price removed", { id: toastId })
        } catch (err) {
            toast.error("Failed to remove scheduled price", { id: toastId })
        }
    }

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Back nav & Actions */}
            <div className="flex items-center justify-between">
                <Link
                    to="/dashboard/category&room"
                    className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-teal-700 transition"
                >
                    <ArrowLeft size={16} /> Back to Categories
                </Link>
                <div className="flex items-center gap-2">
                    <EditCategory
                        category={category}
                        refetch={refetch}
                        className="btn btn-sm btn-outline rounded-xl gap-2"
                    >
                        <Pencil size={14} /> Edit
                    </EditCategory>
                    {role === "admin" && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            className="btn btn-sm btn-error btn-outline rounded-xl gap-2 text-red-600"
                        >
                            <Trash2 size={14} /> Delete
                        </button>
                    )}
                </div>
            </div>

            {/* Main Media Player: Video First, with Image Carousel */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="relative bg-slate-900 h-80 sm:h-[420px]">
                    {mediaType === 'video' && category.video ? (
                        <iframe
                            src={category.video}
                            title="Category Video"
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    ) : photos.length > 0 ? (
                        <>
                            <img
                                src={photos[activeImageIndex]?.url}
                                alt={`photo-${activeImageIndex}`}
                                className="w-full h-full object-cover"
                            />
                            {photos.length > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={prevImage}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 btn btn-circle btn-sm bg-black/50 border-none text-white hover:bg-black/70 z-10"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={nextImage}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-circle btn-sm bg-black/50 border-none text-white hover:bg-black/70 z-10"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                                        {photos.map((_, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => {
                                                    setMediaType('image')
                                                    setActiveImageIndex(idx)
                                                }}
                                                className={`h-1.5 rounded-full transition-all ${idx === activeImageIndex ? 'bg-white w-5' : 'bg-white/50 w-1.5'}`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}
                            <span className="absolute top-3 left-3 badge bg-black/60 text-white border-none text-xs font-semibold z-10">
                                <ImageIcon size={12} className="mr-1" />
                                Photo {activeImageIndex + 1} of {photos.length}
                            </span>
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500">
                            <div className="text-center">
                                <ImageIcon size={48} className="mx-auto mb-2 opacity-30" />
                                <p className="text-sm opacity-50">No media available</p>
                            </div>
                        </div>
                    )}

                    {/* Mode Toggle Controls (Video / Photos) */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                        {category.video && (
                            <button
                                type="button"
                                onClick={() => setMediaType('video')}
                                className={`btn btn-xs sm:btn-sm gap-1.5 border-none shadow-md ${mediaType === 'video' ? 'bg-teal-600 text-white' : 'bg-black/60 text-white hover:bg-black/80'}`}
                            >
                                <Video size={13} />
                                Video
                            </button>
                        )}
                        {photos.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setMediaType('image')}
                                className={`btn btn-xs sm:btn-sm gap-1.5 border-none shadow-md ${mediaType === 'image' ? 'bg-teal-600 text-white' : 'bg-black/60 text-white hover:bg-black/80'}`}
                            >
                                <ImageIcon size={13} />
                                Photos ({photos.length})
                            </button>
                        )}
                    </div>
                </div>

                {/* Combined Media Thumbnails Strip */}
                <div className="flex items-center gap-2.5 p-3.5 overflow-x-auto bg-slate-50 border-t border-slate-100">
                    {category.video && (
                        <button
                            type="button"
                            onClick={() => setMediaType('video')}
                            className={`relative shrink-0 w-24 h-16 rounded-xl overflow-hidden border-2 transition-all group ${mediaType === 'video' ? 'border-teal-500 ring-2 ring-teal-500/20' : 'border-slate-200 opacity-70 hover:opacity-100'}`}
                        >
                            <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center text-white">
                                <div className="w-6 h-6 rounded-full bg-teal-600/90 flex items-center justify-center mb-0.5">
                                    <Play size={12} className="ml-0.5" />
                                </div>
                                <span className="text-[10px] font-bold">Video</span>
                            </div>
                        </button>
                    )}

                    {photos.map((photo, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => {
                                setMediaType('image')
                                setActiveImageIndex(idx)
                            }}
                            className={`relative shrink-0 w-24 h-16 rounded-xl overflow-hidden border-2 transition-all ${mediaType === 'image' && idx === activeImageIndex ? 'border-teal-500 ring-2 ring-teal-500/20 opacity-100' : 'border-slate-200 opacity-70 hover:opacity-100'}`}
                        >
                            <img src={photo.url} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
                            {idx === 0 && (
                                <span className="absolute bottom-1 left-1 badge badge-xs bg-teal-600 text-white border-none text-[9px] font-bold">
                                    Cover
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Main Info - Left Col */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Title + Price */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-extrabold font-serif text-slate-900">{category.name}</h1>
                            </div>
                            <div className="text-right shrink-0 bg-teal-50 px-4 py-2 rounded-2xl border border-teal-100">
                                <p className="text-2xl font-bold text-[#009689]">৳{Number(category.price).toLocaleString()}</p>
                                <p className="text-xs text-slate-500">base price / night</p>
                            </div>
                        </div>

                        {category.description && (
                            <p className="text-sm text-slate-600 leading-relaxed mt-4 pt-4 border-t border-slate-100">
                                {category.description}
                            </p>
                        )}
                    </div>

                    {/* Room Inventory & Out-of-Order Controls */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BedDouble size={18} className="text-teal-600" />
                                <h2 className="font-bold text-slate-900">Rooms & Maintenance Status ({roomNumbers.length})</h2>
                            </div>
                        </div>

                        {roomNumbers.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {roomNumbers.map((num) => {
                                    const oooRecord = oooList.find(
                                        (o) => o.status === "active" && String(o.roomNo).trim() === String(num).trim()
                                    )
                                    const isOOO = !!oooRecord

                                    return (
                                        <div 
                                            key={num} 
                                            className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-2.5 ${
                                                isOOO 
                                                    ? 'bg-neutral-900 border-amber-500 text-white shadow-xs' 
                                                    : 'bg-slate-50 border-slate-200 hover:border-teal-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${
                                                        isOOO ? 'bg-amber-400/20 text-amber-300' : 'bg-teal-100 text-teal-800'
                                                    }`}>
                                                        <Hash size={14} />
                                                    </div>
                                                    <div>
                                                        <strong className={`text-base font-bold ${isOOO ? 'text-white' : 'text-slate-900'}`}>
                                                            Room {num}
                                                        </strong>
                                                        <span className="block text-[10px] text-slate-400">{category.name}</span>
                                                    </div>
                                                </div>

                                                <span className={`badge badge-sm font-bold border-none ${
                                                    isOOO ? 'bg-amber-400 text-neutral-950' : 'bg-emerald-100 text-emerald-800'
                                                }`}>
                                                    {isOOO ? 'Out of Order' : 'Active'}
                                                </span>
                                            </div>

                                            {isOOO && (
                                                <div className="text-[11px] text-amber-200/90 bg-black/40 p-2 rounded-xl space-y-0.5">
                                                    <p><strong>Reason:</strong> {oooRecord.reason}</p>
                                                    <p className="text-[10px] opacity-80">Period: {oooRecord.startDate} → {oooRecord.endDate}</p>
                                                </div>
                                            )}

                                            <div className="pt-1 border-t border-slate-200/40 flex justify-end">
                                                {isOOO ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleResolveOOO(oooRecord)}
                                                        className="btn btn-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg gap-1 border-none shadow-xs"
                                                    >
                                                        <CheckCircle2 size={12} />
                                                        <span>Resolve / Make Active</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenOOOForRoom(num)}
                                                        className="btn btn-xs btn-outline border-amber-400 text-amber-800 hover:bg-amber-100 rounded-lg gap-1"
                                                    >
                                                        <Wrench size={12} className="text-amber-600" />
                                                        <span>Set Out of Order</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400">No room numbers assigned to this category.</p>
                        )}
                    </div>

                    {/* Date-wise Scheduled Price History & Management */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <Tag size={18} className="text-teal-600" />
                                <div>
                                    <h2 className="font-bold text-slate-900">Scheduled Date-wise Pricing</h2>
                                    <p className="text-xs text-slate-500">Schedule future price changes (e.g. ৳2,999 from 26 Sep).</p>
                                </div>
                            </div>
                        </div>

                        {/* Add Schedule Form */}
                        <form onSubmit={handleSaveSchedulePrice} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                📅 Schedule New Price Change
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="form-control">
                                    <label className="label py-0.5">
                                        <span className="label-text text-xs font-semibold text-slate-700">Effective Date *</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={scheduleDate}
                                        onChange={e => setScheduleDate(e.target.value)}
                                        className="input input-sm input-bordered rounded-xl bg-white text-xs"
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="label py-0.5">
                                        <span className="label-text text-xs font-semibold text-slate-700">New Price / Night (৳) *</span>
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        placeholder="e.g. 2999"
                                        value={schedulePrice}
                                        onChange={e => setSchedulePrice(e.target.value)}
                                        className="input input-sm input-bordered rounded-xl bg-white text-xs font-bold text-teal-800"
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="label py-0.5">
                                        <span className="label-text text-xs font-semibold text-slate-700">Event / Note (Optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Peak Season Rate"
                                        value={scheduleNote}
                                        onChange={e => setScheduleNote(e.target.value)}
                                        className="input input-sm input-bordered rounded-xl bg-white text-xs"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-1">
                                <button
                                    type="submit"
                                    disabled={isSavingSchedule}
                                    className="btn btn-sm bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl px-4 border-none shadow-xs gap-1.5"
                                >
                                    {isSavingSchedule ? <span className="loading loading-spinner loading-xs" /> : <Plus size={14} />}
                                    <span>Schedule Price</span>
                                </button>
                            </div>
                        </form>

                        {/* List of Scheduled Prices */}
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Active Price Schedules ({scheduledPrices.length})
                            </h4>

                            {scheduledPrices.length > 0 ? (
                                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                                    {scheduledPrices
                                        .sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))
                                        .map((sp, idx) => (
                                            <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 transition">
                                                <div className="flex items-center gap-3">
                                                    <span className="badge badge-sm bg-teal-50 text-teal-800 border border-teal-200 font-bold">
                                                        From {sp.effectiveDate}
                                                    </span>
                                                    <strong className="text-slate-900 text-sm font-bold">
                                                        ৳{Number(sp.price).toLocaleString()} / night
                                                    </strong>
                                                    {sp.note && (
                                                        <span className="text-slate-500 italic">({sp.note})</span>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteSchedulePrice(sp.effectiveDate)}
                                                    className="btn btn-ghost btn-xs text-rose-600 hover:bg-rose-50"
                                                    title="Remove schedule"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 bg-slate-50 p-4 rounded-xl text-center">
                                    No scheduled price changes. Base price of <strong>৳{Number(category.price).toLocaleString()}</strong> applies for all dates.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Amenities */}
                    {amenities.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                            <div className="flex items-center gap-2 mb-4">
                                <Star size={18} className="text-amber-500" />
                                <h2 className="font-bold text-slate-900">Amenities</h2>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {amenities.map(amenity => (
                                    <span key={amenity} className="badge badge-md bg-amber-50 text-amber-700 border border-amber-200 font-medium px-3 py-2">
                                        {amenity}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Col — Quick Stats */}
                <div className="space-y-5">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 text-sm">
                        <h3 className="font-bold text-slate-900 text-base">Category Overview</h3>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Total Rooms</span>
                            <span className="font-bold text-slate-900">{roomNumbers.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Base Price</span>
                            <span className="font-bold text-[#009689]">৳{Number(category.price).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Scheduled Rates</span>
                            <span className="font-bold text-slate-900">{scheduledPrices.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Amenities</span>
                            <span className="font-bold text-slate-900">{amenities.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Photos</span>
                            <span className="font-bold text-slate-900">{photos.length}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Video Tour</span>
                            <span className="font-bold text-slate-900">{category.video ? "Available" : "None"}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Out of Order Modal */}
            <OutOfOrderModal
                isOpen={isOutOfOrderOpen}
                onClose={() => setIsOutOfOrderOpen(false)}
                initialRoom={selectedOOORoom}
                categories={category ? [category] : []}
                currentUser={user}
                role={role}
                onSuccess={async () => {
                    await Promise.all([
                        refetchOOO(),
                        queryClient.invalidateQueries({ queryKey: ["out-of-order-calendar"] }),
                        queryClient.invalidateQueries({ queryKey: ["all-bookings-for-calendar"] })
                    ])
                }}
            />
        </div>
    )
}

export default CategoryRoomDetails
