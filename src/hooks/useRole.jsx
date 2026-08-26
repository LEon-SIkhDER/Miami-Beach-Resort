import { useContext } from 'react'
import { AuthContext } from '../Context/AuthContext'
import useAxiosSecure from './useAxiosSecure'
import { useQuery } from '@tanstack/react-query'

const useRole = () => {
    const { user, loading } = useContext(AuthContext)
    const axiosSecure = useAxiosSecure()
    const { data: role, isLoading: roleLoading, refetch: refetchRole } = useQuery({
        queryKey: ["user-role", user?.email],
        enabled: !loading && !!user?.email,
        queryFn: async () => {
            try {
                const result = await axiosSecure.get(`/role/${user.email}`)
                return result.data.role || "user"
            } catch (err) {
                console.log("Error fetching role:", err)
                return "user"
            }
        },
        retry: 2,
    })
    return { role, roleLoading: loading || roleLoading, refetchRole }
}

export default useRole
