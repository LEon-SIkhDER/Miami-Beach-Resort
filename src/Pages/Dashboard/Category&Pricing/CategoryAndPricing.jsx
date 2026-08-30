import axios from 'axios';
import { Eye, Image as ImageIcon, Pencil, Plus, Trash2, Video } from 'lucide-react';
import React from 'react';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import Swal from 'sweetalert2'
import AddCategory from './AddCategory';
import EditCategory from './EditCategory';
import { parseFacilityList, parseRoomNumbers } from './categoryRoomUtils';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000"

const CategoryAndPricing = () => {
    const { data: categories = [], refetch } = useQuery({
        queryKey: ["categories"],
        queryFn: async () => {
            const { data } = await axios.get(`${SERVER_URL}/categoryandroom`)
            return data
        }
    })

    const handleDelete = (category) => {
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
                    await refetch()
                    toast.success("Category deleted", { id: toastId })
                } catch (error) {
                    toast.error(error.message || "Something went wrong", { id: toastId })
                }
            }
        })
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight">
                        Category & Room
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Manage room categories, pricing, amenities and assigned room numbers.
                    </p>
                </div>
                <AddCategory className="btn btn-primary btn-sm rounded-xl gap-2 shadow-sm text-white" refetch={refetch}>
                    <Plus size={16} /> Add Category
                </AddCategory>
            </div>

            {/* Category Grid */}
            {categories.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400">
                    <ImageIcon size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-semibold">No categories yet</p>
                    <p className="text-sm mt-1">Click "Add Category" to create your first room category.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {categories.map((category) => {
                        const roomNumbers = parseRoomNumbers(category.roomNumbers || [])
                        const amenities = parseFacilityList(category.amenities || "")
                        const photos = category.images?.length
                            ? category.images
                            : category.imageUrl
                                ? [{ url: category.imageUrl }]
                                : []

                        return (
                            <div
                                key={category._id}
                                className="flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
                            >
                                {/* Cover Photo */}
                                <div className="relative h-44 bg-slate-100">
                                    {photos.length > 0 ? (
                                        <img
                                            src={photos[0].url}
                                            alt={category.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            <ImageIcon size={36} />
                                        </div>
                                    )}

                                    {/* Photo count badge */}
                                    {photos.length > 1 && (
                                        <span className="absolute top-2 left-2 badge badge-sm bg-black/50 text-white border-none font-semibold">
                                            +{photos.length} photos
                                        </span>
                                    )}

                                    {/* Video indicator */}
                                    {category.video && (
                                        <span className="absolute top-2 right-2 badge badge-sm bg-teal-600 text-white border-none gap-1">
                                            <Video size={11} /> Video
                                        </span>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 p-5 space-y-3">
                                    {/* Name + Price */}
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="text-lg font-bold text-gray-900 leading-tight">
                                            {category.name}
                                        </h3>
                                        <div className="text-right shrink-0">
                                            <span className="text-lg font-bold text-[#009689]">
                                                ৳{Number(category.price).toLocaleString()}
                                            </span>
                                            <span className="text-xs text-gray-400 block">/ night</span>
                                        </div>
                                    </div>

                                    {/* Room Numbers */}
                                    {roomNumbers.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                                                Rooms ({roomNumbers.length})
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {roomNumbers.slice(0, 6).map(num => (
                                                    <span key={num} className="badge badge-sm bg-teal-50 text-teal-700 border border-teal-200 font-bold">
                                                        {num}
                                                    </span>
                                                ))}
                                                {roomNumbers.length > 6 && (
                                                    <span className="badge badge-sm bg-slate-100 text-slate-500 border-none font-medium">
                                                        +{roomNumbers.length - 6} more
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Amenities */}
                                    {amenities.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {amenities.slice(0, 4).map(a => (
                                                <span key={a} className="badge badge-xs bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                                                    {a}
                                                </span>
                                            ))}
                                            {amenities.length > 4 && (
                                                <span className="badge badge-xs bg-slate-100 text-slate-500 border-none">
                                                    +{amenities.length - 4}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Description */}
                                    {category.description && (
                                        <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
                                            {category.description}
                                        </p>
                                    )}
                                </div>

                                {/* Actions Footer */}
                                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-slate-50/50">
                                    <span className="text-xs text-slate-400">
                                        {roomNumbers.length} room{roomNumbers.length !== 1 ? 's' : ''} · {photos.length} photo{photos.length !== 1 ? 's' : ''}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                        {/* View — go to details page */}
                                        <Link
                                            to={`/dashboard/category&room/${category._id}`}
                                            className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#009689] text-[#009689] hover:bg-[#009689] hover:text-white transition"
                                            title="View Details"
                                        >
                                            <Eye size={16} />
                                        </Link>

                                        {/* Edit */}
                                        <EditCategory
                                            category={category}
                                            refetch={refetch}
                                            className="w-9 h-9 cursor-pointer flex items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
                                        >
                                            <Pencil size={16} />
                                        </EditCategory>

                                        {/* Delete */}
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(category)}
                                            className="w-9 h-9 flex items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-500 hover:text-white transition"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

export default CategoryAndPricing;
