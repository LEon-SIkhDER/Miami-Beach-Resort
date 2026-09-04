import React, { useEffect, useState, useContext, useMemo } from "react";
import { useNavigate } from "react-router";
import DatePicker from "react-datepicker";
import { eachDayOfInterval, format, addDays, subDays, startOfMonth, endOfMonth, addMonths } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";
import { AuthContext } from "../../../Context/AuthContext";
import useRole from "../../../hooks/useRole";
import useAxiosSecure from "../../../hooks/useAxiosSecure";
import RequestBookingsModal from "./RequestBookingsModal";
import CalendarBookingModal from "./CalendarBookingModal";
import CalendarBookingDetailsModal from "./CalendarBookingDetailsModal";
import OutOfOrderModal from "./OutOfOrderModal";
import { Clock, RefreshCw, BedDouble, Wrench, AlertTriangle, Wallet, Filter, ChevronLeft, ChevronRight, ChevronDown, Calendar as CalendarIcon } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getBookingRooms, getBookingTotal, getBookingPaidAmount, getBookingDueAmount } from "../../../utils/bookingUtils";
import toast from "react-hot-toast";

const Calender = () => {
    const { user } = useContext(AuthContext);
    const { role } = useRole();
    const axiosSecure = useAxiosSecure();
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    // Modals
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [newBookingCellData, setNewBookingCellData] = useState(null);
    const [selectedBookingId, setSelectedBookingId] = useState(null);
    const [isOutOfOrderOpen, setIsOutOfOrderOpen] = useState(false);
    const [selectedOOORoom, setSelectedOOORoom] = useState(null);

    // Category Filter State (ALL or specific category _id / name)
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(() => {
        try {
            return localStorage.getItem("calendar_selected_category") || "ALL";
        } catch (e) {
            return "ALL";
        }
    });

    const handleCategoryFilterChange = (val) => {
        setSelectedCategoryFilter(val);
        try {
            localStorage.setItem("calendar_selected_category", val);
        } catch (e) { }
    };

    // Date-wise Pricing Row Checkbox State
    const [showPricingRow, setShowPricingRow] = useState(() => {
        try {
            return localStorage.getItem("calendar_show_pricing_row") === "true";
        } catch (e) {
            return false;
        }
    });

    const handleTogglePricingRow = (checked) => {
        setShowPricingRow(checked);
        try {
            localStorage.setItem("calendar_show_pricing_row", String(checked));
        } catch (e) { }
    };

    // Room-wise Occupancy Row Checkbox State
    const [showOccupancyRow, setShowOccupancyRow] = useState(() => {
        try {
            return localStorage.getItem("calendar_show_occupancy_row") === "true";
        } catch (e) {
            return false;
        }
    });

    const handleToggleOccupancyRow = (checked) => {
        setShowOccupancyRow(checked);
        try {
            localStorage.setItem("calendar_show_occupancy_row", String(checked));
        } catch (e) { }
    };

    // Helper: calculate effective price for a category on a specific date
    const getEffectiveCategoryPrice = (cat, isoDate) => {
        if (!cat) return 0;
        const basePrice = Number(cat.price || 0);
        if (!Array.isArray(cat.scheduledPrices) || cat.scheduledPrices.length === 0) {
            return basePrice;
        }
        const sorted = [...cat.scheduledPrices]
            .filter((sp) => sp && sp.effectiveDate && !isNaN(Number(sp.price)))
            .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
        const matched = sorted.find((sp) => sp.effectiveDate <= isoDate);
        return matched ? Number(matched.price) : basePrice;
    };

    // 1. Fetch pending request bookings count & items
    const {
        data: requestBookings = [],
        refetch: refetchRequestBookings
    } = useQuery({
        queryKey: ["requestBookings"],
        queryFn: async () => {
            const { data: result } = await axiosSecure.get("/bookings?status=request_booking");
            return result;
        }
    });

    // 2. Fetch all real categories from database
    const {
        data: dbCategories = [],
        isLoading: isCategoriesLoading,
        refetch: refetchCategories
    } = useQuery({
        queryKey: ["all-categories-for-calendar"],
        queryFn: async () => {
            const res = await axiosSecure.get("/categoryandroom");
            return res.data;
        }
    });

    // 3. Fetch all active bookings from database
    const {
        data: allBookings = [],
        isLoading: isBookingsLoading,
        refetch: refetchBookings
    } = useQuery({
        queryKey: ["all-bookings-for-calendar"],
        queryFn: async () => {
            const res = await axiosSecure.get("/bookings");
            return res.data;
        }
    });

    // 4. Fetch Out of Order records
    const {
        data: outOfOrderList = [],
        refetch: refetchOOO
    } = useQuery({
        queryKey: ["out-of-order-calendar"],
        queryFn: async () => {
            const res = await axiosSecure.get("/out-of-order");
            return res.data;
        }
    });

    // Date Range State: Always starts on current date to 1 month forward on load (no localStorage persistence)
    const [startDate, setStartDate] = useState(() => new Date());
    const [endDate, setEndDate] = useState(() => addMonths(new Date(), 1));

    // Clean up any old calendar date keys from localStorage
    useEffect(() => {
        try {
            localStorage.removeItem("calendar_startDate");
            localStorage.removeItem("calendar_endDate");
            localStorage.removeItem("startDate");
            localStorage.removeItem("endDate");
        } catch (e) { }
    }, []);

    const handleStartDate = (date) => {
        if (!date || isNaN(date.getTime())) return;
        setStartDate(date);
        if (endDate && date > endDate) {
            const adjustedEnd = addMonths(date, 1);
            setEndDate(adjustedEnd);
        }
    };

    const handleEndDate = (date) => {
        if (!date || isNaN(date.getTime())) return;
        setEndDate(date);
    };

    // Quick Date Navigation Helpers
    const handleShiftDays = (days) => {
        const currentSpan = endDate && startDate ? Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))) : 30;
        const newStart = days > 0 ? addDays(startDate, days) : subDays(startDate, Math.abs(days));
        const newEnd = addDays(newStart, currentSpan);
        setStartDate(newStart);
        setEndDate(newEnd);
    };

    const handleSetTodayView = () => {
        const today = new Date();
        setStartDate(today);
        setEndDate(addMonths(today, 1));
    };

    const handleSetThisMonth = () => {
        const today = new Date();
        setStartDate(startOfMonth(today));
        setEndDate(endOfMonth(today));
    };

    // Calculate array of date interval objects safely
    const dateRange = useMemo(() => {
        if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate > endDate) return [];
        try {
            const todayIso = format(new Date(), "yyyy-MM-dd");
            return eachDayOfInterval({ start: startDate, end: endDate }).map((date) => {
                const iso = format(date, "yyyy-MM-dd");
                return {
                    display: format(date, "dd MMM yyyy"),
                    dayName: format(date, "EEE"),
                    iso: iso,
                    dateObj: date,
                    isToday: iso === todayIso,
                    isPast: iso < todayIso
                };
            });
        } catch (e) {
            console.error("Date interval calculation error:", e);
            return [];
        }
    }, [startDate, endDate]);

    const [loading, setLoading] = useState(false);

    const handleRefresh = async () => {
        setLoading(true);
        try {
            await queryClient.invalidateQueries();
            await Promise.all([
                refetchCategories(),
                refetchBookings(),
                refetchRequestBookings(),
                refetchOOO()
            ]);
            toast.success("Schedule refreshed! 🔄");
        } catch (e) {
            console.error(e);
        } finally {
            setTimeout(() => setLoading(false), 400);
        }
    };

    // Build Fast Map: Key is `${roomNo}_${isoDate}` -> bookingInfo
    // Exclude checked_out and cancel bookings so cell is empty after checkout!
    const bookingCellMap = useMemo(() => {
        const map = new Map();
        if (!Array.isArray(allBookings)) return map;

        allBookings.forEach((booking) => {
            if (!booking || ["cancel", "cancelled", "checked_out"].includes(booking.status)) return;
            const rooms = getBookingRooms(booking);
            if (!Array.isArray(rooms)) return;

            rooms.forEach((roomItem) => {
                if (!roomItem) return;
                const roomNo = String(roomItem.roomNo || "").trim();
                if (!roomNo || !roomItem.checkIn || !roomItem.checkOut) return;

                try {
                    const start = new Date(roomItem.checkIn);
                    const end = new Date(roomItem.checkOut);
                    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return;

                    const days = eachDayOfInterval({ start, end });
                    // Stay nights (excluding checkout date)
                    if (days.length > 1) {
                        days.slice(0, -1).forEach((d) => {
                            const iso = format(d, "yyyy-MM-dd");
                            const key = `${roomNo}_${iso}`;
                            map.set(key, {
                                guestName: booking.name || "Guest",
                                phone: booking.mobile || "",
                                bookingId: booking.bookingId || "",
                                _id: booking._id,
                                status: booking.status,
                                checkIn: roomItem.checkIn,
                                checkOut: roomItem.checkOut,
                                roomNo: roomNo,
                                categoryName: roomItem.categoryName || "",
                                totalAmount: getBookingTotal(booking),
                                paidAmount: getBookingPaidAmount(booking),
                                dueAmount: getBookingDueAmount(booking)
                            });
                        });
                    }
                } catch (e) {
                    console.error("Booking date interval parse error:", e);
                }
            });
        });
        return map;
    }, [allBookings]);

    // Build Fast Map for Out of Order rooms: Key is `${roomNo}_${isoDate}` -> oooRecord
    const outOfOrderCellMap = useMemo(() => {
        const map = new Map();
        if (!Array.isArray(outOfOrderList)) return map;

        outOfOrderList.forEach((ooo) => {
            if (!ooo || ooo.status !== "active") return;
            const roomNo = String(ooo.roomNo || "").trim();
            if (!roomNo || !ooo.startDate || !ooo.endDate) return;

            try {
                const start = new Date(ooo.startDate);
                const end = new Date(ooo.endDate);
                if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return;

                const days = eachDayOfInterval({ start, end });
                if (days.length > 1) {
                    days.slice(0, -1).forEach((d) => {
                        const iso = format(d, "yyyy-MM-dd");
                        const key = `${roomNo}_${iso}`;
                        map.set(key, ooo);
                    });
                }
            } catch (e) {
                console.error("OOO date interval parse error:", e);
            }
        });
        return map;
    }, [outOfOrderList]);

    // Categories with their physical room numbers (filtered by selectedCategoryFilter)
    const displayCategories = useMemo(() => {
        if (!Array.isArray(dbCategories)) return [];
        return dbCategories
            .filter((cat) => {
                if (selectedCategoryFilter === "ALL" || !selectedCategoryFilter) return true;
                return String(cat._id) === String(selectedCategoryFilter) || cat.name === selectedCategoryFilter;
            })
            .map((cat) => {
                if (!cat) return null;
                const rawRooms = Array.isArray(cat.roomNumbers) ? cat.roomNumbers : [];
                return {
                    category: cat.name || "Room Category",
                    _id: cat._id || cat.name,
                    price: cat.price || 0,
                    scheduledPrices: cat.scheduledPrices || [],
                    roomNumbers: rawRooms.map(r => String(r).trim()).filter(Boolean)
                };
            })
            .filter((cat) => cat && cat.roomNumbers.length > 0);
    }, [dbCategories, selectedCategoryFilter]);

    // Occupancy Rate & Statistics Calculation (Percentage of rooms booked TODAY vs total rooms)
    const statistics = useMemo(() => {
        const todayIso = format(new Date(), "yyyy-MM-dd");
        const totalPhysicalRooms = displayCategories.reduce((acc, c) => acc + c.roomNumbers.length, 0);

        let todayOccupied = 0;
        displayCategories.forEach((cat) => {
            cat.roomNumbers.forEach((rNo) => {
                const key = `${String(rNo).trim()}_${todayIso}`;
                if (bookingCellMap.has(key)) {
                    todayOccupied++;
                }
            });
        });

        const todayOccupancyRate = totalPhysicalRooms > 0 ? Math.round((todayOccupied / totalPhysicalRooms) * 100) : 0;

        const statusCounts = {
            payment_waiting: 0,
            checked_id: 0,
            booking_confirmed: 0,
            request_booking: 0,
            out_of_order: outOfOrderList.filter(o => o.status === "active").length
        };

        if (Array.isArray(allBookings)) {
            allBookings.forEach(b => {
                if (!b || ["cancel", "cancelled", "checked_out"].includes(b.status)) return;
                if (b.status === "payment_waiting") statusCounts.payment_waiting++;
                else if (b.status === "checked_id" || b.status === "checked_in") statusCounts.checked_id++;
                else if (b.status === "booking_confirmed" || b.status === "confirmed") statusCounts.booking_confirmed++;
                else if (b.status === "request_booking") statusCounts.request_booking++;
            });
        }

        return {
            totalPhysicalRooms,
            todayOccupancyRate,
            todayOccupied,
            statusCounts
        };
    }, [displayCategories, bookingCellMap, outOfOrderList, allBookings]);

    // Exact requested color styles:
    // Request booking: current amber (#f59e0b)
    // Payment waiting: yellow (#eab308)
    // Booking confirmed: #5261d6
    // Check in: #01966e
    const getStatusCellClass = (status) => {
        switch (status) {
            case "booking_confirmed":
            case "confirmed":
                return "bg-[#5261d6] text-white font-medium hover:bg-[#4351be]";
            case "checked_id":
            case "checked_in":
                return "bg-[#01966e] text-white font-medium hover:bg-[#017c5b]";
            case "payment_waiting":
                return "bg-[#e11d48] text-white font-bold hover:bg-[#be123c]";
            case "request_booking":
                return "bg-[#f59e0b] text-white font-medium hover:bg-[#d97706]";
            default:
                return "bg-[#5261d6] text-white font-medium";
        }
    };

    const handleCellClick = (bookingInfo, oooInfo, category, roomNo, dateObj) => {
        if (oooInfo) {
            setSelectedOOORoom({
                roomNo: String(roomNo).trim(),
                categoryId: category._id,
                categoryName: category.category,
                startDate: dateObj.iso
            });
            setIsOutOfOrderOpen(true);
        } else if (bookingInfo?._id) {
            setSelectedBookingId(bookingInfo._id);
        } else {
            if (dateObj.isPast) {
                return;
            }
            setNewBookingCellData({
                roomNo: String(roomNo).trim(),
                categoryId: category._id,
                categoryName: category.category,
                checkInDate: dateObj.iso
            });
        }
    };

    return (
        <div className="flex h-[calc(100dvh-65px)] w-full min-w-0 flex-col overflow-hidden bg-slate-50">
            {/* Top Workflow Ribbon with Specified Colors */}
            <div className="bg-white border-b border-slate-200 px-3 sm:px-5 py-2 shrink-0 flex flex-wrap items-center justify-center gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                        <span>Workflow:</span>
                    </div>
                    {/* 1. Request Booking */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f59e0b]/15 border border-[#f59e0b]/40 text-[#b45309] font-bold text-[11px]">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] ring-2 ring-white" />
                        <span>Request Booking ({statistics.statusCounts.request_booking})</span>
                    </div>
                    <span className="text-slate-300 font-black">➔</span>

                    {/* 2. Payment Waiting */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-extrabold text-[11px]">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-white" />
                        <span>Payment Waiting ({statistics.statusCounts.payment_waiting})</span>
                    </div>
                    <span className="text-slate-300 font-black">➔</span>

                    {/* 3. Confirmed */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#5261d6]/15 border border-[#5261d6]/40 text-[#5261d6] font-bold text-[11px]">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#5261d6] ring-2 ring-white" />
                        <span>Confirmed ({statistics.statusCounts.booking_confirmed})</span>
                    </div>
                    <span className="text-slate-300 font-black">➔</span>

                    {/* 4. Check In */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#01966e]/15 border border-[#01966e]/40 text-[#01966e] font-bold text-[11px]">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#01966e] ring-2 ring-white" />
                        <span>Check In ({statistics.statusCounts.checked_id})</span>
                    </div>

                    <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

                    {/* 5. Out of Order */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 text-amber-300 font-bold text-[11px] shadow-xs">
                        <Wrench size={11} className="text-amber-400" />
                        <span>Out of Order ({statistics.statusCounts.out_of_order})</span>
                    </div>
                </div>
            </div>

            {/* Controls Header — Single flex justify-between toolbar with all category tools on left and OOO/dates/refresh on right */}
            <div className="flex flex-wrap items-center justify-between p-3 sm:p-4 gap-3 shrink-0 bg-white border-b border-slate-200">
                {/* Left Controls: Filter, Pricing Toggle, Occupancy Toggle, Request Bookings */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* DaisyUI Category Filter Select */}
                    <select
                        value={selectedCategoryFilter}
                        onChange={(e) => handleCategoryFilterChange(e.target.value)}
                        className="select w-56 sm:w-64 h-8 select-ghost select-sm font-bold text-slate-800 text-xs focus:outline-none cursor-pointer min-h-0 truncate bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-0.5 shadow-2xs"
                    >
                        <option value="ALL">All Categories ({dbCategories.length})</option>
                        {dbCategories.map((c) => (
                            <option key={c._id || c.name} value={c._id || c.name}>
                                {c.name}
                            </option>
                        ))}
                    </select>

                    {/* Date-wise Pricing Checkbox Toggle */}
                    <label className="flex items-center gap-2 bg-slate-50 hover:bg-teal-50/70 border border-slate-300 hover:border-teal-400 rounded-xl px-3 py-1 h-8 cursor-pointer transition select-none">
                        <input
                            type="checkbox"
                            checked={showPricingRow}
                            onChange={(e) => handleTogglePricingRow(e.target.checked)}
                            className="checkbox checkbox-xs checkbox-primary rounded"
                        />
                        <span className="text-xs font-bold text-slate-700">Show Date-wise Pricing Row</span>
                    </label>

                    {/* Occupancy Checkbox Toggle */}
                    <label className="flex items-center gap-2 bg-slate-50 hover:bg-teal-50/70 border border-slate-300 hover:border-teal-400 rounded-xl px-3 py-1 h-8 cursor-pointer transition select-none">
                        <input
                            type="checkbox"
                            checked={showOccupancyRow}
                            onChange={(e) => handleToggleOccupancyRow(e.target.checked)}
                            className="checkbox checkbox-xs checkbox-primary rounded"
                        />
                        <span className="text-xs font-bold text-slate-700">Show Occupancy</span>
                    </label>

                    {/* Request Bookings Button */}
                    <button
                        type="button"
                        onClick={() => setIsRequestModalOpen(true)}
                        className={`btn btn-sm rounded-xl transition-all duration-200 gap-1.5 font-bold h-8 ${requestBookings.length > 0
                                ? "bg-[#f59e0b] hover:bg-amber-600 text-white border-none shadow-md shadow-amber-500/25 ring-2 ring-amber-400/40"
                                : "btn-outline border-slate-300 text-slate-700 hover:bg-slate-100"
                            }`}
                    >
                        <Clock size={14} />
                        <span>Request Bookings ({requestBookings.length ? requestBookings.length : 0})</span>
                    </button>
                </div>

                {/* Right Controls: Out of Order Rooms, Date Pickers, Refresh */}
                <div className="flex flex-wrap items-center justify-end gap-2.5">
                    {/* Out of Order Rooms Button */}
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedOOORoom(null);
                            setIsOutOfOrderOpen(true);
                        }}
                        className={`btn btn-sm rounded-xl transition-all duration-200 gap-1.5 font-bold h-8 ${outOfOrderList.length > 0
                                ? "bg-neutral-900 hover:bg-neutral-800 text-amber-300 border-none shadow-md ring-2 ring-amber-400/30"
                                : "btn-outline border-slate-300 text-slate-700 hover:bg-slate-100"
                            }`}
                    >
                        <Wrench size={13} className="text-amber-400" />
                        <span>Out of Order ({outOfOrderList.length})</span>
                    </button>

                    {/* Date Pickers with High z-index Poppers */}
                    <div className="flex items-center gap-1.5">
                        <div className="relative">
                            <DatePicker
                                selected={startDate}
                                onChange={(date) => handleStartDate(date)}
                                selectsStart
                                startDate={startDate}
                                endDate={endDate}
                                placeholderText="From date"
                                dateFormat="dd MMM yyyy"
                                popperClassName="z-[9999]"
                                popperPlacement="bottom-end"
                                className="rounded-lg border border-gray-300 outline-none focus:border-teal-500 input input-sm cursor-pointer text-xs w-28 sm:w-32 bg-white font-semibold shadow-2xs"
                            />
                        </div>

                        <span className="text-gray-400 text-xs font-bold">—</span>

                        <div className="relative">
                            <DatePicker
                                selected={endDate}
                                onChange={(date) => handleEndDate(date)}
                                selectsEnd
                                startDate={startDate}
                                endDate={endDate}
                                minDate={startDate}
                                placeholderText="To date"
                                dateFormat="dd MMM yyyy"
                                popperClassName="z-[9999]"
                                popperPlacement="bottom-end"
                                className="rounded-lg border border-gray-300 outline-none focus:border-teal-500 input input-sm cursor-pointer text-xs w-28 sm:w-32 bg-white font-semibold shadow-2xs"
                            />
                        </div>
                    </div>

                    {/* Refresh Button */}
                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={loading}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs transition-all hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 h-8"
                        title="Refresh calendar data"
                    >
                        <RefreshCw
                            size={14}
                            className={`transition-transform duration-500 ${loading ? "animate-spin text-teal-600" : ""}`}
                        />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </div>

            {/* Calendar Grid Table */}
            <div className="min-h-0 min-w-0 flex-1 overflow-auto border-t border-gray-300 bg-white">
                <table className="min-w-max border-separate border-spacing-0 text-xs">
                    <tbody>



                        {isCategoriesLoading || isBookingsLoading ? (
                            <tr>
                                <td colSpan={dateRange.length + 1} className="text-center py-16 text-slate-400">
                                    <RefreshCw size={28} className="mx-auto mb-2 animate-spin text-teal-600" />
                                    Loading room schedule...
                                </td>
                            </tr>
                        ) : displayCategories.length === 0 ? (
                            <tr>
                                <td colSpan={dateRange.length + 1} className="text-center py-16 text-slate-400">
                                    <BedDouble size={36} className="mx-auto mb-2 opacity-50" />
                                    No room categories found. Add categories and room numbers in Category & Room.
                                </td>
                            </tr>
                        ) : (
                            <>
                                {/* Single Overall Occupancy Row for All Rooms */}
                                {showOccupancyRow && displayCategories.length > 0 && (
                                    <tr className="bg-teal-50/50">
                                        <th className="sticky left-0 z-40 border border-gray-300 bg-teal-100 text-[11px] font-bold px-2 py-1 text-teal-950 shadow-md whitespace-nowrap text-left">
                                            <span className="flex items-center gap-1">
                                                📊 Occupancy
                                            </span>
                                        </th>
                                        {dateRange.map((dateObj) => {
                                            const allPhysicalRooms = displayCategories.flatMap((c) => (Array.isArray(c.roomNumbers) ? c.roomNumbers : [])).map((r) => String(r).trim()).filter(Boolean);
                                            const totalRoomsCount = allPhysicalRooms.length;
                                            let occupiedCount = 0;
                                            let oooCount = 0;

                                            allPhysicalRooms.forEach((rNo) => {
                                                const cellKey = `${rNo}_${dateObj.iso}`;
                                                if (bookingCellMap.has(cellKey)) {
                                                    occupiedCount++;
                                                } else if (outOfOrderCellMap.has(cellKey)) {
                                                    oooCount++;
                                                }
                                            });

                                            const percent = totalRoomsCount > 0 ? Math.round((occupiedCount / totalRoomsCount) * 100) : 0;
                                            const availableCount = Math.max(0, totalRoomsCount - occupiedCount - oooCount);

                                            return (
                                                <td
                                                    key={`overall-occupancy-${dateObj.iso}`}
                                                    className={`px-1 py-1 border border-gray-300 text-center font-mono text-[10px] font-bold whitespace-nowrap ${percent === 100
                                                            ? "bg-rose-100/80 text-rose-900 font-black"
                                                            : percent > 0
                                                                ? "bg-teal-100/70 text-teal-900"
                                                                : "bg-slate-50/70 text-slate-500 font-normal"
                                                        }`}
                                                    title={`Overall Occupancy\nDate: ${dateObj.display}\nOccupied: ${occupiedCount}/${totalRoomsCount} rooms (${percent}%)\nAvailable: ${availableCount} rooms${oooCount > 0 ? `\nOut of Order: ${oooCount} rooms` : ''}`}
                                                >
                                                    <span className={`text-[10px] font-bold ${percent === 100 ? 'text-rose-800 font-extrabold' : percent > 0 ? 'text-teal-900' : 'text-slate-500'}`}>
                                                        {percent}%
                                                    </span>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                )}

                                {displayCategories.map((category) => (
                                    <React.Fragment key={category._id || category.category}>

                                        {/* CATEGORY ROW HEADER — z-40 sticky */}
                                        <tr>
                                            <th className="sticky left-0 z-40 border border-gray-300 bg-slate-800 text-xs font-bold px-2.5 py-1.5 text-white shadow-md whitespace-nowrap text-left">
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="text-[10px]">{category.category}</span>
                                                </div>
                                            </th>
                                            {dateRange.map((dateObj) => (
                                                <td
                                                    key={`${category.category}-${dateObj.iso}`}
                                                    className={`px-0.5 py-1 border border-gray-300 text-center text-[11px] font-bold whitespace-nowrap ${dateObj.isToday ? "bg-amber-100 text-amber-900 font-bold" : "bg-slate-100 text-slate-700"
                                                        }`}
                                                >
                                                    <span>{dateObj.display}</span>
                                                    <span className="text-[9px] text-slate-400 block font-normal uppercase">
                                                        {dateObj.dayName}
                                                    </span>
                                                </td>
                                            ))}
                                        </tr>

                                        {/* Optional Date-wise Pricing Row — z-40 sticky */}
                                        {showPricingRow && (
                                            <tr className="bg-amber-50/40">
                                                <th className="sticky left-0 z-40 border border-gray-300 bg-amber-50 text-[11px] font-bold px-2 py-1 text-amber-900 shadow-md whitespace-nowrap text-left">
                                                    <span className="flex items-center gap-1">
                                                        🏷️ Pricing / Night
                                                    </span>
                                                </th>
                                                {dateRange.map((dateObj) => {
                                                    const effectivePrice = getEffectiveCategoryPrice(category, dateObj.iso);
                                                    const isCustomScheduled = category.scheduledPrices?.some(sp => sp.effectiveDate <= dateObj.iso);
                                                    return (
                                                        <td
                                                            key={`price-${category.category}-${dateObj.iso}`}
                                                            className={`px-1.5 py-1 border border-gray-300 text-center font-mono text-[10px] font-bold whitespace-nowrap ${isCustomScheduled ? "bg-amber-100/60 text-teal-800" : "bg-slate-50/80 text-slate-600"
                                                                }`}
                                                            title={`Category: ${category.category}\nDate: ${dateObj.display}\nPrice: ৳${effectivePrice.toLocaleString()}`}
                                                        >
                                                            ৳{effectivePrice.toLocaleString()}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        )}

                                        {/* ROOM NUMBER ROWS — z-30 sticky with 0-risk dynamic colSpan */}
                                        {category.roomNumbers.map((roomNo) => {
                                            const rowCells = [];
                                            let dateIndex = 0;

                                            while (dateIndex < dateRange.length) {
                                                const dateObj = dateRange[dateIndex];
                                                const cellKey = `${String(roomNo).trim()}_${dateObj.iso}`;
                                                const bookingInfo = bookingCellMap.get(cellKey);
                                                const oooInfo = outOfOrderCellMap.get(cellKey);

                                                if (oooInfo) {
                                                    // Calculate consecutive OOO days in visible range
                                                    const currentOOOId = String(oooInfo._id || oooInfo.reason);
                                                    let oooSpan = 1;
                                                    while (
                                                        dateIndex + oooSpan < dateRange.length &&
                                                        String(outOfOrderCellMap.get(`${String(roomNo).trim()}_${dateRange[dateIndex + oooSpan].iso}`)?._id ||
                                                            outOfOrderCellMap.get(`${String(roomNo).trim()}_${dateRange[dateIndex + oooSpan].iso}`)?.reason) === currentOOOId
                                                    ) {
                                                        oooSpan++;
                                                    }

                                                    rowCells.push(
                                                        <td
                                                            key={`ooo-${roomNo}-${dateObj.iso}`}
                                                            colSpan={oooSpan}
                                                            onClick={() => handleCellClick(null, oooInfo, category, roomNo, dateObj)}
                                                            title={`Room ${roomNo} is OUT OF ORDER\nReason: ${oooInfo.reason}\nPeriod: ${oooInfo.startDate} → ${oooInfo.endDate}\nClick to view maintenance details or resolve.`}
                                                            className="px-1 py-1 text-center text-xs whitespace-nowrap bg-[#171717] text-amber-300 font-bold border-2 border-dashed border-amber-500 hover:bg-neutral-800 cursor-pointer select-none shadow-xs"
                                                        >
                                                            <span className="truncate block text-[10px] leading-tight">
                                                                🛠️ Out of Order
                                                            </span>
                                                        </td>
                                                    );

                                                    dateIndex += oooSpan;
                                                } else if (bookingInfo) {
                                                    // Calculate consecutive booking days in visible range
                                                    const currentBookingId = String(bookingInfo._id || bookingInfo.bookingId);
                                                    let bookingSpan = 1;
                                                    while (
                                                        dateIndex + bookingSpan < dateRange.length &&
                                                        String(bookingCellMap.get(`${String(roomNo).trim()}_${dateRange[dateIndex + bookingSpan].iso}`)?._id ||
                                                            bookingCellMap.get(`${String(roomNo).trim()}_${dateRange[dateIndex + bookingSpan].iso}`)?.bookingId) === currentBookingId
                                                    ) {
                                                        bookingSpan++;
                                                    }

                                                    const dueAmount = bookingInfo.dueAmount !== undefined
                                                        ? Number(bookingInfo.dueAmount || 0)
                                                        : Math.max(0, Number(bookingInfo.totalAmount || 0) - Number(bookingInfo.paidAmount || 0));
                                                    const hasDue = bookingInfo.status !== "cancel" && dueAmount > 0;

                                                    const tableStartIso = startDate ? format(startDate, "yyyy-MM-dd") : (dateRange[0]?.iso || "");
                                                    const tableEndIso = endDate ? format(endDate, "yyyy-MM-dd") : (dateRange[dateRange.length - 1]?.iso || "");
                                                    const checkInIso = String(bookingInfo.checkIn || "").slice(0, 10);
                                                    const checkOutIso = String(bookingInfo.checkOut || "").slice(0, 10);

                                                    const roundedTlClass = checkInIso && tableStartIso && checkInIso >= tableStartIso ? "rounded-tl-full" : "";
                                                    const roundedBrClass = checkOutIso && tableEndIso && checkOutIso <= tableEndIso ? "rounded-br-full" : "";

                                                    rowCells.push(
                                                        <td
                                                            key={`booking-${roomNo}-${dateObj.iso}`}
                                                            colSpan={bookingSpan}
                                                            onClick={() => handleCellClick(bookingInfo, null, category, roomNo, dateObj)}
                                                            title={`${bookingInfo.guestName} (${bookingInfo.phone})\nStatus: ${bookingInfo.status}\nStay: ${bookingInfo.checkIn} → ${bookingInfo.checkOut}\nBooking ID: ${bookingInfo.bookingId}${hasDue ? `\n⚠️ PAYMENT DUE: ৳${dueAmount.toLocaleString()}` : '\n✅ Fully Paid'}\nClick to view or manage.`}
                                                            className={`px-1 py-1 text-center text-xs whitespace-nowrap transition-all select-none border-2 border-white cursor-pointer ${roundedTlClass} ${roundedBrClass} ${getStatusCellClass(bookingInfo.status)}`}
                                                        >
                                                            <div className="flex items-center justify-center gap-1.5 min-w-0 max-w-full px-1">
                                                                <span className="truncate block font-semibold text-[11px] leading-tight">
                                                                    {bookingInfo.guestName}
                                                                </span>
                                                                {hasDue && (
                                                                    <span
                                                                        className="shrink-0 w-2 h-2 rounded-full bg-orange-400 ring-1 ring-white animate-pulse"
                                                                        title={`Payment Due: ৳${dueAmount.toLocaleString()}`}
                                                                    />
                                                                )}
                                                            </div>
                                                        </td>
                                                    );

                                                    dateIndex += bookingSpan;
                                                } else {
                                                    // Empty single cell
                                                    rowCells.push(
                                                        <td
                                                            key={`empty-${roomNo}-${dateObj.iso}`}
                                                            colSpan={1}
                                                            onClick={() => handleCellClick(null, null, category, roomNo, dateObj)}
                                                            title={
                                                                dateObj.isPast
                                                                    ? `Room ${roomNo} - ${dateObj.display} (Past Date)`
                                                                    : `Room ${roomNo} available on ${dateObj.display}\nClick to create a new reservation.`
                                                            }
                                                            className={`px-1 py-1 text-center text-xs whitespace-nowrap transition-all select-none border border-gray-300 max-w-[125px] ${dateObj.isPast
                                                                    ? "bg-slate-100/70 text-slate-300 cursor-not-allowed"
                                                                    : dateObj.isToday
                                                                        ? "bg-amber-50/40 hover:bg-teal-50 cursor-pointer hover:outline-teal-500"
                                                                        : "hover:bg-teal-50/50 cursor-pointer hover:outline-teal-500"
                                                                }`}
                                                        />
                                                    );

                                                    dateIndex += 1;
                                                }
                                            }

                                            return (
                                                <tr key={`${category.category}-${roomNo}`}>
                                                    {/* ROOM NUMBER STICKY COLUMN */}
                                                    <th className="px-2 py-1 sticky left-0 z-30 bg-[#edfdf7] text-xs font-bold text-slate-800 border border-gray-300 shadow-md whitespace-nowrap">
                                                        {roomNo}
                                                    </th>
                                                    {rowCells}
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </>
                        )}
                    </tbody>
                </table>
            </div>


            {/* Request Bookings Modal (createPortal) */}
            <RequestBookingsModal
                isOpen={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
                requestBookings={requestBookings}
                role={role}
                currentUser={user}
                onSuccess={async () => {
                    await Promise.all([
                        refetchBookings(),
                        refetchRequestBookings(),
                        refetchCategories(),
                        refetchOOO()
                    ]);
                }}
            />

            {/* Direct Calendar Empty Cell Booking Modal (createPortal) */}
            <CalendarBookingModal
                isOpen={!!newBookingCellData}
                onClose={() => setNewBookingCellData(null)}
                initialData={newBookingCellData}
                categories={dbCategories}
                onSuccess={async () => {
                    await Promise.all([
                        refetchBookings(),
                        refetchRequestBookings(),
                        refetchCategories(),
                        refetchOOO()
                    ]);
                }}
                currentUser={user}
                role={role}
            />

            {/* Direct Calendar Booked Cell Quick Details & Status Change Modal (createPortal) */}
            <CalendarBookingDetailsModal
                isOpen={!!selectedBookingId}
                onClose={() => setSelectedBookingId(null)}
                bookingId={selectedBookingId}
                currentUser={user}
                role={role}
                onSuccess={async () => {
                    await Promise.all([
                        refetchBookings(),
                        refetchRequestBookings(),
                        refetchCategories(),
                        refetchOOO()
                    ]);
                }}
            />

            {/* Out of Order / Room Maintenance Modal (createPortal) */}
            <OutOfOrderModal
                isOpen={isOutOfOrderOpen}
                onClose={() => setIsOutOfOrderOpen(false)}
                initialRoom={selectedOOORoom}
                categories={dbCategories}
                currentUser={user}
                role={role}
                onSuccess={async () => {
                    await Promise.all([
                        refetchBookings(),
                        refetchRequestBookings(),
                        refetchCategories(),
                        refetchOOO()
                    ]);
                }}
            />
        </div>
    );
};

export default Calender;
