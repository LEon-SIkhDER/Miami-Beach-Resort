import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import useAxiosSecure from './useAxiosSecure'

export const FALLBACK_BILLING_TYPES = [
    { id: "per_night", name: "Per Night", unitLabel: "night", description: "Billed per night of stay" },
    { id: "per_person", name: "Per Person", unitLabel: "person", description: "Billed per guest count" },
    { id: "per_quantity", name: "Per Quantity", unitLabel: "item", description: "Billed per item / quantity" },
    { id: "one_time", name: "One-time", unitLabel: "time", description: "Fixed one-time service fee" }
]

const normalizeBillingType = (item) => {
    if (!item) return null
    if (typeof item === 'string') {
        const lower = item.toLowerCase()
        const unit = lower.includes('night') ? 'night' : lower.includes('person') ? 'person' : lower.includes('quantity') ? 'item' : 'time'
        return {
            id: item.toLowerCase().replace(/\s+/g, '_'),
            name: item,
            unitLabel: unit,
            description: ""
        }
    }
    return {
        id: item.id || item._id || (item.name ? item.name.toLowerCase().replace(/\s+/g, '_') : `bt_${Math.random()}`),
        name: item.name || "",
        unitLabel: item.unitLabel || "unit",
        description: item.description || ""
    }
}

export const useBillingTypes = () => {
    const axiosSecure = useAxiosSecure()
    const queryClient = useQueryClient()

    const {
        data: rawData = FALLBACK_BILLING_TYPES,
        isLoading,
        isFetching,
        isError,
        error,
        refetch
    } = useQuery({
        queryKey: ["extraServicesBillingTypes"],
        queryFn: async () => {
            const res = await axiosSecure.get('/settings/extra-services/billing-types')
            const list = Array.isArray(res?.data)
                ? res.data
                : (res?.data?.billingType || res?.data?.billingTypes || [])
            return list
        },
        staleTime: 5 * 60 * 1000,
        placeholderData: FALLBACK_BILLING_TYPES
    })

    const billingTypes = (Array.isArray(rawData) && rawData.length > 0 ? rawData : FALLBACK_BILLING_TYPES)
        .map(normalizeBillingType)
        .filter(Boolean)

    const billingTypeNames = billingTypes.map(b => b.name)

    const addMutation = useMutation({
        mutationFn: async (payload) => {
            const res = await axiosSecure.post('/settings/extra-services/billing-types', payload)
            return res.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["extraServicesBillingTypes"] })
        }
    })

    const updateMutation = useMutation({
        mutationFn: async ({ id, ...payload }) => {
            const res = await axiosSecure.patch(`/settings/extra-services/billing-types/${id}`, payload)
            return res.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["extraServicesBillingTypes"] })
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async ({ id, force = false }) => {
            const res = await axiosSecure.delete(`/settings/extra-services/billing-types/${id}${force ? '?force=true' : ''}`)
            return res.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["extraServicesBillingTypes"] })
        }
    })

    const getUnitLabel = (billingTypeName) => {
        if (!billingTypeName) return "unit"
        const matched = billingTypes.find(b => b.name.toLowerCase() === String(billingTypeName).toLowerCase())
        if (matched?.unitLabel) return matched.unitLabel
        const lower = String(billingTypeName).toLowerCase()
        if (lower.includes("night")) return "night"
        if (lower.includes("person")) return "person"
        if (lower.includes("quantity")) return "item"
        if (lower.includes("one-time") || lower.includes("once")) return "time"
        return "unit"
    }

    const getInputLabel = (billingTypeName) => {
        if (!billingTypeName) return "Quantity"
        const lower = String(billingTypeName).toLowerCase()
        if (lower === "per night") return "Number of Nights"
        if (lower === "per person") return "Person Count"
        if (lower === "per quantity") return "Quantity / Items"
        if (lower === "one-time") return "Time(s) / Flat"
        return `${billingTypeName} Count`
    }

    return {
        billingTypes,
        billingTypeNames,
        isLoading,
        isFetching,
        isError,
        error,
        refetch,
        addBillingType: addMutation.mutateAsync,
        isAdding: addMutation.isPending,
        updateBillingType: updateMutation.mutateAsync,
        isUpdating: updateMutation.isPending,
        deleteBillingType: deleteMutation.mutateAsync,
        isDeleting: deleteMutation.isPending,
        getUnitLabel,
        getInputLabel
    }
}

export default useBillingTypes
