import React, { useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { Printer, Download, X, FileText } from 'lucide-react'
import logo from '../../../assets/logo.png'

const formatPdfDate = (dateVal) => {
    if (!dateVal) return '—'
    try {
        const d = typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)
            ? new Date(`${dateVal}T00:00:00`)
            : new Date(dateVal)
        if (isNaN(d.getTime())) return String(dateVal)
        return format(d, 'dd-MMM-yyyy')
    } catch {
        return String(dateVal)
    }
}

const printStyles = `
@media print {
    @page {
        size: A4 portrait;
        margin: 8mm 8mm 8mm 8mm;
    }
    *, *::before, *::after {
        box-sizing: border-box !important;
    }
    html, body {
        height: auto !important;
        overflow: visible !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
    #root {
        display: none !important;
    }
    body * {
        visibility: hidden !important;
    }
    #printable-sales-report-pdf, #printable-sales-report-pdf * {
        visibility: visible !important;
    }
    #printable-sales-report-pdf {
        position: static !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 auto !important;
        padding: 0 !important;
        background: #ffffff !important;
    }
    table {
        width: 100% !important;
        border-collapse: collapse !important;
        page-break-inside: auto !important;
    }
    tr {
        page-break-inside: avoid !important;
        page-break-after: auto !important;
    }
    thead {
        display: table-header-group !important;
    }
    tfoot {
        display: table-row-group !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
    }
    .signature-section {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
    }
}
`

const SalesReportPdfModal = ({
    isOpen,
    onClose,
    items = [],
    dateRange = {},
    filters = {},
    currentUser = null,
    totalSales = 0,
    directPrint = true
}) => {
    const printContainerRef = useRef(null)

    const handlePrint = () => {
        const prevTitle = document.title
        const dateStamp = format(new Date(), 'yyyy-MM-dd')
        const fileName = `Sales_Report_Miami_Beach_Resort_${dateStamp}`
        document.title = fileName
        window.print()
        setTimeout(() => {
            document.title = prevTitle
        }, 1500)
    }

    const handleSavePdf = () => {
        const prevTitle = document.title
        const dateStamp = format(new Date(), 'yyyy-MM-dd')
        const fileName = `Sales_Report_Miami_Beach_Resort_${dateStamp}`
        document.title = fileName
        window.print()
        setTimeout(() => {
            document.title = prevTitle
        }, 1500)
    }

    useEffect(() => {
        if (!isOpen || !directPrint) return

        const prevTitle = document.title
        const dateStamp = format(new Date(), 'yyyy-MM-dd')
        const fileName = `Sales_Report_Miami_Beach_Resort_${dateStamp}`
        document.title = fileName

        const handleAfterPrint = () => {
            document.title = prevTitle
            onClose?.()
        }

        window.addEventListener('afterprint', handleAfterPrint, { once: true })

        const timer = setTimeout(() => {
            window.print()
        }, 150)

        return () => {
            clearTimeout(timer)
            window.removeEventListener('afterprint', handleAfterPrint)
            document.title = prevTitle
        }
    }, [isOpen, directPrint, onClose])

    if (!isOpen) return null

    // Calculate aggregate summary metrics for the PDF footer
    const safeItems = Array.isArray(items) ? items : []
    const safeDateRange = dateRange || {}

    const totalAdults = safeItems.reduce((sum, item) => sum + Number(item?.adults !== undefined ? item.adults : 1), 0)
    const totalChildren = safeItems.reduce((sum, item) => sum + Number(item?.children !== undefined ? item.children : 0), 0)
    const totalGuests = totalAdults + totalChildren

    // Pre-calculate booking-level totals for accurate multi-room proportional financial allocation
    const bookingTotalsMap = new Map()
    safeItems.forEach(item => {
        const bId = item.bookingId || item._id
        if (bId) {
            const cur = bookingTotalsMap.get(bId) || { totalAmount: 0, items: [] }
            cur.totalAmount += Number(item.amount || 0)
            cur.items.push(item)
            bookingTotalsMap.set(bId, cur)
        }
    })

    let totalPaidSum = 0
    let totalDueSum = 0
    let totalAmountSum = 0

    const processedItems = safeItems.map(item => {
        const amount = Number(item.amount || 0)
        const isCancelled = ["cancel", "cancelled"].includes(item.status)
        let itemPaid = 0
        let itemDue = 0

        if (isCancelled) {
            itemPaid = amount
            itemDue = 0
        } else {
            const bId = item.bookingId || item._id
            const bInfo = bId ? bookingTotalsMap.get(bId) : null
            const bPaid = Number(item.paidAmount !== undefined && item.paidAmount !== null ? item.paidAmount : (item.advanceAmount || 0))

            if (bInfo && bInfo.items.length > 1 && bInfo.totalAmount > 0) {
                const isLastRoom = bInfo.items[bInfo.items.length - 1] === item
                if (!isLastRoom) {
                    const ratio = amount / bInfo.totalAmount
                    itemPaid = Math.round(bPaid * ratio)
                    item._allocatedPaid = itemPaid
                } else {
                    const prevAllocated = bInfo.items.slice(0, -1).reduce((s, it) => s + (it._allocatedPaid || 0), 0)
                    itemPaid = Math.max(0, bPaid - prevAllocated)
                }
                itemPaid = Math.min(amount, itemPaid)
                itemDue = Math.max(0, amount - itemPaid)
            } else {
                itemPaid = Math.min(amount, bPaid)
                itemDue = Math.max(0, amount - itemPaid)
            }
        }

        totalPaidSum += itemPaid
        totalDueSum += itemDue
        totalAmountSum += amount

        return {
            ...item,
            _itemPaid: itemPaid,
            _itemDue: itemDue,
            _itemTotal: amount
        }
    })

    const dateRangeDisplay = (() => {
        const { startDate, endDate, activePreset } = safeDateRange
        if (startDate && endDate) {
            return `${formatPdfDate(startDate)} to ${formatPdfDate(endDate)}`
        } else if (startDate) {
            return `From ${formatPdfDate(startDate)}`
        } else if (endDate) {
            return `Up to ${formatPdfDate(endDate)}`
        } else if (activePreset === 'all') {
            return 'All Time History'
        }
        return 'All Active Records'
    })()

    const generatedAtTime = format(new Date(), 'dd-MMM-yyyy hh:mm a')

    // Determine all active filters applied on this bookings dataset
    const activeFilterParts = []
    const roleVal = filters.role || filters.selectedRole
    const workerVal = filters.worker || filters.selectedWorker
    const categoryVal = filters.category || filters.selectedCategory
    const roomVal = filters.room || filters.selectedRoom
    const guestTypeVal = filters.guestType || filters.selectedGuestType
    const searchVal = (filters.search || '').trim()

    if (roleVal && roleVal !== 'all') {
        activeFilterParts.push(`Role: ${roleVal.toUpperCase()}`)
    }
    if (workerVal && workerVal !== 'all') {
        activeFilterParts.push(`Worker: ${workerVal}`)
    }
    if (categoryVal && categoryVal !== 'all') {
        activeFilterParts.push(`Category: ${categoryVal}`)
    }
    if (roomVal && roomVal !== 'all') {
        activeFilterParts.push(`Room: ${roomVal}`)
    }
    if (guestTypeVal && guestTypeVal !== 'all') {
        activeFilterParts.push(`Guest-Type: ${guestTypeVal}`)
    }
    if (searchVal) {
        activeFilterParts.push(`Search: "${searchVal}"`)
    }

    const filtersDisplay = activeFilterParts.length > 0
        ? activeFilterParts.join(' | ')
        : ''

    const printableDocument = (
        <div
            ref={printContainerRef}
            id="printable-sales-report-pdf"
            className="max-w-[850px] mx-auto space-y-4 print:space-y-3 print:max-w-none print:w-full text-slate-900 font-sans text-xs leading-normal"
        >
            {/* FIRST PAGE CENTERED HEADER */}
            <div className="text-center space-y-1 pb-3 border-b border-slate-300">
                <img
                    src={logo}
                    alt="Miami Beach Resort"
                    className="h-10 mx-auto object-contain mb-1"
                />
                <h1 className="text-base font-extrabold uppercase tracking-wider text-slate-900">
                    MIAMI BEACH RESORT
                </h1>
                <p className="text-xs font-semibold text-slate-700">
                    Email: Info.miamibeachresort@gmail.com
                </p>
                <p className="text-[11px] text-slate-500">
                    Marin Drive Road, South Kolatoli, Cox's Bazar. 4700 | Hotline: +8801341849375, +8801341849376
                </p>

                <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-600 px-1 gap-y-1">
                    <div>
                        <span className="font-bold text-slate-800">Sales Report:</span> {dateRangeDisplay}
                    </div>
                    <div>
                        <span className="font-bold text-slate-800">Total Bookings:</span> {safeItems.length}
                    </div>
                    {filtersDisplay ? (
                        <div>
                            <span className="font-bold text-slate-800">Applied Filters:</span> {filtersDisplay}
                        </div>
                    ) : null}
                    <div>
                        <span className="font-bold text-slate-800">Generated:</span> {generatedAtTime}
                    </div>
                </div>
            </div>

            {/* TRANSACTIONS TABLE */}
            <div className="overflow-x-visible">
                <table className="w-full text-[11px] border border-slate-300 border-collapse table-auto">
                    <thead>
                        <tr className="bg-slate-100 text-slate-800 font-bold uppercase tracking-wider text-[10px] border-b border-slate-300">
                            <th className="py-2 px-2 text-center border-r border-slate-300 w-8">
                                No.
                            </th>
                            <th className="py-2 px-2 text-left border-r border-slate-300 whitespace-nowrap">
                                Booking ID
                            </th>
                            <th className="py-2 px-2 text-center border-r border-slate-300 whitespace-nowrap">
                                Room No
                            </th>
                            <th className="py-2 px-2 text-left border-r border-slate-300 max-w-[130px] break-words">
                                Guest Name
                            </th>
                            <th className="py-2 px-2 text-center border-r border-slate-300 whitespace-nowrap">
                                Stay Date
                            </th>
                            <th className="py-2 px-2 text-center border-r border-slate-300 leading-tight">
                                Adult +<br />Child
                            </th>
                            <th className="py-2 px-2 text-left border-r border-slate-300 max-w-[120px] break-words">
                                Reference By
                            </th>
                            <th className="py-2 px-1.5 text-right border-r border-slate-300 leading-tight whitespace-nowrap">
                                Paid<br />(BDT)
                            </th>
                            <th className="py-2 px-1.5 text-right border-r border-slate-300 leading-tight whitespace-nowrap">
                                Due<br />(BDT)
                            </th>
                            <th className="py-2 px-1.5 text-right leading-tight whitespace-nowrap">
                                Total<br />(BDT)
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {processedItems.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="text-center py-8 text-slate-400 font-medium">
                                    No booking transactions recorded for this period.
                                </td>
                            </tr>
                        ) : (
                            processedItems.map((item, idx) => {
                                const adults = Number(item.adults !== undefined ? item.adults : 1)
                                const children = Number(item.children !== undefined ? item.children : 0)
                                const refName = item.reference || item.bookedBy?.name || item.requestedByRole || 'Direct / Online'
                                const cin = formatPdfDate(item.checkIn)
                                const cout = formatPdfDate(item.checkOut)

                                return (
                                    <tr
                                        key={`${item.bookingId || idx}-${idx}`}
                                        className="border-b border-slate-200 hover:bg-slate-50/50 print:hover:bg-transparent"
                                    >
                                        <td className="py-1.5 px-2 text-center border-r border-slate-200 font-mono text-[10px] text-slate-600">
                                            {idx + 1}
                                        </td>
                                        <td className="py-1.5 px-2 text-left border-r border-slate-200 font-mono font-bold text-slate-800 whitespace-nowrap text-[10.5px]">
                                            {item.bookingId}
                                        </td>
                                        <td className="py-1.5 px-2 text-center border-r border-slate-200 max-w-[110px] break-words leading-tight">
                                            <div className="font-mono font-semibold text-slate-700 whitespace-nowrap">
                                                {item.roomNo ? String(item.roomNo).replace(/^room\s*/i, '').trim() || '—' : '—'}
                                            </div>
                                            {item.categoryName && (
                                                <div className="text-[9px] text-slate-500 font-sans mt-0.5">
                                                    {item.categoryName}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-1.5 px-2 text-left border-r border-slate-200 font-semibold text-slate-900 max-w-[130px] break-words leading-tight">
                                            <div>{item.guestName}</div>
                                            {item.guestPhone && (
                                                <div className="text-[9.5px] font-normal text-slate-500 font-mono">
                                                    {item.guestPhone}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-1.5 px-2 text-center border-r border-slate-200 font-mono text-[10px] leading-tight whitespace-nowrap">
                                            <div>{cin}</div>
                                            <div className="text-slate-400 text-[8.5px] leading-none my-0.5">to</div>
                                            <div>{cout}</div>
                                        </td>
                                        <td className="py-1.5 px-2 text-center border-r border-slate-200 font-mono text-[10.5px] font-semibold text-slate-800">
                                            {adults} + {children}
                                        </td>
                                        <td className="py-1.5 px-2 text-left border-r border-slate-200 text-slate-700 max-w-[120px] break-words leading-tight text-[10px]">
                                            <div className="font-semibold text-slate-900">{refName}</div>
                                        </td>
                                        <td className="py-1.5 px-1.5 text-right font-mono font-bold text-emerald-800 border-r border-slate-200 whitespace-nowrap text-[10.5px]">
                                            ৳{Number(item._itemPaid || 0).toLocaleString()}
                                        </td>
                                        <td className="py-1.5 px-1.5 text-right font-mono font-bold text-orange-700 border-r border-slate-200 whitespace-nowrap text-[10.5px]">
                                            ৳{Number(item._itemDue || 0).toLocaleString()}
                                        </td>
                                        <td className="py-1.5 px-1.5 text-right font-mono font-bold text-slate-950 whitespace-nowrap text-[11px]">
                                            ৳{Number(item._itemTotal || 0).toLocaleString()}
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                    {processedItems.length > 0 && (
                        <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900 text-[10.5px]">
                            <tr className="border-b border-slate-300">
                                <td colSpan={5} className="py-2.5 px-3 text-right uppercase tracking-wider font-extrabold text-slate-800 border-r border-slate-300">
                                    Total Sells Summary ({processedItems.length} Bookings):
                                </td>
                                <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-900 border-r border-slate-300 whitespace-nowrap">
                                    {totalAdults} + {totalChildren} = {totalGuests}
                                </td>
                                <td className="py-2.5 px-2 text-right font-bold text-slate-700 border-r border-slate-300 whitespace-nowrap">
                                    Totals:
                                </td>
                                <td className="py-2.5 px-1.5 text-right font-mono font-extrabold text-emerald-800 border-r border-slate-300 whitespace-nowrap text-[10.5px]">
                                    ৳{totalPaidSum.toLocaleString()}
                                </td>
                                <td className="py-2.5 px-1.5 text-right font-mono font-extrabold text-orange-700 border-r border-slate-300 whitespace-nowrap text-[10.5px]">
                                    ৳{totalDueSum.toLocaleString()}
                                </td>
                                <td className="py-2.5 px-1.5 text-right font-mono font-black text-slate-950 whitespace-nowrap text-[11px]">
                                    ৳{totalAmountSum.toLocaleString()}
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* SIGNATURE SECTION (End of Report Only) */}
            <div className="signature-section pt-12 pb-4 flex justify-end">
                <div className="text-center min-w-[200px]">
                    <div className="border-b border-slate-900 w-full mb-1.5"></div>
                    <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                        Printed By
                    </p>
                </div>
            </div>
        </div>
    )

    // Direct Print Mode: Completely invisible on screen, opens only the browser's native print preview
    if (directPrint) {
        return createPortal(
            <div className="fixed -left-[99999px] top-0 opacity-0 pointer-events-none print:static print:left-0 print:opacity-100 print:pointer-events-auto print:block print:w-full print:h-auto">
                {printableDocument}
                <style dangerouslySetInnerHTML={{ __html: printStyles }} />
            </div>,
            document.body
        )
    }

    // Modal Mode: Shows on-screen preview with Print and Save as PDF buttons
    return createPortal(
        <div 
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose?.()
                }
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:block print:w-full print:h-auto"
        >
            {/* Modal Box */}
            <div 
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[96vh] flex flex-col overflow-hidden print:static print:border-none print:shadow-none print:max-w-none print:max-h-none print:w-full print:h-auto print:rounded-none print:overflow-visible"
            >
                {/* Modal Action Bar (Hidden in Print) */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50/95 shrink-0 print:hidden">
                    <div className="flex items-center gap-2.5">
                        <FileText size={18} className="text-teal-600" />
                        <div>
                            <span className="font-bold text-slate-800 text-sm sm:text-base block">
                                Sales Report A4 PDF Preview
                            </span>
                            <span className="text-xs text-slate-500">
                                {safeItems.length} records · Ready to download or print
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="btn btn-sm bg-[#01966e] hover:bg-[#017c5b] text-white font-bold rounded-xl gap-1.5 shadow-xs border-none cursor-pointer"
                            title="Print report directly"
                        >
                            <Printer size={15} /> Print
                        </button>

                        <button
                            type="button"
                            onClick={handleSavePdf}
                            className="btn btn-sm bg-[#5261d6] hover:bg-[#4351be] text-white font-bold rounded-xl gap-1.5 shadow-xs border-none cursor-pointer"
                            title="Save report as A4 PDF document"
                        >
                            <Download size={15} /> Save as PDF
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-sm btn-ghost btn-circle text-slate-400 hover:text-slate-700 cursor-pointer"
                            title="Close Preview"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Printable A4 Content Container */}
                <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-white print:p-0 print:overflow-visible">
                    {printableDocument}
                </div>
            </div>

            {/* Print Stylesheet for A4 Multi-Page Output */}
            <style dangerouslySetInnerHTML={{ __html: printStyles }} />
        </div>,
        document.body
    )
}

export default SalesReportPdfModal
