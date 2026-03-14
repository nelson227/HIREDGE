"use client"

import { Component, type ReactNode } from "react"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex items-center justify-center min-h-[300px] p-8">
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold">Une erreur est survenue</h2>
            <p className="text-muted-foreground">
              Quelque chose s&apos;est mal passé. Veuillez réessayer.
            </p>
            <Button
              variant="outline"
              onClick={() => this.setState({ hasError: false })}
            >
              Réessayer
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
