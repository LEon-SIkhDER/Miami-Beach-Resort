import React, { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
    X,
    BedDouble,
    DollarSign,
    Star,
    ChevronLeft,
    ChevronRight,
    Video,
    Image as ImageIcon
} from 'lucide-react'
import { parseFacilityList, parseRoomNumbers } from './categoryRoomUtils'

const ViewCategoryRoom = ({ children, className, category }) => {
    const modalRef = useRef()
    const [activePhoto, setActivePhoto] = useState(0)
    const [showVideo, setShowVideo] = useState(false)

    const photos = category.images?.length
        ? category.images
        : category.imageUrl
            ? [{ url: category.imageUrl }]
            : []

    const roomNumbers = parseRoomNumbers(category.roomNumbers || [])
    const amenities = parseFacilityList(category.amenities || "")

    const handleOpen = () => {
        setActivePhoto(0)
        setShowVideo(false)
        modalRef.current?.showModal()
    }

    const handleClose = () => modalRef.current?.close()

    const prevPhoto = () => setActivePhoto(p => (p - 1 + photos.length) % photos.length)
    const nextPhoto = () => setActivePhoto(p => (p + 1) % photos.length)

    return (
        <>
            <button type="button" onClick={handleOpen} className={className} title="View Details">
                {children}
            </button>

            {createPortal(
                <dialog ref={modalRef} className="modal">
                    <div className="modal-box max-w-3xl bg-white rounded-3xl p-0 overflow-hidden shadow-2xl border border-slate-100">

                        {/* Photo / Video Section */}
                        <div className="relative bg-slate-900 h-64 sm:h-80">
                            {showVideo && category.video ? (
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
                                        src={photos[activePhoto]?.url}
                                        alt={`photo-${activePhoto}`}
                                        className="w-full h-full object-cover"
                                    />
                                    {/* Photo navigation */}
                                    {photos.length > 1 && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={prevPhoto}
                                                className="absolute left-3 top-1/2 -translate-y-1/2 btn btn-circle btn-sm bg-black/40 border-none text-white hover:bg-black/60"
                                            >
                                                <ChevronLeft size={18} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={nextPhoto}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 btn btn-circle btn-sm bg-black/40 border-none text-white hover:bg-black/60"
                                            >
                                                <ChevronRight size={18} />
                                            </button>
                                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                                                {photos.map((_, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setActivePhoto(idx)}
                                                        className={`w-1.5 h-1.5 rounded-full transition-all ${idx === activePhoto ? 'bg-white w-4' : 'bg-white/50'}`}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                    <span className="absolute top-3 left-3 badge bg-black/50 text-white border-none text-xs font-semibold">
                                        <ImageIcon size={12} className="mr-1" />
                                        {activePhoto + 1} / {photos.length}
                                    </span>
                                </>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-500">
                                    <div className="text-center">
                                        <ImageIcon size={48} className="mx-auto mb-2 opacity-30" />
                                        <p className="text-sm opacity-50">No photos available</p>
                                    </div>
                                </div>
                            )}

                            {/* Video toggle button */}
                            {category.video && (
                                <button
                                    type="button"
                                    onClick={() => setShowVideo(v => !v)}
                                    className={`absolute top-3 right-12 btn btn-sm gap-1.5 border-none ${showVideo ? 'bg-teal-600 text-white' : 'bg-black/50 text-white hover:bg-black/70'}`}
                                >
                                    <Video size={14} />
                                    {showVideo ? "Photos" : "Video"}
                                </button>
                            )}

                            {/* Close button */}
                            <button
                                type="button"
                                onClick={handleClose}
                                className="absolute top-3 right-3 btn btn-circle btn-sm bg-black/40 border-none text-white hover:bg-black/60"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 sm:p-8 space-y-5">
                            {/* Title + Price */}
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold font-serif text-slate-900">{category.name}</h2>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-2xl font-bold text-[#009689]">৳{Number(category.price).toLocaleString()}</p>
                                    <p className="text-xs text-slate-400">per night</p>
                                </div>
                            </div>

                            {/* Room Numbers */}
                            {roomNumbers.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <BedDouble size={16} className="text-teal-600" />
                                        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                                            Rooms ({roomNumbers.length})
                                        </h4>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {roomNumbers.map(num => (
                                            <span key={num} className="badge badge-md bg-teal-50 text-teal-700 border border-teal-200 font-bold px-3">
                                                Room {num}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Amenities */}
                            {amenities.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Star size={16} className="text-amber-500" />
                                        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Amenities</h4>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {amenities.map(amenity => (
                                            <span key={amenity} className="badge badge-sm bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                                                {amenity}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            {category.description && (
                                <div>
                                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">Description</h4>
                                    <p className="text-sm text-slate-600 leading-relaxed">{category.description}</p>
                                </div>
                            )}

                            {/* Photo thumbnails */}
                            {photos.length > 1 && (
                                <div>
                                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">All Photos ({photos.length})</h4>
                                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                        {photos.map((photo, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => { setActivePhoto(idx); setShowVideo(false) }}
                                                className={`aspect-video rounded-lg overflow-hidden border-2 transition-all ${idx === activePhoto && !showVideo ? 'border-teal-500' : 'border-slate-200 opacity-70 hover:opacity-100'}`}
                                            >
                                                <img src={photo.url} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Close button */}
                            <div className="flex justify-end pt-2 border-t border-slate-100">
                                <button type="button" onClick={handleClose} className="btn btn-ghost rounded-xl">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop bg-slate-900/40 backdrop-blur-xs">
                        <button type="button" onClick={handleClose}>close</button>
                    </form>
                </dialog>,
                document.body
            )}
        </>
    )
}

export default ViewCategoryRoom
