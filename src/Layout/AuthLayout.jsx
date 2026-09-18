import React, { useEffect } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router'
import { setStatusBarThemeColor } from '../utils/themeColor'

const AuthLayout = () => {
    const { pathname } = useLocation()

    useEffect(() => {
        setStatusBarThemeColor('#031d17', 'black-translucent')
    }, [pathname])

    return (
        <div className="min-h-screen flex items-center justify-center bg-base-200">
            <ScrollRestoration />
            <Outlet />
        </div>
    )
}

export default AuthLayout
