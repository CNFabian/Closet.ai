import { useState } from 'react';

const TestComponent = () => {
  const [count, setCount] = useState(0);
  
  return (
    <div className="flex flex-col items-center justify-center p-8 m-4 bg-blue-100 border-2 border-blue-500 rounded-lg shadow-md">
      <h1 className="mb-4 text-2xl font-bold text-blue-700">React Component Test</h1>
      <p className="mb-6 text-gray-700">If you can see this styled component, it's successfully connected to your main.jsx!</p>
      
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setCount(count - 1)}
          className="px-4 py-2 font-bold text-white bg-red-500 rounded hover:bg-red-700"
        >
          -
        </button>
        
        <span className="px-4 py-2 text-xl font-bold">{count}</span>
        
        <button 
          onClick={() => setCount(count + 1)}
          className="px-4 py-2 font-bold text-white bg-green-500 rounded hover:bg-green-700"
        >
          +
        </button>
      </div>
      
      <p className="mt-4 text-sm text-gray-600">
        {count === 0 ? "Click the buttons to see state changes!" : 
         count > 0 ? `You've clicked the + button ${count} time${count === 1 ? '' : 's'}` :
         `You've clicked the - button ${Math.abs(count)} time${Math.abs(count) === 1 ? '' : 's'}`}
      </p>
    </div>
  );
};

export default TestComponent;