import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { Upload, X } from 'lucide-react'

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

const RoomImageUploader = ({ uploadedImages, setUploadedImages }) => {
    const [uploading, setUploading] = useState(false)

    const handleMultipleImageUpload = async (e) => {
        const files = Array.from(e.target.files || [])
        if (files.length === 0) return

        setUploading(true)
        const uploadToast = toast.loading(`Uploading ${files.length} image(s) to Cloudinary...`)

        try {
            const uploadPromises = files.map(async (file) => {
                const formData = new FormData()
                formData.append("file", file)
                formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET)

                const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                    method: "POST",
                    body: formData
                })
                const data = await res.json()
                if (!data.secure_url) throw new Error("Failed to upload an image")
                return { url: data.secure_url, publicId: data.public_id }
            })

            const uploaded = await Promise.all(uploadPromises)
            setUploadedImages(prev => [...prev, ...uploaded])
            // toast.success(`Successfully uploaded ${uploaded.length} photo(s)!`, { id: uploadToast })
            toast.dismiss(uploadToast)
        } catch (err) {
            console.log(err)
            toast.error("Image upload failed. Please check network connection.", { id: uploadToast })
        } finally {
            setUploading(false)
            e.target.value = ""
        }
    }

    const removeImage = (index) => {
        setUploadedImages(prev => prev.filter((_, i) => i !== index))
    }

    return (
        <div className="form-control">
            <label className="label py-1">
                <span className="label-text font-semibold text-slate-700">Room Photos (Upload Multiple)</span>
                <span className="label-text-alt text-xs text-slate-400">{uploadedImages.length} photo(s) selected</span> <span className="text-red-500">*</span>
            </label>
            <div className="p-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 space-y-3">
                <div className="flex items-center gap-3">
                    <label className={`btn btn-sm btn-outline border-slate-300 gap-2 cursor-pointer ${uploading ? "btn-disabled" : ""}`}>
                        <Upload size={15} />
                        {uploading ? "Uploading..." : "Upload Multiple Photos"}
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={handleMultipleImageUpload}
                            disabled={uploading}
                        />
                    </label>
                    <span className="text-xs text-slate-500">Hold Ctrl/Shift to pick multiple images</span>
                </div>

                {uploadedImages.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5 pt-2">
                        {uploadedImages.map((img, idx) => (
                            <div key={`${img.url}-${idx}`} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                                <img src={img.url} alt={`upload-${idx}`} className="w-full h-full object-cover" />
                                {idx === 0 && (
                                    <span className="absolute bottom-1 left-1 badge badge-xs bg-teal-600 text-white border-none font-bold">
                                        Cover
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => removeImage(idx)}
                                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow-xs opacity-90 hover:opacity-100"
                                    title="Remove photo"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default RoomImageUploader
