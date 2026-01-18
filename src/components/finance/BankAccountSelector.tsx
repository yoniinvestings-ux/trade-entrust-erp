import { useBankAccounts } from '@/hooks/useFinance';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2 } from 'lucide-react';

interface BankAccountSelectorProps {
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function BankAccountSelector({
  value,
  onValueChange,
  disabled,
  placeholder = 'Select bank account',
}: BankAccountSelectorProps) {
  const { data: accounts, isLoading } = useBankAccounts();

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || isLoading}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder}>
          {value && accounts?.find(a => a.id === value) && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {accounts.find(a => a.id === value)?.name}
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {accounts?.filter(account => account.id && account.id.trim() !== '').map((account) => (
          <SelectItem key={account.id} value={account.id}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>{account.name}</span>
              </div>
              <span className="text-muted-foreground text-sm">
                {account.currency} {(account.current_balance ?? 0).toLocaleString()}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
