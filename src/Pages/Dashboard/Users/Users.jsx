import React, { useContext, useState } from 'react'
import { AuthContext } from '../../../Context/AuthContext'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { showConfirmAlert, showErrorAlert } from '../../../utils/customSwal'
import { 
    Shield, 
    User, 
    Search, 
    Users as UsersIcon, 
    Phone, 
    CheckCircle2, 
    EllipsisVertical, 
    Briefcase, 
    UserCheck, 
    Building2, 
    ArrowDownCircle 
} from 'lucide-react'

const ROLE_LABELS = {
    manager: "Manager",
    agent: "Agent",
    b2b: "B2B Partner",
    admin: "Admin",
    user: "User"
}

const Users = () => {
    const { user: currentUser } = useContext(AuthContext)
    const axiosSecure = useAxiosSecure()
    const queryClient = useQueryClient()
    const [search, setSearch] = useState("")

    const { data: users = [], isLoading } = useQuery({
        queryKey: ["all-users", search],
        queryFn: async () => {
            const params = search ? `?search=${search}` : ""
            const res = await axiosSecure.get(`/users${params}`)
            return res.data
        }
    })

    const roleMutation = useMutation({
        mutationFn: async ({ id, role }) => {
            const res = await axiosSecure.patch(`/user/${id}`, { role })
            return res.data
        },
        onMutate: ({ roleTitle }) => ({
            toastId: toast.loading(`Updating role to ${roleTitle}...`)
        }),
        onSuccess: async (_, variables, context) => {
            await queryClient.invalidateQueries({ queryKey: ["all-users"] })
            toast.dismiss(context?.toastId)
            toast.success(`User updated to ${variables.roleTitle || "new role"}! 🎉`)
        },
        onError: (err, _, context) => {
            toast.dismiss(context?.toastId)
            toast.error(err.response?.data?.message || "Failed to update user role.")
        }
    })

    const handleRoleChange = (targetUser, newRole) => {
        const isSelf = targetUser.email?.toLowerCase() === currentUser?.email?.toLowerCase() || 
                       (currentUser?.uid && targetUser.uid === currentUser.uid)
        if (isSelf) {
            showErrorAlert("Action Not Allowed", "You cannot modify your own role permissions.")
            return
        }

        const roleTitle = ROLE_LABELS[newRole] || newRole

        showConfirmAlert(
            `Approve as ${roleTitle}?`,
            `Change role of "${targetUser.name || targetUser.email}" to ${roleTitle}.`,
            `Yes, set as ${roleTitle}`,
            newRole === "user"
        ).then(result => {
            if (result.isConfirmed) {
                roleMutation.mutate({ id: targetUser._id, role: newRole, roleTitle })
            }
        })
    }

    const getRoleBadge = (role) => {
        switch (role) {
            case "admin":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 whitespace-nowrap">
                        <Shield size={12} className="text-amber-600" /> Admin
                    </span>
                )
            case "manager":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 whitespace-nowrap">
                        <Briefcase size={12} className="text-purple-600" /> Manager
                    </span>
                )
            case "agent":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 whitespace-nowrap">
                        <UserCheck size={12} className="text-teal-600" /> Agent
                    </span>
                )
            case "b2b":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 whitespace-nowrap">
                        <Building2 size={12} className="text-blue-600" /> B2B Partner
                    </span>
                )
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 whitespace-nowrap">
                        <User size={12} className="text-slate-400" /> Guest / User
                    </span>
                )
        }
    }

    return (
        <div className="space-y-6">
            {/* Header and Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight">
                        Users & Roles Management
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        View registered guest accounts and manage roles: Manager, Agent, B2B Partner, and Admin.
                    </p>
                </div>

                <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search users by name or email..."
                        className="input input-sm input-bordered pl-9 rounded-xl w-full sm:w-64 bg-white"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="table table-zebra w-full whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-wider whitespace-nowrap">
                                <th className="whitespace-nowrap w-12">#</th>
                                <th className="whitespace-nowrap">User</th>
                                <th className="whitespace-nowrap">Email</th>
                                <th className="whitespace-nowrap">Phone</th>
                                <th className="whitespace-nowrap">Role</th>
                                <th className="whitespace-nowrap">Joined Date</th>
                                <th className="text-center whitespace-nowrap min-w-[80px]">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {isLoading ? (
                                [1, 2, 3, 4].map(n => (
                                    <tr key={n} className="animate-pulse">
                                        <td><div className="h-4 bg-slate-200 rounded w-4"></div></td>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0"></div>
                                                <div className="h-4 bg-slate-200 rounded w-28"></div>
                                            </div>
                                        </td>
                                        <td><div className="h-4 bg-slate-200 rounded w-36"></div></td>
                                        <td><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                                        <td><div className="h-5 bg-slate-200 rounded-full w-20"></div></td>
                                        <td><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                                        <td className="text-center"><div className="h-7 bg-slate-200 rounded-lg w-8 mx-auto"></div></td>
                                    </tr>
                                ))
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-slate-400">
                                        <UsersIcon size={36} className="mx-auto mb-2 opacity-50" />
                                        No users found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                users.map((u, i) => {
                                    const isCurrentAdmin = u.email?.toLowerCase() === currentUser?.email?.toLowerCase() || (currentUser?.uid && u.uid === currentUser.uid)
                                    return (
                                        <tr key={u._id} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="font-mono text-xs text-slate-400 whitespace-nowrap">{i + 1}</td>
                                            <td className="whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
                                                        {u.name ? u.name.charAt(0).toUpperCase() : u.email?.charAt(0).toUpperCase() || 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-slate-900">{u.name || "Unnamed User"}</span>
                                                            {isCurrentAdmin && (
                                                                <span className="badge badge-xs bg-teal-100 text-teal-800 font-bold border-none px-1.5 py-0.5 rounded-md shrink-0">
                                                                    You
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="text-slate-600 whitespace-nowrap">{u.email}</td>
                                            <td className="text-slate-600 whitespace-nowrap">{u.phone || "—"}</td>
                                            <td className="whitespace-nowrap">
                                                {getRoleBadge(u.role)}
                                            </td>
                                            <td className="text-xs text-slate-500 whitespace-nowrap">
                                                {u.created_At ? new Date(u.created_At).toLocaleDateString() : "—"}
                                            </td>
                                            <td className="text-center whitespace-nowrap">
                                                {isCurrentAdmin ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg whitespace-nowrap">
                                                        <CheckCircle2 size={12} className="text-teal-600" /> Current Admin
                                                    </span>
                                                ) : (
                                                    <div className="dropdown dropdown-left">
                                                        <div tabIndex={0} role="button" className="cursor-pointer rounded-full hover:bg-gray-100 p-2 border border-transparent hover:border-gray-200 inline-flex">
                                                            <EllipsisVertical size={18} />
                                                        </div>
                                                        <ul tabIndex={-1} className="dropdown-content menu bg-base-100 rounded-box z-10 w-56 p-2 shadow-lg border border-slate-100">
                                                            {u.role !== "manager" && (
                                                                <li>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRoleChange(u, "manager")}
                                                                        className="text-purple-700 hover:bg-purple-50 font-medium"
                                                                    >
                                                                        <Briefcase size={14} /> Approve as Manager
                                                                    </button>
                                                                </li>
                                                            )}
                                                            {u.role !== "agent" && (
                                                                <li>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRoleChange(u, "agent")}
                                                                        className="text-teal-700 hover:bg-teal-50 font-medium"
                                                                    >
                                                                        <UserCheck size={14} /> Approve as Agent
                                                                    </button>
                                                                </li>
                                                            )}
                                                            {u.role !== "b2b" && (
                                                                <li>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRoleChange(u, "b2b")}
                                                                        className="text-blue-700 hover:bg-blue-50 font-medium"
                                                                    >
                                                                        <Building2 size={14} /> Approve as B2B
                                                                    </button>
                                                                </li>
                                                            )}
                                                            {u.role !== "admin" && (
                                                                <li>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRoleChange(u, "admin")}
                                                                        className="text-amber-700 hover:bg-amber-50 font-medium"
                                                                    >
                                                                        <Shield size={14} /> Make Admin
                                                                    </button>
                                                                </li>
                                                            )}
                                                            {u.role !== "user" && (
                                                                <li>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRoleChange(u, "user")}
                                                                        className="text-rose-600 hover:bg-rose-50"
                                                                    >
                                                                        <ArrowDownCircle size={14} /> Demote to User
                                                                    </button>
                                                                </li>
                                                            )}
                                                        </ul>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden space-y-3">
                {isLoading ? (
                    [1, 2, 3].map(n => (
                        <div key={n} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs animate-pulse space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0"></div>
                                <div className="flex-1 space-y-1.5">
                                    <div className="h-4 bg-slate-200 rounded w-28"></div>
                                    <div className="h-3 bg-slate-200 rounded w-40"></div>
                                </div>
                            </div>
                            <div className="h-8 bg-slate-200 rounded-xl w-full"></div>
                        </div>
                    ))
                ) : users.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl text-center text-slate-400 border border-slate-200">
                        <UsersIcon size={36} className="mx-auto mb-2 opacity-50" />
                        No users registered yet.
                    </div>
                ) : (
                    users.map(u => {
                        const isCurrentAdmin = u.email?.toLowerCase() === currentUser?.email?.toLowerCase() || (currentUser?.uid && u.uid === currentUser.uid)
                        return (
                            <div key={u._id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
                                            {u.name ? u.name.charAt(0).toUpperCase() : u.email?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <h3 className="font-bold text-slate-900 text-sm truncate">{u.name || "Unnamed User"}</h3>
                                                {isCurrentAdmin && (
                                                    <span className="badge badge-xs bg-teal-100 text-teal-800 font-bold border-none px-1.5 py-0.5 rounded-md shrink-0">
                                                        You
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 truncate">{u.email}</p>
                                        </div>
                                    </div>
                                    <div className="shrink-0">
                                        {getRoleBadge(u.role)}
                                    </div>
                                </div>

                                {u.phone && (
                                    <div className="text-xs text-slate-600 flex items-center gap-1.5 bg-slate-50 p-2 rounded-xl">
                                        <Phone size={12} className="text-teal-600" />
                                        <span>{u.phone}</span>
                                    </div>
                                )}

                                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs text-slate-500">
                                    <span>Joined: {u.created_At ? new Date(u.created_At).toLocaleDateString() : "—"}</span>
                                    
                                    {isCurrentAdmin ? (
                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                                            <CheckCircle2 size={12} className="text-teal-600" /> Current Admin
                                        </span>
                                    ) : (
                                        <div className="dropdown dropdown-left">
                                            <div tabIndex={0} role="button" className="cursor-pointer rounded-full hover:bg-gray-100 p-1.5 border border-transparent hover:border-gray-200">
                                                <EllipsisVertical size={16} />
                                            </div>
                                            <ul tabIndex={-1} className="dropdown-content menu bg-base-100 rounded-box z-10 w-52 p-2 shadow-lg border border-slate-100">
                                                {u.role !== "manager" && (
                                                    <li>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRoleChange(u, "manager")}
                                                            className="text-purple-700 hover:bg-purple-50 font-medium"
                                                        >
                                                            <Briefcase size={14} /> Approve as Manager
                                                        </button>
                                                    </li>
                                                )}
                                                {u.role !== "agent" && (
                                                    <li>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRoleChange(u, "agent")}
                                                            className="text-teal-700 hover:bg-teal-50 font-medium"
                                                        >
                                                            <UserCheck size={14} /> Approve as Agent
                                                        </button>
                                                    </li>
                                                )}
                                                {u.role !== "b2b" && (
                                                    <li>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRoleChange(u, "b2b")}
                                                            className="text-blue-700 hover:bg-blue-50 font-medium"
                                                        >
                                                            <Building2 size={14} /> Approve as B2B
                                                        </button>
                                                    </li>
                                                )}
                                                {u.role !== "admin" && (
                                                    <li>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRoleChange(u, "admin")}
                                                            className="text-amber-700 hover:bg-amber-50 font-medium"
                                                        >
                                                            <Shield size={14} /> Make Admin
                                                        </button>
                                                    </li>
                                                )}
                                                {u.role !== "user" && (
                                                    <li>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRoleChange(u, "user")}
                                                            className="text-rose-600 hover:bg-rose-50"
                                                        >
                                                            <ArrowDownCircle size={14} /> Demote to User
                                                        </button>
                                                    </li>
                                                )}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}

export default Users
