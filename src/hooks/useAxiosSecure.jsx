import axios from 'axios'
import { auth } from '../../firebase.init'

const instance = axios.create({
    baseURL: import.meta.env.VITE_SERVER_URL
})

// Request interceptor: attach Firebase ID Token (JWT)
instance.interceptors.request.use(async (config) => {
    try {
        if (!auth.currentUser && typeof auth.authStateReady === 'function') {
            await auth.authStateReady()
        }
        const currentUser = auth.currentUser
        if (currentUser) {
            const token = await currentUser.getIdToken()
            if (token) {
                config.headers.Authorization = `Bearer ${token}`
            }
        }
    } catch (err) {
        console.error("Error attaching Firebase ID token:", err)
    }
    return config
}, (error) => {
    return Promise.reject(error)
})

// Response interceptor: handle 401/403 responses
instance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error.response?.status
        if (status === 401) {
            console.warn("Unauthorized access (401) on:", error.config?.url)
        } else if (status === 403) {
            console.warn("Forbidden access (403) on:", error.config?.url)
        }
        return Promise.reject(error)
    }
)

const useAxiosSecure = () => {
    return instance
}

export default useAxiosSecure
