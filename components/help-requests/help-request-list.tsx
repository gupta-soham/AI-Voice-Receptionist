"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { HelpRequest, RequestStatus } from "@/types";
import {
  Clock,
  User,
  Phone,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface HelpRequestListProps {
  status?: RequestStatus;
  onRequestSelect: (request: HelpRequest) => void;
}

interface HelpRequestsResponse {
  items: HelpRequest[];
  total: number;
  page: number;
  totalPages: number;
}

export function HelpRequestList({
  status,
  onRequestSelect,
}: HelpRequestListProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery<HelpRequestsResponse>({
    queryKey: ["help-requests", status, page, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });

      if (status) params.append("status", status);
      if (search) params.append("search", search);

      const response = await fetch(`/api/help-requests?${params}`);
      if (!response.ok) throw new Error("Failed to fetch help requests");
      return response.json();
    },
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });

  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.PENDING:
        return <Badge variant="warning">Pending</Badge>;
      case RequestStatus.RESOLVED:
        return <Badge variant="success">Resolved</Badge>;
      case RequestStatus.UNRESOLVED:
        return <Badge variant="destructive">Unresolved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

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
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>Failed to load help requests</p>
            <p className="text-sm mt-2">Please try refreshing the page</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.items.length) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No help requests found</p>
            <p className="text-sm mt-2">
              {status
                ? `No ${status.toLowerCase()} requests at the moment`
                : "No requests available"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search requests by question, caller, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
          />
        </div>
      </div>

      {/* Request List */}
      <div className="space-y-3">
        {data.items.map((request) => (
          <Card
            key={request.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onRequestSelect(request)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    {getStatusBadge(request.status)}
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(new Date(request.createdAt))}
                    </span>
                  </div>
                  <CardTitle className="text-base line-clamp-2">
                    {request.question}
                  </CardTitle>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center space-x-4">
                  {request.callerId && (
                    <div className="flex items-center space-x-1">
                      <User className="h-3 w-3" />
                      <span>{request.callerId}</span>
                    </div>
                  )}
                  {request.callerPhone && (
                    <div className="flex items-center space-x-1">
                      <Phone className="h-3 w-3" />
                      <span>{request.callerPhone}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(new Date(request.createdAt))}</span>
                </div>
              </div>

              {request.answer && (
                <div className="mt-3 p-3 bg-muted rounded-md">
                  <p className="text-sm line-clamp-2">{request.answer}</p>
                  {request.resolvedBy && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Resolved by {request.resolvedBy}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {(data.page - 1) * 10 + 1} to{" "}
            {Math.min(data.page * 10, data.total)} of {data.total} requests
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={data.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <div className="flex items-center space-x-1">
              {[...Array(Math.min(5, data.totalPages))].map((_, i) => {
                const pageNum = i + 1;
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === data.page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={data.page >= data.totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
