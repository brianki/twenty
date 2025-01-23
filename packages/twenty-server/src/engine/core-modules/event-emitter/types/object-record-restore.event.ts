import { ObjectRecordBaseEvent } from 'src/engine/core-modules/event-emitter/types/object-record.base.event';

export class ObjectRecordRestoreEvent<
  T = object,
> extends ObjectRecordBaseEvent<T> {
  properties: {
    after: T;
  };
}
