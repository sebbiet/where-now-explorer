import React from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';

interface ResponsiveSearchProps {
  children: React.ReactNode;
  searchBox: React.ReactNode;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const ResponsiveSearch: React.FC<ResponsiveSearchProps> = ({
  children,
  searchBox,
  isOpen,
  onOpenChange,
}) => {
  const isMobile = useMediaQuery('(max-width: 640px)');

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onOpenChange}>
        <DrawerTrigger asChild>{searchBox}</DrawerTrigger>
        <DrawerContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <div className="p-4">{children}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{searchBox}</PopoverTrigger>
      <PopoverContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        {children}
      </PopoverContent>
    </Popover>
  );
};
