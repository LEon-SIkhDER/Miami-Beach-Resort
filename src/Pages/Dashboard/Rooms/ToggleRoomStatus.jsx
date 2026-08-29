import React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { ToggleLeft, ToggleRight } from 'lucide-react'
import useAxiosSecure from '../../../hooks/useAxiosSecure'

const ToggleRoomStatus = ({ room }) => {
    const axiosSecure = useAxiosSecure()
    const queryClient = useQueryClient()

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

    const handleToggleStatus = () => {
        const isActivating = room.status !== "active"
        const toastId = toast.loading(isActivating ? "Activating room..." : "Deactivating room...")
        statusMutation.mutate({
            id: room._id,
            status: isActivating ? "active" : "inactive",
            toastId,
            isActivating
        })
    }

    return (
        <button
            type="button"
            onClick={handleToggleStatus}
            className="btn btn-ghost btn-xs btn-square"
            title={room.status === "active" ? "Click to Deactivate" : "Click to Activate"}
            disabled={statusMutation.isPending}
        >
            {room.status === "active" ? (
                <ToggleRight size={22} className="text-emerald-600" />
            ) : (
                <ToggleLeft size={22} className="text-slate-400" />
            )}
        </button>
    )
}

export default ToggleRoomStatus
