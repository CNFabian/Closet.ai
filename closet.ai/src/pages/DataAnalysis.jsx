import React, { useState } from 'react';
import ClaudeWithFirestore from '../components/ClaudeWithFirestore';


const DataAnalysis = () => {
  const [claudeResponse, setClaudeResponse] = useState(null);
  
  // Example prompt template for analyzing customer feedback
  const feedbackPromptTemplate = {
    format: 'custom',
    text: `You are an expert data analyst. I have collected customer feedback from my application. 
    Please analyze this feedback and provide insights on common themes, sentiment, and suggestions for improvement.
    
    Customer Feedback:
    {{documents}}
    
    Based on this feedback, please provide:
    1. A summary of the main themes
    2. Sentiment analysis (positive/negative ratio)
    3. Top 3 areas for improvement
    4. Top 3 things customers like
    5. Recommendations based on this analysis`
  };
  
  // Example conditions to query only recent feedback
  const lastMonthConditions = [
    {
      field: 'createdAt',
      operator: '>=',
      value: new Date(new Date().setMonth(new Date().getMonth() - 1))
    }
  ];
  
  const handleClaudeResponse = (response) => {
    setClaudeResponse(response);
    // You could save this to Firestore, display it, etc.
  };
  
  return (
    <>
      <h1>Customer Feedback Analysis</h1>
      
      <ClaudeWithFirestore
        collection="customerFeedback"
        conditions={lastMonthConditions}
        promptTemplate={feedbackPromptTemplate}
        onResponse={handleClaudeResponse}
      />
      
      {claudeResponse && (
        <div className="analysis-actions">
          <button>Save Analysis</button>
          <button>Export as PDF</button>
          <button>Share with Team</button>
        </div>
      )}
  </>
  );
};

export default DataAnalysis;