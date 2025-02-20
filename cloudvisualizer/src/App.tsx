import { Route, BrowserRouter as Router, Routes } from 'react-router'
import NotFound from './components/NotFound'
import SideBar from './components/SideBar'
import About from './router/about/About'
import Home from './router/home/Home'

function App() {
  return (
    <Router>
      <div className="flex">
        <SideBar />

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
