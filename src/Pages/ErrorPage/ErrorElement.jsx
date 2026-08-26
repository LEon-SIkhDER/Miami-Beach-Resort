import React from 'react'
import { Link } from 'react-router'
import logo from '../../assets/logo.png'
import { Home as HomeIcon } from 'lucide-react'

const ErrorElement = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-slate-50 p-4 text-center">
            <img src={logo} alt="Miami Beach Resort" className="h-14 w-auto object-contain mb-2" />
            <p className="text-7xl sm:text-8xl font-black font-serif text-teal-800 tracking-tight">404</p>
            <div className="space-y-1 max-w-sm">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Page Not Found</h1>
                <p className="text-xs sm:text-sm text-slate-500">The page you are looking for doesn't exist or has been relocated.</p>
            </div>
            <Link to="/" className="btn btn-sm sm:btn-md btn-primary text-white rounded-xl gap-2 font-bold shadow-xs">
                <HomeIcon size={16} /> Back to Homepage
            </Link>
        </div>
    )
}

export default ErrorElement
