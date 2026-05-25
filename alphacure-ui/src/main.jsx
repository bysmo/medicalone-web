import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initKeycloak } from './services/auth'

const root = ReactDOM.createRoot(document.getElementById('root'));

const isPublicPage = window.location.search.includes('public=register') || window.location.hash.includes('register');

if (isPublicPage) {
  root.render(
    <React.StrictMode>
      <App isPublic={true} />
    </React.StrictMode>
  );
} else {
  initKeycloak(() => {
    root.render(
      <React.StrictMode>
        <App isPublic={false} />
      </React.StrictMode>
    );
  });
}
