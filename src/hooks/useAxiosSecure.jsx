import axios from 'axios'
import { useContext, useEffect } from 'react'
import { AuthContext } from '../Context/AuthContext'
import { useNavigate } from 'react-router'

const instance = axios.create({
    baseURL: import.meta.env.VITE_SERVER_URL
})

const useAxiosSecure = () => {
    const { user, logOut } = useContext(AuthContext)
    const navigate = useNavigate()

    useEffect(() => {
        // all requests
        const requestInterceptor = instance.interceptors.request.use(async (config) => {
            if (user) {
                try {
                    const token = await user.getIdToken(true)
                    config.headers.Authorization = `Bearer ${token}`
                } catch (e) {
                    console.log("Token error:", e)
                }
            }
            return config
        }, (error) => {
            return Promise.reject(error)
        })

        // all responses
        const responseInterceptor = instance.interceptors.response.use((res) => {
            return res
        }, (error) => {
            if (error.response?.status === 401) {
                console.log("401 Unauthorized:", error.config?.url)
            } else if (error.response?.status === 403) {
                console.log("403 Forbidden:", error.config?.url)
            }
            return Promise.reject(error)
        })

        return () => {
            instance.interceptors.request.eject(requestInterceptor)
            instance.interceptors.response.eject(responseInterceptor)
        }
    }, [user, logOut])

    return instance
}

export default useAxiosSecure
