import axios from 'axios';
import React, { useRef } from 'react';
import toast from 'react-hot-toast';

const EditCategory = ({ children, className, refetch, category }) => {
    const modalRef = useRef()
    const formRef = useRef()

    const handleEditCategory = async (e) => {
        e.preventDefault()
        modalRef.current.close()
        const formData = Object.fromEntries(new FormData(e.target))
        console.log(formData);
        const toastId = toast.loading("Category Updating...")
        try {
            const { data: result } = await axios.patch(`http://localhost:5000/categoryandpricing/${category._id}`, formData)
            if (result.modifiedCount !== 1) {
                throw new Error("Failed to Update category ")
            }
            await refetch()
            toast.dismiss(toastId)
            toast.success("Category updated")
            formRef.current.reset()
        } catch (error) {
            toast.dismiss(toastId)
            toast.error(error.message || "Something went wrong")
        }

    }

    return (
        <>
            <button onClick={() => modalRef.current.showModal()} className={className}>{children}</button>
            <dialog ref={modalRef} className="modal">
                <div className="modal-box">
                    <form method="dialog">
                        {/* if there is a button in form, it will close the modal */}
                        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
                    </form>
                    <div className="w-full max-w-lg mx-auto bg-white rounded-xl ">
                        <div className="mb-6">
                            <h2 className="text-xl font-semibold text-gray-800">
                                Update Category
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Update category for your hotel.
                            </p>
                        </div>

                        <form onSubmit={handleEditCategory} ref={formRef} className="space-y-5">
                            {/* Category Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Category Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Urban View Couple"
                                    name='name'
                                    defaultValue={category.name}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none transition focus:border-[#009689] focus:ring-2 focus:ring-[#009689]/10"
                                />
                            </div>




                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Price <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. 2300"
                                    name='price'
                                    defaultValue={category.price}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none transition focus:border-[#009689] focus:ring-2 focus:ring-[#009689]/10"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description
                                </label>
                                <textarea
                                    rows="4"
                                    name='description'
                                    placeholder="Write a short description..."
                                    defaultValue={category.description}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none resize-none transition focus:border-[#009689] focus:ring-2 focus:ring-[#009689]/10"
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="px-5 py-2.5 rounded-lg bg-[#009689] text-white font-medium hover:bg-[#007f73] transition"
                                >
                                    Update Category
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </dialog>
        </>
    );
};

export default EditCategory;