import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

interface ChartWidgetProps {
  title: string
  type: 'line' | 'bar' | 'doughnut',
  data: any; // Chart.js data object
  options?: any; // Chart.js options object
}

const ChartWidget: React.FC<ChartWidgetProps> = ({ title, type, data, options }) => {
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    }
  };

  const renderChart = () => {
    switch (type) {
      case 'line':
        return <Line data={data} options={options || defaultOptions} />
      case 'bar':
        return <Bar data={data} options={options || defaultOptions} />
      case 'doughnut':
        return <Doughnut data={data} options={options || defaultOptions} />
      default:
        return null
    }
  }

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h3>
      <div className="h-64">
        {renderChart()}
      </div>
    </div>
  )
}

export default ChartWidget