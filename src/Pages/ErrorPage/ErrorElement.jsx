import React from 'react'
import { Link, useRouteError, isRouteErrorResponse } from 'react-router'
import logo from '../../assets/logo.png'
import { Home as HomeIcon, RefreshCw, AlertTriangle } from 'lucide-react'

const ErrorElement = () => {
    const error = useRouteError()
    console.error("Router Error caught by ErrorElement:", error)

    const is404 = isRouteErrorResponse(error) && error.status === 404

    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-slate-50 p-4 text-center">
            <img src={logo} alt="Miami Beach Resort" className="h-14 w-auto object-contain mb-2" />
            
            {is404 ? (
                <>
                    <p className="text-7xl sm:text-8xl font-black font-serif text-teal-800 tracking-tight">404</p>
                    <div className="space-y-1 max-w-sm">
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Page Not Found</h1>
                        <p className="text-xs sm:text-sm text-slate-500">The page you are looking for doesn't exist or has been relocated.</p>
                    </div>
                </>
            ) : (
                <>
                    <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
                        <AlertTriangle size={32} />
                    </div>
                    <div className="space-y-1 max-w-md">
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Something Went Wrong</h1>
                        <p className="text-xs sm:text-sm text-slate-500">
                            {error?.message || "An unexpected error occurred while loading this page."}
                        </p>
                    </div>
                </>
            )}

            <div className="flex items-center gap-2">
                <button
                    onClick={() => window.location.reload()}
                    className="btn btn-sm sm:btn-md btn-outline border-slate-300 rounded-xl gap-2 font-bold"
                >
                    <RefreshCw size={15} /> Reload
                </button>
                <Link to="/" className="btn btn-sm sm:btn-md btn-primary text-white rounded-xl gap-2 font-bold shadow-xs">
                    <HomeIcon size={16} /> Homepage
                </Link>
            </div>
        </div>
    )
}

export default ErrorElement
