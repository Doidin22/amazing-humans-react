import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Critical Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#121212] text-white p-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Oops!</h1>
          <p className="text-gray-400 mb-6">Something went wrong attempting to render this page.</p>
          <button 
            onClick={() => window.location.href = '/'} 
            className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-full font-bold transition"
          >
            Return to Home
          </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;