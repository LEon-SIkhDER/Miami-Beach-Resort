import { createBrowserRouter } from "react-router"
import Root from "../Layout/Root"
import Home from "../Pages/Home/Home"
import AuthLayout from "../Layout/AuthLayout"
import Login from "../Pages/Auth/Login"
import Register from "../Pages/Auth/Register"
import ErrorElement from "../Pages/ErrorPage/ErrorElement"
import PrivateRoute from "../PrivateRoute/PrivateRoute"
import AdminRoute from "../PrivateRoute/AdminRoute"
import Dashboard from "../Layout/Dashboard/Dashboard"
import DashboardHome from "../Pages/Dashboard/Home/DashboardHome"
import Rooms from "../Pages/Dashboard/Rooms/Rooms"
import Bookings from "../Pages/Dashboard/Bookings/Bookings"
import Users from "../Pages/Dashboard/Users/Users"
import Forbidden from "../Components/Forbidden"

export const router = createBrowserRouter([
    {
        path: "/",
        Component: Root,
        errorElement: <ErrorElement />,
        children: [
            { index: true, Component: Home },
        ]
    },
    {
        path: "/",
        Component: AuthLayout,
        children: [
            { path: "login", Component: Login },
            { path: "register", Component: Register },
        ]
    },
    {
        path: "/dashboard",
        element: <PrivateRoute><Dashboard /></PrivateRoute>,
        children: [
            { index: true, Component: DashboardHome },
            { path: "bookings", Component: Bookings },
            // admin
            { path: "rooms", element: <AdminRoute><Rooms /></AdminRoute> },
            { path: "users", element: <AdminRoute><Users /></AdminRoute> },
        ]
    },
    { path: "/forbidden", Component: Forbidden }
])
