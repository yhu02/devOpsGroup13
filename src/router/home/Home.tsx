import { useEffect, useRef, useState } from 'react'
import { Network } from 'vis-network'
import { DataSet } from 'vis-data'
import 'vis-network/styles/vis-network.css'
import type { AwsResource, Dependency } from '../../types/AWS'
import { resourceVisuals } from '../../utils/AWSVisuals'
import { createNodeObjects } from '../../aws/cloudwatchapi'

// Define your own type for edges with an optional "id"
interface GraphEdge {
  id?: string
  from: string
  to: string
  label?: string
  arrows?: string
}

function Home() {
  const networkRef = useRef<HTMLDivElement>(null)

  // State for resources and dependencies
  const [resources, setResources] = useState<AwsResource[]>([
    { id: 'vpc-1', type: 'VPC', name: 'Main VPC' },
    { id: 'rds-1', type: 'RDS', name: 'OrdersDB' },
  ])

  const [dependencies, setDependencies] = useState<Dependency[]>([
    { from: 'vpc-1', to: 'rds-1', relationship: 'contains' },
  ])

  // Create network visualization
  useEffect(() => {
    if (networkRef.current) {
      const nodeData = resources.map((res) => ({
        id: res.id,
        label: res.name,
        shape: resourceVisuals[res.type]?.icon ? 'image' : 'ellipse',
        image: resourceVisuals[res.type]?.icon,
        color: resourceVisuals[res.type]?.color,
      }))

      const edgeData: GraphEdge[] = dependencies.map((dep) => ({
        from: dep.from,
        to: dep.to,
        label: dep.relationship,
        arrows: 'to',
      }))

      const nodes = new DataSet(nodeData)
      const edges = new DataSet<GraphEdge>(edgeData)

      const network = new Network(
        networkRef.current,
        { nodes, edges },
        {
          autoResize: true,
          physics: { enabled: true },
          layout: { improvedLayout: true },
        }
      )

      network.on('click', (params) => {
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0]
          const resource = resources.find((r) => r.id === nodeId)
          if (resource) {
            console.log(
              'Clicked resource:',
              resource.name,
              'of type',
              resource.type
            )
          }
        }
      })

      // Return cleanup function
      return () => {
        network.destroy()
      }
    }
  }, [resources, dependencies]) // Re-run when resources or dependencies change

  // Handle button click
  const handleLoadData = async () => {
    try {
      const result = await createNodeObjects()
      if (result.resources && result.dependencies) {
        setResources(result.resources)
        setDependencies(result.dependencies)
      }
    } catch (error) {
      console.error('Error loading AWS data:', error)
    }
  }

  return (
    <div>
      <h1>Welcome to Cloud Visualizer</h1>
      <div>
        <p>A tool for visualizing cloud infrastructure</p>
        <div ref={networkRef} style={{ height: 600, width: '100%' }} />
      </div>
      <button onClick={handleLoadData}>Load VPC Flow Data</button>
    </div>
  )
}

export default Home
