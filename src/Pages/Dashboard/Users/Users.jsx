import React, { useContext, useState } from 'react'
import { AuthContext } from '../../../Context/AuthContext'
import useAxiosSecure from '../../../hooks/useAxiosSecure'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { showConfirmAlert, showErrorAlert } from '../../../utils/customSwal'
import { Shield, User, Search, Users as UsersIcon, Mail, Calendar, Phone, CheckCircle2 } from 'lucide-react'

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
        onMutate: ({ role }) => ({
            toastId: toast.loading(role === "admin" ? "Granting admin access..." : "Revoking admin access...")
        }),
        onSuccess: async (_, __, context) => {
            await queryClient.invalidateQueries({ queryKey: ["all-users"] })
            toast.dismiss(context?.toastId)
            toast.success("User role updated successfully!")
        },
        onError: (_, __, context) => {
            toast.dismiss(context?.toastId)
            toast.error("Failed to update user role.")
        }
    })

    const handleMakeAdmin = (user) => {
        showConfirmAlert(
            `Make "${user.name || user.email}" an Admin?`,
            "This user will have full access to add/delete rooms, view all bookings, and manage roles.",
            "Yes, grant Admin role"
        ).then(result => {
            if (result.isConfirmed) roleMutation.mutate({ id: user._id, role: "admin" })
        })
    }

    const handleRemoveAdmin = (user) => {
        if (user.email?.toLowerCase() === currentUser?.email?.toLowerCase()) {
            showErrorAlert("Action Not Allowed", "You cannot demote or change your own admin status.")
            return
        }

        showConfirmAlert(
            `Revoke Admin Access for "${user.name || user.email}"?`,
            "This user will be demoted to a regular guest user.",
            "Yes, demote to User",
            true
        ).then(result => {
            if (result.isConfirmed) roleMutation.mutate({ id: user._id, role: "user" })
        })
    }

    return (
        <div className="space-y-6">
            {/* Header and Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-serif tracking-tight">
                        Users and Roles Management
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        View registered guest accounts and manage administrator access permissions.
                    </p>
                </div>

                <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        className="input input-sm input-bordered pl-9 rounded-xl w-full sm:w-60 bg-white"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Desktop Table */}
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
                                <th className="text-right whitespace-nowrap min-w-[150px]">Action</th>
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
                                        <td><div className="h-5 bg-slate-200 rounded-full w-16"></div></td>
                                        <td><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                                        <td className="text-right"><div className="h-7 bg-slate-200 rounded-lg w-28 ml-auto"></div></td>
                                    </tr>
                                ))
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-slate-400">
                                        <UsersIcon size={36} className="mx-auto mb-2 opacity-50" />
                                        No users registered yet.
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
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                                                    u.role === "admin" 
                                                        ? "bg-amber-50 text-amber-800 border border-amber-200" 
                                                        : "bg-slate-100 text-slate-700"
                                                }`}>
                                                    {u.role === "admin" ? <Shield size={12} /> : <User size={12} />}
                                                    {u.role === "admin" ? "Admin" : "User"}
                                                </span>
                                            </td>
                                            <td className="text-xs text-slate-500 whitespace-nowrap">
                                                {u.created_At ? new Date(u.created_At).toLocaleDateString() : "—"}
                                            </td>
                                            <td className="text-right whitespace-nowrap">
                                                <div className="inline-flex justify-end shrink-0">
                                                    {isCurrentAdmin ? (
                                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-lg whitespace-nowrap shrink-0">
                                                            <CheckCircle2 size={12} className="text-teal-600" /> Logged in
                                                        </span>
                                                    ) : u.role === "admin" ? (
                                                        <button
                                                            onClick={() => handleRemoveAdmin(u)}
                                                            className="btn btn-outline border-rose-300 text-rose-600 hover:bg-rose-50 btn-xs rounded-lg gap-1 whitespace-nowrap shrink-0"
                                                        >
                                                            <User size={12} /> Demote to User
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleMakeAdmin(u)}
                                                            className="btn btn-primary btn-xs rounded-lg gap-1 text-white shadow-xs whitespace-nowrap shrink-0"
                                                        >
                                                            <Shield size={12} /> Grant Admin
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Cards View (Optimized down to 320px) */}
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
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                                        u.role === "admin" 
                                            ? "bg-amber-50 text-amber-800 border border-amber-200" 
                                            : "bg-slate-100 text-slate-700"
                                    }`}>
                                        {u.role === "admin" ? <Shield size={11} /> : <User size={11} />}
                                        {u.role === "admin" ? "Admin" : "User"}
                                    </span>
                                </div>

                                {u.phone && (
                                    <div className="text-xs text-slate-600 flex items-center gap-1.5 bg-slate-50 p-2 rounded-xl">
                                        <Phone size={12} className="text-teal-600" />
                                        <span>{u.phone}</span>
                                    </div>
                                )}

                                <div className="pt-1 border-t border-slate-100">
                                    {isCurrentAdmin ? (
                                        <div className="w-full text-center text-xs font-medium text-slate-400 bg-slate-50 py-1.5 rounded-xl">
                                            <span className="inline-flex items-center gap-1">
                                                <CheckCircle2 size={13} className="text-teal-600" /> Current Logged In Admin
                                            </span>
                                        </div>
                                    ) : u.role === "admin" ? (
                                        <button
                                            onClick={() => handleRemoveAdmin(u)}
                                            className="btn btn-outline border-rose-300 text-rose-600 hover:bg-rose-50 btn-sm w-full rounded-xl gap-1.5 text-xs font-semibold"
                                        >
                                            <User size={14} /> Demote to User
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleMakeAdmin(u)}
                                            className="btn btn-primary btn-sm w-full rounded-xl gap-1.5 text-white font-semibold text-xs shadow-xs"
                                        >
                                            <Shield size={14} /> Grant Admin Access
                                        </button>
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
