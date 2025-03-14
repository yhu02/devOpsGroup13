function Health() {
  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">System Health Status</h1>
      <div className="relative rounded border border-green-400 bg-green-100 px-4 py-3 text-green-700">
        <p className="font-medium">CloudVisualizer is healthy</p>
        <p className="mt-2 text-sm">All systems are operating normally</p>
      </div>
    </div>
  )
}

export default Health
