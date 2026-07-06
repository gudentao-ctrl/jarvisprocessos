import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReportBlock } from "@/lib/report-types";

function SortableItem({ block, onToggle, onRemove, onEdit }: {
  block: ReportBlock;
  onToggle: () => void;
  onRemove: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border bg-card p-2"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground touch-none" aria-label="Arrastar">
        <GripVertical className="h-4 w-4" />
      </button>
      <button onClick={onEdit} className="flex-1 truncate text-left text-sm font-medium">
        {block.title}
      </button>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{block.type}</span>
      <Button variant="ghost" size="icon" onClick={onToggle} aria-label="Alternar visibilidade">
        {block.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 opacity-50" />}
      </Button>
      <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Remover">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

export function BlockList({
  blocks, onChange, onEdit,
}: {
  blocks: ReportBlock[];
  onChange: (b: ReportBlock[]) => void;
  onEdit: (id: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = blocks.findIndex((b) => b.id === active.id);
    const newIdx = blocks.findIndex((b) => b.id === over.id);
    onChange(arrayMove(blocks, oldIdx, newIdx));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1.5">
          {blocks.map((b) => (
            <SortableItem
              key={b.id}
              block={b}
              onToggle={() => onChange(blocks.map((x) => x.id === b.id ? { ...x, enabled: !x.enabled } : x))}
              onRemove={() => onChange(blocks.filter((x) => x.id !== b.id))}
              onEdit={() => onEdit(b.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
