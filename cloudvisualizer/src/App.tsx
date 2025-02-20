import { Link, Route, BrowserRouter as Router, Routes } from 'react-router'

function Home() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Welcome to Cloud Visualizer</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-700">
          A tool for visualizing cloud infrastructure
        </p>
      </div>
    </div>
  )
}

function About() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">About</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-700">
          Cloud Visualizer helps you understand and manage your cloud resources
        </p>
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">404: Page Not Found</h1>
      <p className="text-gray-700">The page you're looking for doesn't exist.</p>
    </div>
  )
}

function App() {
  return (
    <Router>
      <div className="flex">
        <nav className="w-[200px] min-h-screen p-5 bg-gray-100 border-r border-gray-200">
          <div className="flex flex-col gap-3">
            <Link to="/" className="text-gray-700 hover:text-gray-900 no-underline">Home</Link>
            <Link to="/about" className="text-gray-700 hover:text-gray-900 no-underline">About</Link>
          </div>
        </nav>

        <main className="flex-1 p-5">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
