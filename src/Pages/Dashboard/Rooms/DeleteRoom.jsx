import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { showConfirmAlert } from '../../../utils/customSwal'
import axios from 'axios'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000"

const DeleteRoom = ({ children, className, room, refetch }) => {
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = () => {
        showConfirmAlert(
            `Delete "${room.name}"?`,
            "This will delete the room and all its uploaded photos from Cloudinary.",
            "Yes, delete room",
            true
        ).then(async (result) => {
            if (!result.isConfirmed) return


            const toastId = toast.loading("Deleting room...")

            try {
                setIsDeleting(true)
                await axios.delete(`${SERVER_URL}/room/${room._id}`)
                await refetch?.()
                toast.success("Room deleted successfully!", { id: toastId })
            } catch (error) {
                toast.error("Failed to delete room.", { id: toastId })
            } finally {
                setIsDeleting(false)
            }



        })
    }

    return (
        <button
            type="button"
            onClick={handleDelete}
            className={className}
            title="Delete Room"
            disabled={isDeleting}
        >
            {isDeleting ? <span className="loading loading-spinner loading-xs" /> : children}
        </button>
    )
}

export default DeleteRoom
