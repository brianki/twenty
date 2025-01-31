import { useTheme } from '@emotion/react';

import {
  StyledMenuItemIconCheck,
  StyledMenuItemLeftContent,
} from '../internals/components/StyledMenuItemBase';

import { IconComponent } from '@ui/display/icon/types/IconComponent';
import { Tag } from '@ui/display/tag/components/Tag';
import { ThemeColor } from '@ui/theme';
import { StyledMenuItemSelect } from './MenuItemSelect';

type MenuItemSelectTagProps = {
  selected: boolean;
  isKeySelected?: boolean;
  className?: string;
  onClick?: () => void;
  color: ThemeColor | 'transparent';
  text: string;
  variant?: 'solid' | 'outline';
  LeftIcon?: IconComponent | null;
};

export const MenuItemSelectTag = ({
  color,
  selected,
  isKeySelected,
  className,
  onClick,
  text,
  variant = 'solid',
  LeftIcon,
}: MenuItemSelectTagProps) => {
  const theme = useTheme();
  return (
    <StyledMenuItemSelect
      onClick={onClick}
      className={className}
      selected={selected}
      isKeySelected={isKeySelected}
    >
      <StyledMenuItemLeftContent>
        <Tag
          variant={variant}
          color={color}
          text={text}
          Icon={LeftIcon ?? undefined}
        />
      </StyledMenuItemLeftContent>
      {selected && <StyledMenuItemIconCheck size={theme.icon.size.md} />}
    </StyledMenuItemSelect>
  );
};
