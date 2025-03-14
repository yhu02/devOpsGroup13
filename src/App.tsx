import { Suspense, lazy } from 'react'
import { Route, BrowserRouter as Router, Routes } from 'react-router'
import SideBar from './components/SideBar'

// Lazy load route components
const NotFound = lazy(() => import('./components/NotFound'))
const About = lazy(() => import('./router/about/About'))
const Home = lazy(() => import('./router/home/Home'))

function App() {
  return (
    <Router>
      <div className="flex">
        <SideBar />
        <main className="flex-1 p-5">
          <Suspense fallback={<div>Loading...</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  )
}

export default App
