import axios from 'axios';
import React from 'react';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

const DeleteCategory = ({ children, className, category, refetch }) => {
    const handleDelete = async () => {
        Swal.fire({
            title: "Are you sure?",
            text: "You won't be able to revert this!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, delete it!"
        }).then(async (result) => {
            if (result.isConfirmed) {
                const toastId = toast.loading("Deleting")
                try {
                    const { data: result } = await axios.delete(`http://localhost:5000/categoryandroom/${category._id}`)
                    if (result.deletedCount !== 1) {
                        throw new Error("Delete Failed")
                    }
                    await refetch()
                    toast.dismiss(toastId)
                    toast.success("Category Deleted")

                } catch (error) {
                    toast.dismiss(toastId)
                    toast.success(error.message || "Something went wrong")
                }
            }
        });

    }
    return (
        <button onClick={handleDelete} className={className}>{children}</button>
    );
};

export default DeleteCategory;
