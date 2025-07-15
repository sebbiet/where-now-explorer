import { memo } from 'react';
import ThemeToggle from './ThemeToggle';

const PageHeader = memo(() => {
  return (
    <header className="flex justify-end gap-2 mb-8">
      <ThemeToggle />
    </header>
  );
});

PageHeader.displayName = 'PageHeader';

export default PageHeader;
