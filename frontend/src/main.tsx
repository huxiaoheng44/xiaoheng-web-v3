import React from 'react';
import ReactDOM from 'react-dom/client';
import { PortfolioScene } from './PortfolioScene';
import './style.css';
import './scene-layout.css';
import './screen-focus.css';
import './content/content.css';
import './ghost-v3.css';
import './scene-motion.css';
import './features/ghost/agent.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><PortfolioScene /></React.StrictMode>);
