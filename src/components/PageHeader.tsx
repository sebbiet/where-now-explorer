import { memo } from 'react';
import ThemeToggle from './ThemeToggle';
import SettingsPanel from './SettingsPanel';

const PageHeader = memo(() => {
  return (
    <header className="flex justify-end gap-3 mb-8">
      <SettingsPanel />
      <ThemeToggle />
    </header>
  );
});

PageHeader.displayName = 'PageHeader';

export default PageHeader;
