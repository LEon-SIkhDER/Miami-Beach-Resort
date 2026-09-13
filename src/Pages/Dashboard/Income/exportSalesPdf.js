import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
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

/**
 * Clean and normalize text: strips zero-width/invisible unicode characters, collapses consecutive spaces, and handles null/empty values.
 */
const cleanText = (val) => {
    if (val === null || val === undefined || val === '') return '—'
    return String(val).replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim() || '—'
}

/**
 * Wrap text by character limit at word boundaries so long names wrap cleanly onto multiple lines.
 */
const wrapTextByCharLimit = (text, maxChars = 18) => {
    if (!text || typeof text !== 'string') return text || '—'
    const clean = text.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim()
    if (clean.length <= maxChars) return clean
    const words = clean.split(' ')
    const lines = []
    let currentLine = ''
    for (const word of words) {
        if (!currentLine) {
            currentLine = word
        } else if ((currentLine + ' ' + word).length <= maxChars) {
            currentLine += ' ' + word
        } else {
            lines.push(currentLine)
            currentLine = word
        }
    }
    if (currentLine) lines.push(currentLine)
    return lines.join('\n')
}

/**
 * Helper to safely load image as Base64 data URL for jsPDF.
 * Resolves to null on error or timeout so PDF generation never fails.
 */
const loadImageDataUrl = (url) => {
    return new Promise((resolve) => {
        if (!url || typeof window === 'undefined') {
            resolve(null)
            return
        }
        const img = new Image()
        img.crossOrigin = 'Anonymous'
        const timeout = setTimeout(() => resolve(null), 1200)

        img.onload = () => {
            clearTimeout(timeout)
            try {
                const canvas = document.createElement('canvas')
                canvas.width = img.naturalWidth || img.width
                canvas.height = img.naturalHeight || img.height
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0)
                resolve({
                    dataUrl: canvas.toDataURL('image/png'),
                    width: canvas.width,
                    height: canvas.height
                })
            } catch {
                resolve(null)
            }
        }
        img.onerror = () => {
            clearTimeout(timeout)
            resolve(null)
        }
        img.src = url
    })
}

/**
 * Export sales report bookings directly to a client-side A4 Landscape PDF.
 * Supports direct 1-click file download or native printing of the exact same PDF.
 */
export const exportSalesToPdf = async ({
    items = [],
    dateRange = {},
    filters = {},
    categoryBreakdown = [],
    totalSales = 0,
    currentUser = null,
    printDirect = false
}) => {
    const safeItems = Array.isArray(items) ? items : []

    if (!safeItems || safeItems.length === 0) {
        toast.error('No booking records to export for the selected filter.')
        return
    }

    try {
        // Initialize A4 Landscape PDF document
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'pt',
            format: 'a4'
        })

        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()
        // Center the 760pt table on the 841.89pt page
        const tableWidth = 760
        const marginX = Math.round((pageWidth - tableWidth) / 2)

        // Load logo if available
        const logoInfo = await loadImageDataUrl(logo)

        // 1. HEADER SECTION (Page 1)
        let headerY = 28

        if (logoInfo?.dataUrl) {
            // Calculate proportional dimensions
            const logoH = 26
            const logoW = (logoInfo.width / logoInfo.height) * logoH
            doc.addImage(logoInfo.dataUrl, 'PNG', marginX, headerY, logoW, logoH)

            // Resort title beside logo
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(15)
            doc.setTextColor(15, 23, 42) // slate-900
            doc.text('MIAMI BEACH RESORT', marginX + logoW + 12, headerY + 14)

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8)
            doc.setTextColor(71, 85, 105) // slate-600
            doc.text(
                "Marine Drive Road, South Kolatoli, Cox's Bazar 4700 | Hotline: +8801341849375 | Email: Info.miamibeachresort@gmail.com",
                marginX + logoW + 12,
                headerY + 25
            )
            headerY += 34
        } else {
            // Fallback centered text header
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(15)
            doc.setTextColor(15, 23, 42)
            doc.text('MIAMI BEACH RESORT', pageWidth / 2, headerY + 12, { align: 'center' })

            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8)
            doc.setTextColor(71, 85, 105)
            doc.text(
                "Marine Drive Road, South Kolatoli, Cox's Bazar 4700 | Hotline: +8801341849375 | Email: Info.miamibeachresort@gmail.com",
                pageWidth / 2,
                headerY + 24,
                { align: 'center' }
            )
            headerY += 32
        }

        // Horizontal divider line
        doc.setDrawColor(203, 213, 225) // slate-300
        doc.setLineWidth(0.75)
        doc.line(marginX, headerY, pageWidth - marginX, headerY)
        headerY += 12

        // Report Title Banner
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(15, 118, 110) // teal-700
        doc.text('SALES & REVENUE TRANSACTIONS REPORT', marginX, headerY)

        // Metadata Subtitle Bar
        const dateRangeDisplay = (() => {
            const { startDate, endDate, activePreset } = dateRange || {}
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

        let totalAdultsSum = 0
        let totalChildrenSum = 0
        let totalGuestsSum = 0
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
            totalPaidSum += itemPaid
            totalDueSum += itemDue
            totalAmountSum += amount

            const refName = cleanText(item.reference || item.bookedBy?.name || item.requestedByRole || 'Direct / Online')
            const rawRoom = item.roomNo ? String(item.roomNo).replace(/^room\s*/i, '').trim() : '—'
            const roomNo = cleanText(rawRoom)
            const rawCategory = item.categoryName || item.room?.category || item.roomCategory || 'Unassigned'
            // Auto-wrap category name onto multiple lines if wider than 18 characters
            const categoryName = wrapTextByCharLimit(cleanText(rawCategory), 18)
            const rawGuest = item.guestName || item.name || '—'
            const guestName = wrapTextByCharLimit(cleanText(rawGuest), 22)
            const guestNumber = cleanText(item.guestPhone || item.phone || item.guestNumber || item.mobile || '—')
            const stayDate = `${formatPdfDate(item.checkIn)} to ${formatPdfDate(item.checkOut)}`
            const guestCounts = `${adults} + ${children}`

            return [
                String(idx + 1),
                item.bookingId || '—',
                categoryName,
                roomNo,
                guestName,
                guestNumber,
                stayDate,
                guestCounts,
                refName,
                itemPaid.toLocaleString(),
                itemDue.toLocaleString(),
                amount.toLocaleString()
            ]
        })

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(71, 85, 105)

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

        let subtitleText = `Date Range: ${dateRangeDisplay}   |   Records: ${safeItems.length} Bookings`
        if (filtersDisplay) {
            subtitleText += `   |   Applied Filters: ${filtersDisplay}`
        }

        const subtitleLines = doc.splitTextToSize(subtitleText, tableWidth)
        doc.text(subtitleLines, marginX, headerY + 12)
        const lineCount = Array.isArray(subtitleLines) ? subtitleLines.length : 1
        headerY += 12 + (lineCount * 10)

        // 2. PRIMARY TRANSACTIONS TABLE (12 Columns: Paid, Due, Total at the end)
        const headers = [[
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
        ]]

        // Unified summary footer: columns 0-6 merged cleanly to eliminate empty gaps, with sums for Paid, Due, and Total
        const footers = [[
            {
                content: `Total Summary (${safeItems.length} ${safeItems.length === 1 ? 'Booking' : 'Bookings'}):`,
                colSpan: 7,
                styles: { halign: 'right', fontStyle: 'bold' }
            },
            {
                content: `${totalAdultsSum} + ${totalChildrenSum} = ${totalGuestsSum}`,
                styles: { halign: 'center', fontStyle: 'bold' }
            },
            {
                content: 'Totals:',
                styles: { halign: 'right', fontStyle: 'bold' }
            },
            {
                content: `BDT ${totalPaidSum.toLocaleString()}`,
                styles: { halign: 'right', fontStyle: 'bold' }
            },
            {
                content: `BDT ${totalDueSum.toLocaleString()}`,
                styles: { halign: 'right', fontStyle: 'bold' }
            },
            {
                content: `BDT ${totalAmountSum.toLocaleString()}`,
                styles: { halign: 'right', fontStyle: 'bold' }
            }
        ]]

        autoTable(doc, {
            startY: headerY,
            tableWidth: tableWidth,
            margin: { left: marginX, right: marginX, top: 36, bottom: 32 },
            head: headers,
            body: rows,
            foot: footers,
            theme: 'grid',
            styles: {
                font: 'helvetica',
                fontSize: 7.5,
                textColor: [15, 23, 42],
                cellPadding: 3.5,
                valign: 'middle',
                overflow: 'linebreak',
                lineColor: [226, 232, 240], // slate-200
                lineWidth: 0.5
            },
            headStyles: {
                fillColor: [15, 118, 110], // Teal-700
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8,
                halign: 'center',
                valign: 'middle',
                cellPadding: 4
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252] // slate-50
            },
            footStyles: {
                fillColor: [241, 245, 249], // slate-100
                textColor: [15, 23, 42],
                fontStyle: 'bold',
                fontSize: 8,
                valign: 'middle',
                cellPadding: 4,
                lineColor: [203, 213, 225],
                lineWidth: 0.75
            },
            columnStyles: {
                0: { cellWidth: 22, halign: 'center' }, // SL
                1: { cellWidth: 62, halign: 'center' }, // Booking ID
                2: { cellWidth: 108, halign: 'left' },  // Category Name (auto-wrapped at word boundaries)
                3: { cellWidth: 36, halign: 'center' }, // Room No
                4: { cellWidth: 90, halign: 'left' },   // Guest Name
                5: { cellWidth: 68, halign: 'center' }, // Guest Number
                6: { cellWidth: 94, halign: 'center' }, // Stay Date
                7: { cellWidth: 50, halign: 'center' }, // Adult + Child
                8: { cellWidth: 70, halign: 'left' },   // Reference By
                9: { cellWidth: 52, halign: 'right' },  // Paid (BDT)
                10: { cellWidth: 52, halign: 'right' }, // Due (BDT)
                11: { cellWidth: 56, halign: 'right' }  // Total (BDT)
            },
            didDrawPage: (data) => {
                // Header on pages 2+
                if (data.pageNumber > 1) {
                    doc.setFont('helvetica', 'bold')
                    doc.setFontSize(8)
                    doc.setTextColor(15, 118, 110)
                    doc.text('MIAMI BEACH RESORT · SALES REPORT', marginX, 22)

                    doc.setFont('helvetica', 'normal')
                    doc.setFontSize(7.5)
                    doc.setTextColor(100, 116, 139)
                    doc.text(dateRangeDisplay, pageWidth - marginX, 22, { align: 'right' })

                    doc.setDrawColor(226, 232, 240)
                    doc.setLineWidth(0.5)
                    doc.line(marginX, 26, pageWidth - marginX, 26)
                }
            }
        })

        // 3. SIGNATURE SECTION ON LAST PAGE
        let sigY = doc.lastAutoTable.finalY + 32
        if (sigY + 45 > pageHeight - 30) {
            doc.addPage()
            sigY = 50
        }

        const sigBoxWidth = 140
        const sigRightX = pageWidth - marginX - sigBoxWidth

        doc.setDrawColor(15, 23, 42)
        doc.setLineWidth(0.75)
        doc.line(sigRightX, sigY, sigRightX + sigBoxWidth, sigY)

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(15, 23, 42)
        doc.text('Printed By', sigRightX + sigBoxWidth / 2, sigY + 10, { align: 'center' })

        const printedByUser = cleanText(currentUser?.displayName || currentUser?.name || currentUser?.email)
        if (printedByUser && printedByUser !== '—') {
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(7.5)
            doc.setTextColor(100, 116, 139)
            doc.text(printedByUser, sigRightX + sigBoxWidth / 2, sigY + 20, { align: 'center' })
        }

        // 4. FOOTER ON EVERY PAGE (Page Numbering & Confidential Notice)
        const totalPages = doc.getNumberOfPages()
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i)
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(7.5)
            doc.setTextColor(148, 163, 184) // slate-400

            doc.text('Miami Beach Resort · Confidential & Proprietary Sales Record', marginX, pageHeight - 16)
            doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginX, pageHeight - 16, { align: 'right' })
        }

        if (printDirect) {
            // Trigger native print of the EXACT same generated PDF
            doc.autoPrint()
            const blobUrl = doc.output('bloburl')
            let printed = false
            try {
                const iframe = document.createElement('iframe')
                iframe.style.position = 'fixed'
                iframe.style.right = '0'
                iframe.style.bottom = '0'
                iframe.style.width = '0'
                iframe.style.height = '0'
                iframe.style.border = '0'
                iframe.src = blobUrl
                document.body.appendChild(iframe)

                iframe.onload = () => {
                    printed = true
                    setTimeout(() => {
                        iframe.contentWindow?.focus()
                        iframe.contentWindow?.print()
                        setTimeout(() => {
                            try {
                                document.body.removeChild(iframe)
                                URL.revokeObjectURL(blobUrl)
                            } catch {
                                // Ignore cleanup error
                            }
                        }, 60000)
                    }, 250)
                }
            } catch (err) {
                console.warn('Iframe print error, falling back to window.open', err)
            }

            // Fallback for environments blocking iframe printing
            setTimeout(() => {
                if (!printed) {
                    const win = window.open(blobUrl, '_blank')
                    if (win) win.focus()
                }
            }, 1200)
        } else {
            // Trigger native 1-click file download
            const dateStamp = format(new Date(), 'yyyy-MM-dd')
            const fileName = `Sales_Report_Miami_Beach_Resort_${dateStamp}.pdf`
            doc.save(fileName)

            toast.success(`Downloaded Sales Report (${safeItems.length} bookings) successfully!`)
        }
    } catch (err) {
        console.error('Failed to export PDF report:', err)
        toast.error('Failed to generate PDF report. Please try again.')
    }
}
