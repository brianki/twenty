import { ObjectMetadataItem } from '@/object-metadata/types/ObjectMetadataItem';
import { WorkflowTrigger, WorkflowTriggerType } from 'twenty-shared';
import { assertUnreachable } from '@/workflow/utils/assertUnreachable';
import { DATABASE_TRIGGER_TYPES } from '@/workflow/workflow-trigger/constants/DatabaseTriggerTypes';
import { getManualTriggerDefaultSettings } from '@/workflow/workflow-trigger/utils/getManualTriggerDefaultSettings';

export const getTriggerDefaultDefinition = ({
  defaultLabel,
  type,
  activeObjectMetadataItems,
}: {
  defaultLabel: string;
  type: WorkflowTriggerType;
  activeObjectMetadataItems: ObjectMetadataItem[];
}): WorkflowTrigger => {
  if (activeObjectMetadataItems.length === 0) {
    throw new Error(
      'This function need to receive at least one object metadata item to run.',
    );
  }

  switch (type) {
    case 'DATABASE_EVENT': {
      return {
        type,
        settings: {
          eventName: `${activeObjectMetadataItems[0].nameSingular}.${
            DATABASE_TRIGGER_TYPES.find(
              (availableEvent) => availableEvent.defaultLabel === defaultLabel,
            )?.event
          }`,
          outputSchema: {},
        },
      };
    }
    case 'MANUAL': {
      return {
        type,
        settings: getManualTriggerDefaultSettings({
          availability: 'WHEN_RECORD_SELECTED',
          activeObjectMetadataItems,
        }),
      };
    }
    default: {
      return assertUnreachable(type, `Unknown type: ${type}`);
    }
  }
};
