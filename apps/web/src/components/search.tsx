'use client';

import * as React from 'react';
import { Input } from '@geocap-x/ui';
import { Search as SearchIcon, X } from 'lucide-react';

interface SearchProps {
  onSearch: (value: string) => void;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
}

export const Search: React.FC<SearchProps> = ({
  onSearch,
  placeholder = 'Search...',
  defaultValue = '',
  className,
}) => {
  const [value, setValue] = React.useState(defaultValue);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(value);
    }, 300); // 300ms debounce

    return () => clearTimeout(handler);
  }, [value, onSearch]);

  return (
    <Input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      leftIcon={<SearchIcon className="h-4 w-4 text-slate-500" />}
      rightIcon={
        value ? (
          <button
            onClick={() => setValue('')}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : undefined
      }
      className={className}
    />
  );
};
