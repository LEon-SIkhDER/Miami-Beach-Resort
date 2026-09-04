import axios from 'axios';
import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import CategoryImageUploader from './CategoryImageUploader';
import { getYouTubeEmbedUrl } from './categoryRoomUtils';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "https://miami-beach-resort.vercel.app"

const EditCategory = ({ children, className, refetch, category }) => {
    const modalRef = useRef()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [uploadedImages, setUploadedImages] = useState([])
    const [isUploading, setIsUploading] = useState(false)

    const handleOpen = () => {
        // Pre-fill images with existing ones
        setUploadedImages(
            category.images?.length
                ? category.images
                : category.imageUrl
                    ? [{ url: category.imageUrl, publicId: category.imagePublicId || "" }]
                    : []
        )
        modalRef.current?.showModal()
    }

    const handleClose = () => {
        if (isSubmitting) return
        modalRef.current?.close()
    }

    const handleEditCategory = async (e) => {
        e.preventDefault()
        const formData = Object.fromEntries(new FormData(e.target))

        // Parse room numbers into array
        const roomNumbers = String(formData.roomNumbers || "")
            .split(",")
            .map(r => r.trim())
            .filter(Boolean)

        // Convert video URL to embed
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

        const toastId = toast.loading("Updating Category...")
        try {
            setIsSubmitting(true)
            const { data: result } = await axios.patch(`${SERVER_URL}/categoryandroom/${category._id}`, payload)
            if (result.modifiedCount !== 1) {
                throw new Error("Failed to update category")
            }
            modalRef.current?.close()
            toast.success("Category updated!", { id: toastId })
            if (refetch) {
                try {
                    await refetch()
                } catch (e) {
                    console.error("Refetch error after editing category:", e)
                }
            }
        } catch (error) {
            toast.error(error.message || "Something went wrong", { id: toastId })
        } finally {
            setIsSubmitting(false)
        }
    }

    // Normalize existing room numbers for default value
    const defaultRoomNumbers = Array.isArray(category.roomNumbers)
        ? category.roomNumbers.join(", ")
        : String(category.roomNumbers || "")

    return (
        <>
            <button type="button" onClick={handleOpen} className={className} title="Edit Category">
                {children}
            </button>

            {createPortal(
                <dialog ref={modalRef} className="modal">
                    <div className="modal-box max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                            <div>
                                <h3 className="font-bold text-xl font-serif text-slate-900">Edit Category</h3>
                                <p className="text-sm text-slate-500 mt-0.5">Update category details and room assignments.</p>
                            </div>
                            <button type="button" onClick={handleClose} className="btn btn-ghost btn-sm btn-circle" disabled={isSubmitting}>
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleEditCategory} className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">

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
                                        defaultValue={category.name}
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
                                        defaultValue={category.price}
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
                                    defaultValue={defaultRoomNumbers}
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
                                    defaultValue={category.amenities || ""}
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
                                    defaultValue={category.description || ""}
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
                                    defaultValue={category.video || ""}
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
                                        "Save Changes"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                    <form method={isSubmitting ? undefined : "dialog"} className="modal-backdrop bg-slate-900/40 backdrop-blur-xs">
                        <button type="button" onClick={handleClose}>close</button>
                    </form>
                </dialog>,
                document.body
            )}
        </>
    );
};

export default EditCategory;
