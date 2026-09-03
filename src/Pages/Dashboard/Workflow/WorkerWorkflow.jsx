import React, { useContext, useState } from 'react'
import { Link } from 'react-router'
import { AuthContext } from '../../../Context/AuthContext'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
import { useQuery } from '@tanstack/react-query'
import {
    Briefcase,
    UserCheck,
    Building2,
    Users,
    Search,
    TrendingUp,
    CalendarCheck,
    DollarSign,
    Clock,
    Activity,
    CheckCircle2,
    ArrowUpRight,
    Shield,
    ExternalLink,
    RefreshCw
} from 'lucide-react'
import { formatDate } from '../../../utils/bookingUtils'
import UserWorkflowModal from '../Users/UserWorkflowModal'

const ROLE_FILTERS = [
    { value: "all", label: "All Workers", icon: <Users size={13} />, activeBg: "bg-teal-600 text-white border-teal-600" },
    { value: "agent", label: "Agents", icon: <UserCheck size={13} />, activeBg: "bg-teal-700 text-white border-teal-700" },
    { value: "b2b", label: "B2B Partners", icon: <Building2 size={13} />, activeBg: "bg-blue-600 text-white border-blue-600" },
    { value: "manager", label: "Managers", icon: <Briefcase size={13} />, activeBg: "bg-purple-600 text-white border-purple-600" }
]

const WorkerWorkflow = () => {
    const { user: currentUser } = useContext(AuthContext)
    const axiosSecure = useAxiosSecure()

    const [roleFilter, setRoleFilter] = useState("all") // "all" | "agent" | "b2b" | "manager"
    const [search, setSearch] = useState("")
    const [selectedWorkflowUser, setSelectedWorkflowUser] = useState(null)

    // Fetch all users with computed workflow statistics
    const { data: allUsers = [], isLoading, refetch, isFetching } = useQuery({
        queryKey: ["admin-worker-workflow-users"],
        queryFn: async () => {
            const res = await axiosSecure.get("/users")
            return Array.isArray(res.data) ? res.data : []
        }
    })

    // Filter for worker/staff roles: agent, b2b, manager
    const workerUsers = allUsers.filter(u => ["agent", "b2b", "manager"].includes(u.role))
    const agentCount = allUsers.filter(u => u.role === "agent").length
    const b2bCount = allUsers.filter(u => u.role === "b2b").length
    const managerCount = allUsers.filter(u => u.role === "manager").length

    // Aggregate key KPI metrics across all workers
    const totalWorkerBookings = workerUsers.reduce((sum, p) => sum + (p.stats?.totalBookings || 0), 0)
    const totalConfirmedBookings = workerUsers.reduce((sum, p) => sum + (p.stats?.confirmedBookings || 0), 0)
    const totalWorkerSales = workerUsers.reduce((sum, p) => sum + (p.stats?.totalSales || 0), 0)
    const totalWorkerPaid = workerUsers.reduce((sum, p) => sum + (p.stats?.totalPaid || 0), 0)
    const totalWorkerDue = workerUsers.reduce((sum, p) => sum + (p.stats?.totalDue || 0), 0)

    // Filter displayed list according to active tab and search query
    const filteredWorkers = workerUsers.filter(p => {
        if (roleFilter !== "all" && p.role !== roleFilter) return false
        if (search) {
            const s = search.toLowerCase()
            const nameMatch = (p.name || "").toLowerCase().includes(s)
            const emailMatch = (p.email || "").toLowerCase().includes(s)
            const phoneMatch = (p.phone || "").toLowerCase().includes(s)
            return nameMatch || emailMatch || phoneMatch
        }
        return true
    })

    const getRoleBadge = (role) => {
        switch (role) {
            case "agent":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
                        <UserCheck size={12} className="text-teal-600" /> Agent
                    </span>
                )
            case "b2b":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        <Building2 size={12} className="text-blue-600" /> B2B Partner
                    </span>
                )
            case "manager":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
                        <Briefcase size={12} className="text-purple-600" /> Manager
                    </span>
                )
            case "admin":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        <Shield size={12} className="text-amber-600" /> Admin
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        Staff
                    </span>
                )
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight">
                            Worker & Partner Workflow
                        </h1>
                        <span className="badge badge-sm bg-teal-100 text-teal-900 font-bold border-none">
                            {workerUsers.length} Active Staff / Partners
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Monitor live booking volumes, sales performance, payment collections, and detailed audit activities of Agents, B2B Partners, and Managers.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="btn btn-sm btn-outline border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-bold gap-1.5"
                        title="Refresh workflow data"
                    >
                        <RefreshCw size={13} className={isFetching ? "animate-spin text-teal-600" : ""} />
                        <span>Refresh</span>
                    </button>
                    <Link
                        to="/dashboard/users"
                        className="btn btn-sm btn-outline border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl font-bold gap-1.5"
                    >
                        <Users size={13} />
                        <span>Manage Roles</span>
                    </Link>
                </div>
            </div>

            {/* 4 Summary KPI Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Workers</span>
                        <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                            <Users size={16} />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{workerUsers.length}</p>
                    <p className="text-[11px] text-slate-400 font-medium">
                        {agentCount} Agents · {b2bCount} B2B · {managerCount} Managers
                    </p>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Bookings</span>
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                            <CalendarCheck size={16} />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-slate-900">{totalWorkerBookings}</p>
                    <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                        <CheckCircle2 size={12} /> {totalConfirmedBookings} Confirmed Reservations
                    </p>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Sales Volume</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                            <TrendingUp size={16} />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-emerald-800">৳{totalWorkerSales.toLocaleString()}</p>
                    <p className="text-[11px] text-slate-400 font-medium">Total value credited to partners</p>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Collected / Due</span>
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                            <DollarSign size={16} />
                        </div>
                    </div>
                    <p className="text-xl font-black text-slate-900">
                        <span className="text-emerald-700">৳{totalWorkerPaid.toLocaleString()}</span>
                    </p>
                    <p className="text-[11px] font-semibold text-slate-500">
                        {totalWorkerDue > 0 ? (
                            <span className="text-orange-600 font-bold">Remaining Due: ৳{totalWorkerDue.toLocaleString()}</span>
                        ) : (
                            <span className="text-emerald-600 font-medium">All Dues Cleared ✅</span>
                        )}
                    </p>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Role Filter Tabs */}
                    <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                        {ROLE_FILTERS.map(opt => {
                            const isActive = roleFilter === opt.value
                            const count = opt.value === "all"
                                ? workerUsers.length
                                : opt.value === "agent"
                                    ? agentCount
                                    : opt.value === "b2b"
                                        ? b2bCount
                                        : managerCount

                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setRoleFilter(opt.value)}
                                    className={`btn btn-xs rounded-xl font-bold gap-1.5 transition-all ${
                                        isActive
                                            ? opt.activeBg
                                            : "btn-ghost bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60"
                                    }`}
                                >
                                    {opt.icon}
                                    <span>{opt.label}</span>
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none ${
                                        isActive ? "bg-white/25 text-white" : "bg-slate-200 text-slate-700"
                                    }`}>
                                        {count}
                                    </span>
                                </button>
                            )
                        })}
                    </div>

                    {/* Search Box */}
                    <div className="relative shrink-0 sm:w-72">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search worker name, email, phone..."
                            className="input input-sm input-bordered pl-8.5 pr-7 rounded-xl w-full bg-slate-50 focus:bg-white text-xs"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                                title="Clear search"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {(roleFilter !== "all" || search) && (
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
                        <span>
                            Showing <strong>{filteredWorkers.length}</strong> matching partner{filteredWorkers.length !== 1 ? 's' : ''}
                        </span>
                        <button
                            type="button"
                            onClick={() => {
                                setRoleFilter("all")
                                setSearch("")
                            }}
                            className="text-teal-700 hover:underline font-bold text-xs"
                        >
                            Reset Filter
                        </button>
                    </div>
                )}
            </div>

            {/* Workers Table Container */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                    <table className="table table-zebra w-full whitespace-nowrap text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
                            <tr>
                                <th className="w-10">#</th>
                                <th>Worker / Partner Details</th>
                                <th>Role</th>
                                <th>Total Bookings</th>
                                <th>Sales Volume</th>
                                <th>Collected / Due</th>
                                <th>Joined Date</th>
                                <th className="text-center">Workflow & Activity</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                [1, 2, 3, 4].map(n => (
                                    <tr key={n} className="animate-pulse">
                                        <td><div className="h-4 bg-slate-200 rounded w-4"></div></td>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0"></div>
                                                <div className="space-y-1">
                                                    <div className="h-4 bg-slate-200 rounded w-32"></div>
                                                    <div className="h-3 bg-slate-200 rounded w-24"></div>
                                                </div>
                                            </div>
                                        </td>
                                        <td><div className="h-5 bg-slate-200 rounded-full w-16"></div></td>
                                        <td><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                                        <td><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                                        <td><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                                        <td><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                                        <td className="text-center"><div className="h-6 bg-slate-200 rounded w-24 mx-auto"></div></td>
                                    </tr>
                                ))
                            ) : filteredWorkers.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-16 text-slate-400">
                                        <Users size={36} className="mx-auto mb-2 opacity-50" />
                                        <p className="font-semibold text-slate-600">No workers found</p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {workerUsers.length === 0
                                                ? "No Agents, B2B Partners, or Managers are registered yet. Assign roles in the Users & Roles page."
                                                : "No workers match your active search and filter criteria."}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredWorkers.map((p, idx) => {
                                    const bookingsCount = p.stats?.totalBookings || 0
                                    const confirmedCount = p.stats?.confirmedBookings || 0
                                    const salesAmount = p.stats?.totalSales || 0
                                    const paidAmount = p.stats?.totalPaid || 0
                                    const dueAmount = p.stats?.totalDue || 0
                                    const isCurrent = p.email?.toLowerCase() === currentUser?.email?.toLowerCase()

                                    return (
                                        <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="font-mono text-slate-400">{idx + 1}</td>
                                            <td>
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
                                                        {p.name ? p.name.charAt(0).toUpperCase() : p.email?.charAt(0).toUpperCase() || 'W'}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-bold text-slate-900 text-sm">{p.name || "Unnamed Worker"}</span>
                                                            {isCurrent && (
                                                                <span className="badge badge-xs bg-teal-100 text-teal-800 font-bold border-none px-1.5 py-0.5 rounded-md shrink-0">
                                                                    You
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400">{p.email}</div>
                                                        {p.phone && <div className="text-[10px] text-teal-700 font-semibold font-mono">{p.phone}</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                {getRoleBadge(p.role)}
                                            </td>
                                            <td>
                                                <div>
                                                    <span className="font-bold text-teal-900 block text-xs">
                                                        {bookingsCount} Booking{bookingsCount !== 1 ? 's' : ''}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        {confirmedCount} confirmed
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="font-bold text-emerald-800 text-sm">
                                                ৳{salesAmount.toLocaleString()}
                                            </td>
                                            <td>
                                                <div className="text-slate-700 font-semibold">
                                                    <span className="text-emerald-700">৳{paidAmount.toLocaleString()}</span>
                                                    {dueAmount > 0 && (
                                                        <span className="text-orange-600 block text-[10px] font-bold">
                                                            Due: ৳{dueAmount.toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="text-slate-500 text-[11px]">
                                                {p.created_At ? formatDate(p.created_At) : "N/A"}
                                            </td>
                                            <td className="text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedWorkflowUser(p)}
                                                    className="btn btn-xs btn-primary text-white gap-1 rounded-lg shadow-2xs font-bold"
                                                    title="Inspect complete workflow, credited reservations, and timeline activity logs"
                                                >
                                                    <Activity size={12} /> View Workflow
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Workflow Drilldown Inspection Modal */}
            {selectedWorkflowUser && (
                <UserWorkflowModal
                    user={selectedWorkflowUser}
                    isOpen={!!selectedWorkflowUser}
                    onClose={() => setSelectedWorkflowUser(null)}
                />
            )}
        </div>
    )
}

export default WorkerWorkflow
