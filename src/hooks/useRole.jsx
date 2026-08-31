import { useContext } from 'react'
import { AuthContext } from '../Context/AuthContext'
import useAxiosSecure from './useAxiosSecure'
import { useQuery } from '@tanstack/react-query'

const useRole = () => {
    const { user, loading } = useContext(AuthContext)
    const axiosSecure = useAxiosSecure()
    
    const { 
        data: role, 
        isPending: roleLoading, 
        isError,
        refetch: refetchRole 
    } = useQuery({
        queryKey: ["user-role", user?.email],
        enabled: !loading && !!user?.email,
        queryFn: async () => {
            const result = await axiosSecure.get(`/role/${user.email}`)
            if (result.data?.role) {
                return String(result.data.role).trim().toLowerCase()
            }
            return "user"
        },
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 3000),
        staleTime: 1000 * 60 * 10, // Cache for 10 mins so role is stable across route switches
        refetchOnWindowFocus: false, // Don't refetch on window focus to avoid transient drops
    })

    const effectiveRole = role || (isError ? "user" : undefined)
    const isChecking = loading || (roleLoading && !isError)

    return { 
        role: effectiveRole, 
        roleLoading: isChecking, 
        refetchRole 
    }
}

export default useRole
