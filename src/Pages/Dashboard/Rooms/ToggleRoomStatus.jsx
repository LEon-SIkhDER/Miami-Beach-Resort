import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { ToggleLeft, ToggleRight } from 'lucide-react'
import axios from 'axios'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000"

const ToggleRoomStatus = ({ room, className, showLabel = false, refetch }) => {
    const [isLoading, setIsLoading] = useState(false)
    const isActive = room.status === "active"

    const handleToggleStatus = async () => {
        const isActivating = !isActive
        const status = isActivating ? "active" : "inactive"
        const toastId = toast.loading(isActivating ? "Activating room..." : "Marking room out of order...")

        try {
            setIsLoading(true)
            await axios.patch(`${SERVER_URL}/room/${room._id}`, { status })
            await refetch?.()
            toast.success(isActivating ? "Room activated and now visible on site!" : "Room marked as out of order!", { id: toastId })
        } catch (error) {
            toast.error("Failed to change room status", { id: toastId })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <button
            type="button"
            onClick={handleToggleStatus}
            className={className || "btn btn-ghost btn-xs btn-square"}
            title={isActive ? "Mark Out of Order" : "Activate Room"}
            disabled={isLoading}
        >
            {isLoading ? (
                <>
                    <span className="loading loading-spinner loading-xs" />
                    {showLabel && "Updating..."}
                </>
            ) : isActive ? (
                <>
                    <ToggleLeft size={showLabel ? 15 : 22} className="text-red-500" />
                    {showLabel && "Out of Order"}
                </>
            ) : (
                <>
                    <ToggleRight size={showLabel ? 15 : 22} className="text-emerald-600" />
                    {showLabel && "Activate"}
                </>
            )}
        </button>
    )
}

export default ToggleRoomStatus
