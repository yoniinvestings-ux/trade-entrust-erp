import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface DepartmentScoreCardProps {
  name: string;
  score: number;
  icon: LucideIcon;
  alertCount?: number;
  onClick?: () => void;
}

export function DepartmentScoreCard({ name, score, icon: Icon, alertCount = 0, onClick }: DepartmentScoreCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500/10';
    if (score >= 60) return 'bg-yellow-500/10';
    if (score >= 40) return 'bg-orange-500/10';
    return 'bg-red-500/10';
  };

  return (
    <div
      className={cn(
        'relative p-4 rounded-xl border cursor-pointer transition-all hover:scale-105 hover:shadow-lg',
        getScoreBg(score)
      )}
      onClick={onClick}
    >
      {alertCount > 0 && (
        <div className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
          {alertCount > 9 ? '9+' : alertCount}
        </div>
      )}
      <div className="flex items-center gap-3 mb-2">
        <div className={cn('p-2 rounded-lg', getScoreBg(score))}>
          <Icon className={cn('h-5 w-5', getScoreColor(score))} />
        </div>
        <span className="font-medium text-sm">{name}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn('text-3xl font-bold', getScoreColor(score))}>{score}</span>
        <span className="text-sm text-muted-foreground">%</span>
      </div>
      <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all duration-500', {
            'bg-green-500': score >= 80,
            'bg-yellow-500': score >= 60 && score < 80,
            'bg-orange-500': score >= 40 && score < 60,
            'bg-red-500': score < 40,
          })}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
