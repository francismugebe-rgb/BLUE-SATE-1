import React from 'react';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 to-red-600 flex items-center justify-center text-white p-4">
      <div className="text-center space-y-6 max-w-md w-full bg-white/10 backdrop-blur-md rounded-3xl p-12 shadow-2xl border border-white/20">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-inner">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="currentColor" 
            className="w-14 h-14 text-red-500"
          >
            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Welcome to Heart Connect</h1>
        <p className="text-lg text-white/80 font-medium">
          Your journey to meaningful connections starts here.
        </p>
        <div className="pt-4">
          <div className="h-1 w-20 bg-white/30 mx-auto rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default App;
