import React from 'react'
import { Link } from 'react-router'
import logo from '../assets/logo.png'
import { ShieldAlert, ArrowLeft } from 'lucide-react'

const Forbidden = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-5 p-4 text-center bg-slate-50">
            <img src={logo} alt="Miami Beach Resort" className="h-14 w-auto object-contain mb-2" />
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-xs">
                <ShieldAlert size={32} />
            </div>
            <div className="space-y-1 max-w-sm">
                <h1 className="text-2xl font-extrabold font-serif text-slate-900">Access Restricted</h1>
                <p className="text-xs sm:text-sm text-slate-500">You don't have administrator authorization to view this section.</p>
            </div>
            <Link to="/" className="btn btn-sm sm:btn-md btn-primary text-white rounded-xl gap-2 font-bold shadow-xs">
                <ArrowLeft size={16} /> Return to Homepage
            </Link>
        </div>
    )
}

export default Forbidden
