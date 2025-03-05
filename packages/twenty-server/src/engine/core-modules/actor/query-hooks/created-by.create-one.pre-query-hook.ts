import { InjectRepository } from '@nestjs/typeorm';

import { isDefined } from 'class-validator';
import { Repository } from 'typeorm';

import { WorkspaceQueryHookInstance } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/interfaces/workspace-query-hook.interface';
import { CreateOneResolverArgs } from 'src/engine/api/graphql/workspace-resolver-builder/interfaces/workspace-resolvers-builder.interface';

import {
  GraphqlQueryRunnerException,
  GraphqlQueryRunnerExceptionCode,
} from 'src/engine/api/graphql/graphql-query-runner/errors/graphql-query-runner.exception';
import { WorkspaceQueryHook } from 'src/engine/api/graphql/workspace-query-runner/workspace-query-hook/decorators/workspace-query-hook.decorator';
import { CreatedByFromAuthContextService } from 'src/engine/core-modules/actor/services/created-by-from-auth-context.service';
import { AuthContext } from 'src/engine/core-modules/auth/types/auth-context.type';
import { FieldMetadataEntity } from 'src/engine/metadata-modules/field-metadata/field-metadata.entity';
import { CustomWorkspaceEntity } from 'src/engine/twenty-orm/custom.workspace-entity';

type CustomWorkspaceItem = Omit<
  CustomWorkspaceEntity,
  'createdAt' | 'updatedAt'
> & {
  createdAt: string;
  updatedAt: string;
};

@WorkspaceQueryHook(`*.createOne`)
export class CreatedByCreateOnePreQueryHook
  implements WorkspaceQueryHookInstance
{
  constructor(
    @InjectRepository(FieldMetadataEntity, 'metadata')
    private readonly fieldMetadataRepository: Repository<FieldMetadataEntity>,
    private readonly createdByFromAuthContextService: CreatedByFromAuthContextService,
  ) {}

  async execute(
    authContext: AuthContext,
    objectName: string,
    payload: CreateOneResolverArgs<CustomWorkspaceItem>,
  ): Promise<CreateOneResolverArgs<CustomWorkspaceItem>> {
    if (!isDefined(payload.data)) {
      throw new GraphqlQueryRunnerException(
        'Payload data is required',
        GraphqlQueryRunnerExceptionCode.INVALID_QUERY_INPUT,
      );
    }

    // TODO: Once all objects have it, we can remove this check
    const createdByFieldMetadata = await this.fieldMetadataRepository.findOne({
      where: {
        object: {
          nameSingular: objectName,
        },
        name: 'createdBy',
        workspaceId: authContext.workspace.id,
      },
    });

    if (!createdByFieldMetadata) {
      return payload;
    }

    const createdBy =
      await this.createdByFromAuthContextService.buildCreatedBy(authContext);

    // Front-end can fill the source field
    if (
      createdBy &&
      (!payload.data.createdBy || !payload.data.createdBy?.name)
    ) {
      payload.data.createdBy = {
        ...createdBy,
        source: payload.data.createdBy?.source ?? createdBy.source,
      };
    }

    return payload;
  }
}
