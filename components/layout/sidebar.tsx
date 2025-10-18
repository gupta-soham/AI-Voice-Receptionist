'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useQuery } from '@tanstack/react-query'
import {
  MessageSquare,
  BookOpen,
  Settings,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface HelpRequestsData {
  items: Array<{ status: string }>
  total: number
}

export function Sidebar() {
  const pathname = usePathname()

  const { data: requestsData } = useQuery<HelpRequestsData>({
    queryKey: ['help-requests-summary'],
    queryFn: async () => {
      const response = await fetch('/api/help-requests?limit=100')
      if (!response.ok) throw new Error('Failed to fetch requests')
      return response.json()
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  })

  const pendingCount =
    requestsData?.items.filter(r => r.status === 'PENDING').length || 0
  const resolvedCount =
    requestsData?.items.filter(r => r.status === 'RESOLVED').length || 0
  const unresolvedCount =
    requestsData?.items.filter(r => r.status === 'UNRESOLVED').length || 0

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: BarChart3,
      badge: null,
      badgeVariant: 'default' as const,
    },
    // {
    //   name: "Pending Requests",
    //   href: "/dashboard?tab=pending",
    //   icon: Clock,
    //   badge: pendingCount > 0 ? pendingCount : null,
    //   badgeVariant: "warning" as const,
    // },
    // {
    //   name: "Resolved Requests",
    //   href: "/dashboard?tab=resolved",
    //   icon: CheckCircle,
    //   badge: resolvedCount > 0 ? resolvedCount : null,
    //   badgeVariant: "success" as const,
    // },
    // {
    //   name: "Unresolved Requests",
    //   href: "/dashboard?tab=unresolved",
    //   icon: XCircle,
    //   badge: unresolvedCount > 0 ? unresolvedCount : null,
    //   badgeVariant: "destructive" as const,
    // },
    {
      name: 'Knowledge Base',
      href: '/knowledge',
      icon: BookOpen,
      badge: null,
      badgeVariant: 'default' as const,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Settings,
      badge: null,
      badgeVariant: 'default' as const,
    },
  ]

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      <div className="flex-1 overflow-auto py-4">
        <nav className="space-y-1 px-3">
          {navigation.map(item => {
            const isActive =
              pathname === item.href ||
              (item.href.includes('?tab=') && pathname === '/dashboard')

            return (
              <Button
                key={item.name}
                variant={isActive ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start',
                  isActive && 'bg-secondary'
                )}
                asChild
              >
                <Link href={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.name}
                  {item.badge && (
                    <Badge
                      variant={item.badgeVariant || 'default'}
                      className="ml-auto text-xs"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              </Button>
            )
          })}
        </nav>
      </div>

      <div className="border-t p-4">
        <div className="text-xs text-muted-foreground">
          <div>Total Requests: {requestsData?.total || 0}</div>
          <div className="mt-1 flex space-x-4">
            <span className="text-yellow-600">Pending: {pendingCount}</span>
            <span className="text-green-600">Resolved: {resolvedCount}</span>
            <span className="text-red-600">Unresolved: {unresolvedCount}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
