// src/components/HealthCheck.tsx
import { useEffect, useState } from 'react'

export default function HealthCheck() {
  const [statusCloudWatch, setStatusCloudWatch] =
    useState<string>('Checking...')
  const [statusBackend, setStatusBackend] = useState<string>('Checking...')

  useEffect(() => {
    async function checkHealthBackend() {
      try {
        const response = await fetch(`/api/health`)
        const data = await response.json()

        setStatusBackend(data.status == 'healthy' ? 'Healthy' : 'Unhealthy')
      } catch (error) {
        console.error('Health check failed:', error)
        setStatusBackend('Error')
      }
    }

    checkHealthBackend()

    async function checkHealthCloudWatch() {
      try {
        console.log('Checking AWS health status...')
        const response = await fetch(`/api/aws/health`)
        console.log(response)
        const data = await response.json()
        console.log(data)
        setStatusCloudWatch(data.status == 'healthy' ? 'Healthy' : 'Unhealthy')
      } catch (error) {
        console.error('Health check failed:', error)
        setStatusCloudWatch('Error')
      }
    }

    checkHealthCloudWatch()
  }, [])

  return (
    <div>
      <h1>Service Health Status</h1>
      <div>Backend: {statusBackend}</div>
      <div>CloudWatch: {statusCloudWatch}</div>
    </div>
  )
}
