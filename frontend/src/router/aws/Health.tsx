import { useEffect, useState } from 'react'

import { CloudWatch } from '../../lib/clients/CloudWatch'

function Health() {
  const [isHealthy, setIsHealthy] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const checkHealth = async () => {
    setIsLoading(true)
    const isHealthy = await CloudWatch.checkHealth()
    setIsHealthy(isHealthy)
    setIsLoading(false)
  }

  useEffect(() => {
    checkHealth()
  }, [])

  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">System Health Status</h1>
      {isLoading ? (
        <div className="rounded border border-blue-400 bg-blue-100 px-4 py-3 text-blue-700">
          <p className="font-medium">Checking system health...</p>
        </div>
      ) : (
        <div
          className={`relative rounded border px-4 py-3 ${isHealthy ? 'border-green-400 bg-green-100 text-green-700' : 'border-red-400 bg-red-100 text-red-700'}`}
        >
          <p className="font-medium">
            {isHealthy
              ? 'CloudVisualizer is healthy!'
              : 'CloudVisualizer has issues'}
          </p>
          <p className="mt-2 text-sm">
            {isHealthy
              ? 'All systems are good to go!'
              : 'Some systems are not ready to go'}
          </p>
          <button
            onClick={checkHealth}
            className="mt-3 rounded bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300"
          >
            Check Again
          </button>
        </div>
      )}
    </div>
  )
}

export default Health
