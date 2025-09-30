import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="container min-vh-100 d-flex flex-column align-items-center justify-content-center">
      <div className="text-center">
        <div className="mb-4">
          <a href="https://vite.dev" target="_blank" rel="noopener noreferrer" className="me-3">
            <img src={viteLogo} className="img-fluid" alt="Vite logo" style={{ height: '6em' }} />
          </a>
          <a href="https://react.dev" target="_blank" rel="noopener noreferrer">
            <img src={reactLogo} className="img-fluid" alt="React logo" style={{ height: '6em' }} />
          </a>
        </div>

        <h1 className="display-4 fw-bold mb-4">Vite + React</h1>

        <div className="card shadow-sm mx-auto" style={{ maxWidth: '500px' }}>
          <div className="card-body p-4">
            <button 
              className="btn btn-primary btn-lg mb-3" 
              onClick={() => setCount((count) => count + 1)}
            >
              count is {count}
            </button>
            <p className="mb-0">
              Edit <code className="text-danger">src/App.tsx</code> and save to test HMR
            </p>
          </div>
        </div>

        <p className="text-muted mt-4">
          Click on the Vite and React logos to learn more
        </p>
      </div>
    </div>
  )
}

export default App