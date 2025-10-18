'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HelpRequestList } from '@/components/help-requests/help-request-list'
import { ResolveRequestModal } from '@/components/help-requests/resolve-request-modal'
import { HelpRequest, RequestStatus } from '@/types'

function DashboardContent() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') || 'pending'

  const [selectedRequest, setSelectedRequest] = useState<HelpRequest | null>(
    null
  )
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false)

  const handleRequestSelect = (request: HelpRequest) => {
    setSelectedRequest(request)
    if (request.status === RequestStatus.PENDING) {
      setIsResolveModalOpen(true)
    }
  }

  const handleResolveModalClose = () => {
    setIsResolveModalOpen(false)
    setSelectedRequest(null)
  }

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Supervisor Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage help requests from the AI voice agent
          </p>
        </div>

        <Tabs defaultValue={initialTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">Pending Requests</TabsTrigger>
            <TabsTrigger value="resolved">Resolved Requests</TabsTrigger>
            <TabsTrigger value="unresolved">Unresolved Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">Pending Requests</h2>
              <p className="text-muted-foreground text-sm">
                These requests need your attention. Click on a request to
                provide an answer.
              </p>
            </div>
            <HelpRequestList
              status={RequestStatus.PENDING}
              onRequestSelect={handleRequestSelect}
            />
          </TabsContent>

          <TabsContent value="resolved" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">Resolved Requests</h2>
              <p className="text-muted-foreground text-sm">
                These requests have been successfully resolved and answered.
              </p>
            </div>
            <HelpRequestList
              status={RequestStatus.RESOLVED}
              onRequestSelect={handleRequestSelect}
            />
          </TabsContent>

          <TabsContent value="unresolved" className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">
                Unresolved Requests
              </h2>
              <p className="text-muted-foreground text-sm">
                These requests timed out without being resolved.
              </p>
            </div>
            <HelpRequestList
              status={RequestStatus.UNRESOLVED}
              onRequestSelect={handleRequestSelect}
            />
          </TabsContent>
        </Tabs>
      </div>

      <ResolveRequestModal
        request={selectedRequest}
        open={isResolveModalOpen}
        onOpenChange={handleResolveModalClose}
      />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-6">Loading dashboard...</div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}
