import { Link, useLocation } from 'react-router-dom'

function Header() {
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <header className="bg-deep-blue border-b border-soft-blue/20">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link 
          to="/" 
          className="text-2xl font-inter font-bold text-accent-mint hover:scale-[1.06] hover:-translate-y-0.5 transition-all duration-200 ease-out"
          style={{
            textShadow: '0 0 20px rgba(174, 234, 255, 0.5)'
          }}
        >
          JH Pics
        </Link>
        <nav className="flex gap-4">
          <Link
            to="/"
            className={`px-4 py-2 rounded-full transition-all duration-200 ${
              isActive('/')
                ? 'bg-neoblue/50 text-white'
                : 'text-soft-blue hover:bg-neoblue/30 hover:text-white'
            }`}
          >
            Home
          </Link>
          <Link
            to="/upload"
            className={`px-4 py-2 rounded-full transition-all duration-200 ${
              isActive('/upload')
                ? 'bg-neoblue/50 text-white'
                : 'text-soft-blue hover:bg-neoblue/30 hover:text-white'
            }`}
          >
            사진편집
          </Link>
          <Link
            to="/projects"
            className={`px-4 py-2 rounded-full transition-all duration-200 ${
              isActive('/projects')
                ? 'bg-neoblue/50 text-white'
                : 'text-soft-blue hover:bg-neoblue/30 hover:text-white'
            }`}
          >
            사업리스트
          </Link>
        </nav>
      </div>
    </header>
  )
}

export default Header

