import React, { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { X } from 'lucide-react'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
import RoomImageUploader from './RoomImageUploader'
import { getCategoryPrice, getYouTubeEmbedUrl } from './roomUtils'

const AddRoom = ({ children, className }) => {
    const modalRef = useRef()
    const axiosSecure = useAxiosSecure()
    const queryClient = useQueryClient()
    const [uploadedImages, setUploadedImages] = useState([])
    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm()
    const selectedCategoryName = watch("category")

    const { data: categories = [] } = useQuery({
        queryKey: ["category-and-pricing"],
        queryFn: async () => {
            const res = await axiosSecure.get("/categoryandpricing")
            return res.data
        }
    })

    const selectedPrice = getCategoryPrice(categories, selectedCategoryName)

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
            reset()
            setUploadedImages([])
            modalRef.current?.close()
        },
        onError: (_, __, context) => {
            toast.dismiss(context?.toastId)
            toast.error("Failed to add room.")
        }
    })

    const handleOpen = () => {
        reset()
        setUploadedImages([])
        modalRef.current?.showModal()
    }

    const handleClose = () => {
        modalRef.current?.close()
    }

    const onSubmit = (data) => {
        if (uploadedImages.length === 0) {
            toast.error("Please upload at least one room photo")
            return
        }

        const video = String(data.video || "").trim()
        const youtubeEmbedUrl = getYouTubeEmbedUrl(video)
        if (video && !youtubeEmbedUrl) {
            toast.error("Please add a valid YouTube video link")
            return
        }

        addMutation.mutate({
            ...data,
            video: youtubeEmbedUrl,
            price: selectedPrice,
            capacity: 2,
            images: uploadedImages,
            imageUrl: uploadedImages[0]?.url,
            imagePublicId: uploadedImages[0]?.publicId,
        })
    }

    return (
        <>
            <button type="button" onClick={handleOpen} className={className}>{children}</button>
            <dialog ref={modalRef} className="modal">
                <div className="modal-box max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                        <h3 className="font-bold text-xl font-serif text-slate-900">Add New Suite / Room</h3>
                        <button type="button" onClick={handleClose} className="btn btn-ghost btn-sm btn-circle">
                            <X size={18} />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1  gap-4">
                            {/* <div className="form-control">
                                <label className="label py-1"><span className="label-text font-semibold text-slate-700">Room Name</span></label>
                                <input
                                    type="text"
                                    placeholder="e.g. Front Side Couple Room"
                                    className={`input input-bordered w-full rounded-xl ${errors.name ? "input-error" : ""}`}
                                    {...register("name", { required: "Name is required" })}
                                />
                            </div> */}
                            <div className="form-control">
                                <label className="label py-1"><span className="label-text font-semibold text-slate-700">Category</span></label> <span className="text-red-500">*</span>
                                <select
                                    className={`select select-bordered w-full rounded-xl ${errors.category ? "select-error" : ""}`}
                                    {...register("category", { required: "Category is required" })}
                                    required
                                >
                                    <option value="">Select Category</option>
                                    {categories.map(category => (
                                        <option key={category._id} value={category.name}>{category.name}</option>
                                    ))}
                                </select>
                                {selectedPrice > 0 && (
                                    <span className="text-xs font-semibold text-teal-700 mt-1">
                                        Price: ৳{selectedPrice.toLocaleString()} / night
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="form-control">
                            <label className="label py-1"><span className="label-text font-semibold text-slate-700">Facility</span></label>
                            <input
                                type="text"
                                placeholder="AC, Wi-Fi, Smart TV, Balcony"
                                className="input input-bordered w-full rounded-xl"
                                {...register("facility")}
                            />
                        </div>
                        <div className="form-control">
                            <label className="label py-1"><span className="label-text font-semibold text-slate-700">Description</span></label> <span className="text-red-500">*</span>
                            <textarea
                                placeholder="Description about room"
                                className="textarea textarea-bordered w-full rounded-xl"
                                rows={3}
                                required
                                {...register("description")}
                            />
                        </div>
                        <div className="form-control">
                            <label className="label py-1"><span className="label-text font-semibold text-slate-700">Video</span></label>
                            <input
                                type="url"
                                placeholder="https://www.youtube.com/watch?v=ZOxMPa-JBbY"
                                className="input input-bordered w-full rounded-xl"
                                {...register("video")}
                            />
                        </div>
                        <RoomImageUploader uploadedImages={uploadedImages} setUploadedImages={setUploadedImages} />
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                            <button type="button" className="btn btn-ghost rounded-xl" onClick={handleClose}>Cancel</button>
                            <button type="submit" className="btn btn-primary rounded-xl text-white px-6" disabled={addMutation.isPending}>
                                {addMutation.isPending ? <span className="loading loading-spinner loading-sm" /> : "Publish Room"}
                            </button>
                        </div>
                    </form>
                </div>
                <form method="dialog" className="modal-backdrop bg-slate-900/40 backdrop-blur-xs">
                    <button>close</button>
                </form>
            </dialog>
        </>
    )
}

export default AddRoom
