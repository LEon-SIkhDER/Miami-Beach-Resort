import React, { useEffect, useState, useContext } from "react";
import DatePicker from "react-datepicker";
import { eachDayOfInterval, format } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";
import { AuthContext } from "../../../Context/AuthContext";
import useRole from "../../../hooks/useRole";
import useAxiosSecure from "../../../hooks/useAxiosSecure";
import RequestBookingsModal from "./RequestBookingsModal";
import { Clock, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const categories = [
    {
        category: "Urban View",
        rooms: [
            {
                roomNo: 101,
                status: "booked",
                guest: "Arif Rahman",
                startAt: "2026-08-28",
                endAt: "2026-08-30",
            },
            {
                roomNo: 102,
                status: "booked",
                guest: "Samiul Hasan",
                startAt: "2026-08-31",
                endAt: "2026-09-03",
            },
            {
                roomNo: 103,
                status: "available",
                guest: null,
                startAt: null,
                endAt: null,
            },
            {
                roomNo: 104,
                status: "maintenance",
                guest: null,
                startAt: null,
                endAt: null,
            },
        ],
    },

    {
        category: "Hill View",
        rooms: [
            {
                roomNo: 105,
                status: "booked",
                guest: "Tanvir Ahmed",
                startAt: "2026-08-29",
                endAt: "2026-09-02",
            },
            {
                roomNo: 106,
                status: "available",
                guest: null,
                startAt: null,
                endAt: null,
            },
            {
                roomNo: 201,
                status: "booked",
                guest: "Sadia Islam",
                startAt: "2026-09-05",
                endAt: "2026-09-07",
            },
            {
                roomNo: 202,
                status: "booked",
                guest: "Nayeem Hossain",
                startAt: "2026-08-28",
                endAt: "2026-08-29",
            },
        ],
    },

    {
        category: "City View",
        rooms: [
            {
                roomNo: 203,
                status: "available",
                guest: null,
                startAt: null,
                endAt: null,
            },
            {
                roomNo: 204,
                status: "booked",
                guest: "Mahmud Hasan",
                startAt: "2026-08-30",
                endAt: "2026-09-01",
            },
            {
                roomNo: 205,
                status: "booked",
                guest: "Farhana Akter",
                startAt: "2026-09-03",
                endAt: "2026-09-06",
            },
            {
                roomNo: 206,
                status: "maintenance",
                guest: null,
                startAt: null,
                endAt: null,
            },
            {
                roomNo: 207,
                status: "booked",
                guest: "Fahim Chowdhury",
                startAt: "2026-09-02",
                endAt: "2026-09-04",
            },
        ],
    },

    {
        category: "Sea View",
        rooms: [
            {
                roomNo: 301,
                status: "booked",
                guest: "Rakib Hossain",
                startAt: "2026-08-28",
                endAt: "2026-08-31",
            },
            {
                roomNo: 302,
                status: "available",
                guest: null,
                startAt: null,
                endAt: null,
            },
            {
                roomNo: 303,
                status: "booked",
                guest: "Mim Akter",
                startAt: "2026-09-01",
                endAt: "2026-09-05",
            },
            {
                roomNo: 304,
                status: "booked",
                guest: "Rafiul Karim",
                startAt: "2026-08-29",
                endAt: "2026-08-30",
            },
            {
                roomNo: 305,
                status: "maintenance",
                guest: null,
                startAt: null,
                endAt: null,
            },
            {
                roomNo: 306,
                status: "booked",
                guest: "Shakil Khan",
                startAt: "2026-09-06",
                endAt: "2026-09-08",
            },
            {
                roomNo: 307,
                status: "booked",
                guest: "Raisa Noor",
                startAt: "2026-08-30",
                endAt: "2026-09-02",
            },
        ],
    },

    {
        category: "Family",
        rooms: [
            {
                roomNo: 401,
                status: "booked",
                guest: "Imran Kabir",
                startAt: "2026-08-28",
                endAt: "2026-09-01",
            },
            {
                roomNo: 402,
                status: "available",
                guest: null,
                startAt: null,
                endAt: null,
            },
            {
                roomNo: 403,
                status: "booked",
                guest: "Jannatul Ferdous",
                startAt: "2026-09-03",
                endAt: "2026-09-05",
            },
            {
                roomNo: 404,
                status: "available",
                guest: null,
                startAt: null,
                endAt: null,
            },
        ],
    },
];

const Calender = () => {
    const { user } = useContext(AuthContext);
    const { role } = useRole();
    const axiosSecure = useAxiosSecure();
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

    const { data: requestBookings = [] } = useQuery({
        queryKey: ["requestBookings"],
        queryFn: async () => {
            const { data: result } = await axiosSecure.get("/bookings?status=request_booking")
            return result
        }
    })

    const [startDate, setStartDate] = useState(() => {
        return new Date(
            new Date().setDate(new Date().getDate() - 7)
        );
    })

    const handleStartDate = (date) => {
        localStorage.setItem("startDate", date.toISOString())
        setStartDate(date)
    }

    const [endDate, setEndDate] = useState(() => {
        return new Date(
            new Date().setDate(new Date().getDate() + 7)
        );
    })

    const handleEndDate = (date) => {
        localStorage.setItem("endDate", date.toISOString())
        setEndDate(date)
    }

    const [dateRange, setDateRange] = useState([]);

    useEffect(() => {
        if (startDate && endDate) {
            const dates = eachDayOfInterval({
                start: startDate,
                end: endDate,
            }).map((date) => format(date, "dd MMM yyyy"));

            setDateRange(dates);
        } else {
            setDateRange([]);
        }
    }, [startDate, endDate]);

    const [loading, setLoading] = useState(false);

    const handleRefresh = () => {
        setLoading(true);

        setTimeout(() => {
            setLoading(false);
        }, 500);
    };

    const isRoomBooked = (room, date) => {
        if (!room.startAt || !room.endAt) return false;

        const currentDate = format(date, "yyyy-MM-dd");
        const startDate = format(new Date(room.startAt), "yyyy-MM-dd");
        const endDate = format(new Date(room.endAt), "yyyy-MM-dd");

        return currentDate >= startDate && currentDate <= endDate;
    };

    const handleLeftClick = (e, date, category, roomNo) => {
        e.preventDefault()
        console.log(date, category, roomNo)
    }

    return (
        <div className="flex h-[calc(100dvh-65px)] w-full min-w-0 flex-col overflow-hidden">
            <div className="flex justify-between p-5 items-end">
                <button 
                    type="button"
                    onClick={() => setIsRequestModalOpen(true)}
                    className={`btn btn-sm rounded-xl transition-all duration-200 gap-1.5 font-bold ${
                        requestBookings.length > 0
                            ? 'bg-amber-500 hover:bg-amber-600 text-white border-none shadow-md shadow-amber-500/25 ring-2 ring-amber-400/40'
                            : 'btn-outline border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                >
                    <Clock size={15} />
                    <span>Request Bookings ({requestBookings.length ? requestBookings.length : 0})</span>
                </button>

                <div className="shrink-0  flex flex-col gap-4 sm:flex-row sm:justify-end sm:items-end">
                    {/* Date Picker */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        {/* From */}
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                From
                            </label>

                            <DatePicker
                                selected={startDate}
                                onChange={(date) => handleStartDate(date)}
                                selectsStart
                                startDate={startDate}
                                endDate={endDate}
                                placeholderText="Select date"
                                dateFormat="dd MMM yyyy"
                                onChangeRaw={(e) => e.preventDefault()}

                                // readOnly
                                className="rounded-lg border border-gray-300  outline-none focus:border-blue-500 input cursor-pointer select-none"
                            />
                        </div>

                        <span className="mt-6 text-gray-500">—</span>

                        {/* To */}
                        <div>
                            <label className="mb-1 block text-sm font-medium">
                                To
                            </label>

                            <DatePicker
                                selected={endDate}
                                onChange={(date) => handleEndDate(date)}
                                selectsEnd
                                startDate={startDate}
                                endDate={endDate}
                                minDate={startDate}
                                placeholderText="Select date"
                                dateFormat="dd MMM yyyy"
                                onChangeRaw={(e) => e.preventDefault()}
                                // onKeyDown={(e) => e.preventDefault()}
                                // readOnly
                                className="rounded-lg border border-gray-300  outline-none focus:border-blue-500 input cursor-pointer select-none"
                            />
                        </div>
                    </div>
                    {/* refresh  */}
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-70">
                        <RefreshCw
                            size={17}
                            strokeWidth={2}
                            className={`
                    transition-transform duration-500
                    ${loading ? "animate-spin" : ""}
                `}
                        />

                        <span>
                            Refresh
                        </span>
                    </button>
                </div>
            </div>

            {/* __________________________________________ */}
            <div className="min-h-0 min-w-0  overflow-auto border-t border-gray-300 bg-white">
                <table className="min-w-max border-collapse border border-gray-300">
                    <tbody>
                        {categories.map((category) => (
                            <React.Fragment key={category.category}>
                                {/* CATEGORY ROW */}
                                <tr>
                                    <th
                                        // colSpan={dateRange.length + 1}
                                        className="sticky left-0 z-10  border border-gray-300 bg-slate-100  text-sm font-bold px-1"
                                    >
                                        {category.category}
                                    </th>
                                    {dateRange.map((date) => (
                                        <td key={`${category.category}-${date}`} className=" px-1 border border-gray-300 bg-slate-50  text-center text-xs font-semibold whitespace-nowrap">
                                            {date}
                                        </td>
                                    ))}
                                </tr>

                                {/* ROOM ROWS */}
                                {category.rooms.map((room) => (
                                    <tr key={room.roomNo}>
                                        {/* ROOM NUMBER */}
                                        <th className=" px-1 sticky left-0 z-10  bg-white  text-sm font-semibold outline outline-gray-300">
                                            {room.roomNo}
                                        </th>
                                        {/* DATE CELLS */}
                                        {dateRange.map((date) => (
                                            <td
                                                onContextMenu={(e) => handleLeftClick(e, date, category.category, room.roomNo)}

                                                key={`${room.roomNo}-${date}`}
                                                className={` px-1 border border-gray-300 outline outline-transparent hover:outline-green-500 cursor-pointer ${isRoomBooked(room, date) ? "bg-blue-500" : ""}`}
                                            >
                                                {isRoomBooked(room, date) ? room.guest : ""}
                                            </td>
                                        ))}

                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
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
            />
        </div>
    );
};

export default Calender;
