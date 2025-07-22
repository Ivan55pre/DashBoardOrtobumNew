import React from 'react'

interface ReportSkeletonProps {
  isMobile: boolean
  columnCount: number
  rowCount?: number
  filterCount?: number
}

const ReportSkeleton: React.FC<ReportSkeletonProps> = ({
  isMobile,
  columnCount,
  rowCount = 8,
  filterCount = 1,
}) => {
  if (isMobile) {
    return (
      <div className="card p-0 overflow-hidden animate-pulse">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-3">
            <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-3/5"></div>
            <div className="h-8 w-8 bg-gray-300 dark:bg-gray-700 rounded-md"></div>
          </div>
          <div className="h-9 bg-gray-300 dark:bg-gray-700 rounded-md w-1/3 mb-3"></div>
          <div className="space-y-2">
            {[...Array(filterCount)].map((_, i) => (
              <div key={i} className="h-9 bg-gray-300 dark:bg-gray-700 rounded-md w-full"></div>
            ))}
          </div>
        </div>
        <div className="p-4 space-y-5">
          {[...Array(rowCount)].map((_, i) => (
            <div key={i} className="flex items-start justify-between space-x-4">
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
              <div className="w-1/4 space-y-2">
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded"></div>
                <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-5/6 ml-auto"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-72 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-96"></div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded-lg w-36"></div>
          {[...Array(filterCount)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-300 dark:bg-gray-700 rounded-lg w-48"></div>
          ))}
          <div className="h-10 bg-gray-300 dark:bg-gray-700 rounded-lg w-28"></div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="min-w-full">
          <thead className="bg-gray-50 dark:bg-dark-700">
            <tr>
              {[...Array(columnCount)].map((_, i) => (
                <th key={i} className="px-6 py-4"><div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div></th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-dark-800 divide-y divide-gray-200 dark:divide-gray-700">
            {[...Array(rowCount)].map((_, i) => (
              <tr key={i}>
                {[...Array(columnCount)].map((_, j) => (
                  <td key={j} className="px-6 py-5"><div className="h-5 bg-gray-200 dark:bg-gray-700 rounded"></div></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ReportSkeleton