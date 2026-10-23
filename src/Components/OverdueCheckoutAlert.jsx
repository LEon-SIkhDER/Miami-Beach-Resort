import React, { useState, useEffect, useContext } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { AuthContext } from '../Context/AuthContext'
import useRole from '../hooks/useRole'
import useAxiosSecure from '../hooks/useAxiosSecure'
import { formatDate } from '../utils/bookingUtils'
import {
    AlertTriangle,
    X,
    Clock,
    BedDouble,
    Phone,
    ArrowRight,
    LogIn,
    CheckCircle2,
    Check,
    DollarSign,
    ShieldAlert
} from 'lucide-react'

const STAFF_ROLES = ["admin", "manager", "agent", "front_desk", "b2b"]

const renderStatusBadge = (status) => {
    switch (status) {
        case "checked_id":
        case "checked_in":
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <LogIn size={12} /> Checked In
                </span>
            )
        case "booking_confirmed":
        case "confirmed":
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 size={12} /> Confirmed
                </span>
            )
        default:
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock size={12} /> {status || 'Active'}
                </span>
            )
    }
}

const OverdueCheckoutAlert = () => {
    const { user: currentUser } = useContext(AuthContext)
    const { role } = useRole()
    const axiosSecure = useAxiosSecure()
    const navigate = useNavigate()

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [currentTime, setCurrentTime] = useState(() => new Date())

    const isStaff = currentUser && STAFF_ROLES.includes(role)

    // Keep client-side time updated every 30 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 30000)
        return () => clearInterval(timer)
    }, [])

    // Query overdue checkouts from server
    const { data: overdueBookings = [], isLoading } = useQuery({
        queryKey: ["overdue-checkouts"],
        queryFn: async () => {
            const res = await axiosSecure.get("/bookings/overdue-checkouts")
            return Array.isArray(res.data) ? res.data : []
        },
        enabled: !!isStaff,
        refetchInterval: 30000, // Re-check every 30 seconds
        refetchOnWindowFocus: true
    })

    // Keyboard support: Escape closes modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isModalOpen) {
                setIsModalOpen(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isModalOpen])

    // If not staff or no overdue bookings, do not render anything
    if (!isStaff || (!isLoading && overdueBookings.length === 0)) {
        return null
    }

    const overdueCount = overdueBookings.length

    const handleRowClick = (bookingId) => {
        if (!bookingId) return
        setIsModalOpen(false)
        navigate(`/dashboard/bookings/${bookingId}`)
    }

    return (
        <>
            {/* Warning Floating Button Ball at bottom-right corner */}
            <aside
                aria-label="Overdue Checkout Warning"
                className="fixed bottom-6 right-6 z-40 select-none print:hidden animate-in fade-in zoom-in-75 duration-300"
            >
                <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    aria-label={`Warning: ${overdueCount} room checkout(s) overdue`}
                    title={`${overdueCount} room(s) not checked out yet and past 11:00 AM checkout time. Click to view.`}
                    className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-full bg-gradient-to-tr from-rose-600 via-amber-500 to-rose-500 hover:from-rose-500 hover:to-amber-400 text-white shadow-[0_10px_25px_rgba(244,63,94,0.45)] hover:shadow-[0_14px_32px_rgba(244,63,94,0.65)] hover:scale-110 active:scale-95 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-rose-400/50 cursor-pointer border-2 border-white/60 aspect-square"
                >
                    {/* Animated pulsating halo */}
                    <span className="absolute inset-0 rounded-full bg-rose-500/40 animate-ping pointer-events-none"></span>

                    {/* Counter Badge */}
                    <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 flex items-center justify-center rounded-full bg-rose-700 text-white text-[11px] font-black shadow-md border-2 border-white pointer-events-none">
                        {overdueCount}
                    </span>

                    {/* Warning Icon */}
                    <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.3] text-white animate-pulse" />
                </button>
            </aside>

            {/* Overdue Checkouts Modal */}
            {isModalOpen && createPortal(
                <div
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setIsModalOpen(false)
                        }
                    }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-3xl shadow-2xl border border-rose-100 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-rose-100 bg-rose-50/70 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/30">
                                    <AlertTriangle size={22} className="stroke-[2.4]" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-900 text-base sm:text-lg font-serif">
                                            Overdue Room Checkouts
                                        </h3>
                                        <span className="badge badge-sm font-bold bg-rose-600 text-white border-none">
                                            {overdueCount} Overdue
                                        </span>
                                    </div>
                                    <p className="text-xs text-rose-800 font-medium mt-0.5">
                                        Checkout deadline is <span className="font-bold">11:00 AM</span>. The following rooms have passed checkout time.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="btn btn-ghost btn-sm btn-circle text-slate-400 hover:text-slate-700"
                                aria-label="Close modal"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Top Context Notice */}
                        <div className="px-6 py-3 bg-amber-50/80 border-b border-amber-100/80 flex items-center justify-between text-xs text-amber-900">
                            <div className="flex items-center gap-2">
                                <Clock size={15} className="text-amber-700 shrink-0" />
                                <span>
                                    Click on any reservation row below to open its booking details page, review guest balance, and complete check-out.
                                </span>
                            </div>
                        </div>

                        {/* Modal Body: Table of Overdue Reservations */}
                        <div className="overflow-x-auto flex-1 p-4 sm:p-6">
                            <table className="table table-zebra w-full text-xs sm:text-sm">
                                <thead>
                                    <tr className="bg-slate-100/80 text-slate-700 font-bold text-xs uppercase tracking-wider">
                                        <th className="rounded-l-xl">Booking ID</th>
                                        <th>Guest Details</th>
                                        <th>Room(s)</th>
                                        <th>Checkout Date</th>
                                        <th>Status</th>
                                        <th>Balance</th>
                                        <th className="rounded-r-xl text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {overdueBookings.map((b) => {
                                        const roomItems = b.overdueRooms && b.overdueRooms.length > 0
                                            ? b.overdueRooms
                                            : (b.rooms || [])
                                        const roomNumbers = roomItems
                                            .map(r => r.roomNo ? `Room ${r.roomNo}` : '')
                                            .filter(Boolean)
                                            .join(', ') || 'Unassigned'
                                        const category = roomItems[0]?.categoryName || 'Room'
                                        const checkOutDate = roomItems[0]?.checkOut || b.checkOut

                                        const due = Number(b.dueAmount || 0)

                                        return (
                                            <tr
                                                key={b._id}
                                                onClick={() => handleRowClick(b._id)}
                                                className="cursor-pointer hover:bg-rose-50/60 transition-colors group select-none"
                                                title="Click row to open booking details"
                                            >
                                                {/* Booking ID */}
                                                <td>
                                                    <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 group-hover:bg-teal-100 px-2 py-1 rounded-md border border-teal-200 transition-colors inline-block whitespace-nowrap">
                                                        {b.bookingId}
                                                    </span>
                                                </td>

                                                {/* Guest Details */}
                                                <td>
                                                    <div className="font-bold text-slate-800 group-hover:text-rose-900 transition-colors">
                                                        {b.name}
                                                    </div>
                                                    {b.mobile && (
                                                        <div className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                                                            <Phone size={11} className="text-slate-400" />
                                                            <span>{b.mobile}</span>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Room Number & Category */}
                                                <td>
                                                    <div className="space-y-0.5">
                                                        <span className="inline-flex items-center gap-1 font-bold text-slate-900 bg-slate-100 group-hover:bg-white px-2 py-0.5 rounded text-xs whitespace-nowrap border border-slate-200/60">
                                                            <BedDouble size={12} className="text-teal-600" />
                                                            {roomNumbers}
                                                        </span>
                                                        <p className="text-[11px] text-slate-500 truncate max-w-[190px]">
                                                            {category}
                                                        </p>
                                                    </div>
                                                </td>

                                                {/* Checkout Date & 11:00 AM passed indicator */}
                                                <td className="whitespace-nowrap">
                                                    <div className="font-semibold text-rose-700 flex items-center gap-1">
                                                        <Clock size={13} />
                                                        <span>{formatDate(checkOutDate)}</span>
                                                    </div>
                                                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                                        Past 11:00 AM
                                                    </span>
                                                </td>

                                                {/* Current Status */}
                                                <td>
                                                    {renderStatusBadge(b.status)}
                                                </td>

                                                {/* Financial Balance */}
                                                <td className="whitespace-nowrap">
                                                    {due > 0 ? (
                                                        <span className="badge badge-sm font-bold bg-orange-100 text-orange-900 border border-orange-300">
                                                            Due ৳{due.toLocaleString()}
                                                        </span>
                                                    ) : (
                                                        <span className="badge badge-sm font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                                            Paid Full
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Action indicator */}
                                                <td className="text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center gap-1 text-teal-700 font-bold text-xs bg-teal-50 group-hover:bg-teal-700 group-hover:text-white px-2.5 py-1.5 rounded-lg border border-teal-200/80 transition-all">
                                                        <span>View</span>
                                                        <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between shrink-0">
                            <span className="text-xs text-slate-500">
                                Total <span className="font-bold text-slate-800">{overdueCount}</span> overdue reservation{overdueCount > 1 ? 's' : ''} require checkout
                            </span>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="btn btn-sm btn-ghost text-slate-600 hover:text-slate-900"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    )
}

export default OverdueCheckoutAlert