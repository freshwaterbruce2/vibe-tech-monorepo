import { formatHHMMSS } from '@/hooks/useTimer'
import { PalletEntry } from '@/types/shipping'
import { Button } from '@vibetech/ui'
import { FileText } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

interface PalletExportProps {
  palletEntries: PalletEntry[]
}

const PalletExport = ({ palletEntries }: PalletExportProps) => {
  const [isExporting, setIsExporting] = useState(false)

  const exportPalletData = () => {
    if (palletEntries.length === 0) {
      toast.error('No pallet data to export')
      return
    }

    setIsExporting(true)

    try {
      const dateStr = new Date().toISOString().split('T')[0]!
      const timeStr = new Date()
        .toISOString()
        .split('T')[1]!
        .split('.')[0]!
        .replace(/:/g, '-')
      const filename = `walmart_dc8980_pallets_${dateStr}_${timeStr}.csv`

      const headers = [
        'ID',
        'Door Number',
        'Pallet Count',
        'Started At',
        'Ended At',
        'Duration (HH:MM:SS)',
        'Timestamp',
        'Date',
        'Time',
      ]

      const rows = palletEntries.map(entry => {
        const date = new Date(entry.timestamp)
        const duration = entry.elapsedTime
          ? formatHHMMSS(entry.elapsedTime)
          : ''

        return [
          entry.id,
          entry.doorNumber || 0,
          entry.count,
          entry.startTime ?? '',
          entry.endTime ?? '',
          duration,
          entry.timestamp,
          date.toLocaleDateString(),
          date.toLocaleTimeString(),
        ]
      })

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(',')),
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const downloadLink = document.createElement('a')
      downloadLink.href = url
      downloadLink.download = filename
      document.body.appendChild(downloadLink)
      downloadLink.click()

      // Clean up
      setTimeout(() => {
        document.body.removeChild(downloadLink)
        URL.revokeObjectURL(url)
        setIsExporting(false)
      }, 100)

      toast.success('CSV export successful!', {
        description: `File saved as ${filename}`,
      })
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export data', {
        description: 'Please try again or contact support',
      })
      setIsExporting(false)
    }
  }

  return (
    <Button
      onClick={exportPalletData}
      disabled={isExporting}
      className={`mt-4 bg-walmart-yellow text-black hover:bg-walmart-yellow/80 transition-all ${
        isExporting ? 'animate-pulse' : ''
      }`}
    >
      <FileText className="mr-2 h-4 w-4" />
      {isExporting ? 'Exporting...' : 'Export Pallet Data'}
    </Button>
  )
}

export default PalletExport
