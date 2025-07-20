import React, { useCallback } from 'react'
import { Upload, FileText, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'

const FileUpload: React.FC = () => {
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    
    reader.onload = (e) => {
      const data = e.target?.result
      
      if (file.type.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Handle Excel files
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)
        
        console.log('Excel data:', jsonData)
        // Here you would typically send this data to your backend or state management
      } else if (file.type === 'text/csv') {
        // Handle CSV files
        const csvData = data as string
        const lines = csvData.split('\n')
        const headers = lines[0].split(',')
        const rows = lines.slice(1).map(line => {
          const values = line.split(',')
          return headers.reduce((obj, header, index) => {
            obj[header] = values[index]
            return obj
          }, {} as any)
        })
        
        console.log('CSV data:', rows)
      }
    }
    
    if (file.type.includes('spreadsheet') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.readAsBinaryString(file)
    } else {
      reader.readAsText(file)
    }
  }, [])

  return (
    <div className="flex items-center space-x-2">
      <label className="btn-primary cursor-pointer flex items-center space-x-2">
        <Upload className="w-4 h-4" />
        <span>Загрузить данные</span>
        <input
          type="file"
          accept=".csv,.xlsx,.xls,.pdf"
          onChange={handleFileUpload}
          className="hidden"
        />
      </label>
      
      <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
        <FileSpreadsheet className="w-4 h-4" />
        <FileText className="w-4 h-4" />
        <span>CSV, Excel, PDF</span>
      </div>
    </div>
  )
}

export default FileUpload