"use client";

import { useState } from "react";
import { KnowledgeList } from "@/components/knowledge/knowledge-list";
import { KnowledgeFormModal } from "@/components/knowledge/knowledge-form-modal";
import { KnowledgeBase } from "@/types";

export default function KnowledgePage() {
  const [selectedEntry, setSelectedEntry] = useState<KnowledgeBase | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleCreateNew = () => {
    setSelectedEntry(null);
    setIsModalOpen(true);
  };

  const handleEdit = (entry: KnowledgeBase) => {
    setSelectedEntry(entry);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedEntry(null);
  };

  return (
    <div className="container mx-auto py-6">
      <KnowledgeList onCreateNew={handleCreateNew} onEdit={handleEdit} />

      <KnowledgeFormModal
        entry={selectedEntry}
        open={isModalOpen}
        onOpenChange={handleModalClose}
      />
    </div>
  );
}
