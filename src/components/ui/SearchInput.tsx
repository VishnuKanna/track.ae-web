import type { InputHTMLAttributes } from "react";
import { forwardRef, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/cn";

interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onSearch: (value: string) => void;
  delay?: number;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput({ value, onSearch, delay = 220, className, ...rest }, ref) {
    const [local, setLocal] = useState(value);
    const debounced = useDebounce(local, delay);

    useEffect(() => {
      setLocal(value);
    }, [value]);

    useEffect(() => {
      onSearch(debounced);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debounced]);

    return (
      <div className={cn("search-wrap", className)}>
        {rest["aria-hidden"] === undefined && (
          <span className="search-icon">
            <Search size={16} />
          </span>
        )}
        <input
          ref={ref}
          type="search"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          {...rest}
        />
      </div>
    );
  }
);