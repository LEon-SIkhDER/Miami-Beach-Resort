import React, { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { X } from 'lucide-react'
import RoomImageUploader from './RoomImageUploader'
import { getCategoryPrice, getYouTubeEmbedUrl } from './roomUtils'
import axios from 'axios'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000"

const AddRoom = ({ children, className, refetch }) => {
    const modalRef = useRef()
    const formRef = useRef()
    const [uploadedImages, setUploadedImages] = useState([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedCategoryName, setSelectedCategoryName] = useState("")

    const { data: categories = [] } = useQuery({
        queryKey: ["category-and-pricing"],
        queryFn: async () => {
            const res = await axios.get(`${SERVER_URL}/categoryandpricing`)
            return res.data
        }
    })

    const selectedPrice = getCategoryPrice(categories, selectedCategoryName)

    const handleOpen = () => {
        formRef.current?.reset()
        setSelectedCategoryName("")
        setUploadedImages([])
        modalRef.current?.showModal()
    }

    const handleClose = () => {
        if (isSubmitting) return
        modalRef.current?.close()
    }

    const handleAddRoom = async (e) => {
        e.preventDefault()
        modalRef.current.close()
        if (uploadedImages.length === 0) {
            toast.error("Please upload at least one room photo")
            return
        }

        const formData = Object.fromEntries(new FormData(e.target))
        formData.name = formData.name || formData.category
        console.log(formData);

        const video = String(formData.video || "").trim()
        const youtubeEmbedUrl = getYouTubeEmbedUrl(video)


        const toastId = toast.loading("Publishing room...")

        try {
            setIsSubmitting(true)
            await axios.post(`${SERVER_URL}/rooms`, {
                ...formData,
                video: youtubeEmbedUrl,
                price: selectedPrice,
                capacity: 2,
                images: uploadedImages,
                imageUrl: uploadedImages[0]?.url,
                imagePublicId: uploadedImages[0]?.publicId,
            })
            await refetch?.()
            toast.success("Room published successfully!", { id: toastId })
            formRef.current?.reset()
            setSelectedCategoryName("")
            setUploadedImages([])
            modalRef.current?.close()
        } catch (error) {
            toast.error("Failed to add room.", { id: toastId })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <>
            <button type="button" onClick={handleOpen} className={className}>{children}</button>
            <dialog ref={modalRef} className="modal">
                <div className="modal-box max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                        <h3 className="font-bold text-xl font-serif text-slate-900">Add New Suite / Room</h3>
                        <button type="button" onClick={handleClose} className="btn btn-ghost btn-sm btn-circle" disabled={isSubmitting}>
                            <X size={18} />
                        </button>
                    </div>
                  
                    <form onSubmit={handleAddRoom} ref={formRef} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Room No */}
                            <div className="form-control">
                                <label className="label py-1">
                                    <span className="label-text font-semibold text-slate-700">
                                        Room No.
                                    </span>
                                    <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="roomNo"
                                    placeholder="Enter room number"
                                    className="input input-bordered w-full rounded-xl"
                                    required
                                />
                            </div>

                            {/* Category */}
                            <div className="form-control">
                                <label className="label py-1">
                                    <span className="label-text font-semibold text-slate-700">
                                        Category
                                    </span>
                                    <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="category"
                                    className="select select-bordered w-full rounded-xl"
                                    onChange={e => setSelectedCategoryName(e.target.value)}
                                    required
                                >
                                    <option value="">Select Category</option>
                                    {categories.map(category => (
                                        <option key={category._id} value={category.name}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>

                                {selectedPrice > 0 && (
                                    <span className="text-xs font-semibold text-teal-700 mt-1">
                                        Price: ৳{selectedPrice.toLocaleString()} / night
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Facility */}
                        <div className="form-control">
                            <label className="label py-1">
                                <span className="label-text font-semibold text-slate-700">
                                    Facility
                                </span>
                            </label>
                            <input
                                type="text"
                                placeholder="AC, Wi-Fi, Smart TV, Balcony"
                                className="input input-bordered w-full rounded-xl"
                                name="facility"
                            />
                        </div>

                        {/* Description */}
                        <div className="form-control">
                            <label className="label py-1">
                                <span className="label-text font-semibold text-slate-700">
                                    Description
                                </span>
                                <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                placeholder="Description about room"
                                className="textarea textarea-bordered w-full rounded-xl"
                                rows={3}
                                required
                                name="description"
                            />
                        </div>

                        {/* Video */}
                        <div className="form-control">
                            <label className="label py-1">
                                <span className="label-text font-semibold text-slate-700">
                                    Video
                                </span>
                            </label>
                            <input
                                type="url"
                                placeholder="https://www.youtube.com/watch?v=ZOxMPa-JBbY"
                                className="input input-bordered w-full rounded-xl"
                                name="video"
                            />
                        </div>

                        <RoomImageUploader
                            uploadedImages={uploadedImages}
                            setUploadedImages={setUploadedImages}
                        />

                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                className="btn btn-ghost rounded-xl"
                                onClick={handleClose}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="btn btn-primary rounded-xl text-white px-6"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <span className="loading loading-spinner loading-sm" />
                                ) : (
                                    "Publish Room"
                                )}
                            </button>
                        </div>
                    </form>
               

                </div>
                <form method={isSubmitting ? undefined : "dialog"} className="modal-backdrop bg-slate-900/40 backdrop-blur-xs">
                    <button type="button" onClick={handleClose}>close</button>
                </form>
            </dialog>
        </>
    )
}

export default AddRoom
