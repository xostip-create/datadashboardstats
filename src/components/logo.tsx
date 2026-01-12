import { cn } from '@/lib/utils';
import { BookMarked } from 'lucide-react';

type LogoProps = {
  className?: string;
};

export function Logo({ className }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <BookMarked className="h-6 w-6 text-primary" />
      <h1 className="text-xl font-bold font-headline tracking-wider">
        RecordBook
      </h1>
    </div>
  );
}
