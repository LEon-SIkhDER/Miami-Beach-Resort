import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
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
    Play
} from 'lucide-react'
import { parseFacilityList, parseRoomNumbers } from './categoryRoomUtils'
import EditCategory from './EditCategory'
import Swal from 'sweetalert2'
import toast from 'react-hot-toast'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000"

const CategoryRoomDetails = () => {
    const { id } = useParams()
    const navigate = useNavigate()

    // mediaType: 'video' | 'image'
    const [mediaType, setMediaType] = useState('video')
    const [activeImageIndex, setActiveImageIndex] = useState(0)

    const { data: category, isLoading, refetch } = useQuery({
        queryKey: ["category-detail", id],
        queryFn: async () => {
            const { data } = await axios.get(`${SERVER_URL}/categoryandroom/${id}`)
            return data
        },
        enabled: !!id
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

    return (
        <div className="space-y-6 max-w-4xl">
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
                    <button
                        type="button"
                        onClick={handleDelete}
                        className="btn btn-sm btn-error btn-outline rounded-xl gap-2 text-red-600"
                    >
                        <Trash2 size={14} /> Delete
                    </button>
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
                    {/* Video thumbnail item */}
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

                    {/* Image thumbnails */}
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
                                <p className="text-xs text-slate-500">per night</p>
                            </div>
                        </div>

                        {category.description && (
                            <p className="text-sm text-slate-600 leading-relaxed mt-4 pt-4 border-t border-slate-100">
                                {category.description}
                            </p>
                        )}
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

                {/* Right Col — Room Numbers & Stats */}
                <div className="space-y-5">
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                        <div className="flex items-center gap-2 mb-4">
                            <BedDouble size={18} className="text-teal-600" />
                            <h2 className="font-bold text-slate-900">Rooms ({roomNumbers.length})</h2>
                        </div>
                        {roomNumbers.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                                {roomNumbers.map(num => (
                                    <div key={num} className="bg-teal-50 border border-teal-200 rounded-xl p-2 text-center">
                                        <Hash size={12} className="text-teal-500 mx-auto mb-0.5" />
                                        <span className="text-sm font-bold text-teal-800">{num}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400">No room numbers assigned</p>
                        )}
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Total Rooms</span>
                            <span className="font-bold text-slate-900">{roomNumbers.length}</span>
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


        </div>
    )
}

export default CategoryRoomDetails
