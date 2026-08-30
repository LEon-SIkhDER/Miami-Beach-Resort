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
import Bookings from "../Pages/Dashboard/Bookings/Bookings"
import BookingDetails from "../Pages/Dashboard/Bookings/BookingDetails"
import RoomDetails from "../Pages/Rooms/RoomDetails"
import Users from "../Pages/Dashboard/Users/Users"
import Forbidden from "../Components/Forbidden"
import Calender from "../Pages/Dashboard/Calender/Calender"
import CategoryAndPricing from "../Pages/Dashboard/Category&Pricing/CategoryAndPricing"
import CategoryRoomDetails from "../Pages/Dashboard/Category&Pricing/CategoryRoomDetails"

export const router = createBrowserRouter([
    {
        path: "/",
        Component: Root,
        errorElement: <ErrorElement />,
        children: [
            { index: true, Component: Home },
            { path: "room/:id", Component: RoomDetails },
            { path: "rooms/:id", Component: RoomDetails },
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
            { path: "bookings/:id", Component: BookingDetails },
            // admin
            { path: "category&room", element: <AdminRoute><CategoryAndPricing /></AdminRoute> },
            { path: "category&room/:id", element: <AdminRoute><CategoryRoomDetails /></AdminRoute> },
            { path: "users", element: <AdminRoute><Users /></AdminRoute> },
            { path: "calender", element: <AdminRoute><Calender /></AdminRoute> },
        ]
    },
    { path: "/forbidden", Component: Forbidden }
])
