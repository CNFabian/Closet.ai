import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { logoutUser } from '../services/firebase/auth';
import { useNavigate } from 'react-router-dom';
import '../styles/Header.css';
import NotificationBell from './NotificationBell';

const Header = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutUser();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoggingOut(false);
      setShowUserMenu(false);
    }
  };

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  return (
    <header className="app-header">
      <div className="header-content">
        <h1 className="app-title">Pantry Pal</h1>
        
        {currentUser && (
          <div className="header-actions">
            <NotificationBell />
            
            <div className="user-menu-container">
              <button 
                className="user-menu-trigger"
                onClick={toggleUserMenu}
                disabled={loggingOut}
              >
                {/* all your existing user avatar and name code stays exactly the same */}
                <div className="user-avatar">
                  {currentUser.photoURL ? (
                    <img 
                      src={currentUser.photoURL} 
                      alt="User avatar"
                      className="avatar-image"
                    />
                  ) : (
                    <div className="avatar-placeholder">
                      {currentUser.displayName ? 
                        currentUser.displayName.charAt(0).toUpperCase() : 
                        currentUser.email.charAt(0).toUpperCase()
                      }
                    </div>
                  )}
                </div>
                <span className="user-name">
                  {currentUser.displayName || currentUser.email}
                </span>
                <svg 
                  className={`dropdown-arrow ${showUserMenu ? 'open' : ''}`} 
                  viewBox="0 0 24 24"
                >
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
              </button>

              {showUserMenu && (
                <div className="user-menu">
                  {/* all your existing dropdown menu code stays the same */}
                  <div className="user-info">
                    <div className="user-email">{currentUser.email}</div>
                    {currentUser.displayName && (
                      <div className="user-display-name">{currentUser.displayName}</div>
                    )}
                  </div>
                  <hr className="menu-divider" />
                  <button 
                    className="logout-button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                  >
                    {loggingOut ? 'Signing out...' : 'Sign out'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;