'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { KnowledgeBase } from '@/types'
import { formatDate } from '@/lib/utils'
import {
  BookOpen,
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'

interface KnowledgeListProps {
  onCreateNew: () => void
  onEdit: (entry: KnowledgeBase) => void
}

interface KnowledgeResponse {
  items: KnowledgeBase[]
  total: number
  page: number
  totalPages: number
}

export function KnowledgeList({ onCreateNew, onEdit }: KnowledgeListProps) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery<KnowledgeResponse>({
    queryKey: ['knowledge', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      })

      if (search) params.append('search', search)

      const response = await fetch(`/api/knowledge?${params}`)
      if (!response.ok) throw new Error('Failed to fetch knowledge base')
      return response.json()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/knowledge/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete entry')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge'] })
    },
    onError: error => {
      console.error('Failed to delete knowledge entry:', error)
      // TODO: Show error toast
    },
  })

  const handleDelete = async (entry: KnowledgeBase) => {
    if (
      window.confirm(
        `Are you sure you want to delete this knowledge base entry?\n\nQuestion: ${entry.question}`
      )
    ) {
      await deleteMutation.mutateAsync(entry.id)
    }
  }

  const getSourceBadge = (source?: string) => {
    switch (source) {
      case 'supervisor':
        return <Badge variant="success">Supervisor</Badge>
      case 'manual':
        return <Badge variant="outline">Manual</Badge>
      case 'import':
        return <Badge variant="secondary">Import</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded w-full"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="mx-auto h-12 w-12 mb-4 text-destructive opacity-50" />
            <p>Failed to load knowledge base</p>
            <p className="text-sm mt-2">Please try refreshing the page</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Knowledge Base</h2>
          <p className="text-muted-foreground">
            Manage questions and answers for the AI voice agent
          </p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Entry
        </Button>
      </div>

      {/* Search and Stats */}
      <div className="flex items-center justify-between space-x-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search questions and answers..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-input rounded-md bg-background text-sm"
            />
          </div>
        </div>

        {data && (
          <div className="text-sm text-muted-foreground">
            {data.total} total entries
          </div>
        )}
      </div>

      {/* Knowledge Entries */}
      {!data?.items.length ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <BookOpen className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No knowledge base entries found</p>
              <p className="text-sm mt-2">
                {search
                  ? 'Try adjusting your search terms'
                  : 'Create your first entry to get started'}
              </p>
              {!search && (
                <Button className="mt-4" onClick={onCreateNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Entry
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.items.map(entry => (
            <Card key={entry.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getSourceBadge(entry.source)}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(new Date(entry.createdAt))}
                      </span>
                    </div>
                    <CardTitle className="text-base line-clamp-2">
                      {entry.question}
                    </CardTitle>
                  </div>

                  <div className="flex items-center space-x-1 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(entry)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(entry)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-sm line-clamp-3">{entry.answer}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {(data.page - 1) * 10 + 1} to{' '}
            {Math.min(data.page * 10, data.total)} of {data.total} entries
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={data.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="flex items-center space-x-1">
              {[...Array(Math.min(5, data.totalPages))].map((_, i) => {
                const pageNum = i + 1
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === data.page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
              disabled={data.page >= data.totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
