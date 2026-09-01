import { Outlet } from 'react-router'
import Header from '../SharedComponents/Header'
import Footer from '../SharedComponents/Footer'

const Root = () => {
    return (
        <div className="min-h-screen flex flex-col bg-base-100">
            <Header />
            <main className="flex-1">
                <Outlet />
            </main>
            <Footer />
        </div>
    )
}

export default Root
