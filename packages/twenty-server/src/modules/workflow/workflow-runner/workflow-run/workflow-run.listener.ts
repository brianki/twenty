import { Inject, Injectable } from '@nestjs/common';

import { PubSub } from 'graphql-subscriptions';

import { OnDatabaseBatchEvent } from 'src/engine/api/graphql/graphql-query-runner/decorators/on-database-batch-event.decorator';
import { DatabaseEventAction } from 'src/engine/api/graphql/graphql-query-runner/enums/database-event-action';
import { WorkspaceEventBatch } from 'src/engine/workspace-event-emitter/types/workspace-event.type';
import { ObjectRecordCreateEvent } from 'src/engine/core-modules/event-emitter/types/object-record-create.event';
import { WorkflowRunWorkspaceEntity } from 'src/modules/workflow/common/standard-objects/workflow-run.workspace-entity';

@Injectable()
export class WorkflowRunListener {
  constructor(@Inject('PUB_SUB') private readonly pubSub: PubSub) {}

  @OnDatabaseBatchEvent('workflowRun', DatabaseEventAction.UPDATED)
  async handleWorkflowRunUpdated(
    batchEvent: WorkspaceEventBatch<
      ObjectRecordCreateEvent<WorkflowRunWorkspaceEntity>
    >,
  ): Promise<void> {
    for (const eventPayload of batchEvent.events) {
      await this.pubSub.publish('workflowRunUpdated', {
        payload: eventPayload.properties.after,
      });
    }
  }
}
