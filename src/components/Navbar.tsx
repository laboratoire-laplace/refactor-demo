import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

function CloseIcon({ className = 'w-6 h-6' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

const Navbar = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <>
      {/* Navbar */}
      <nav className="fixed top-0 z-50 w-full bg-transparent">
        <div className="flex w-full justify-center overflow-hidden">
          <div className="xs:px-4 w-full min-w-[310px] max-w-[100vw] px-0">
            <div className="py-6">
              <div className="flex h-[48px] items-center justify-between">
                {/* Logo - Left Side */}
                <div className="pl-4">
                  <Link to="/" className="flex items-center">
                    <span className="text-lg font-bold tracking-wider text-white">agent.defi.space</span>
                  </Link>
                </div>
                
                {/* Mobile Menu Button */}
                <div className="md:hidden">
                  <button 
                    onClick={() => setIsDrawerOpen(true)} 
                    className="text-white/70 hover:text-white"
                    aria-label="Open menu"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                      />
                    </svg>
                  </button>
                </div>
  
                {/* Desktop Navigation Links - Right Side */}
                <div className="hidden md:flex items-center space-x-8 pr-4">
                  <Link
                    to="/"
                    className={`pt-0.5 text-sm font-medium ${isActive('/') ? 'text-white' : 'text-white/80 hover:text-white'} transition-colors`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/agents/agent-1"
                    className={`pt-0.5 text-sm font-medium ${location.pathname.includes('/agents/') ? 'text-white' : 'text-white/80 hover:text-white'} transition-colors`}
                  >
                    Agents
                  </Link>
                  <Link
                    to="/transactions"
                    className={`pt-0.5 text-sm font-medium ${isActive('/transactions') ? 'text-white' : 'text-white/80 hover:text-white'} transition-colors`}
                  >
                    Transactions
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden">
          <div className="absolute right-0 h-full w-64 bg-[#212020] p-4 shadow-lg">
            <div className="flex justify-between">
              <span className="text-lg font-bold text-white">Menu</span>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="text-white/70 hover:text-white"
                aria-label="Close menu"
              >
                <CloseIcon />
              </button>
            </div>
            <nav className="mt-8 flex flex-col space-y-6">
              <Link
                to="/"
                className={`text-sm font-medium tracking-wider transition-colors ${
                  isActive('/') 
                    ? 'text-white' 
                    : 'text-white/70 hover:text-white'
                }`}
                onClick={() => setIsDrawerOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                to="/agents/agent-1"
                className={`text-sm font-medium tracking-wider transition-colors ${
                  location.pathname.includes('/agents/') 
                    ? 'text-white' 
                    : 'text-white/70 hover:text-white'
                }`}
                onClick={() => setIsDrawerOpen(false)}
              >
                Agents
              </Link>
              <Link
                to="/transactions"
                className={`text-sm font-medium tracking-wider transition-colors ${
                  isActive('/transactions') 
                    ? 'text-white' 
                    : 'text-white/70 hover:text-white'
                }`}
                onClick={() => setIsDrawerOpen(false)}
              >
                Transactions
              </Link>
            </nav>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar; 