import { cn } from "@/lib/cn";
import { animalById, type ZooAnimalId } from "@shared/zoo";

export function ZooSticker({
  animalId,
  locked = false,
  className,
}: {
  animalId: ZooAnimalId;
  locked?: boolean;
  className?: string;
}) {
  const animal = animalById(animalId);
  return (
    <span
      className={cn(
        "relative block overflow-hidden rounded-[22px] bg-paper ring-1 ring-line",
        locked && "opacity-40 grayscale",
        className,
      )}
    >
      <img src={`/zoo/${animalId}.jpg`} alt={animal?.name || animalId} className="h-full w-full object-cover" />
    </span>
  );
}
