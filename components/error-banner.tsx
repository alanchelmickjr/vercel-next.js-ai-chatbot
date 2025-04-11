"use client"

import { AlertCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface ErrorBannerProps {
  message: string
  onDismiss: () => void
  onRetry?: () => void
}

export function ErrorBanner({ message, onDismiss, onRetry }: ErrorBannerProps) {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="size-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{message}</span>
        <div className="flex gap-2">
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            <XCircle className="size-4 mr-1" />
            Dismiss
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}