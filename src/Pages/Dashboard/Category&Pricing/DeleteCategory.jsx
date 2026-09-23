import React from 'react';
import toast from 'react-hot-toast';
import { Trash2 } from 'lucide-react';
import { showCustomSwal } from '../../../utils/customSwal';
import useAxiosSecure from '../../../hooks/useAxiosSecure';

const DeleteCategory = ({ children, className, category, refetch }) => {
    const axiosSecure = useAxiosSecure();
    const handleDelete = async () => {
        const confirmed = await showCustomSwal({
            title: "Delete Category?",
            des: `This will permanently remove "${category?.name || 'this category'}" and cannot be reverted.`,
            icon: Trash2,
            confirmButtonText: "Yes, Delete",
            cancelButtonText: "Cancel",
            isDanger: true
        });

        if (confirmed) {
            const toastId = toast.loading("Deleting...")
            try {
                const { data: result } = await axiosSecure.delete(`/categoryandroom/${category._id}`)
                if (result.deletedCount !== 1) {
                    throw new Error("Delete Failed")
                }
                await refetch()
                toast.dismiss(toastId)
                toast.success("Category Deleted")

            } catch (error) {
                toast.dismiss(toastId)
                toast.error(error.message || "Something went wrong")
            }
        }
    }
    return (
        <button onClick={handleDelete} className={className}>{children}</button>
    );
};

export default DeleteCategory;
