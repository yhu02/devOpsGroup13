import { useEffect, useRef, useState } from 'react'
import { DataSet } from 'vis-data'
import { Network } from 'vis-network'
import 'vis-network/styles/vis-network.css'
import type { AwsResource, Dependency } from '../../types/AWS'
import { resourceVisuals } from '../../utils/AWSVisuals'
import { getVPCFlowLogs } from '../../aws/cloudwatchapi'

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
    { id: 'vpc-2', type: 'VPC', name: 'Secondary VPC' },
    { id: 'rds-1', type: 'RDS', name: 'OrdersDB' },
    { id: 'rds-2', type: 'RDS', name: 'AnalyticsDB' },
    { id: 'ec2-1', type: 'EC2', name: 'Web Server' },
    { id: 'ec2-2', type: 'EC2', name: 'API Server' },
    { id: 'ec2-3', type: 'EC2', name: 'Worker Node' },
  ])

  const [dependencies, setDependencies] = useState<Dependency[]>([
    { from: 'vpc-1', to: 'rds-1', relationship: 'contains' },
    { from: 'vpc-1', to: 'ec2-1', relationship: 'contains' },
    { from: 'vpc-1', to: 'ec2-2', relationship: 'contains' },
    { from: 'vpc-2', to: 'rds-2', relationship: 'contains' },
    { from: 'vpc-2', to: 'ec2-3', relationship: 'contains' },
    { from: 'ec2-1', to: 'rds-1', relationship: 'connects' },
    { from: 'ec2-2', to: 'rds-1', relationship: 'connects' },
    { from: 'ec2-2', to: 'rds-2', relationship: 'connects' },
    { from: 'ec2-3', to: 'rds-2', relationship: 'connects' },
    { from: 'ec2-1', to: 'ec2-2', relationship: 'communicates' },
    { from: 'ec2-2', to: 'ec2-3', relationship: 'communicates' },
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

      const network = new Network(
        networkRef.current,
        { nodes, edges },
        {
          autoResize: true,
          width: '100%',
          height: '100%',
          locale: 'en',
          locales: undefined,
          clickToUse: false,
          configure: {
            enabled: true,
            filter: true,
            container: undefined,
            showButton: true,
          },
          edges: {
            arrows: {
              to: { enabled: true, type: 'arrow', scaleFactor: 1 },
              from: { enabled: false },
              middle: { enabled: false },
            },
            color: {
              color: '#848484',
              highlight: '#848484',
              hover: '#848484',
              inherit: false,
              opacity: 1.0,
            },
            smooth: {
              enabled: false,
              type: 'straightCross',
              roundness: 0,
            },
            width: 1,
            selectionWidth: 1,
            hoverWidth: 1.5,
            shadow: false,
            font: { size: 12, face: 'arial', color: '#ff0000' },
            scaling: {
              label: true,
            },
          },
          nodes: {
            borderWidth: 1,
            borderWidthSelected: 2,
            shape: 'dot',
            image: undefined,
            brokenImage: undefined,
            color: {
              border: '#3366CC',
              background: '#99CCFF',
              highlight: { border: '#2B50AA', background: '#AAD4FF' },
              hover: { border: '#2B50AA', background: '#D2E5FF' },
            },
            font: {
              face: 'arial',
              color: '#343434',
              size: 14,
              background: 'none',
              strokeWidth: 0,
              strokeColor: '#ffffff',
            },
            icon: {
              face: 'FontAwesome',
              code: undefined,
              size: 50,
              color: '#2B7CE9',
            },
            shapeProperties: {
              useImageSize: false,
              useBorderWithImage: true,
              interpolation: false,
              coordinateOrigin: 'center',
            },
          },
          groups: {
            useDefaultGroups: true,
            myGroup: { color: { background: 'red' }, borderWidth: 3 },
          },
          layout: {
            randomSeed: undefined,
            improvedLayout: true,
            clusterThreshold: 150,
            hierarchical: {
              enabled: true,
              direction: 'UD',
              sortMethod: 'directed',
              levelSeparation: 150,
              nodeSpacing: 250,
              treeSpacing: 300,
              blockShifting: true,
              edgeMinimization: true,
              parentCentralization: true,
            },
          },
          interaction: {
            dragNodes: true,
            dragView: true,
            hideEdgesOnDrag: false,
            hideEdgesOnZoom: false,
            hideNodesOnDrag: false,
            hover: true,
            hoverConnectedEdges: true,
            keyboard: {
              enabled: false,
              speed: { x: 10, y: 10, zoom: 0.02 },
              bindToWindow: true,
            },
            multiselect: false,
            navigationButtons: true,
            selectable: true,
            selectConnectedEdges: true,
            tooltipDelay: 300,
            zoomSpeed: 1,
            zoomView: true,
          },
          manipulation: {
            enabled: false,
            initiallyActive: false,
            addNode: true,
            addEdge: true,
            editNode: undefined,
            editEdge: true,
            deleteNode: true,
            deleteEdge: true,
            controlNodeStyle: {},
          },
          physics: {
            enabled: true,
            solver: 'hierarchicalRepulsion',
            hierarchicalRepulsion: {
              centralGravity: 0.0,
              springLength: 100,
              springConstant: 0.01,
              nodeDistance: 200,
            },
            stabilization: {
              enabled: true,
              iterations: 200,
              updateInterval: 25,
              fit: true,
            },
            minVelocity: 0.75,
          },
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
      const result = await getVPCFlowLogs()
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
        <button
          onClick={handleLoadData}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          Load VPC flow log
        </button>
        <div ref={networkRef} style={{ height: '100vh', width: '100%' }} />
      </div>
    </div>
  )
}

export default Home
