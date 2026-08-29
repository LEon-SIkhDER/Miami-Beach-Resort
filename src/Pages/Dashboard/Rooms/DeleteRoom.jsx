import React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
import { showConfirmAlert } from '../../../utils/customSwal'

const DeleteRoom = ({ children, className, room }) => {
    const axiosSecure = useAxiosSecure()
    const queryClient = useQueryClient()

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
            toast.success("Room deleted successfully!")
        },
        onError: (_, __, context) => {
            toast.dismiss(context?.toastId)
            toast.error("Failed to delete room.")
        }
    })

    const handleDelete = () => {
        showConfirmAlert(
            `Delete "${room.name}"?`,
            "This will delete the room and all its uploaded photos from Cloudinary.",
            "Yes, delete room",
            true
        ).then(result => {
            if (result.isConfirmed) deleteMutation.mutate(room._id)
        })
    }

    return (
        <button
            type="button"
            onClick={handleDelete}
            className={className}
            title="Delete Room"
            disabled={deleteMutation.isPending}
        >
            {children}
        </button>
    )
}

export default DeleteRoom
