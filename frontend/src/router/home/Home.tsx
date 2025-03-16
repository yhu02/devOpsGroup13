import { useEffect, useRef, useState } from 'react';
import { DataSet } from 'vis-data';
import { Network } from 'vis-network';
import 'vis-network/styles/vis-network.css';
import { resourceVisuals } from '../../utils/AWSVisuals';
import { GetNetworkSettings } from '../../utils/getNetworkSettings';
import type { AwsResource, Dependency } from '../../../../shared/types/AWS'; // from shared types

// Define your own type for edges with an optional "id"
interface GraphEdge {
  id?: string
  from: string
  to: string
  label?: string
  arrows?: string
}

function Home() {
  const networkRef = useRef<HTMLDivElement>(null);
  // State for resources and dependencies
  const [resources, setResources] = useState<AwsResource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dependencies, setDependencies] = useState<Dependency[]>([]);

  useEffect(() => {
    if (networkRef.current) {
      const nodeData = resources.map((res) => ({
        id: res.id,
        label: res.name,
        shape: resourceVisuals[res.type]?.icon ? 'image' : 'ellipse',
        image: resourceVisuals[res.type]?.icon ?? undefined,
        color: resourceVisuals[res.type]?.color ?? '#ADD8E6',
      }));
      
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
      const network = new Network(networkRef.current, { nodes, edges }, GetNetworkSettings());
      
      network.on('click', (params) => {
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0];
          const resource = resources.find((r) => r.id === nodeId);
          if (resource) {
            console.log('Clicked resource:', resource.name, 'of type', resource.type);
          }
        }
      });
      
      return () => network.destroy();
    }
  }, [resources, dependencies]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      // Call your backend API here to load AWS data
      const res = await fetch('/api/aws/load-resources');
      const data = await res.json();
      // Assuming your API returns an object with resources and dependencies
      setResources(data.resources);
      setDependencies(data.dependencies);
      setIsLoading(false);
    };
    loadData();
  }, []);

  return (
    <div>
      <h1>Welcome to Cloud Visualizer</h1>
      <div>
        <p>A tool for visualizing cloud infrastructure</p>
        {isLoading ? (
          <div className="flex h-96 w-full items-center justify-center">
            <div className="text-xl">Loading cloud resources...</div>
          </div>
        ) : (
          <div ref={networkRef} style={{ height: '100vh', width: '100%' }} />
        )}
      </div>
    </div>
  );
}

export default Home;
