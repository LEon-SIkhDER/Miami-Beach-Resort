import React, { useState } from 'react'
import {
    X,
    Plus,
    Edit2,
    Trash2,
    Check,
    AlertCircle,
    HelpCircle,
    Tag,
    Layers,
    Info,
    RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'
import useBillingTypes from '../../../hooks/useBillingTypes'

const ManageBillingTypesModal = ({ isOpen, onClose, extraServices = [] }) => {
    const {
        billingTypes,
        isLoading,
        isFetching,
        refetch,
        addBillingType,
        isAdding,
        updateBillingType,
        isUpdating,
        deleteBillingType,
        isDeleting
    } = useBillingTypes()

    const [isCreating, setIsCreating] = useState(false)
    const [newType, setNewType] = useState({ name: '', unitLabel: '', description: '' })

    const [editingId, setEditingId] = useState(null)
    const [editForm, setEditForm] = useState({ name: '', unitLabel: '', description: '' })

    const [deletingId, setDeletingId] = useState(null)

    if (!isOpen) return null

    // Count how many services currently use each billing type
    const getServiceUsageCount = (typeName) => {
        if (!Array.isArray(extraServices) || !typeName) return 0
        const target = typeName.trim().toLowerCase()
        return extraServices.filter(s => String(s.billingType || '').trim().toLowerCase() === target).length
    }

    const handleStartEdit = (bt) => {
        setEditingId(bt.id)
        setEditForm({
            name: bt.name,
            unitLabel: bt.unitLabel || '',
            description: bt.description || ''
        })
    }

    const handleCancelEdit = () => {
        setEditingId(null)
        setEditForm({ name: '', unitLabel: '', description: '' })
    }

    const handleSaveEdit = async (id) => {
        if (!editForm.name.trim()) {
            toast.error("Billing type name is required.")
            return
        }
        try {
            await updateBillingType({
                id,
                name: editForm.name.trim(),
                unitLabel: editForm.unitLabel.trim() || 'unit',
                description: editForm.description.trim()
            })
            toast.success("Billing type updated successfully!")
            setEditingId(null)
        } catch (err) {
            toast.error(err?.response?.data?.message || err.message || "Failed to update billing type")
        }
    }

    const handleCreate = async (e) => {
        e?.preventDefault()
        if (!newType.name.trim()) {
            toast.error("Billing type name is required.")
            return
        }
        try {
            await addBillingType({
                name: newType.name.trim(),
                unitLabel: newType.unitLabel.trim() || 'unit',
                description: newType.description.trim()
            })
            toast.success(`Billing type "${newType.name.trim()}" added!`)
            setNewType({ name: '', unitLabel: '', description: '' })
            setIsCreating(false)
        } catch (err) {
            toast.error(err?.response?.data?.message || err.message || "Failed to add billing type")
        }
    }

    const handleDelete = async (bt) => {
        const usageCount = getServiceUsageCount(bt.name)
        if (usageCount > 0) {
            toast.error(`Cannot delete "${bt.name}": It is currently assigned to ${usageCount} extra service(s). Please reassign or delete those services first.`)
            return
        }

        if (!window.confirm(`Are you sure you want to delete "${bt.name}"?`)) {
            return
        }

        try {
            setDeletingId(bt.id)
            await deleteBillingType({ id: bt.id })
            toast.success(`Billing type "${bt.name}" removed.`)
        } catch (err) {
            toast.error(err?.response?.data?.message || err.message || "Failed to delete billing type")
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200">
            <div 
                className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                onClick={e => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/80">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shadow-xs">
                            <Tag size={18} />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-900">
                                Extra Services Billing Types
                            </h3>
                            <p className="text-xs text-slate-500">
                                Manage billing models stored in settings (Per Night, Per Quantity, etc.)
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => refetch()}
                            className="p-2 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-slate-200/50 transition-colors cursor-pointer"
                            title="Refresh billing types"
                        >
                            <RefreshCw size={16} className={isFetching ? "animate-spin text-teal-600" : ""} />
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
                    {/* Top Action Bar / Add Button */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                            <Layers size={14} className="text-teal-600" />
                            <span><strong>{billingTypes.length}</strong> configured billing types</span>
                        </div>
                        {!isCreating && (
                            <button
                                type="button"
                                onClick={() => setIsCreating(true)}
                                className="btn btn-xs sm:btn-sm bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl border-none shadow-xs gap-1.5 cursor-pointer"
                            >
                                <Plus size={14} /> Add Billing Type
                            </button>
                        )}
                    </div>

                    {/* Add New Form (Expandable) */}
                    {isCreating && (
                        <form onSubmit={handleCreate} className="bg-teal-50/50 border border-teal-200 rounded-2xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <Plus size={14} className="text-teal-600" /> New Billing Type
                                </h4>
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="text-xs text-slate-400 hover:text-slate-600 font-medium"
                                >
                                    Cancel
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Type Name * <span className="text-[10px] font-normal text-slate-400">(e.g. Per Quantity)</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Per Quantity"
                                        value={newType.name}
                                        onChange={e => setNewType(prev => ({ ...prev, name: e.target.value }))}
                                        className="input input-sm input-bordered w-full rounded-xl bg-white text-xs font-semibold text-slate-800 focus:border-teal-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        Price Suffix Unit <span className="text-[10px] font-normal text-slate-400">(e.g. item, night, qty)</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. item (shows as ৳X / item)"
                                        value={newType.unitLabel}
                                        onChange={e => setNewType(prev => ({ ...prev, unitLabel: e.target.value }))}
                                        className="input input-sm input-bordered w-full rounded-xl bg-white text-xs font-semibold text-slate-800 focus:border-teal-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Description <span className="text-[10px] font-normal text-slate-400">(Optional)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Billed per count of items requested"
                                    value={newType.description}
                                    onChange={e => setNewType(prev => ({ ...prev, description: e.target.value }))}
                                    className="input input-sm input-bordered w-full rounded-xl bg-white text-xs text-slate-800 focus:border-teal-500"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="btn btn-xs rounded-xl btn-ghost text-slate-600 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isAdding}
                                    className="btn btn-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl border-none shadow-xs"
                                >
                                    {isAdding ? "Saving..." : "Save Billing Type"}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Billing Types Table */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                        <table className="table table-sm w-full">
                            <thead className="bg-slate-50 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                                <tr>
                                    <th>Billing Type</th>
                                    <th>Unit Suffix</th>
                                    <th>In Use</th>
                                    <th className="text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={4} className="text-center py-8 text-slate-400">
                                            <span className="loading loading-spinner loading-sm text-teal-600"></span>
                                            <p className="mt-1">Loading billing types...</p>
                                        </td>
                                    </tr>
                                ) : billingTypes.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="text-center py-8 text-slate-400">
                                            No billing types configured.
                                        </td>
                                    </tr>
                                ) : (
                                    billingTypes.map((bt) => {
                                        const isEditing = editingId === bt.id
                                        const usageCount = getServiceUsageCount(bt.name)

                                        if (isEditing) {
                                            return (
                                                <tr key={bt.id} className="bg-amber-50/50">
                                                    <td colSpan={4} className="p-3">
                                                        <div className="space-y-2">
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-slate-600 uppercase">Type Name</label>
                                                                    <input
                                                                        type="text"
                                                                        value={editForm.name}
                                                                        onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                                                        className="input input-xs input-bordered w-full rounded-lg bg-white font-semibold"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] font-bold text-slate-600 uppercase">Unit Suffix</label>
                                                                    <input
                                                                        type="text"
                                                                        value={editForm.unitLabel}
                                                                        onChange={e => setEditForm(prev => ({ ...prev, unitLabel: e.target.value }))}
                                                                        className="input input-xs input-bordered w-full rounded-lg bg-white font-semibold"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-slate-600 uppercase">Description</label>
                                                                <input
                                                                    type="text"
                                                                    value={editForm.description}
                                                                    onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                                                    className="input input-xs input-bordered w-full rounded-lg bg-white"
                                                                />
                                                            </div>
                                                            <div className="flex items-center justify-end gap-2 pt-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={handleCancelEdit}
                                                                    className="btn btn-xs btn-ghost text-slate-600 rounded-lg"
                                                                >
                                                                    Cancel
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    disabled={isUpdating}
                                                                    onClick={() => handleSaveEdit(bt.id)}
                                                                    className="btn btn-xs bg-teal-600 hover:bg-teal-700 text-white rounded-lg border-none font-semibold"
                                                                >
                                                                    {isUpdating ? "Saving..." : "Save Changes"}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        }

                                        return (
                                            <tr key={bt.id} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="font-semibold text-slate-900">
                                                    <div className="flex items-center gap-2">
                                                        <span className="badge badge-xs sm:badge-sm bg-teal-50 text-teal-800 border-teal-200 font-bold px-2 py-0.5 rounded-lg">
                                                            {bt.name}
                                                        </span>
                                                        {bt.description && (
                                                            <span className="text-[11px] text-slate-400 truncate max-w-[150px] sm:max-w-[220px]" title={bt.description}>
                                                                {bt.description}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                                        /{bt.unitLabel || 'unit'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge badge-xs font-bold ${
                                                        usageCount > 0
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                            : "bg-slate-100 text-slate-400 border-slate-200"
                                                    }`}>
                                                        {usageCount} {usageCount === 1 ? 'service' : 'services'}
                                                    </span>
                                                </td>
                                                <td className="text-right">
                                                    <div className="inline-flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStartEdit(bt)}
                                                            className="p-1 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors cursor-pointer"
                                                            title={`Edit ${bt.name}`}
                                                        >
                                                            <Edit2 size={13} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={deletingId === bt.id}
                                                            onClick={() => handleDelete(bt)}
                                                            className={`p-1 rounded-lg transition-colors cursor-pointer ${
                                                                usageCount > 0
                                                                    ? "text-slate-300 hover:text-slate-400 hover:bg-slate-100"
                                                                    : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                            }`}
                                                            title={usageCount > 0 ? `Cannot delete: used by ${usageCount} service(s)` : `Delete ${bt.name}`}
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 text-[11px] text-slate-500 flex items-start gap-2 border border-slate-200/60">
                        <Info size={14} className="text-teal-600 shrink-0 mt-0.5" />
                        <p>
                            Billing types saved here automatically populate the Extra Services creation dropdowns and dynamically adjust pricing labels across Calendar Reservations, Booking Edit, and Invoices.
                        </p>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="px-5 sm:px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-sm bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl border-none shadow-xs"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ManageBillingTypesModal
