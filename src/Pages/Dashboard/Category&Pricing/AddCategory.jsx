import axios from 'axios';
import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import CategoryImageUploader from './CategoryImageUploader';
import { getYouTubeEmbedUrl } from './categoryRoomUtils';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "https://miami-beach-resort.vercel.app"

const AddCategory = ({ children, className, refetch }) => {
    const modalRef = useRef()
    const formRef = useRef()
    const [uploadedImages, setUploadedImages] = useState([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    const handleOpen = () => {
        formRef.current?.reset()
        setUploadedImages([])
        modalRef.current?.showModal()
    }

    const handleClose = () => {
        if (isSubmitting) return
        modalRef.current?.close()
    }

    const handleAddCategory = async (e) => {
        e.preventDefault()

        const formData = Object.fromEntries(new FormData(e.target))

        // Parse room numbers into an array
        const roomNumbers = String(formData.roomNumbers || "")
            .split(",")
            .map(r => r.trim())
            .filter(Boolean)

        // Convert YouTube URL to embed URL
        const video = String(formData.video || "").trim()
        const youtubeEmbedUrl = getYouTubeEmbedUrl(video)
        if (video && !youtubeEmbedUrl) {
            toast.error("Please enter a valid YouTube video link")
            return
        }

        const payload = {
            ...formData,
            roomNumbers,
            video: youtubeEmbedUrl,
            images: uploadedImages,
            imageUrl: uploadedImages[0]?.url || "",
            imagePublicId: uploadedImages[0]?.publicId || "",
        }

        const toastId = toast.loading("Adding Category...")
        try {
            setIsSubmitting(true)
            const { data: result } = await axios.post(`${SERVER_URL}/categoryandroom`, payload)
            if (!result.insertedId) {
                throw new Error("Failed to add category")
            }
            modalRef.current?.close()
            formRef.current?.reset()
            setUploadedImages([])
            toast.success("Category added successfully!", { id: toastId })
            if (refetch) {
                try {
                    await refetch()
                } catch (e) {
                    console.error("Refetch error after adding category:", e)
                }
            }
        } catch (error) {
            toast.error(error.message || "Something went wrong", { id: toastId })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <>
            <button type="button" onClick={handleOpen} className={className}>{children}</button>
            <dialog ref={modalRef} className="modal">
                <div className="modal-box max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 ">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                        <div>
                            <h3 className="font-bold text-xl font-serif text-slate-900">Add New Category</h3>
                            <p className="text-sm text-slate-500 mt-0.5">Add a new room category with rooms and details.</p>
                        </div>
                        <button type="button" onClick={handleClose} className="btn btn-ghost btn-sm btn-circle" disabled={isSubmitting}>
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleAddCategory} ref={formRef} className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">

                        {/* Row 1: Category Name + Price */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="form-control">
                                <label className="label py-1">
                                    <span className="label-text font-semibold text-slate-700">Category Name</span>
                                    <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="e.g. Deluxe Sea View Suite"
                                    className="input input-bordered w-full rounded-xl"
                                    required
                                />
                            </div>
                            <div className="form-control">
                                <label className="label py-1">
                                    <span className="label-text font-semibold text-slate-700">Price / Night (৳)</span>
                                    <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    name="price"
                                    placeholder="e.g. 3500"
                                    className="input input-bordered w-full rounded-xl"
                                    required
                                    min="0"
                                />
                            </div>
                        </div>

                        {/* Room Numbers */}
                        <div className="form-control">
                            <label className="label py-1">
                                <span className="label-text font-semibold text-slate-700">Room Numbers</span>
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="roomNumbers"
                                placeholder="e.g. 101, 102, 103"
                                className="input input-bordered w-full rounded-xl"
                                required
                            />
                            <label className="label py-0.5">
                                <span className="label-text-alt text-slate-400">Separate room numbers with commas</span>
                            </label>
                        </div>

                        {/* Amenities */}
                        <div className="form-control">
                            <label className="label py-1">
                                <span className="label-text font-semibold text-slate-700">Amenities</span>
                            </label>
                            <input
                                type="text"
                                name="amenities"
                                placeholder="e.g. AC, Wi-Fi, Smart TV, Balcony, Mini Bar"
                                className="input input-bordered w-full rounded-xl"
                            />
                            <label className="label py-0.5">
                                <span className="label-text-alt text-slate-400">Separate amenities with commas</span>
                            </label>
                        </div>

                        {/* Description */}
                        <div className="form-control">
                            <label className="label py-1">
                                <span className="label-text font-semibold text-slate-700">Description</span>
                                <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                name="description"
                                rows={3}
                                placeholder="Write a short description about this room category..."
                                className="textarea textarea-bordered w-full rounded-xl resize-none"
                                required
                            />
                        </div>

                        {/* Video URL */}
                        <div className="form-control">
                            <label className="label py-1">
                                <span className="label-text font-semibold text-slate-700">Video (YouTube)</span>
                            </label>
                            <input
                                type="url"
                                name="video"
                                placeholder="https://www.youtube.com/watch?v=ZOxMPa-JBbY"
                                className="input input-bordered w-full rounded-xl"
                            />
                        </div>

                        {/* Image Upload */}
                        <CategoryImageUploader
                            uploadedImages={uploadedImages}
                            setUploadedImages={setUploadedImages}
                            onUploadingChange={setIsUploading}
                        />

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                className="btn btn-ghost rounded-xl"
                                onClick={handleClose}
                                disabled={isSubmitting || isUploading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary rounded-xl text-white px-6"
                                disabled={isSubmitting || isUploading}
                            >
                                {isUploading ? (
                                    <><span className="loading loading-spinner loading-sm" /> Uploading images...</>
                                ) : isSubmitting ? (
                                    <span className="loading loading-spinner loading-sm" />
                                ) : (
                                    "Add Category"
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
    );
};

export default AddCategory;
