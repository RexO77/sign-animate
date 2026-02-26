import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import PlatformApp from './App.jsx'
import LandingApp from '../signanimate-landing/src/App.jsx'

const PLATFORM_PATH = '/platform'
const LEGACY_PLATFORM_PATH = '/app'

function isPlatformPath(pathname) {
  return (
    pathname === PLATFORM_PATH ||
    pathname.startsWith(`${PLATFORM_PATH}/`) ||
    pathname === LEGACY_PLATFORM_PATH ||
    pathname.startsWith(`${LEGACY_PLATFORM_PATH}/`)
  )
}

function RouterApp() {
  const [showPlatform, setShowPlatform] = useState(() => isPlatformPath(window.location.pathname))

  useEffect(() => {
    const handlePopState = () => {
      setShowPlatform(isPlatformPath(window.location.pathname))
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const openPlatform = () => {
    if (showPlatform) return
    window.history.pushState({}, '', PLATFORM_PATH)
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    setShowPlatform(true)
  }

  return showPlatform ? <PlatformApp /> : <LandingApp onTryForFree={openPlatform} />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterApp />
  </StrictMode>,
)
