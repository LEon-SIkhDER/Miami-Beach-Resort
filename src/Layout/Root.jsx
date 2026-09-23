import { Outlet } from 'react-router'
import Header from '../SharedComponents/Header'
import Footer from '../SharedComponents/Footer'
import SmoothScroll from '../Components/SmoothScroll'
import FloatingWhatsApp from '../SharedComponents/FloatingWhatsApp'

const Root = () => {
    return (
        <SmoothScroll>
            <div className="min-h-screen flex flex-col bg-base-100 relative">
                <Header />
                <main className="flex-1">
                    <Outlet />
                </main>
                <Footer />
                <FloatingWhatsApp />
            </div>
        </SmoothScroll>
    )
}

export default Root
