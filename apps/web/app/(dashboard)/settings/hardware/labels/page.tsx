'use client';

import { useState } from 'react';
import { PageHeader } from '@caratflow/ui';
import { trpc } from '@/lib/trpc';
import type { LabelTemplateResponse, CreateLabelTemplate } from '@caratflow/shared-types';
import { LabelTemplateEditor } from '@/features/hardware/LabelTemplateEditor';
import { LabelPreview } from '@/features/hardware/LabelPreview';
import { Plus, Edit2, Trash2, Eye } from 'lucide-react';

export default function LabelTemplatesPage() {
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LabelTemplateResponse | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<LabelTemplateResponse | null>(null);

  const { data: templates, isLoading, refetch } = trpc.hardware.printer.templates.list.useQuery();

  const createMutation = trpc.hardware.printer.templates.create.useMutation({
    onSuccess: () => {
      setShowEditor(false);
      void refetch();
    },
  });

  const updateMutation = trpc.hardware.printer.templates.update.useMutation({
    onSuccess: () => {
      setEditingTemplate(null);
      setShowEditor(false);
      void refetch();
    },
  });

  const deleteMutation = trpc.hardware.printer.templates.delete.useMutation({
    onSuccess: () => {
      void refetch();
    },
  });

  const handleSave = (template: CreateLabelTemplate) => {
    if (editingTemplate) {
      updateMutation.mutate({ templateId: editingTemplate.id, data: template });
    } else {
      createMutation.mutate(template);
    }
  };

  const handleEdit = (template: LabelTemplateResponse) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleDelete = (templateId: string) => {
    if (window.confirm('Delete this template?')) {
      deleteMutation.mutate({ templateId });
    }
  };

  const handleCancel = () => {
    setShowEditor(false);
    setEditingTemplate(null);
  };

  // Sample product data for preview
  const sampleData: Record<string, string> = {
    sku: 'GR-22K-001',
    productName: 'Gold Ring 22K',
    grossWeight: '8.450g',
    netWeight: '8.200g',
    purity: '22K (916)',
    huid: 'ABCD1234EF',
    price: '45,000',
    barcode: 'GR22K001',
    qrCode: '{"sku":"GR-22K-001","huid":"ABCD1234EF"}',
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Label Templates"
        description="Design and manage label templates for jewelry product tags."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings', href: '/settings' },
          { label: 'Hardware', href: '/settings/hardware' },
          { label: 'Label Templates' },
        ]}
      />

      {/* Editor */}
      {showEditor ? (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
            {editingTemplate ? 'Edit Template' : 'Create New Template'}
          </h2>
          <LabelTemplateEditor
            onSave={handleSave}
            onCancel={handleCancel}
            initialTemplate={editingTemplate ?? undefined}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => setShowEditor(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New Template
            </button>
          </div>

          {/* Template List */}
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading templates...</div>
          ) : !templates?.length ? (
            <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
              No label templates yet. Create one to get started.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template: LabelTemplateResponse) => (
                <div key={template.id} className="rounded-lg border bg-card shadow-sm">
                  <div className="p-4">
                    <h3 className="text-sm font-semibold">{template.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {template.width}mm x {template.height}mm | {template.fields.length} fields
                    </p>

                    {/* Mini Preview */}
                    <div className="mt-3">
                      <LabelPreview
                        preview={{
                          templateId: template.id,
                          templateName: template.name,
                          width: template.width,
                          height: template.height,
                          renderedFields: template.fields.map((f) => ({
                            ...f,
                            resolvedValue: sampleData[f.value.replace(/\{\{|\}\}/g, '')] ?? f.value,
                          })),
                        }}
                        scale={2}
                      />
                    </div>
                  </div>
                  <div className="flex border-t">
                    <button
                      onClick={() => setPreviewTemplate(previewTemplate?.id === template.id ? null : template)}
                      className="flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </button>
                    <button
                      onClick={() => handleEdit(template)}
                      className="flex flex-1 items-center justify-center gap-1.5 border-l py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      disabled={deleteMutation.isPending}
                      className="flex flex-1 items-center justify-center gap-1.5 border-l py-2 text-xs font-medium text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Full Preview Modal */}
          {previewTemplate && (
            <div className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Preview: {previewTemplate.name}</h2>
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="text-sm text-muted-foreground hover:underline"
                >
                  Close
                </button>
              </div>
              <LabelPreview
                preview={{
                  templateId: previewTemplate.id,
                  templateName: previewTemplate.name,
                  width: previewTemplate.width,
                  height: previewTemplate.height,
                  renderedFields: previewTemplate.fields.map((f) => ({
                    ...f,
                    resolvedValue: sampleData[f.value.replace(/\{\{|\}\}/g, '')] ?? f.value,
                  })),
                }}
                scale={4}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
