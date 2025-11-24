import { Input } from "@/components/ui/input";

export const SearchBar = () => {
  return (
    <div className="mb-6">
      <label htmlFor="search" className="block text-sm font-medium text-foreground mb-2">
        Search:
      </label>
      <Input
        id="search"
        type="text"
        placeholder="Search by filename, list ID, or affiliate ID..."
        className="w-full"
      />
    </div>
  );
};
