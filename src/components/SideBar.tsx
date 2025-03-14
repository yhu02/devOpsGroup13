import { Link } from 'react-router'

export default function SideBar() {
  return (
    <nav className="min-h-screen w-[200px] border-r border-gray-200 bg-gray-100 p-5">
      <div className="flex flex-col gap-3">
        <Link to="/" className="text-gray-700 no-underline hover:text-gray-900">
          Home
        </Link>
        <Link
          to="/about"
          className="text-gray-700 no-underline hover:text-gray-900"
        >
          About
        </Link>
        <Link
          to="/health"
          className="text-gray-700 no-underline hover:text-gray-900"
        >
          Health
        </Link>
      </div>
    </nav>
  )
}
