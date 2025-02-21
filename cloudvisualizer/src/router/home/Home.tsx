import { useEffect, useRef } from 'react'
import { DataSet, Network } from 'vis-network'
import 'vis-network/styles/vis-network.css'
import type { AwsResource, Dependency } from '../../types/AWS'
import { resourceVisuals } from '../../utils/AWSVisuals'

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

  useEffect(() => {
    if (networkRef.current) {
      const resources: AwsResource[] = [
        { id: 'vpc-1', type: 'VPC', name: 'Main VPC' },
        { id: 'rds-1', type: 'RDS', name: 'OrdersDB' },
      ]

      const dependencies: Dependency[] = [
        { from: 'vpc-1', to: 'rds-1', relationship: 'contains' },
      ]

      const nodeData = resources.map((res) => ({
        id: res.id,
        label: res.name,
        shape: resourceVisuals[res.type]?.icon ? 'image' : 'ellipse',
        image: resourceVisuals[res.type]?.icon,
        color: resourceVisuals[res.type]?.color,
      }))

      // Use the local 'GraphEdge' type
      const edgeData: GraphEdge[] = dependencies.map((dep) => ({
        // Optionally assign your own unique ID if you like:
        // id: `${dep.from}-${dep.to}`,
        from: dep.from,
        to: dep.to,
        label: dep.relationship,
        arrows: 'to',
      }))

      const nodes = new DataSet(nodeData) // no problem for nodes
      const edges = new DataSet<GraphEdge>(edgeData) // typed as GraphEdge

      const network = new Network(networkRef.current, { nodes, edges }, {
        autoResize: true,
        physics: { enabled: true },
        layout: { improvedLayout: true },
      })

      network.on('click', (params) => {
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0]
          const resource = resources.find((r) => r.id === nodeId)
          if (resource) {
            console.log('Clicked resource:', resource.name, 'of type', resource.type)
          }
        }
      })
    }
  }, [])

  return (
    <div>
      <h1>Welcome to Cloud Visualizer</h1>
      <div>
        <p>A tool for visualizing cloud infrastructure</p>
        <div ref={networkRef} style={{ height: 600, width: '100%' }} />
      </div>
    </div>
  )
}

export default Home
