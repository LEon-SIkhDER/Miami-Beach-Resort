import XLSX from 'xlsx-js-style'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

const formatExcelDate = (dateVal) => {
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

// Thin black border applied to all cells (all border around every cell)
const borderAll = {
    top: { style: 'thin', color: { rgb: '000000' } },
    bottom: { style: 'thin', color: { rgb: '000000' } },
    left: { style: 'thin', color: { rgb: '000000' } },
    right: { style: 'thin', color: { rgb: '000000' } }
}

/**
 * Export sales report bookings to Excel (.xlsx) with dedicated individual columns
 * for Category Name, Guest Number, Room No, Stay Dates, and Financial Breakdown.
 * Applies bold headers & footers, and all-around cell borders across all tables.
 */
export const exportSalesToExcel = ({
    items = [],
    dateRange = {},
    categoryBreakdown = [],
    totalSales = 0
}) => {
    const safeItems = Array.isArray(items) ? items : []
    const safeBreakdown = Array.isArray(categoryBreakdown) ? categoryBreakdown : []

    if (!safeItems || safeItems.length === 0) {
        toast.error('No booking records to export for the selected filter.')
        return
    }

    try {
        // 1. Column headers with dedicated individual columns for Paid, Due, and Total at the end
        const headers = [
            'SL',
            'Booking ID',
            'Category Name',
            'Room No',
            'Guest Name',
            'Guest Number',
            'Stay Date',
            'Adult + Child',
            'Reference By',
            'Paid (BDT)',
            'Due (BDT)',
            'Total (BDT)'
        ]

        let totalAdultsSum = 0
        let totalChildrenSum = 0
        let totalGuestsSum = 0
        let totalNightsSum = 0
        let totalPaidSum = 0
        let totalDueSum = 0
        let totalAmountSum = 0

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

        const rows = safeItems.map((item, idx) => {
            const adults = Number(item.adults !== undefined ? item.adults : 1)
            const children = Number(item.children !== undefined ? item.children : 0)
            const totalGuests = adults + children
            const nights = Number(item.nights || 0)
            const amount = Number(item.amount || 0)
            const isCancelled = ["cancel", "cancelled"].includes(item.status)

            // Calculate Paid, Due, and Total for this line item
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
                    // Multi-room booking: distribute paid amount proportionally based on room amount
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
                    // Single-room booking
                    itemPaid = Math.min(amount, bPaid)
                    itemDue = Math.max(0, amount - itemPaid)
                }
            }

            totalAdultsSum += adults
            totalChildrenSum += children
            totalGuestsSum += totalGuests
            totalNightsSum += nights
            totalPaidSum += itemPaid
            totalDueSum += itemDue
            totalAmountSum += amount

            const cleanCell = (v) => String(v || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim()
            const refName = cleanCell(item.reference || item.bookedBy?.name || item.requestedByRole || 'Direct / Online')
            const roomNo = item.roomNo ? cleanCell(String(item.roomNo).replace(/^room\s*/i, '')) || '—' : '—'
            const categoryName = cleanCell(item.categoryName || item.room?.category || item.roomCategory || 'Unassigned')
            const guestName = cleanCell(item.guestName || item.name || '—')
            const guestNumber = cleanCell(item.guestPhone || item.phone || item.guestNumber || item.mobile || '—')
            const stayDate = `${formatExcelDate(item.checkIn)} to ${formatExcelDate(item.checkOut)}`
            const guestCounts = `${adults} + ${children}`

            return [
                idx + 1,
                item.bookingId || '—',
                categoryName,
                roomNo,
                guestName,
                guestNumber,
                stayDate,
                guestCounts,
                refName,
                itemPaid,
                itemDue,
                amount
            ]
        })

        // Summary Total Row at bottom matching 12-column structure with sums for Paid, Due, and Total
        const summaryRow = [
            'Total',
            `${safeItems.length} Bookings`,
            '',
            '',
            '',
            '',
            '',
            `${totalAdultsSum} + ${totalChildrenSum} = ${totalGuestsSum}`,
            'Totals:',
            totalPaidSum,
            totalDueSum,
            totalAmountSum
        ]

        const sheetData = [headers, ...rows, summaryRow]
        const wsBookings = XLSX.utils.aoa_to_sheet(sheetData)

        // Set optimized column widths matching the 12-column layout
        wsBookings['!cols'] = [
            { wch: 6 },  // SL
            { wch: 18 }, // Booking ID
            { wch: 28 }, // Category Name
            { wch: 12 }, // Room No
            { wch: 24 }, // Guest Name
            { wch: 18 }, // Guest Number
            { wch: 28 }, // Stay Date
            { wch: 16 }, // Adult + Child
            { wch: 22 }, // Reference By
            { wch: 16 }, // Paid (BDT)
            { wch: 16 }, // Due (BDT)
            { wch: 18 }  // Total (BDT)
        ]

        // Set row heights for clean visual presentation
        wsBookings['!rows'] = [
            { hpt: 26 }, // Header row
            ...rows.map(() => ({ hpt: 20 })),
            { hpt: 24 }  // Footer summary row
        ]

        // Apply styles to all cells in Bookings sheet:
        // - Header: bold, light slate fill, all border, centered
        // - Data: normal, all border, aligned by type (numbers right-aligned)
        // - Footer: bold, light slate fill, all border, totals formatted
        const bookingsRange = XLSX.utils.decode_range(wsBookings['!ref'])
        for (let R = bookingsRange.s.r; R <= bookingsRange.e.r; ++R) {
            const isHeader = R === bookingsRange.s.r
            const isFooter = R === bookingsRange.e.r

            for (let C = bookingsRange.s.c; C <= bookingsRange.e.c; ++C) {
                const cellAddr = XLSX.utils.encode_cell({ r: R, c: C })
                if (!wsBookings[cellAddr]) {
                    wsBookings[cellAddr] = { t: 's', v: '' }
                }
                const cell = wsBookings[cellAddr]

                if (isHeader) {
                    cell.s = {
                        font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '000000' } },
                        fill: { fgColor: { rgb: 'E2E8F0' } },
                        border: borderAll,
                        alignment: { vertical: 'center', horizontal: 'center', wrapText: true }
                    }
                } else if (isFooter) {
                    cell.s = {
                        font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '000000' } },
                        fill: { fgColor: { rgb: 'F1F5F9' } },
                        border: borderAll,
                        alignment: {
                            vertical: 'center',
                            horizontal: C >= 8 ? 'right' : 'center',
                            wrapText: true
                        }
                    }
                    if (typeof cell.v === 'number') {
                        cell.z = '#,##0'
                    }
                } else {
                    let hAlign = 'left'
                    if (C === 0 || C === 1 || C === 3 || C === 5 || C === 6 || C === 7) {
                        hAlign = 'center'
                    } else if (C >= 9) {
                        hAlign = 'right'
                    }

                    cell.s = {
                        font: { name: 'Calibri', sz: 10, color: { rgb: '000000' } },
                        border: borderAll,
                        alignment: { vertical: 'center', horizontal: hAlign, wrapText: true }
                    }

                    if (typeof cell.v === 'number' && C >= 9) {
                        cell.z = '#,##0'
                    }
                }
            }
        }

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, wsBookings, 'Sales Report')

        // 2. Add Category Breakdown Sheet if category breakdown data is available
        if (safeBreakdown && safeBreakdown.length > 0) {
            const catHeaders = [
                'SL',
                'Suite Category Name',
                'Total Revenue (BDT)',
                'Bookings Count',
                'Nights Sold',
                'Revenue Share (%)'
            ]

            const catRows = safeBreakdown.map((cat, idx) => {
                const rev = Number(cat?.totalRevenue || 0)
                const share = totalSales > 0 ? Number(((rev / totalSales) * 100).toFixed(1)) : 0
                return [
                    idx + 1,
                    cat?.roomName || 'Uncategorized',
                    rev,
                    Number(cat?.bookingCount || 0),
                    Number(cat?.totalNights || 0),
                    `${share}%`
                ]
            })

            const catSummary = [
                'Total',
                `${safeBreakdown.length} Categories`,
                totalAmountSum,
                safeItems.length,
                totalNightsSum,
                '100%'
            ]

            const wsCategories = XLSX.utils.aoa_to_sheet([catHeaders, ...catRows, catSummary])
            wsCategories['!cols'] = [
                { wch: 6 },  // SL
                { wch: 28 }, // Suite Category Name
                { wch: 22 }, // Total Revenue (BDT)
                { wch: 16 }, // Bookings Count
                { wch: 14 }, // Nights Sold
                { wch: 18 }  // Revenue Share (%)
            ]

            wsCategories['!rows'] = [
                { hpt: 26 }, // Header row
                ...catRows.map(() => ({ hpt: 20 })),
                { hpt: 24 }  // Footer summary row
            ]

            // Apply bold header/footer and all-around borders to Category Breakdown sheet
            const catRange = XLSX.utils.decode_range(wsCategories['!ref'])
            for (let R = catRange.s.r; R <= catRange.e.r; ++R) {
                const isHeader = R === catRange.s.r
                const isFooter = R === catRange.e.r

                for (let C = catRange.s.c; C <= catRange.e.c; ++C) {
                    const cellAddr = XLSX.utils.encode_cell({ r: R, c: C })
                    if (!wsCategories[cellAddr]) {
                        wsCategories[cellAddr] = { t: 's', v: '' }
                    }
                    const cell = wsCategories[cellAddr]

                    if (isHeader) {
                        cell.s = {
                            font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '000000' } },
                            fill: { fgColor: { rgb: 'E2E8F0' } },
                            border: borderAll,
                            alignment: { vertical: 'center', horizontal: 'center', wrapText: true }
                        }
                    } else if (isFooter) {
                        cell.s = {
                            font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '000000' } },
                            fill: { fgColor: { rgb: 'F1F5F9' } },
                            border: borderAll,
                            alignment: {
                                vertical: 'center',
                                horizontal: C === 2 ? 'right' : 'center',
                                wrapText: true
                            }
                        }
                        if (typeof cell.v === 'number') {
                            cell.z = '#,##0'
                        }
                    } else {
                        let hAlign = 'center'
                        if (C === 1) {
                            hAlign = 'left'
                        } else if (C === 2) {
                            hAlign = 'right'
                        }

                        cell.s = {
                            font: { name: 'Calibri', sz: 10, color: { rgb: '000000' } },
                            border: borderAll,
                            alignment: { vertical: 'center', horizontal: hAlign, wrapText: true }
                        }

                        if (typeof cell.v === 'number' && C === 2) {
                            cell.z = '#,##0'
                        }
                    }
                }
            }

            XLSX.utils.book_append_sheet(wb, wsCategories, 'Category Breakdown')
        }

        // Trigger native download
        const dateStamp = format(new Date(), 'yyyy-MM-dd')
        const fileName = `Sales_Report_Miami_Beach_Resort_${dateStamp}.xlsx`
        XLSX.writeFile(wb, fileName)

        toast.success(`Exported ${safeItems.length} booking(s) to Excel successfully!`)
    } catch (err) {
        console.error('Failed to export Excel report:', err)
        toast.error('Failed to export Excel report. Please try again.')
    }
}
