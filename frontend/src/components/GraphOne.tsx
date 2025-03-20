import { DataSet } from 'vis-data'
import { Edge, Network, Node } from 'vis-network'

import type { AwsResource, Dependency } from '../../../shared/types/AWS'
import { resourceVisuals } from '../utils/AWSVisuals'

const resources: Array<AwsResource> = [
  { id: 'vpc-1', type: 'VPC', name: 'Main VPC' },
  { id: 'rds-1', type: 'RDS', name: 'OrdersDB' },
]

const dependencies: Array<Dependency> = [
  { from: 'vpc-1', to: 'rds-1', relationship: 'contains' },
]

// Prepare node and edge datasets for Vis Network
const nodeData: Array<Node> = resources.map((res) => {
  const visNode: Node = {
    id: res.id,
    label: res.name,
    // If we have a custom icon for this resource type, use image shape
    shape: resourceVisuals[res.type]?.icon ? 'image' : 'ellipse',
    image: resourceVisuals[res.type]?.icon, // path to the icon if available
    color: resourceVisuals[res.type]?.color, // fallback color if no icon
  }
  return visNode
})

const edgeData: Array<Edge> = dependencies.map((dep) => ({
  from: dep.from,
  to: dep.to,
  label: dep.relationship,
  arrows: 'to', // draw an arrowhead pointing to the 'to' node
}))

// Create DataSet instances (Vis Network uses these for dynamic data handling)
const nodes = new DataSet(nodeData)
const edges = new DataSet(edgeData)

// Initialize the network
const container = document.getElementById('networkGraph')!
const network = new Network(
  container,
  { nodes, edges },
  {
    autoResize: true,
    physics: false, // disable physics for a simpler static layout (optional)
    layout: {
      improvedLayout: true,
    },
    interaction: {
      hover: true,
      zoomView: true,
      dragView: true,
    },
  }
)
network.on('click', (params) => {
  if (params.nodes.length > 0) {
    const nodeId = params.nodes[0]
    // find the resource by id and display details
    const resource = resources.find((r) => r.id === nodeId)
    if (resource) {
      console.log('Clicked resource:', resource.name, 'of type', resource.type)
      // In a real app, show a popup or side panel with resource details
    }
  }
})
