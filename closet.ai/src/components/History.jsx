import React, { useState, useEffect } from 'react';
import { getHistory, getHistoryByType, getHistoryByDateRange } from '../services/firebase/firestore';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { auth } from '../services/firebase/config';
import { useAuth } from '../context/AuthContext';
import './History.css';

function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const { currentUser } = useAuth();

  const historyTypes = {
    all: 'All Activities',
    ingredient_added: 'Ingredients Added',
    ingredient_updated: 'Ingredients Updated',
    recipe_generated: 'Recipes Generated',
    recipe_saved: 'Recipes Saved',
    recipe_cooked: 'Recipes Cooked'
  };

  const getCurrentUserId = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.uid;
};

  useEffect(() => {
    if (currentUser) {
      fetchHistory();
    }
  }, [currentUser, filterType]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError('');
      
      let historyData;
      if (filterType === 'all') {
        historyData = await getHistory(100);
      } else {
        historyData = await getHistoryByType(filterType, 50);
      }
      
      setHistory(historyData);
    } catch (error) {
      console.error('Error fetching history:', error);
      setError('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryByDateRange = async () => {
    if (!dateRange.start || !dateRange.end) {
      setError('Please select both start and end dates');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999); // Include the entire end date
      
      const historyData = await getHistoryByDateRange(startDate, endDate);
      setHistory(historyData);
    } catch (error) {
      console.error('Error fetching history by date range:', error);
      setError('Failed to load history for selected dates');
    } finally {
      setLoading(false);
    }
  };

  const clearDateFilter = () => {
    setDateRange({ start: '', end: '' });
    fetchHistory();
  };

  const handleClearAllHistory = async () => {
    if (!confirm('Are you sure you want to delete ALL your activity history? This cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const userId = getCurrentUserId();
      
      // Get all history entries for this user
      const querySnapshot = await getDocs(
        query(
          collection(db, 'history'),
          where('userId', '==', userId)
        )
      );
      
      // Delete all entries in batches
      const batch = writeBatch(db);
      querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      if (querySnapshot.docs.length > 0) {
        await batch.commit();
        setError(`Cleared all ${querySnapshot.docs.length} history entries`);
        // Clear the history state to update the UI immediately
        setHistory([]);
      } else {
        setError('No history entries to clear');
      }
    } catch (error) {
      console.error('Error clearing all history:', error);
      setError('Failed to clear history entries. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'ingredient_added': return '➕';
      case 'ingredient_updated': return '✏️';
      case 'recipe_generated': return '🤖';
      case 'recipe_saved': return '💾';
      case 'recipe_cooked': return '👨‍🍳';
      default: return '📝';
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'ingredient_added': return '#28a745';
      case 'ingredient_updated': return '#ffc107';
      case 'recipe_generated': return '#17a2b8';
      case 'recipe_saved': return '#6f42c1';
      case 'recipe_cooked': return '#fd7e14';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return <div className="loading-spinner">Loading activity history...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!currentUser) {
    return <div className="error-message">Please log in to view your activity history</div>;
  }

  return (
    <div className="history-container">
      <h2>Activity History</h2>
      
      {/* Filters */}
      <div className="history-filters">
        <div className="filter-group">
          <label htmlFor="type-filter">Filter by type:</label>
          <select 
            id="type-filter"
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
          >
            {Object.entries(historyTypes).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Date range:</label>
            <div className="date-range">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                placeholder="Start date"
              />
              <span>to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                placeholder="End date"
              />
              <button onClick={fetchHistoryByDateRange} disabled={!dateRange.start || !dateRange.end}>
                Filter
              </button>
              {(dateRange.start || dateRange.end) && (
                <button onClick={clearDateFilter} className="clear-button">
                  Clear
                </button>
              )}
              <button 
                onClick={handleClearAllHistory} 
                disabled={loading}
                className="cleanup-button"
              >
                Clear All History
              </button>
            </div>
        </div>
      </div>

      {/* History List */}
      <div className="history-list">
        {history.length === 0 ? (
          <div className="no-history">
            <p>No activity history found for the selected criteria.</p>
          </div>
        ) : (
          history.map((entry) => (
            <div key={entry.id} className="history-item">
              <div className="history-icon" style={{ backgroundColor: getActivityColor(entry.type) }}>
                {getActivityIcon(entry.type)}
              </div>
              
              <div className="history-content">
                <div className="history-main">
                  <h4>{entry.action}</h4>
                  <p className="history-description">{entry.description}</p>
                </div>
                
                <div className="history-meta">
                  <span className="history-date">{formatDate(entry.timestamp)}</span>
                  <span className="history-type">{historyTypes[entry.type] || entry.type}</span>
                </div>
                
                {/* Additional details */}
                {entry.details && (
                  <div className="history-details">
                    {entry.type === 'recipe_generated' && entry.details.generatedRecipe && (
                      <div className="recipe-details">
                        <span>Difficulty: {entry.details.generatedRecipe.difficulty}</span>
                        <span>Servings: {entry.details.generatedRecipe.servings}</span>
                      </div>
                    )}
                    
                    {entry.type === 'ingredient_updated' && entry.details.changes && (
                      <div className="change-details">
                        <strong>Changes:</strong> {entry.details.changes.join(', ')}
                      </div>
                    )}
                    
                    {entry.type === 'recipe_cooked' && entry.details.ingredientsUsed && (
                      <div className="ingredients-used">
                        <strong>Ingredients used:</strong> {entry.details.totalIngredients} items
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default History;