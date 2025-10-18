"use client";

import { useEffect } from "react";
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
import { KnowledgeBase } from "@/types";

const knowledgeSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
});

type KnowledgeFormData = z.infer<typeof knowledgeSchema>;

interface KnowledgeFormModalProps {
  entry: KnowledgeBase | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KnowledgeFormModal({
  entry,
  open,
  onOpenChange,
}: KnowledgeFormModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!entry;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<KnowledgeFormData>({
    resolver: zodResolver(knowledgeSchema),
    defaultValues: {
      question: "",
      answer: "",
    },
  });

  // Reset form when entry changes
  useEffect(() => {
    if (entry) {
      reset({
        question: entry.question,
        answer: entry.answer,
      });
    } else {
      reset({
        question: "",
        answer: "",
      });
    }
  }, [entry, reset]);

  const createMutation = useMutation({
    mutationFn: async (data: KnowledgeFormData) => {
      const response = await fetch("/api/knowledge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          source: "manual",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create entry");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      onOpenChange(false);
      reset();
    },
    onError: (error) => {
      console.error("Failed to create knowledge entry:", error);
      // TODO: Show error toast
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: KnowledgeFormData) => {
      if (!entry) throw new Error("No entry to update");

      const response = await fetch(`/api/knowledge/${entry.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update entry");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge"] });
      onOpenChange(false);
      reset();
    },
    onError: (error) => {
      console.error("Failed to update knowledge entry:", error);
      // TODO: Show error toast
    },
  });

  const onSubmit = async (data: KnowledgeFormData) => {
    if (isEditing) {
      await updateMutation.mutateAsync(data);
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? "Edit Knowledge Base Entry"
              : "Add Knowledge Base Entry"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the question and answer for this knowledge base entry."
              : "Add a new question and answer to the knowledge base. This will help the AI respond to similar questions automatically."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">Question *</Label>
            <Textarea
              id="question"
              placeholder="Enter the question that callers might ask..."
              rows={3}
              {...register("question")}
              className={errors.question ? "border-destructive" : ""}
            />
            {errors.question && (
              <p className="text-sm text-destructive">
                {errors.question.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Be specific and include variations of how the question might be
              asked.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="answer">Answer *</Label>
            <Textarea
              id="answer"
              placeholder="Provide a clear, helpful answer..."
              rows={6}
              {...register("answer")}
              className={errors.answer ? "border-destructive" : ""}
            />
            {errors.answer && (
              <p className="text-sm text-destructive">
                {errors.answer.message}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Write a complete, professional response that the AI can read to
              callers.
            </p>
          </div>

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
              {isSubmitting
                ? isEditing
                  ? "Updating..."
                  : "Creating..."
                : isEditing
                  ? "Update Entry"
                  : "Create Entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
