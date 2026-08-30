import React, { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
    Plus,
    Pencil,
    Trash2,
    BedDouble,
    Eye,
    Image as ImageIcon,
    Search,
    EllipsisVertical,
} from 'lucide-react'
import AddRoom from './AddRoom'
import EditRoom from './EditRoom'
import DeleteRoom from './DeleteRoom'
import ToggleRoomStatus from './ToggleRoomStatus'
import { parseFacilityList } from './roomUtils'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000"

const Rooms = () => {
    const [search, setSearch] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("")
    const [statusFilter, setStatusFilter] = useState("")

    const { data: rooms = [], isLoading, refetch } = useQuery({
        queryKey: ["all-rooms", statusFilter],
        queryFn: async () => {
            const res = await axios.get(`${SERVER_URL}/rooms`, {
                params: statusFilter ? { status: statusFilter } : {}
            })
            return res.data
        }
    })

    const { data: categories = [] } = useQuery({
        queryKey: ["category-and-pricing"],
        queryFn: async () => {
            const res = await axios.get(`${SERVER_URL}/categoryandpricing`)
            return res.data
        }
    })

    const filteredRooms = rooms.filter(room => {
        if (categoryFilter && room.category !== categoryFilter) return false
        if (search) {
            const s = search.toLowerCase()
            return room.name?.toLowerCase().includes(s) ||
                room.category?.toLowerCase().includes(s) ||
                room.facility?.toLowerCase().includes(s) ||
                room.description?.toLowerCase().includes(s)
        }
        return true
    })

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight">
                        Rooms Management
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Add, edit, search suites and control book ability on the public website.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <AddRoom refetch={refetch} className="btn btn-primary btn-sm rounded-xl gap-2 shadow-sm shadow-teal-600/20 text-white">
                        <Plus size={16} /> Add New Room
                    </AddRoom>
                </div>
            </div>

            <div className='flex justify-between'>
                <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search rooms..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="input input-sm input-bordered pl-9 rounded-xl w-44 sm:w-52 bg-white min-w-64"
                    />
                </div>

                <div className='flex gap-5 '>
                    <select className="select select-sm select-bordered rounded-xl bg-white text-xs font-semibold min-w-64"
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                    >
                        <option value="">All Categories</option>
                        {categories.map(category => (
                            <option key={category._id} value={category.name}>{category.name}</option>
                        ))}
                    </select>

                    <select className="select select-sm select-bordered rounded-xl bg-white text-xs font-semibold min-w-64"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="">All Statuses</option>
                        <option value="active">Active (Bookable)</option>
                        <option value="inactive" className=''>Out of Order</option>
                    </select>
                </div>
            </div>

            <div className="hidden md:block bg-white  border border-slate-200 shadow-xs ">
                <div className="">
                    <table className="table table-zebra w-full whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                <th className="whitespace-nowrap w-10 ">#</th>
                                <th className="whitespace-nowrap">Photo Gallery</th>
                                <th className="whitespace-nowrap">Room Name</th>
                                <th className="whitespace-nowrap">Category</th>
                                <th className="whitespace-nowrap">Facilities</th>
                                <th className="whitespace-nowrap">Price / Night</th>
                                <th className="whitespace-nowrap">Status</th>
                                <th className="text-center whitespace-nowrap min-w-[140px] ">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {isLoading ? (
                                [1, 2, 3, 4].map(n => (
                                    <tr key={n} className="animate-pulse">
                                        <td><div className="h-4 bg-slate-200 rounded w-4"></div></td>
                                        <td><div className="h-10 w-14 bg-slate-200 rounded-lg"></div></td>
                                        <td><div className="h-4 bg-slate-200 rounded w-32"></div></td>
                                        <td><div className="h-5 bg-slate-200 rounded-full w-20"></div></td>
                                        <td><div className="h-5 bg-slate-200 rounded-full w-24"></div></td>
                                        <td><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                                        <td><div className="h-5 bg-slate-200 rounded-full w-28"></div></td>
                                        <td className="text-right"><div className="h-8 bg-slate-200 rounded-lg w-24 ml-auto"></div></td>
                                    </tr>
                                ))
                            ) : filteredRooms.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-12 text-slate-400">
                                        <BedDouble size={36} className="mx-auto mb-2 opacity-50" />
                                        No rooms found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredRooms.map((room, i) => (
                                    <tr key={room._id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="font-mono text-xs text-slate-400 whitespace-nowrap">{i + 1}</td>
                                        <td className="whitespace-nowrap">
                                            <div className="relative inline-block">
                                                {room.imageUrl ? (
                                                    <img src={room.imageUrl} alt={room.name} className="w-14 h-10 object-cover rounded-lg border border-slate-200" />
                                                ) : (
                                                    <div className="w-14 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300">
                                                        <ImageIcon size={16} />
                                                    </div>
                                                )}
                                                {room.images?.length > 1 && (
                                                    <span className="absolute -bottom-1 -right-1 badge badge-xs bg-slate-800 text-white font-bold border-none">
                                                        +{room.images.length}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="font-bold text-slate-900 whitespace-nowrap">
                                            <Link to={`/room/${room._id}`} className="hover:text-teal-700 transition-colors">
                                                {room.name}
                                            </Link>
                                            <h1 className='text-info'>{room.roomNo}</h1>
                                        </td>
                                        <td className="whitespace-nowrap">
                                            <span className="badge badge-sm bg-slate-100 text-slate-700 border-none font-medium whitespace-nowrap">
                                                {room.category}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="flex flex-wrap gap-1 max-w-64">
                                                {parseFacilityList(room.facility).slice(0, 3).map(facility => (
                                                    <span key={facility} className="badge badge-sm bg-teal-50 text-teal-700 border border-teal-200/60 font-medium">
                                                        {facility}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="font-semibold text-slate-900 whitespace-nowrap">৳{room.price?.toLocaleString()}</td>
                                        <td className="whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${room.status === "active"
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                : "bg-rose-50 text-rose-700 border border-rose-200"
                                                }`}>
                                                {room.status === "active" ? "Active" : "Out of Order"}
                                            </span>
                                        </td>
                                        <td className="text-center whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1 shrink-0 ">
                                                {/* 
                                                <ToggleRoomStatus room={room} />
                                                <EditRoom
                                                    room={room}
                                                    className="btn btn-ghost btn-xs btn-square text-teal-700 hover:bg-teal-50"
                                                >
                                                    <Pencil size={15} />
                                                </EditRoom>
                                                <DeleteRoom
                                                    room={room}
                                                    className="btn btn-ghost btn-xs btn-square text-red-500 hover:bg-red-50"
                                                >
                                                    <Trash2 size={15} />
                                                </DeleteRoom> */}
                                                <div className="dropdown dropdown-left">
                                                    <div tabIndex={0} role="button" className="cursor-pointer rounded-full hover:bg-gray-100 p-2 border border-transparent hover:border-gray-200"><EllipsisVertical size={18} /></div>
                                                    <ul tabIndex={-1} className="dropdown-content menu bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm">
                                                        <li><Link to={`/room/${room._id}`} className=" text-slate-500 hover:text-teal-700 hover:bg-teal-50" title="View Room Page">
                                                            <Eye size={15} /> View
                                                        </Link></li>
                                                        <li>
                                                            <ToggleRoomStatus
                                                                refetch={refetch}
                                                                room={room}
                                                                showLabel
                                                                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${room.status === "active"
                                                                    ? "text-red-500 hover:text-red-600 hover:bg-red-50"
                                                                    : "text-slate-500 hover:text-emerald-700 hover:bg-emerald-50"
                                                                    }`}
                                                            />
                                                        </li>
                                                        <li>
                                                            <EditRoom
                                                                refetch={refetch}
                                                                room={room}
                                                                className="flex items-center gap-2 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50 px-3 py-2 text-sm"
                                                            >
                                                                <Pencil size={15} /> Edit
                                                            </EditRoom>
                                                        </li>
                                                        <li>
                                                            <DeleteRoom
                                                                refetch={refetch}
                                                                room={room}
                                                                className="flex items-center gap-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 text-sm"
                                                            >
                                                                <Trash2 size={15} /> Delete
                                                            </DeleteRoom>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="md:hidden space-y-3.5">
                {isLoading ? (
                    [1, 2, 3].map(n => (
                        <div key={n} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs animate-pulse space-y-3">
                            <div className="flex gap-3">
                                <div className="w-20 h-20 bg-slate-200 rounded-xl shrink-0"></div>
                                <div className="flex-1 space-y-2 py-1">
                                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                                    <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                                </div>
                            </div>
                            <div className="h-9 bg-slate-200 rounded-xl w-full"></div>
                        </div>
                    ))
                ) : filteredRooms.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl text-center text-slate-400 border border-slate-200">
                        <BedDouble size={36} className="mx-auto mb-2 opacity-50" />
                        No rooms found matching your search.
                    </div>
                ) : (
                    filteredRooms.map(room => (
                        <div key={room._id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                            <div className="flex gap-3">
                                <Link to={`/room/${room._id}`} className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                                    {room.imageUrl ? (
                                        <img src={room.imageUrl} alt={room.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                            <ImageIcon size={20} />
                                        </div>
                                    )}
                                    {room.images?.length > 1 && (
                                        <span className="absolute bottom-1 right-1 badge badge-xs bg-slate-900/80 text-white font-bold border-none">
                                            +{room.images.length}
                                        </span>
                                    )}
                                </Link>
                                <div className="flex-1 min-w-0">
                                    <Link to={`/room/${room._id}`}>
                                        <h3 className="font-bold text-slate-900 text-sm truncate hover:text-teal-700">{room.name}</h3>
                                    </Link>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        <span className="badge badge-xs bg-slate-100 text-slate-700 border-none font-medium">
                                            {room.category}
                                        </span>
                                        {parseFacilityList(room.facility).slice(0, 2).map(facility => (
                                            <span key={facility} className="badge badge-xs bg-teal-50 text-teal-700 border border-teal-200/60 font-medium">
                                                {facility}
                                            </span>
                                        ))}
                                    </div>
                                    <p className="font-bold text-teal-800 text-sm mt-1.5">
                                        ৳{room.price?.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">/ night</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${room.status === "active"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : "bg-rose-50 text-rose-700 border border-rose-200"
                                        }`}>
                                        {room.status === "active" ? "Active" : "Out of Order"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Link
                                        to={`/room/${room._id}`}
                                        className="btn btn-ghost btn-xs btn-square text-slate-500 hover:text-teal-700"
                                        title="View Room Page"
                                    >
                                        <Eye size={15} />
                                    </Link>
                                    <ToggleRoomStatus room={room} refetch={refetch} />
                                    <EditRoom
                                        refetch={refetch}
                                        room={room}
                                        className="btn btn-ghost btn-xs btn-square text-teal-700 hover:bg-teal-50"
                                    >
                                        <Pencil size={15} />
                                    </EditRoom>
                                    <DeleteRoom
                                        refetch={refetch}
                                        room={room}
                                        className="btn btn-ghost btn-xs btn-square text-red-500 hover:bg-red-50"
                                    >
                                        <Trash2 size={15} />
                                    </DeleteRoom>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default Rooms
