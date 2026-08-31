import React, { useEffect, useState, useContext, useMemo } from "react";
import { useNavigate } from "react-router";
import DatePicker from "react-datepicker";
import { eachDayOfInterval, format } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";
import { AuthContext } from "../../../Context/AuthContext";
import useRole from "../../../hooks/useRole";
import useAxiosSecure from "../../../hooks/useAxiosSecure";
import RequestBookingsModal from "./RequestBookingsModal";
import CalendarBookingModal from "./CalendarBookingModal";
import CalendarBookingDetailsModal from "./CalendarBookingDetailsModal";
import OutOfOrderModal from "./OutOfOrderModal";
import { Clock, RefreshCw, BedDouble, Wrench, AlertTriangle, Wallet, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getBookingRooms } from "../../../utils/bookingUtils";

const Calender = () => {
    const { user } = useContext(AuthContext);
    const { role } = useRole();
    const axiosSecure = useAxiosSecure();
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
        } catch (e) {}
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

    // Date Range State with robust localStorage persistence
    const [startDate, setStartDate] = useState(() => {
        try {
            const saved = localStorage.getItem("calendar_startDate") || localStorage.getItem("startDate");
            if (saved) {
                const parsed = new Date(saved);
                if (!isNaN(parsed.getTime())) return parsed;
            }
        } catch (e) {
            console.error("Error reading startDate from localStorage:", e);
        }
        return new Date(new Date().setDate(new Date().getDate() - 7));
    });

    const [endDate, setEndDate] = useState(() => {
        try {
            const saved = localStorage.getItem("calendar_endDate") || localStorage.getItem("endDate");
            if (saved) {
                const parsed = new Date(saved);
                if (!isNaN(parsed.getTime())) return parsed;
            }
        } catch (e) {
            console.error("Error reading endDate from localStorage:", e);
        }
        return new Date(new Date().setDate(new Date().getDate() + 7));
    });

    const handleStartDate = (date) => {
        if (!date || isNaN(date.getTime())) return;
        setStartDate(date);
        try {
            localStorage.setItem("calendar_startDate", date.toISOString());
            localStorage.setItem("startDate", date.toISOString());

            // If new startDate is after current endDate, automatically adjust endDate
            if (endDate && date > endDate) {
                const adjustedEnd = new Date(date.getTime() + 14 * 24 * 60 * 60 * 1000);
                setEndDate(adjustedEnd);
                localStorage.setItem("calendar_endDate", adjustedEnd.toISOString());
                localStorage.setItem("endDate", adjustedEnd.toISOString());
            }
        } catch (e) {
            console.error("Error saving startDate to localStorage:", e);
        }
    };

    const handleEndDate = (date) => {
        if (!date || isNaN(date.getTime())) return;
        setEndDate(date);
        try {
            localStorage.setItem("calendar_endDate", date.toISOString());
            localStorage.setItem("endDate", date.toISOString());
        } catch (e) {
            console.error("Error saving endDate to localStorage:", e);
        }
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
            await Promise.all([
                refetchCategories(),
                refetchBookings(),
                refetchRequestBookings(),
                refetchOOO()
            ]);
        } catch (e) {
            console.error(e);
        } finally {
            setTimeout(() => setLoading(false), 500);
        }
    };

    // Build Fast Map: Key is `${roomNo}_${isoDate}` -> bookingInfo
    const bookingCellMap = useMemo(() => {
        const map = new Map();
        if (!Array.isArray(allBookings)) return map;

        allBookings.forEach((booking) => {
            if (!booking || ["cancel", "cancelled"].includes(booking.status)) return;
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
                                totalAmount: Number(booking.totalAmount || booking.calculatedTotalAmount || 0),
                                paidAmount: Number(booking.paidAmount || booking.advanceAmount || 0)
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
                    roomNumbers: rawRooms.map(r => String(r).trim()).filter(Boolean)
                };
            })
            .filter((cat) => cat && cat.roomNumbers.length > 0);
    }, [dbCategories, selectedCategoryFilter]);

    const getStatusCellClass = (status) => {
        switch (status) {
            case "booking_confirmed":
            case "confirmed":
                return "bg-blue-600 text-white font-medium hover:bg-blue-700";
            case "checked_id":
                return "bg-indigo-600 text-white font-medium hover:bg-indigo-700";
            case "checked_out":
                return "bg-slate-500 text-white font-medium hover:bg-slate-600";
            case "payment_waiting":
                return "bg-sky-500 text-white font-semibold hover:bg-sky-600";
            case "request_booking":
                return "bg-amber-500 text-white font-medium hover:bg-amber-600";
            default:
                return "bg-teal-600 text-white font-medium hover:bg-teal-700";
        }
    };

    const handleCellClick = (bookingInfo, oooInfo, category, roomNo, dateObj) => {
        if (oooInfo) {
            // Open Out of Order modal to view or resolve
            setSelectedOOORoom({
                roomNo: String(roomNo).trim(),
                categoryId: category._id,
                categoryName: category.category,
                startDate: dateObj.iso
            });
            setIsOutOfOrderOpen(true);
        } else if (bookingInfo?._id) {
            // Open quick details & status change modal on calendar
            setSelectedBookingId(bookingInfo._id);
        } else {
            // Prevent adding bookings in the past
            if (dateObj.isPast) {
                return;
            }
            // Empty cell clicked by authority -> Open booking modal with pre-selected room and date
            setNewBookingCellData({
                roomNo: String(roomNo).trim(),
                categoryId: category._id,
                categoryName: category.category,
                checkInDate: dateObj.iso
            });
        }
    };

    return (
        <div className="flex h-[calc(100dvh-65px)] w-full min-w-0 flex-col overflow-hidden">
            {/* Controls Header */}
            <div className="flex flex-wrap justify-between p-3 sm:p-5 items-end gap-3 shrink-0">
                <div className="flex flex-wrap items-center gap-2">
                    {/* Category Filter Dropdown */}
                    <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-xl px-2.5 py-1 shadow-2xs h-8">
                        <Filter size={13} className="text-teal-600 shrink-0" />
                        <span className="text-[11px] font-bold text-slate-500 hidden sm:inline">Category:</span>
                        <select
                            value={selectedCategoryFilter}
                            onChange={(e) => handleCategoryFilterChange(e.target.value)}
                            className="bg-transparent font-bold text-slate-800 text-xs focus:outline-none cursor-pointer pr-1 max-w-[170px] sm:max-w-[240px] truncate"
                        >
                            <option value="ALL">All Categories ({dbCategories.length})</option>
                            {dbCategories.map((c) => (
                                <option key={c._id || c.name} value={c._id || c.name}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        {selectedCategoryFilter !== "ALL" && (
                            <button
                                type="button"
                                onClick={() => handleCategoryFilterChange("ALL")}
                                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md font-semibold"
                                title="Show all categories"
                            >
                                Reset
                            </button>
                        )}
                    </div>

                    {/* Request Bookings Button */}
                    <button
                        type="button"
                        onClick={() => setIsRequestModalOpen(true)}
                        className={`btn btn-sm rounded-xl transition-all duration-200 gap-1.5 font-bold ${
                            requestBookings.length > 0
                                ? "bg-amber-500 hover:bg-amber-600 text-white border-none shadow-md shadow-amber-500/25 ring-2 ring-amber-400/40"
                                : "btn-outline border-slate-300 text-slate-700 hover:bg-slate-100"
                        }`}
                    >
                        <Clock size={15} />
                        <span>Request Bookings ({requestBookings.length ? requestBookings.length : 0})</span>
                    </button>

                    {/* Out of Order Rooms Button */}
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedOOORoom(null);
                            setIsOutOfOrderOpen(true);
                        }}
                        className={`btn btn-sm rounded-xl transition-all duration-200 gap-1.5 font-bold ${
                            outOfOrderList.length > 0
                                ? "bg-neutral-900 hover:bg-neutral-800 text-amber-300 border-none shadow-md ring-2 ring-amber-400/30"
                                : "btn-outline border-slate-300 text-slate-700 hover:bg-slate-100"
                        }`}
                    >
                        <Wrench size={14} className="text-amber-400" />
                        <span>Out of Order ({outOfOrderList.length})</span>
                    </button>
                </div>

                <div className="shrink-0 flex flex-wrap items-end gap-3">
                    {/* Status Legend Indicator */}
                    <div className="hidden xl:flex items-center gap-3 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Confirmed
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span> Payment Waiting
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span> Checked In
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded-md bg-blue-600 border-2 border-orange-500"></span> Due Payment
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-amber-400"></span> Out of Order
                        </span>
                    </div>

                    {/* Date Pickers */}
                    <div className="flex items-center gap-2">
                        <div>
                            <label className="mb-0.5 block text-xs font-medium text-slate-600">From</label>
                            <DatePicker
                                selected={startDate}
                                onChange={(date) => handleStartDate(date)}
                                selectsStart
                                startDate={startDate}
                                endDate={endDate}
                                placeholderText="Select date"
                                dateFormat="dd MMM yyyy"
                                className="rounded-lg border border-gray-300 outline-none focus:border-teal-500 input input-sm cursor-pointer text-xs w-28 sm:w-32 bg-white"
                                onChangeRaw={(e) => e.preventDefault()}
                            />
                        </div>

                        <span className="mt-4 text-gray-400 text-xs">—</span>

                        <div>
                            <label className="mb-0.5 block text-xs font-medium text-slate-600">To</label>
                            <DatePicker
                                selected={endDate}
                                onChange={(date) => handleEndDate(date)}
                                selectsEnd
                                startDate={startDate}
                                endDate={endDate}
                                minDate={startDate}
                                placeholderText="Select date"
                                dateFormat="dd MMM yyyy"
                                className="rounded-lg border border-gray-300 outline-none focus:border-teal-500 input input-sm cursor-pointer text-xs w-28 sm:w-32 bg-white"
                                onChangeRaw={(e) => e.preventDefault()}
                            />
                        </div>
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs transition-all hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 h-8"
                    >
                        <RefreshCw
                            size={14}
                            className={`transition-transform duration-500 ${loading ? "animate-spin text-teal-600" : ""}`}
                        />
                        <span>Refresh</span>
                    </button>
                </div>
            </div>

            {/* Calendar Grid Table */}
            <div className="min-h-0 min-w-0 flex-1 overflow-auto border-t border-gray-300 bg-white">
                <table className="min-w-max border-collapse border border-gray-300 text-xs">
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
                            displayCategories.map((category) => (
                                <React.Fragment key={category._id || category.category}>
                                    {/* CATEGORY ROW HEADER */}
                                    <tr>
                                        <th className="sticky left-0 z-20 border border-gray-300 bg-slate-100 text-xs font-bold px-2 py-1 text-slate-900 shadow-xs whitespace-nowrap">
                                            {category.category}
                                        </th>
                                        {dateRange.map((dateObj) => (
                                            <td
                                                key={`${category.category}-${dateObj.iso}`}
                                                className={`px-1.5 py-1 border border-gray-300 text-center text-[11px] font-semibold whitespace-nowrap ${
                                                    dateObj.isToday ? "bg-amber-100 text-amber-900 font-bold" : "bg-slate-50 text-slate-600"
                                                }`}
                                            >
                                                <span>{dateObj.display}</span>
                                                <span className="text-[9px] text-slate-400 block font-normal uppercase">
                                                    {dateObj.dayName}
                                                </span>
                                            </td>
                                        ))}
                                    </tr>

                                    {/* ROOM NUMBER ROWS */}
                                    {category.roomNumbers.map((roomNo) => (
                                        <tr key={`${category.category}-${roomNo}`}>
                                            {/* ROOM NUMBER STICKY COLUMN */}
                                            <th className="px-2 py-1 sticky left-0 z-10 bg-white text-xs font-bold text-slate-800 border border-gray-300 shadow-xs whitespace-nowrap">
                                                {roomNo}
                                            </th>

                                            {/* DATE CELLS */}
                                            {dateRange.map((dateObj) => {
                                                const cellKey = `${String(roomNo).trim()}_${dateObj.iso}`;
                                                const bookingInfo = bookingCellMap.get(cellKey);
                                                const oooInfo = outOfOrderCellMap.get(cellKey);
                                                const isOOO = !!oooInfo;
                                                const isBooked = !!bookingInfo;

                                                const hasDue = isBooked && 
                                                    bookingInfo.status !== "cancel" && 
                                                    Number(bookingInfo.totalAmount || 0) > Number(bookingInfo.paidAmount || 0);
                                                const dueAmount = isBooked ? Math.max(0, Number(bookingInfo.totalAmount || 0) - Number(bookingInfo.paidAmount || 0)) : 0;

                                                return (
                                                    <td
                                                        key={`${roomNo}-${dateObj.iso}`}
                                                        onClick={() => handleCellClick(bookingInfo, oooInfo, category, roomNo, dateObj)}
                                                        title={
                                                            isOOO
                                                                ? `Room ${roomNo} is OUT OF ORDER\nReason: ${oooInfo.reason}\nPeriod: ${oooInfo.startDate} → ${oooInfo.endDate}\nClick to view maintenance details or resolve.`
                                                                : isBooked
                                                                ? `${bookingInfo.guestName} (${bookingInfo.phone})\nStatus: ${bookingInfo.status}\nStay: ${bookingInfo.checkIn} → ${bookingInfo.checkOut}\nBooking ID: ${bookingInfo.bookingId}${hasDue ? `\n⚠️ PAYMENT DUE: ৳${dueAmount.toLocaleString()}` : '\n✅ Paid in full'}\nClick to view or manage.`
                                                                : dateObj.isPast
                                                                ? `Room ${roomNo} - ${dateObj.display} (Past Date)`
                                                                : `Room ${roomNo} available on ${dateObj.display}\nClick to create a new reservation.`
                                                        }
                                                        className={`px-1 py-1 text-center text-xs whitespace-nowrap transition-all max-w-[130px] ${
                                                            isOOO
                                                                ? "bg-neutral-900 text-amber-300 font-bold border-2 border-dashed border-amber-500 hover:bg-neutral-800 cursor-pointer shadow-xs"
                                                                : isBooked
                                                                ? `${getStatusCellClass(bookingInfo.status)} cursor-pointer ${
                                                                    hasDue 
                                                                        ? "border-2 !border-orange-500 ring-2 ring-orange-400 font-bold shadow-xs" 
                                                                        : "border border-gray-300 hover:outline-teal-500"
                                                                }`
                                                                : dateObj.isPast
                                                                ? "border border-gray-300 bg-slate-100/70 text-slate-300 cursor-not-allowed select-none"
                                                                : dateObj.isToday
                                                                ? "border border-gray-300 bg-amber-50/40 hover:bg-teal-50 cursor-pointer hover:outline-teal-500"
                                                                : "border border-gray-300 hover:bg-teal-50/50 cursor-pointer hover:outline-teal-500"
                                                        }`}
                                                    >
                                                        {isOOO ? (
                                                            <span className="truncate block font-bold text-[10px] text-amber-300 leading-tight select-none">
                                                                🛠️ Out of Order
                                                            </span>
                                                        ) : isBooked ? (
                                                            <div className="flex items-center justify-center gap-1 min-w-0">
                                                                <span className="truncate block font-semibold text-[11px] leading-tight select-none">
                                                                    {bookingInfo.guestName}
                                                                </span>
                                                                {hasDue && (
                                                                    <span 
                                                                        className="shrink-0 w-2 h-2 rounded-full bg-orange-400 ring-1 ring-white animate-pulse" 
                                                                        title={`Due: ৳${dueAmount.toLocaleString()}`}
                                                                    />
                                                                )}
                                                            </div>
                                                        ) : (
                                                            ""
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))
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
