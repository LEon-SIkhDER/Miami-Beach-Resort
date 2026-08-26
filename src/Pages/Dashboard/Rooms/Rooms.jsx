import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
import toast from 'react-hot-toast'
import { showConfirmAlert } from '../../../utils/customSwal'
import { 
    Plus, 
    Pencil, 
    Trash2, 
    ToggleLeft, 
    ToggleRight, 
    Upload, 
    BedDouble, 
    Users, 
    Eye, 
    Sparkles, 
    Image as ImageIcon,
    X,
    Layers
} from 'lucide-react'

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

const Rooms = () => {
    const axiosSecure = useAxiosSecure()
    const queryClient = useQueryClient()
    const [addModalOpen, setAddModalOpen] = useState(false)
    const [editRoom, setEditRoom] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [uploadedImages, setUploadedImages] = useState([]) // Array of { url, publicId }

    const { register: registerAdd, handleSubmit: handleAddSubmit, reset: resetAdd, formState: { errors: addErrors } } = useForm()
    const { register: registerEdit, handleSubmit: handleEditSubmit, reset: resetEdit, formState: { errors: editErrors } } = useForm()

    const { data: rooms = [], isLoading } = useQuery({
        queryKey: ["all-rooms"],
        queryFn: async () => {
            const res = await axiosSecure.get("/rooms")
            return res.data
        }
    })

    // Multi-image upload to Cloudinary
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
                if (data.secure_url) {
                    return { url: data.secure_url, publicId: data.public_id }
                } else {
                    throw new Error("Failed to upload an image")
                }
            })

            const uploaded = await Promise.all(uploadPromises)
            setUploadedImages(prev => [...prev, ...uploaded])
            toast.success(`Successfully uploaded ${uploaded.length} photo(s)!`, { id: uploadToast })
        } catch (err) {
            console.log(err)
            toast.error("Image upload failed. Please check network connection.", { id: uploadToast })
        } finally {
            setUploading(false)
        }
    }

    const removeImage = (index) => {
        setUploadedImages(prev => prev.filter((_, i) => i !== index))
    }

    const addMutation = useMutation({
        mutationFn: async (data) => {
            const res = await axiosSecure.post("/rooms", data)
            return res.data
        },
        onMutate: () => ({ toastId: toast.loading("Publishing room...") }),
        onSuccess: async (_, __, context) => {
            await queryClient.invalidateQueries({ queryKey: ["all-rooms"] })
            await queryClient.invalidateQueries({ queryKey: ["active-rooms"] })
            toast.dismiss(context?.toastId)
            toast.success("Room published successfully!")
            resetAdd()
            setUploadedImages([])
            setAddModalOpen(false)
        },
        onError: (_, __, context) => {
            toast.dismiss(context?.toastId)
            toast.error("Failed to add room.")
        }
    })

    const editMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const res = await axiosSecure.patch(`/room/${id}`, data)
            return res.data
        },
        onMutate: () => ({ toastId: toast.loading("Saving changes...") }),
        onSuccess: async (_, __, context) => {
            await queryClient.invalidateQueries({ queryKey: ["all-rooms"] })
            await queryClient.invalidateQueries({ queryKey: ["active-rooms"] })
            toast.dismiss(context?.toastId)
            toast.success(" Room updated successfully!")
            setEditRoom(null)
            setUploadedImages([])
        },
        onError: (_, __, context) => {
            toast.dismiss(context?.toastId)
            toast.error("Failed to update room.")
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const res = await axiosSecure.delete(`/room/${id}`)
            return res.data
        },
        onMutate: () => ({ toastId: toast.loading("Deleting room...") }),
        onSuccess: async (_, __, context) => {
            await queryClient.invalidateQueries({ queryKey: ["all-rooms"] })
            await queryClient.invalidateQueries({ queryKey: ["active-rooms"] })
            toast.dismiss(context?.toastId)
            toast.success("🗑️ Room deleted successfully!")
        },
        onError: (_, __, context) => {
            toast.dismiss(context?.toastId)
            toast.error("Failed to delete room.")
        }
    })

    const statusMutation = useMutation({
        mutationFn: async ({ id, status }) => {
            const res = await axiosSecure.patch(`/room/${id}`, { status })
            return res.data
        },
        onSuccess: async (_, variables) => {
            await queryClient.invalidateQueries({ queryKey: ["all-rooms"] })
            await queryClient.invalidateQueries({ queryKey: ["active-rooms"] })
            toast.dismiss(variables.toastId)
            toast.success(variables.isActivating ? "Room activated and now visible on site!" : "Room deactivated and hidden from site!")
        },
        onError: (_, variables) => {
            toast.dismiss(variables.toastId)
            toast.error("Failed to change room status")
        }
    })

    const handleToggleStatus = (room) => {
        const isActivating = room.status !== "active"
        const toastId = toast.loading(isActivating ? "Activating room..." : "Deactivating room...")
        statusMutation.mutate({ 
            id: room._id, 
            status: isActivating ? "active" : "inactive", 
            toastId, 
            isActivating 
        })
    }

    const onAddSubmit = (data) => {
        if (uploadedImages.length === 0) {
            toast.error("Please upload at least one room photo")
            return
        }
        addMutation.mutate({
            ...data,
            price: Number(data.price),
            capacity: Number(data.capacity),
            images: uploadedImages,
            imageUrl: uploadedImages[0]?.url,
            imagePublicId: uploadedImages[0]?.publicId,
        })
    }

    const onEditSubmit = (data) => {
        const payload = {
            ...data,
            price: Number(data.price),
            capacity: Number(data.capacity),
        }
        if (uploadedImages.length > 0) {
            payload.images = uploadedImages
            payload.imageUrl = uploadedImages[0]?.url
            payload.imagePublicId = uploadedImages[0]?.publicId
        }
        editMutation.mutate({ id: editRoom._id, data: payload })
    }

    const handleDelete = (id, name) => {
        showConfirmAlert(
            `Delete "${name}"?`,
            "This will delete the room and all its uploaded photos from Cloudinary.",
            "Yes, delete room",
            true
        ).then(result => {
            if (result.isConfirmed) deleteMutation.mutate(id)
        })
    }

    const handleOpenEdit = (room) => {
        setEditRoom(room)
        setUploadedImages(room.images || (room.imageUrl ? [{ url: room.imageUrl, publicId: room.imagePublicId }] : []))
        resetEdit({
            name: room.name,
            category: room.category,
            view: room.view,
            price: room.price,
            capacity: room.capacity,
            description: room.description || "",
        })
    }

    const MultiImageUploader = () => (
        <div className="form-control">
            <label className="label py-1">
                <span className="label-text font-semibold text-slate-700">Room Photos (Upload Multiple)</span>
                <span className="label-text-alt text-xs text-slate-400">{uploadedImages.length} photo(s) selected</span>
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
                            <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100">
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight">
                        Rooms Management
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Add, edit, manage suites and control bookability on the public website.
                    </p>
                </div>
                <button
                    onClick={() => { setAddModalOpen(true); setUploadedImages([]); resetAdd() }}
                    className="btn btn-primary btn-sm rounded-xl gap-2 shadow-sm shadow-teal-600/20 text-white"
                >
                    <Plus size={16} /> Add New Room
                </button>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                        <thead>
                            <tr className="bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-wider">
                                <th>#</th>
                                <th>Photo Gallery</th>
                                <th>Room Name</th>
                                <th>Category</th>
                                <th>View</th>
                                <th>Price / Night</th>
                                <th>Capacity</th>
                                <th>Status</th>
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {isLoading ? (
                                [1, 2, 3, 4].map(n => (
                                    <tr key={n} className="animate-pulse">
                                        <td><div className="h-4 bg-slate-200 rounded w-4"></div></td>
                                        <td><div className="h-10 w-14 bg-slate-200 rounded-lg"></div></td>
                                        <td><div className="h-4 bg-slate-200 rounded w-32"></div></td>
                                        <td><div className="h-5 bg-slate-200 rounded-full w-20"></div></td>
                                        <td><div className="h-5 bg-slate-200 rounded-full w-24"></div></td>
                                        <td><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                                        <td><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                                        <td><div className="h-5 bg-slate-200 rounded-full w-28"></div></td>
                                        <td className="text-right"><div className="h-8 bg-slate-200 rounded-lg w-24 ml-auto"></div></td>
                                    </tr>
                                ))
                            ) : rooms.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-12 text-slate-400">
                                        <BedDouble size={36} className="mx-auto mb-2 opacity-50" />
                                        No rooms added yet. Click "Add New Room" above.
                                    </td>
                                </tr>
                            ) : (
                                rooms.map((room, i) => (
                                    <tr key={room._id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="font-mono text-xs text-slate-400">{i + 1}</td>
                                        <td>
                                            <div className="relative inline-block">
                                                {room.imageUrl ? (
                                                    <img src={room.imageUrl} alt={room.name} className="w-14 h-10 object-cover rounded-lg border border-slate-200" />
                                                ) : (
                                                    <div className="w-14 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300">
                                                        <ImageIcon size={16} />
                                                    </div>
                                                )}
                                                {room.images?.length > 1 && (
                                                    <span className="absolute -bottom-1 -right-1 badge badge-xs bg-slate-800 text-white font-bold border-none">
                                                        +{room.images.length}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="font-bold text-slate-900">{room.name}</td>
                                        <td>
                                            <span className="badge badge-sm bg-slate-100 text-slate-700 border-none font-medium">
                                                {room.category}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="badge badge-sm bg-teal-50 text-teal-700 border border-teal-200/60 font-medium">
                                                {room.view}
                                            </span>
                                        </td>
                                        <td className="font-semibold text-slate-900">৳{room.price?.toLocaleString()}</td>
                                        <td className="text-slate-600">{room.capacity} Persons</td>
                                        <td>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                room.status === "active" 
                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                            }`}>
                                                {room.status === "active" ? "Active (Bookable)" : "Deactivated"}
                                            </span>
                                        </td>
                                        <td className="text-right">
                                            <div className="inline-flex items-center gap-1">
                                                <button
                                                    onClick={() => handleToggleStatus(room)}
                                                    className="btn btn-ghost btn-xs btn-square"
                                                    title={room.status === "active" ? "Click to Deactivate" : "Click to Activate"}
                                                >
                                                    {room.status === "active" ? (
                                                        <ToggleRight size={22} className="text-emerald-600" />
                                                    ) : (
                                                        <ToggleLeft size={22} className="text-slate-400" />
                                                    )}
                                                </button>
                                                <button 
                                                    onClick={() => handleOpenEdit(room)} 
                                                    className="btn btn-ghost btn-xs btn-square text-teal-700 hover:bg-teal-50"
                                                    title="Edit Room"
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(room._id, room.name)} 
                                                    className="btn btn-ghost btn-xs btn-square text-red-500 hover:bg-red-50"
                                                    title="Delete Room"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Cards View (Optimized down to 320px) */}
            <div className="md:hidden space-y-3.5">
                {isLoading ? (
                    [1, 2, 3].map(n => (
                        <div key={n} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs animate-pulse space-y-3">
                            <div className="flex gap-3">
                                <div className="w-20 h-20 bg-slate-200 rounded-xl shrink-0"></div>
                                <div className="flex-1 space-y-2 py-1">
                                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                                    <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                                </div>
                            </div>
                            <div className="h-9 bg-slate-200 rounded-xl w-full"></div>
                        </div>
                    ))
                ) : rooms.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl text-center text-slate-400 border border-slate-200">
                        <BedDouble size={36} className="mx-auto mb-2 opacity-50" />
                        No rooms added yet.
                    </div>
                ) : (
                    rooms.map(room => (
                        <div key={room._id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                            <div className="flex gap-3">
                                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                                    {room.imageUrl ? (
                                        <img src={room.imageUrl} alt={room.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            <ImageIcon size={20} />
                                        </div>
                                    )}
                                    {room.images?.length > 1 && (
                                        <span className="absolute bottom-1 right-1 badge badge-xs bg-slate-900/80 text-white font-bold border-none">
                                            +{room.images.length}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-900 text-sm truncate">{room.name}</h3>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        <span className="badge badge-xs bg-slate-100 text-slate-700 border-none font-medium">
                                            {room.category}
                                        </span>
                                        <span className="badge badge-xs bg-teal-50 text-teal-700 border border-teal-200/60 font-medium">
                                            {room.view}
                                        </span>
                                    </div>
                                    <p className="font-bold text-teal-800 text-sm mt-1.5">
                                        ৳{room.price?.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">/ night</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                        room.status === "active" 
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                            : "bg-rose-50 text-rose-700 border border-rose-200"
                                    }`}>
                                        {room.status === "active" ? "Active" : "Deactivated"}
                                    </span>
                                    <span className="text-slate-500 text-[11px]">• {room.capacity} Persons</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleToggleStatus(room)}
                                        className="btn btn-ghost btn-xs btn-square"
                                        title={room.status === "active" ? "Click to Deactivate" : "Click to Activate"}
                                    >
                                        {room.status === "active" ? (
                                            <ToggleRight size={22} className="text-emerald-600" />
                                        ) : (
                                            <ToggleLeft size={22} className="text-slate-400" />
                                        )}
                                    </button>
                                    <button 
                                        onClick={() => handleOpenEdit(room)} 
                                        className="btn btn-ghost btn-xs btn-square text-teal-700 hover:bg-teal-50"
                                        title="Edit Room"
                                    >
                                        <Pencil size={15} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(room._id, room.name)} 
                                        className="btn btn-ghost btn-xs btn-square text-red-500 hover:bg-red-50"
                                        title="Delete Room"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Room Modal */}
            {addModalOpen && (
                <dialog open className="modal modal-open">
                    <div className="modal-box max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                            <h3 className="font-bold text-xl font-serif text-slate-900">Add New Suite / Room</h3>
                            <button onClick={() => setAddModalOpen(false)} className="btn btn-ghost btn-sm btn-circle">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleAddSubmit(onAddSubmit)} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="form-control">
                                    <label className="label py-1"><span className="label-text font-semibold text-slate-700">Room Name</span></label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Front Side Couple Room"
                                        className={`input input-bordered w-full rounded-xl ${addErrors.name ? "input-error" : ""}`}
                                        {...registerAdd("name", { required: "Name is required" })}
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label py-1"><span className="label-text font-semibold text-slate-700">Category</span></label>
                                    <select
                                        className={`select select-bordered w-full rounded-xl ${addErrors.category ? "select-error" : ""}`}
                                        {...registerAdd("category", { required: "Category is required" })}
                                    >
                                        <option value="">Select Category</option>
                                        <option value="Couple">Couple</option>
                                        <option value="Family Suite">Family Suite</option>
                                        <option value="Double Bed">Double Bed</option>
                                        <option value="Standard">Standard</option>
                                    </select>
                                </div>
                                <div className="form-control">
                                    <label className="label py-1"><span className="label-text font-semibold text-slate-700">View</span></label>
                                    <select
                                        className={`select select-bordered w-full rounded-xl ${addErrors.view ? "select-error" : ""}`}
                                        {...registerAdd("view", { required: "View is required" })}
                                    >
                                        <option value="">Select View</option>
                                        <option value="Sea View">Sea View</option>
                                        <option value="Balcony Sea View">Balcony Sea View</option>
                                        <option value="Balcony">Balcony</option>
                                        <option value="Non-Balcony">Non-Balcony</option>
                                    </select>
                                </div>
                                <div className="form-control">
                                    <label className="label py-1"><span className="label-text font-semibold text-slate-700">Price Per Night (৳)</span></label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 4000"
                                        className={`input input-bordered w-full rounded-xl ${addErrors.price ? "input-error" : ""}`}
                                        {...registerAdd("price", { required: "Price is required", min: 1 })}
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label py-1"><span className="label-text font-semibold text-slate-700">Capacity (Persons)</span></label>
                                    <input
                                        type="number"
                                        placeholder="2"
                                        className={`input input-bordered w-full rounded-xl ${addErrors.capacity ? "input-error" : ""}`}
                                        {...registerAdd("capacity", { required: "Capacity is required", min: 1 })}
                                    />
                                </div>
                            </div>
                            <div className="form-control">
                                <label className="label py-1"><span className="label-text font-semibold text-slate-700">Description and Amenities</span></label>
                                <textarea
                                    placeholder="Describe room features, bedding, balcony details..."
                                    className="textarea textarea-bordered w-full rounded-xl"
                                    rows={3}
                                    {...registerAdd("description")}
                                />
                            </div>
                            <MultiImageUploader />
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" className="btn btn-ghost rounded-xl" onClick={() => setAddModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary rounded-xl text-white px-6" disabled={addMutation.isPending || uploading}>
                                    {addMutation.isPending ? <span className="loading loading-spinner loading-sm" /> : "Publish Room"}
                                </button>
                            </div>
                        </form>
                    </div>
                    <div className="modal-backdrop bg-slate-900/40 backdrop-blur-xs" onClick={() => setAddModalOpen(false)} />
                </dialog>
            )}

            {/* Edit Room Modal */}
            {editRoom && (
                <dialog open className="modal modal-open">
                    <div className="modal-box max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                            <h3 className="font-bold text-xl font-serif text-slate-900">Edit Suite</h3>
                            <button onClick={() => { setEditRoom(null); setUploadedImages([]) }} className="btn btn-ghost btn-sm btn-circle">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="form-control">
                                    <label className="label py-1"><span className="label-text font-semibold text-slate-700">Room Name</span></label>
                                    <input
                                        type="text"
                                        className={`input input-bordered w-full rounded-xl ${editErrors.name ? "input-error" : ""}`}
                                        {...registerEdit("name", { required: "Name is required" })}
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label py-1"><span className="label-text font-semibold text-slate-700">Category</span></label>
                                    <select
                                        className={`select select-bordered w-full rounded-xl ${editErrors.category ? "select-error" : ""}`}
                                        {...registerEdit("category", { required: "Category is required" })}
                                    >
                                        <option value="Couple">Couple</option>
                                        <option value="Family Suite">Family Suite</option>
                                        <option value="Double Bed">Double Bed</option>
                                        <option value="Standard">Standard</option>
                                    </select>
                                </div>
                                <div className="form-control">
                                    <label className="label py-1"><span className="label-text font-semibold text-slate-700">View</span></label>
                                    <select
                                        className={`select select-bordered w-full rounded-xl ${editErrors.view ? "select-error" : ""}`}
                                        {...registerEdit("view", { required: "View is required" })}
                                    >
                                        <option value="Sea View">Sea View</option>
                                        <option value="Balcony Sea View">Balcony Sea View</option>
                                        <option value="Balcony">Balcony</option>
                                        <option value="Non-Balcony">Non-Balcony</option>
                                    </select>
                                </div>
                                <div className="form-control">
                                    <label className="label py-1"><span className="label-text font-semibold text-slate-700">Price Per Night (৳)</span></label>
                                    <input
                                        type="number"
                                        className={`input input-bordered w-full rounded-xl ${editErrors.price ? "input-error" : ""}`}
                                        {...registerEdit("price", { required: "Price is required", min: 1 })}
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label py-1"><span className="label-text font-semibold text-slate-700">Capacity (Persons)</span></label>
                                    <input
                                        type="number"
                                        className={`input input-bordered w-full rounded-xl ${editErrors.capacity ? "input-error" : ""}`}
                                        {...registerEdit("capacity", { required: "Capacity is required", min: 1 })}
                                    />
                                </div>
                            </div>
                            <div className="form-control">
                                <label className="label py-1"><span className="label-text font-semibold text-slate-700">Description</span></label>
                                <textarea
                                    className="textarea textarea-bordered w-full rounded-xl"
                                    rows={3}
                                    {...registerEdit("description")}
                                />
                            </div>
                            <MultiImageUploader />
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" className="btn btn-ghost rounded-xl" onClick={() => { setEditRoom(null); setUploadedImages([]) }}>Cancel</button>
                                <button type="submit" className="btn btn-primary rounded-xl text-white px-6" disabled={editMutation.isPending || uploading}>
                                    {editMutation.isPending ? <span className="loading loading-spinner loading-sm" /> : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                    <div className="modal-backdrop bg-slate-900/40 backdrop-blur-xs" onClick={() => { setEditRoom(null); setUploadedImages([]) }} />
                </dialog>
            )}
        </div>
    )
}

export default Rooms
