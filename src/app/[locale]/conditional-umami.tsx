'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

export function ConditionalUmami() {
  const [hasConsent, setHasConsent] = useState(false)

  useEffect(() => {
    const checkConsent = () => {
      const consent = localStorage.getItem('CookieConsent')
      if (consent === 'true') {
        setHasConsent(true)
      }
    }

    checkConsent()

    window.addEventListener('storage', checkConsent)
    const interval = setInterval(checkConsent, 1000)

    return () => {
      window.removeEventListener('storage', checkConsent)
      clearInterval(interval)
    }
  }, [])

  if (!hasConsent) return null

  return (
    <Script
      src="https://analytics.pictusweb.com/script.js"
      data-website-id="983a3e98-46bd-4c6f-8848-299d51be9319"
      strategy="afterInteractive"
    />
  )
}
