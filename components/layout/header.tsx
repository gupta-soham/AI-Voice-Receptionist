'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { Phone, Settings, Activity } from 'lucide-react'
import Link from 'next/link'

interface HealthData {
  status: string
  statistics: {
    pendingRequests: number
    totalRequests: number
  }
  backgroundJobs: {
    running: boolean
  }
}

export function Header() {
  const { data: healthData } = useQuery<HealthData>({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await fetch('/api/health')
      if (!response.ok) throw new Error('Failed to fetch health data')
      return response.json()
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Phone className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold">AI Voice Receptionist</h1>
          </div>

          {healthData && (
            <div className="flex items-center space-x-2">
              <Badge
                variant={
                  healthData.status === 'healthy' ? 'success' : 'destructive'
                }
                className="text-xs"
              >
                <Activity className="mr-1 h-3 w-3" />
                {healthData.status}
              </Badge>

              {healthData.statistics.pendingRequests > 0 && (
                <Badge variant="warning" className="text-xs">
                  {healthData.statistics.pendingRequests} pending
                </Badge>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-sm text-muted-foreground">
            {healthData && (
              <span>{healthData.statistics.totalRequests} total requests</span>
            )}
          </div>

          <Button variant="ghost" size="icon" asChild>
            <Link href="/settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
