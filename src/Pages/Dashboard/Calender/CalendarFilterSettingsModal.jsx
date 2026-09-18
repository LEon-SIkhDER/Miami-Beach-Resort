import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { SlidersHorizontal, Filter, Eye, X, RotateCcw, Check, Calendar as CalendarIcon } from "lucide-react";

const CalendarFilterSettingsModal = ({
    isOpen,
    onClose,
    categories = [],
    selectedCategory = "ALL",
    onCategoryChange,
    showPricingRow = false,
    onTogglePricingRow,
    showOccupancyRow = false,
    onToggleOccupancyRow,
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
    onResetDateRange,
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

    const hasActiveCustomizations =
        selectedCategory !== "ALL" || showPricingRow || showOccupancyRow;

    const activeCount =
        (selectedCategory !== "ALL" ? 1 : 0) +
        (showPricingRow ? 1 : 0) +
        (showOccupancyRow ? 1 : 0);

    const handleResetAll = () => {
        if (onCategoryChange) onCategoryChange("ALL");
        if (onTogglePricingRow) onTogglePricingRow(false);
        if (onToggleOccupancyRow) onToggleOccupancyRow(false);
        if (onResetDateRange) onResetDateRange();
    };

    return createPortal(
        <div
            onClick={onClose}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="filter-settings-title"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md max-h-[88vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-900 text-white shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
                            <SlidersHorizontal size={16} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 id="filter-settings-title" className="font-bold text-white text-sm">
                                    Filters & Display
                                </h3>
                                {activeCount > 0 && (
                                    <span className="badge badge-xs bg-teal-500 text-slate-900 font-extrabold border-none px-1.5 py-0.5">
                                        {activeCount} active
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-slate-400">
                                Customize dates, room categories, and calendar rows
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
                <div className="p-5 overflow-y-auto space-y-5 flex-1 text-slate-800 text-xs">
                    {/* Date Range Section */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                            <CalendarIcon size={14} className="text-teal-600" />
                            <span>Calendar Date Range</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2.5">
                            <div>
                                <span className="text-[11px] font-semibold text-slate-500 block mb-1">From Date</span>
                                <DatePicker
                                    selected={startDate}
                                    onChange={(date) => onStartDateChange && onStartDateChange(date)}
                                    selectsStart
                                    startDate={startDate}
                                    endDate={endDate}
                                    placeholderText="From date"
                                    dateFormat="dd MMM yyyy"
                                    popperClassName="z-[99999]"
                                    popperPlacement="bottom-start"
                                    wrapperClassName="w-full"
                                    className="input input-sm input-bordered rounded-xl bg-slate-50 border-slate-300 text-xs font-semibold w-full cursor-pointer focus:border-teal-500 focus:outline-none h-9"
                                />
                            </div>
                            <div>
                                <span className="text-[11px] font-semibold text-slate-500 block mb-1">To Date</span>
                                <DatePicker
                                    selected={endDate}
                                    onChange={(date) => onEndDateChange && onEndDateChange(date)}
                                    selectsEnd
                                    startDate={startDate}
                                    endDate={endDate}
                                    minDate={startDate}
                                    placeholderText="To date"
                                    dateFormat="dd MMM yyyy"
                                    popperClassName="z-[99999]"
                                    popperPlacement="bottom-end"
                                    wrapperClassName="w-full"
                                    className="input input-sm input-bordered rounded-xl bg-slate-50 border-slate-300 text-xs font-semibold w-full cursor-pointer focus:border-teal-500 focus:outline-none h-9"
                                />
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400">
                            Select start and end dates to display in the calendar view.
                        </p>
                    </div>

                    <div className="h-px bg-slate-100" />

                    {/* Category Filter Section */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                            <Filter size={14} className="text-teal-600" />
                            <span>Room Category</span>
                        </label>
                        <div className="relative">
                            <select
                                value={selectedCategory}
                                onChange={(e) => onCategoryChange && onCategoryChange(e.target.value)}
                                className="select select-bordered w-full h-10 text-xs font-semibold text-slate-800 bg-slate-50 border-slate-300 rounded-xl focus:border-teal-500 focus:outline-none"
                            >
                                <option value="ALL">All Categories ({categories.length})</option>
                                {categories.map((c) => (
                                    <option key={c._id || c.name} value={c._id || c.name}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <p className="text-[10px] text-slate-400">
                            Select a specific room category to filter the calendar rows.
                        </p>
                    </div>

                    <div className="h-px bg-slate-100" />

                    {/* Table Display Settings Section */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                            <Eye size={14} className="text-teal-600" />
                            <span>Table Display Options</span>
                        </label>

                        {/* Date-wise Pricing Row Card */}
                        <div
                            onClick={() => onTogglePricingRow && onTogglePricingRow(!showPricingRow)}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                showPricingRow
                                    ? "bg-teal-50/70 border-teal-300 ring-1 ring-teal-200"
                                    : "bg-slate-50 border-slate-200 hover:bg-slate-100/70"
                            }`}
                        >
                            <div className="space-y-0.5 flex-1 pr-2">
                                <span className="font-bold text-slate-800 text-xs block">
                                    Show Date-wise Pricing Row
                                </span>
                                <span className="text-[11px] text-slate-500 block leading-tight">
                                    Displays the dynamic daily rate row beneath each room category
                                </span>
                            </div>
                            <input
                                type="checkbox"
                                checked={showPricingRow}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    onTogglePricingRow && onTogglePricingRow(e.target.checked);
                                }}
                                className="checkbox checkbox-sm checkbox-primary rounded-lg pointer-events-auto"
                            />
                        </div>

                        {/* Show Occupancy Card */}
                        <div
                            onClick={() => onToggleOccupancyRow && onToggleOccupancyRow(!showOccupancyRow)}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                showOccupancyRow
                                    ? "bg-teal-50/70 border-teal-300 ring-1 ring-teal-200"
                                    : "bg-slate-50 border-slate-200 hover:bg-slate-100/70"
                            }`}
                        >
                            <div className="space-y-0.5 flex-1 pr-2">
                                <span className="font-bold text-slate-800 text-xs block">
                                    Show Occupancy
                                </span>
                                <span className="text-[11px] text-slate-500 block leading-tight">
                                    Displays overall occupancy rate and booked room count across all rooms
                                </span>
                            </div>
                            <input
                                type="checkbox"
                                checked={showOccupancyRow}
                                onChange={(e) => {
                                    e.stopPropagation();
                                    onToggleOccupancyRow && onToggleOccupancyRow(e.target.checked);
                                }}
                                className="checkbox checkbox-sm checkbox-primary rounded-lg pointer-events-auto"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50 shrink-0 gap-2">
                    {hasActiveCustomizations ? (
                        <button
                            type="button"
                            onClick={handleResetAll}
                            className="btn btn-ghost btn-xs text-slate-500 hover:text-rose-600 gap-1 font-semibold"
                        >
                            <RotateCcw size={12} />
                            <span>Reset Default</span>
                        </button>
                    ) : (
                        <div className="text-[11px] text-slate-400 font-medium">Default view active</div>
                    )}
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-sm bg-teal-600 hover:bg-teal-700 text-white border-none rounded-xl px-5 font-bold shadow-xs"
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

export default CalendarFilterSettingsModal;
