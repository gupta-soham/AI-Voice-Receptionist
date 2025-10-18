"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { HelpRequest } from "@/types";
import { formatDate } from "@/lib/utils";
import { User, Phone, Clock, MessageSquare } from "lucide-react";

const resolveSchema = z.object({
  answer: z.string().min(1, "Answer is required"),
  learn: z.boolean().default(false),
});

type ResolveFormData = z.infer<typeof resolveSchema>;

interface ResolveRequestModalProps {
  request: HelpRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ResolveRequestModal({
  request,
  open,
  onOpenChange,
}: ResolveRequestModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ResolveFormData>({
    resolver: zodResolver(resolveSchema),
    defaultValues: {
      answer: "",
      learn: true,
    },
  });

  const learnValue = watch("learn");

  const resolveMutation = useMutation({
    mutationFn: async (data: ResolveFormData) => {
      if (!request) throw new Error("No request selected");

      const response = await fetch(`/api/help-requests/${request.id}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answer: data.answer,
          resolvedBy: "supervisor_001", // TODO: Get from auth context
          learn: data.learn,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to resolve request");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch help requests
      queryClient.invalidateQueries({ queryKey: ["help-requests"] });
      queryClient.invalidateQueries({ queryKey: ["help-requests-summary"] });

      // Close modal and reset form
      onOpenChange(false);
      reset();
    },
    onError: (error) => {
      console.error("Failed to resolve request:", error);
      // TODO: Show error toast
    },
  });

  const onSubmit = async (data: ResolveFormData) => {
    setIsSubmitting(true);
    try {
      await resolveMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      reset();
    }
  };

  if (!request) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resolve Help Request</DialogTitle>
          <DialogDescription>
            Provide an answer to resolve this help request. You can optionally
            add the answer to the knowledge base for future reference.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Request Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Request Details</h3>
              <Badge variant="warning">Pending</Badge>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">
                  Question
                </Label>
                <p className="text-sm mt-1">{request.question}</p>
              </div>

              <div className="flex items-center space-x-6 text-xs text-muted-foreground">
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
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(new Date(request.createdAt))}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Resolution Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="answer">Answer *</Label>
              <Textarea
                id="answer"
                placeholder="Provide a clear and helpful answer to the caller's question..."
                rows={6}
                {...register("answer")}
                className={errors.answer ? "border-destructive" : ""}
              />
              {errors.answer && (
                <p className="text-sm text-destructive">
                  {errors.answer.message}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="learn"
                checked={learnValue}
                onCheckedChange={(checked) => setValue("learn", !!checked)}
              />
              <Label htmlFor="learn" className="text-sm">
                Add to Knowledge Base
              </Label>
            </div>

            {learnValue && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
                <div className="flex items-start space-x-2">
                  <MessageSquare className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Knowledge Base Update</p>
                    <p className="text-xs mt-1">
                      This question and answer will be added to the knowledge
                      base, allowing the AI to handle similar questions
                      automatically in the future.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[100px]"
              >
                {isSubmitting ? "Resolving..." : "Resolve Request"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
