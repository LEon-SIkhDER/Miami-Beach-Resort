import { Outlet } from 'react-router'
import Header from '../SharedComponents/Header'

const Root = () => {
    return (
        <div className="min-h-screen bg-base-100">
            <Header />
            <div>
                <Outlet />
            </div>
        </div>
    )
}

export default Root
