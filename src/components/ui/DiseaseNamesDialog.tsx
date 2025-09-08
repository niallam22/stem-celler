import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Disease {
  id: string;
  name: string;
  indication?: string | null;
}

interface DiseaseNamesDialogProps {
  diseases: Disease[];
  buttonText?: string;
  buttonSize?: "default" | "sm" | "lg" | "icon";
  buttonVariant?: "default" | "outline" | "ghost" | "secondary" | "destructive" | "link";
  className?: string;
}

export default function DiseaseNamesDialog({
  diseases,
  buttonText = "See Disease Names",
  buttonSize = "sm",
  buttonVariant = "outline",
  className = "",
}: DiseaseNamesDialogProps) {
  if (diseases.length === 0) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize} className={className}>
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Disease Names</DialogTitle>
          <DialogDescription>
            Full names for disease indication abbreviations
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 mt-4 max-h-96 overflow-y-auto">
          {diseases.map((disease) => (
            <div key={disease.id} className="border-b pb-2">
              <div className="font-medium">
                {disease.indication || disease.id}
              </div>
              <div className="text-sm text-gray-600">{disease.name}</div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}