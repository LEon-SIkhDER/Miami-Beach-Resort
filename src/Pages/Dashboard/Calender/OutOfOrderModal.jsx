import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import toast from 'react-hot-toast'
import { showConfirmAlert } from '../../../utils/customSwal'
import {
    Wrench,
    X,
    Calendar,
    BedDouble,
    AlertTriangle,
    CheckCircle2,
    Trash2,
    Clock,
    Plus,
    FileText,
    ShieldAlert
} from 'lucide-react'
import { formatDate } from '../../../utils/bookingUtils'

const OOO_REASONS = [
    "AC Repair & Maintenance",
    "Plumbing / Washroom Issue",
    "Room Renovation & Painting",
    "Deep Cleaning & Sanitization",
    "Electrical / Wiring Issue",
    "Furniture / Bed Replacement",
    "Pest Control",
    "Other Maintenance"
]

const formatLocalDate = (date) => {
    if (!date) return ''
    const d = new Date(date)
    if (isNaN(d.getTime())) return ''
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

const OutOfOrderModal = ({
    isOpen,
    onClose,
    initialRoom, // { roomNo, categoryId, categoryName, startDate }
    categories = [],
    currentUser,
    role,
    onSuccess
}) => {
    const axiosSecure = useAxiosSecure()
    const queryClient = useQueryClient()
    const [activeTab, setActiveTab] = useState('create') // 'create' | 'list'
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form fields
    const [categoryId, setCategoryId] = useState('')
    const [roomNo, setRoomNo] = useState('')
    const [startDate, setStartDate] = useState(new Date())
    const [endDate, setEndDate] = useState(() => new Date(new Date().getTime() + 24 * 60 * 60 * 1000))
    const [reason, setReason] = useState(OOO_REASONS[0])
    const [customReason, setCustomReason] = useState('')
    const [notes, setNotes] = useState('')

    // Fetch active Out of Order records
    const { 
        data: oooList = [], 
        isLoading: isOOOLoading, 
        refetch: refetchOOO 
    } = useQuery({
        queryKey: ["out-of-order-records"],
        queryFn: async () => {
            const res = await axiosSecure.get("/out-of-order")
            return res.data
        },
        enabled: isOpen
    })

    useEffect(() => {
        if (isOpen) {
            if (initialRoom) {
                setCategoryId(initialRoom.categoryId || (categories[0]?._id || ''))
                setRoomNo(String(initialRoom.roomNo || '').trim())
                const start = initialRoom.startDate ? new Date(initialRoom.startDate) : new Date()
                setStartDate(start)
                setEndDate(new Date(start.getTime() + 24 * 60 * 60 * 1000))
                setActiveTab('create')
            } else {
                setCategoryId(categories[0]?._id || '')
                setRoomNo('')
                setStartDate(new Date())
                setEndDate(new Date(new Date().getTime() + 24 * 60 * 60 * 1000))
            }
            setReason(OOO_REASONS[0])
            setCustomReason('')
            setNotes('')
        }
    }, [isOpen, initialRoom, categories])

    if (!isOpen) return null

    const currentCat = categories.find(c => String(c._id) === String(categoryId))
    const availableRooms = Array.isArray(currentCat?.roomNumbers) ? currentCat.roomNumbers : []

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!roomNo) {
            toast.error("Please select a room number.")
            return
        }
        if (!startDate || !endDate || startDate >= endDate) {
            toast.error("End date must be after start date.")
            return
        }

        setIsSubmitting(true)
        const toastId = toast.loading("Marking room as Out of Order...")

        try {
            const payload = {
                roomNo: String(roomNo).trim(),
                categoryId,
                categoryName: currentCat?.name || "Room Category",
                startDate: formatLocalDate(startDate),
                endDate: formatLocalDate(endDate),
                reason: reason === "Other Maintenance" && customReason.trim() ? customReason.trim() : reason,
                notes: notes.trim(),
                createdBy: {
                    name: currentUser?.displayName || "Admin / Staff",
                    email: currentUser?.email || "",
                    role: role || "admin"
                }
            }

            const res = await axiosSecure.post("/out-of-order", payload)
            if (res.data) {
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ["out-of-order-calendar"] }),
                    queryClient.invalidateQueries({ queryKey: ["out-of-order-records"] }),
                    queryClient.invalidateQueries({ queryKey: ["all-bookings-for-calendar"] }),
                    refetchOOO()
                ])
                if (onSuccess) await onSuccess()
                toast.success(`Room ${roomNo} is now set Out of Order for maintenance. 🛠️`, { id: toastId })
                setActiveTab('list')
            }
        } catch (err) {
            console.error("Out of order create error:", err)
            toast.error(err.response?.data?.message || "Failed to mark room out of order.", { id: toastId })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleResolve = async (record) => {
        const confirmed = await showConfirmAlert(
            `Mark Room ${record.roomNo} as Available?`,
            `This will resolve the Out of Order maintenance status (${record.reason}) and make Room ${record.roomNo} available for reservations.`,
            "Yes, Mark as Available"
        )
        if (!confirmed.isConfirmed) return

        const toastId = toast.loading("Resolving Out of Order status...")
        try {
            const payload = {
                status: "resolved",
                resolvedBy: {
                    name: currentUser?.displayName || "Admin / Staff",
                    email: currentUser?.email || "",
                    role: role || "admin"
                }
            }
            const res = await axiosSecure.patch(`/out-of-order/${record._id}`, payload)
            if (res.data) {
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: ["out-of-order-calendar"] }),
                    queryClient.invalidateQueries({ queryKey: ["out-of-order-records"] }),
                    refetchOOO()
                ])
                if (onSuccess) await onSuccess()
                toast.success(`Room ${record.roomNo} is now available! 🎉`, { id: toastId })
            }
        } catch (err) {
            console.error("Resolve error:", err)
            toast.error("Failed to resolve out of order status.", { id: toastId })
        }
    }

    const handleDeleteRecord = async (record) => {
        const confirmed = await showConfirmAlert(
            `Delete Record for Room ${record.roomNo}?`,
            "Permanently delete this maintenance record.",
            "Yes, Delete",
            true
        )
        if (!confirmed.isConfirmed) return

        const toastId = toast.loading("Deleting record...")
        try {
            await axiosSecure.delete(`/out-of-order/${record._id}`)
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["out-of-order-calendar"] }),
                queryClient.invalidateQueries({ queryKey: ["out-of-order-records"] }),
                refetchOOO()
            ])
            if (onSuccess) await onSuccess()
            toast.success("Record deleted.", { id: toastId })
        } catch (err) {
            console.error("Delete error:", err)
            toast.error("Failed to delete record.", { id: toastId })
        }
    }

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-amber-200 bg-neutral-900 text-white shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500 text-neutral-900 flex items-center justify-center font-bold shadow-xs">
                            <Wrench size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-base">Out of Order / Room Maintenance</h3>
                            <p className="text-xs text-amber-300">
                                Temporarily block rooms from guest booking during repairs
                            </p>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="btn btn-ghost btn-sm btn-circle text-slate-400 hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 bg-slate-50 px-6 shrink-0">
                    <button
                        type="button"
                        onClick={() => setActiveTab('create')}
                        className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                            activeTab === 'create'
                                ? 'border-amber-500 text-neutral-900 bg-white'
                                : 'border-transparent text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        <Plus size={14} /> Mark Room Out of Order
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('list')}
                        className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
                            activeTab === 'list'
                                ? 'border-amber-500 text-neutral-900 bg-white'
                                : 'border-transparent text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        <ShieldAlert size={14} /> Active Out of Order ({oooList.length})
                    </button>
                </div>

                {/* Tab Content */}
                <div className="p-6 overflow-y-auto flex-1 text-xs sm:text-sm">
                    {activeTab === 'create' ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Important Notice */}
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
                                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <strong className="block font-bold">Booking Protection Active</strong>
                                    Rooms marked as Out of Order cannot be booked by guests or staff for the selected maintenance period.
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Category */}
                                <div className="form-control">
                                    <label className="label py-0.5">
                                        <span className="label-text font-bold text-slate-800 text-xs">Room Category *</span>
                                    </label>
                                    <select
                                        value={categoryId}
                                        onChange={e => {
                                            setCategoryId(e.target.value)
                                            setRoomNo('')
                                        }}
                                        className="select select-sm select-bordered rounded-xl bg-white text-xs font-semibold"
                                    >
                                        {categories.map(c => (
                                            <option key={c._id} value={c._id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Room No */}
                                <div className="form-control">
                                    <label className="label py-0.5">
                                        <span className="label-text font-bold text-slate-800 text-xs">Physical Room No *</span>
                                    </label>
                                    <select
                                        required
                                        value={roomNo}
                                        onChange={e => setRoomNo(e.target.value)}
                                        className="select select-sm select-bordered rounded-xl bg-white text-xs font-bold text-amber-900"
                                    >
                                        <option value="">-- Select Room --</option>
                                        {availableRooms.map(r => (
                                            <option key={r} value={r}>Room {r}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Date Range */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="form-control">
                                    <label className="label py-0.5">
                                        <span className="label-text font-bold text-slate-800 text-xs flex items-center gap-1">
                                            <Calendar size={13} className="text-teal-600" /> Start Date *
                                        </span>
                                    </label>
                                    <DatePicker
                                        selected={startDate}
                                        onChange={d => {
                                            setStartDate(d)
                                            if (endDate <= d) {
                                                setEndDate(new Date(d.getTime() + 24 * 60 * 60 * 1000))
                                            }
                                        }}
                                        selectsStart
                                        startDate={startDate}
                                        endDate={endDate}
                                        minDate={new Date()}
                                        dateFormat="dd MMM yyyy"
                                        className="input input-sm input-bordered rounded-xl bg-white text-xs w-full cursor-pointer"
                                        onChangeRaw={e => e.preventDefault()}
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="label py-0.5">
                                        <span className="label-text font-bold text-slate-800 text-xs flex items-center gap-1">
                                            <Calendar size={13} className="text-teal-600" /> End Date *
                                        </span>
                                    </label>
                                    <DatePicker
                                        selected={endDate}
                                        onChange={d => setEndDate(d)}
                                        selectsEnd
                                        startDate={startDate}
                                        endDate={endDate}
                                        minDate={new Date(startDate.getTime() + 24 * 60 * 60 * 1000)}
                                        dateFormat="dd MMM yyyy"
                                        className="input input-sm input-bordered rounded-xl bg-white text-xs w-full cursor-pointer font-bold text-amber-900"
                                        onChangeRaw={e => e.preventDefault()}
                                    />
                                </div>
                            </div>

                            {/* Reason */}
                            <div className="form-control">
                                <label className="label py-0.5">
                                    <span className="label-text font-bold text-slate-800 text-xs">Maintenance Reason *</span>
                                </label>
                                <select
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    className="select select-sm select-bordered rounded-xl bg-white text-xs font-semibold"
                                >
                                    {OOO_REASONS.map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>

                            {reason === "Other Maintenance" && (
                                <div className="form-control">
                                    <label className="label py-0.5">
                                        <span className="label-text font-semibold text-slate-700 text-xs">Custom Reason Details</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={customReason}
                                        onChange={e => setCustomReason(e.target.value)}
                                        placeholder="Describe the issue..."
                                        className="input input-sm input-bordered rounded-xl bg-white text-xs"
                                    />
                                </div>
                            )}

                            {/* Notes */}
                            <div className="form-control">
                                <label className="label py-0.5">
                                    <span className="label-text font-semibold text-slate-700 text-xs flex items-center gap-1">
                                        <FileText size={13} className="text-teal-600" /> Internal Notes (Optional)
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Technician details, parts ordered..."
                                    className="input input-sm input-bordered rounded-xl bg-white text-xs"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="btn btn-sm btn-ghost rounded-xl px-4 text-slate-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="btn btn-sm bg-neutral-900 hover:bg-neutral-800 text-amber-300 font-bold rounded-xl px-5 shadow-xs border-none"
                                >
                                    {isSubmitting ? <span className="loading loading-spinner loading-xs" /> : <Wrench size={14} />}
                                    <span>Set Out of Order</span>
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-3">
                            {isOOOLoading ? (
                                <div className="text-center py-12 text-slate-400">
                                    <div className="loading loading-spinner loading-md text-amber-500 mx-auto" />
                                    <p className="mt-2 text-xs">Loading Out of Order rooms...</p>
                                </div>
                            ) : oooList.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 space-y-2">
                                    <CheckCircle2 size={40} className="mx-auto text-emerald-500 opacity-60" />
                                    <p className="font-bold text-slate-700">All Rooms Are Available & In Service</p>
                                    <p className="text-xs text-slate-400">No rooms are currently out of order.</p>
                                </div>
                            ) : (
                                oooList.map(record => (
                                    <div 
                                        key={record._id}
                                        className="p-4 rounded-2xl bg-neutral-900 text-white border border-neutral-800 space-y-2.5 shadow-sm"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="badge badge-sm bg-amber-500 text-neutral-900 font-extrabold border-none">
                                                    Room {record.roomNo}
                                                </span>
                                                <span className="font-bold text-slate-200 text-xs">
                                                    {record.categoryName}
                                                </span>
                                            </div>
                                            <span className="badge badge-xs bg-rose-500 text-white font-bold uppercase">
                                                Out of Order
                                            </span>
                                        </div>

                                        <div className="text-xs text-slate-300 space-y-1 bg-neutral-800/80 p-2.5 rounded-xl">
                                            <p className="font-semibold text-amber-300">
                                                🛠️ {record.reason}
                                            </p>
                                            <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                                <Calendar size={12} className="text-teal-400" />
                                                {formatDate(record.startDate)} → {formatDate(record.endDate)}
                                            </p>
                                            {record.notes && (
                                                <p className="italic text-[11px] text-slate-400">
                                                    Note: "{record.notes}"
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-[10px] text-slate-500">
                                                Set by {record.createdBy?.name || "Staff"}
                                            </span>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteRecord(record)}
                                                    className="btn btn-2xs btn-ghost text-rose-400 hover:bg-rose-950/40"
                                                    title="Delete record"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleResolve(record)}
                                                    className="btn btn-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl gap-1 border-none shadow-xs"
                                                >
                                                    <CheckCircle2 size={13} />
                                                    <span>Resolve & Mark Available</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    )
}

export default OutOfOrderModal
