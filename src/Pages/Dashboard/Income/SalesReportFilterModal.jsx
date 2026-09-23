import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
    SlidersHorizontal,
    Filter,
    Calendar as CalendarIcon,
    Briefcase,
    UserCheck,
    BedDouble,
    DoorClosed,
    Users,
    X,
    RotateCcw,
    Check,
} from "lucide-react";

const datePresets = [
    { id: "all", label: "All Time" },
    { id: "today", label: "Today" },
    { id: "week", label: "This Week" },
    { id: "month", label: "This Month" },
    { id: "last30", label: "Last 30 Days" },
];

const SalesReportFilterModal = ({
    isOpen,
    onClose,
    // Date filter props
    startDate,
    endDate,
    onCustomDateChange,
    activePreset,
    onPresetChange,
    // Role filter props
    selectedRole = "all",
    onRoleChange,
    // Worker filter props
    selectedWorker = "all",
    onWorkerChange,
    workerOptions = [],
    // Category filter props
    selectedCategory = "all",
    onCategoryChange,
    allAvailableCategories = [],
    // Room filter props
    selectedRoom = "all",
    onRoomChange,
    allAvailableRooms = [],
    // Guest Type filter props
    selectedGuestType = "all",
    onGuestTypeChange,
    // Booking Status filter props
    selectedBookingStatus = "all",
    onBookingStatusChange,
    // Reset / clear
    onResetAll,
    activeCount = 0,
}) => {
    // Handle Escape key press
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    // Prevent body scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const hasActiveFilters = activeCount > 0;

    return createPortal(
        <div
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sales-filter-modal-title"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-900 text-white shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
                            <SlidersHorizontal size={16} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 id="sales-filter-modal-title" className="font-bold text-white text-sm">
                                    Filters & Options
                                </h3>
                                {activeCount > 0 && (
                                    <span className="badge badge-xs bg-teal-500 text-slate-900 font-extrabold border-none px-1.5 py-0.5">
                                        {activeCount} active
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-400">
                                Refine dates, workers, room types & status
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-ghost btn-sm btn-circle text-slate-400 hover:text-white"
                        aria-label="Close modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto space-y-4 flex-1 text-slate-800 text-xs">
                    {/* 1. Date Range Section */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                            <CalendarIcon size={14} className="text-teal-600" />
                            <span>Sales Date Range</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2.5">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                                    From Date
                                </span>
                                <DatePicker
                                    selected={startDate}
                                    onChange={(date) => onCustomDateChange && onCustomDateChange("start", date)}
                                    selectsStart
                                    startDate={startDate}
                                    endDate={endDate}
                                    dateFormat="dd MMM yyyy"
                                    placeholderText="From date"
                                    popperClassName="z-[99999]"
                                    popperPlacement="bottom-start"
                                    wrapperClassName="w-full"
                                    className="input input-sm input-bordered rounded-xl bg-slate-50 border-slate-300 text-xs font-semibold w-full cursor-pointer focus:border-teal-500 focus:outline-none h-9"
                                />
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                                    To Date
                                </span>
                                <DatePicker
                                    selected={endDate}
                                    onChange={(date) => onCustomDateChange && onCustomDateChange("end", date)}
                                    selectsEnd
                                    startDate={startDate}
                                    endDate={endDate}
                                    minDate={startDate}
                                    dateFormat="dd MMM yyyy"
                                    placeholderText="To date"
                                    popperClassName="z-[99999]"
                                    popperPlacement="bottom-end"
                                    wrapperClassName="w-full"
                                    className="input input-sm input-bordered rounded-xl bg-slate-50 border-slate-300 text-xs font-semibold w-full cursor-pointer focus:border-teal-500 focus:outline-none h-9"
                                />
                            </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="pt-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                                Quick Presets
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {datePresets.map((preset) => (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        onClick={() => onPresetChange && onPresetChange(preset.id)}
                                        className={`btn btn-xs rounded-xl font-bold transition-all ${
                                            activePreset === preset.id
                                                ? "bg-teal-600 text-white shadow-2xs border-teal-600"
                                                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-transparent"
                                        }`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100" />

                    {/* 2. Worker Role Filter */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                            <Briefcase size={14} className="text-teal-600" />
                            <span>Worker Role</span>
                        </label>
                        <select
                            value={selectedRole}
                            onChange={(e) => onRoleChange && onRoleChange(e.target.value)}
                            className="select select-bordered select-sm w-full h-9 text-xs font-semibold text-slate-800 bg-slate-50 border-slate-300 rounded-xl focus:border-teal-500 focus:outline-none"
                        >
                            <option value="all">All Worker Roles</option>
                            <option value="agent">Agent (Marketing / Sales)</option>
                            <option value="b2b">B2B Partner</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    {/* 3. Specific Worker Filter */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                            <UserCheck size={14} className="text-indigo-600" />
                            <span>Specific Worker / Reference</span>
                        </label>
                        <select
                            value={selectedWorker}
                            onChange={(e) => onWorkerChange && onWorkerChange(e.target.value)}
                            className="select select-bordered select-sm w-full h-9 text-xs font-semibold text-slate-800 bg-slate-50 border-slate-300 rounded-xl focus:border-teal-500 focus:outline-none"
                        >
                            <option value="all">
                                {selectedRole === "all"
                                    ? "All Workers & References"
                                    : `All ${
                                          selectedRole === "b2b"
                                              ? "B2B Partners"
                                              : selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1) + "s"
                                      } & References`}
                            </option>
                            {workerOptions.map((w, idx) => (
                                <option key={idx} value={w.name}>
                                    {w.name} ({String(w.role || "").toUpperCase()})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="h-px bg-slate-100" />

                    {/* 4. Room Category Filter */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                            <BedDouble size={14} className="text-purple-600" />
                            <span>Suite Category</span>
                        </label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => onCategoryChange && onCategoryChange(e.target.value)}
                            className="select select-bordered select-sm w-full h-9 text-xs font-semibold text-slate-800 bg-slate-50 border-slate-300 rounded-xl focus:border-teal-500 focus:outline-none"
                        >
                            <option value="all">All Suite Types</option>
                            {allAvailableCategories.map((catName, i) => (
                                <option key={i} value={catName}>
                                    {catName}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 5. Room No Filter */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                            <DoorClosed size={14} className="text-amber-600" />
                            <span>Room Number</span>
                        </label>
                        <select
                            value={selectedRoom}
                            onChange={(e) => onRoomChange && onRoomChange(e.target.value)}
                            className="select select-bordered select-sm w-full h-9 text-xs font-semibold text-slate-800 bg-slate-50 border-slate-300 rounded-xl focus:border-teal-500 focus:outline-none"
                        >
                            <option value="all">All Rooms</option>
                            {allAvailableRooms.map((roomNo, i) => (
                                <option key={i} value={roomNo}>
                                    Room {roomNo}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="h-px bg-slate-100" />

                    {/* 6. Guest Type Filter */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                            <Users size={14} className="text-blue-600" />
                            <span>Guest Type</span>
                        </label>
                        <select
                            value={selectedGuestType}
                            onChange={(e) => onGuestTypeChange && onGuestTypeChange(e.target.value)}
                            className="select select-bordered select-sm w-full h-9 text-xs font-semibold text-slate-800 bg-slate-50 border-slate-300 rounded-xl focus:border-teal-500 focus:outline-none"
                        >
                            <option value="all">All Guest Types</option>
                            <option value="WEB">WEB</option>
                            <option value="Walk-In">Walk-In</option>
                        </select>
                    </div>

                    {/* 7. Booking Status Filter */}
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                            <Filter size={14} className="text-rose-500" />
                            <span>Booking Status</span>
                        </label>
                        <select
                            value={selectedBookingStatus}
                            onChange={(e) => onBookingStatusChange && onBookingStatusChange(e.target.value)}
                            className="select select-bordered select-sm w-full h-9 text-xs font-semibold text-slate-800 bg-slate-50 border-slate-300 rounded-xl focus:border-teal-500 focus:outline-none"
                        >
                            <option value="all">All Statuses</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="checked_in">Checked In</option>
                            <option value="checked_out">Checked Out</option>
                            <option value="request_booking">Pending / Request</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50 shrink-0 gap-2">
                    {hasActiveFilters ? (
                        <button
                            type="button"
                            onClick={onResetAll}
                            className="btn btn-ghost btn-xs text-rose-600 hover:bg-rose-50 gap-1 font-bold"
                        >
                            <RotateCcw size={12} />
                            <span>Clear Filters</span>
                        </button>
                    ) : (
                        <div className="text-[11px] text-slate-400 font-medium">Default view active</div>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-sm bg-teal-600 hover:bg-teal-700 text-white border-none rounded-xl px-5 font-bold shadow-xs ml-auto"
                    >
                        <Check size={14} />
                        <span>Done</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default SalesReportFilterModal;
