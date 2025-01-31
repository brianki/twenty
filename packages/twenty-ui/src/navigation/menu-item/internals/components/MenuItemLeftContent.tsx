import { useTheme } from '@emotion/react';
import { isString } from '@sniptt/guards';
import { ReactNode } from 'react';

import styled from '@emotion/styled';

import { IconGripVertical } from '@tabler/icons-react';
import { IconComponent } from '@ui/display/icon/types/IconComponent';
import { OverflowingTextWithTooltip } from '@ui/display/tooltip/OverflowingTextWithTooltip';
import {
  StyledDraggableItem,
  StyledMenuItemLabel,
  StyledMenuItemLeftContent,
} from './StyledMenuItemBase';

const StyledMainText = styled.div`
  flex-shrink: 0;
`;

const StyledContextualText = styled.div`
  color: ${({ theme }) => theme.font.color.light};
  font-family: inherit;

  font-size: inherit;
  font-weight: inherit;
  max-width: 100%;
  overflow: hidden;

  text-decoration: inherit;
  text-overflow: ellipsis;

  white-space: nowrap;

  padding-left: ${({ theme }) => theme.spacing(1)};
  flex-shrink: 1;
`;

type MenuItemLeftContentProps = {
  className?: string;
  LeftIcon: IconComponent | null | undefined;
  showGrip?: boolean;
  disabled?: boolean;
  text: ReactNode;
  contextualText?: ReactNode;
};

export const MenuItemLeftContent = ({
  className,
  LeftIcon,
  text,
  contextualText,
  showGrip = false,
  disabled = false,
}: MenuItemLeftContentProps) => {
  const theme = useTheme();

  return (
    <StyledMenuItemLeftContent className={className}>
      {showGrip && (
        <StyledDraggableItem>
          <IconGripVertical
            size={theme.icon.size.md}
            stroke={theme.icon.stroke.sm}
            color={
              disabled ? theme.font.color.extraLight : theme.font.color.light
            }
          />
        </StyledDraggableItem>
      )}
      {LeftIcon && (
        <LeftIcon size={theme.icon.size.md} stroke={theme.icon.stroke.sm} />
      )}
      <StyledMenuItemLabel>
        {isString(text) ? (
          <StyledMainText>
            <OverflowingTextWithTooltip text={text} />
          </StyledMainText>
        ) : (
          text
        )}
        {isString(contextualText) ? (
          <StyledContextualText>{`· ${contextualText}`}</StyledContextualText>
        ) : (
          contextualText
        )}
      </StyledMenuItemLabel>
    </StyledMenuItemLeftContent>
  );
};
