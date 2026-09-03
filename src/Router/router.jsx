import { createBrowserRouter } from "react-router"
import Root from "../Layout/Root"
import Home from "../Pages/Home/Home"
import About from "../Pages/About/About"
import Services from "../Pages/Services/Services"
import AuthLayout from "../Layout/AuthLayout"
import Login from "../Pages/Auth/Login"
import Register from "../Pages/Auth/Register"
import ErrorElement from "../Pages/ErrorPage/ErrorElement"
import PrivateRoute from "../PrivateRoute/PrivateRoute"
import RoleRoute from "../PrivateRoute/RoleRoute"
import DashboardIndex from "../Pages/Dashboard/Home/DashboardIndex"
import Dashboard from "../Layout/Dashboard/Dashboard"
import DashboardHome from "../Pages/Dashboard/Home/DashboardHome"
import Bookings from "../Pages/Dashboard/Bookings/Bookings"
import BookingDetails from "../Pages/Dashboard/Bookings/BookingDetails"
import CancelledBookings from "../Pages/Dashboard/Bookings/CancelledBookings"
import IncomeAnalytics from "../Pages/Dashboard/Income/IncomeAnalytics"
import RoomDetails from "../Pages/Rooms/RoomDetails"
import Users from "../Pages/Dashboard/Users/Users"
import Forbidden from "../Components/Forbidden"
import Calender from "../Pages/Dashboard/Calender/Calender"
import CategoryAndPricing from "../Pages/Dashboard/Category&Pricing/CategoryAndPricing"
import CategoryRoomDetails from "../Pages/Dashboard/Category&Pricing/CategoryRoomDetails"
import MyBookings from "../Pages/MyBookings/MyBookings"
import WorkerWorkflow from "../Pages/Dashboard/Workflow/WorkerWorkflow"

export const router = createBrowserRouter([
    {
        path: "/",
        Component: Root,
        errorElement: <ErrorElement />,
        children: [
            { index: true, Component: Home },
            { path: "about", Component: About },
            { path: "services", Component: Services },
            { path: "room/:id", Component: RoomDetails },
            { path: "rooms/:id", Component: RoomDetails },
            { path: "my-bookings", element: <PrivateRoute><MyBookings /></PrivateRoute> },
            { path: "my-bookings/:id", element: <PrivateRoute><BookingDetails /></PrivateRoute> },
        ]
    },
    {
        path: "/",
        Component: AuthLayout,
        errorElement: <ErrorElement />,
        children: [
            { path: "login", Component: Login },
            { path: "register", Component: Register },
        ]
    },
    {
        path: "/dashboard",
        element: <PrivateRoute><Dashboard /></PrivateRoute>,
        errorElement: <ErrorElement />,
        children: [
            { index: true, Component: DashboardIndex },
            { path: "overview", Component: DashboardHome },
            { path: "calender", element: <RoleRoute allowedRoles={["admin", "manager", "agent", "b2b"]}><Calender /></RoleRoute> },
            { path: "bookings", Component: Bookings },
            { path: "bookings/:id", Component: BookingDetails },
            { path: "cancellations", element: <RoleRoute allowedRoles={["admin", "manager", "agent"]}><CancelledBookings /></RoleRoute> },
            { path: "income", element: <RoleRoute allowedRoles={["admin", "manager"]}><IncomeAnalytics /></RoleRoute> },
            { path: "category&room", element: <RoleRoute allowedRoles={["admin", "manager"]}><CategoryAndPricing /></RoleRoute> },
            { path: "category&room/:id", element: <RoleRoute allowedRoles={["admin", "manager"]}><CategoryRoomDetails /></RoleRoute> },
            { path: "users", element: <RoleRoute allowedRoles={["admin", "manager"]}><Users /></RoleRoute> },
            { path: "workflow", element: <RoleRoute allowedRoles={["admin", "manager"]}><WorkerWorkflow /></RoleRoute> },
        ]
    },
    { path: "/forbidden", Component: Forbidden }
])
