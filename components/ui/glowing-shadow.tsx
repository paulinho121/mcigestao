"use client"

import { type ReactNode } from "react"
import "./glowing-shadow.css"

interface GlowingShadowProps {
  children: ReactNode
  className?: string
}

export function GlowingShadow({ children, className = "" }: GlowingShadowProps) {
  return (
    <div className={`glow-container ${className}`}>
      <span className="glow"></span>
      <div className="glow-content">{children}</div>
    </div>
  )
}
