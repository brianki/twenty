import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';

import fs from 'fs/promises';

import { DataSource, QueryFailedError } from 'typeorm';

import { WorkspaceSyncContext } from 'src/engine/workspace-manager/workspace-sync-metadata/interfaces/workspace-sync-context.interface';

import { FeatureFlagService } from 'src/engine/core-modules/feature-flag/services/feature-flag.service';
import { WorkspaceMetadataVersionService } from 'src/engine/metadata-modules/workspace-metadata-version/services/workspace-metadata-version.service';
import { WorkspaceMigrationEntity } from 'src/engine/metadata-modules/workspace-migration/workspace-migration.entity';
import { WorkspaceMigrationRunnerService } from 'src/engine/workspace-manager/workspace-migration-runner/workspace-migration-runner.service';
import { WorkspaceSyncFieldMetadataRelationService } from 'src/engine/workspace-manager/workspace-sync-metadata/services/workspace-sync-field-metadata-relation.service';
import { WorkspaceSyncFieldMetadataService } from 'src/engine/workspace-manager/workspace-sync-metadata/services/workspace-sync-field-metadata.service';
import { WorkspaceSyncIndexMetadataService } from 'src/engine/workspace-manager/workspace-sync-metadata/services/workspace-sync-index-metadata.service';
import { WorkspaceSyncObjectMetadataIdentifiersService } from 'src/engine/workspace-manager/workspace-sync-metadata/services/workspace-sync-object-metadata-identifiers.service';
import { WorkspaceSyncObjectMetadataService } from 'src/engine/workspace-manager/workspace-sync-metadata/services/workspace-sync-object-metadata.service';
import { WorkspaceSyncRelationMetadataService } from 'src/engine/workspace-manager/workspace-sync-metadata/services/workspace-sync-relation-metadata.service';
import { WorkspaceSyncStorage } from 'src/engine/workspace-manager/workspace-sync-metadata/storage/workspace-sync.storage';

interface SynchronizeOptions {
  applyChanges?: boolean;
}

@Injectable()
export class WorkspaceSyncMetadataService {
  private readonly logger = new Logger(WorkspaceSyncMetadataService.name);

  constructor(
    @InjectDataSource('metadata')
    private readonly metadataDataSource: DataSource,
    private readonly workspaceMigrationRunnerService: WorkspaceMigrationRunnerService,
    private readonly workspaceSyncObjectMetadataService: WorkspaceSyncObjectMetadataService,
    private readonly workspaceSyncRelationMetadataService: WorkspaceSyncRelationMetadataService,
    private readonly workspaceSyncFieldMetadataService: WorkspaceSyncFieldMetadataService,
    private readonly workspaceSyncFieldMetadataRelationService: WorkspaceSyncFieldMetadataRelationService,
    private readonly workspaceSyncIndexMetadataService: WorkspaceSyncIndexMetadataService,
    private readonly workspaceSyncObjectMetadataIdentifiersService: WorkspaceSyncObjectMetadataIdentifiersService,
    private readonly workspaceMetadataVersionService: WorkspaceMetadataVersionService,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  /**
   *
   * Sync all standard objects and fields metadata for a given workspace and data source
   * This will update the metadata if it has changed and generate migrations based on the diff.
   *
   * @param context
   * @param options
   */
  public async synchronize(
    context: WorkspaceSyncContext,
    options: SynchronizeOptions = { applyChanges: true },
  ): Promise<{
    workspaceMigrations: WorkspaceMigrationEntity[];
    storage: WorkspaceSyncStorage;
  }> {
    let workspaceMigrations: WorkspaceMigrationEntity[] = [];
    const storage = new WorkspaceSyncStorage();
    const queryRunner = this.metadataDataSource.createQueryRunner();

    this.logger.log('Syncing standard objects and fields metadata');

    await queryRunner.connect();
    await queryRunner.startTransaction();

    const manager = queryRunner.manager;

    try {
      // const isNewRelationEnabled =
      //   await this.featureFlagService.isFeatureEnabled(
      //     FeatureFlagKey.IsNewRelationEnabled,
      //     context.workspaceId,
      //   );

      const workspaceMigrationRepository = manager.getRepository(
        WorkspaceMigrationEntity,
      );

      this.logger.log('Syncing standard objects and fields metadata');

      // 1 - Sync standard objects

      const workspaceObjectMigrationsStart = performance.now();
      const workspaceObjectMigrations =
        await this.workspaceSyncObjectMetadataService.synchronize(
          context,
          manager,
          storage,
        );

      const workspaceObjectMigrationsEnd = performance.now();

      this.logger.log(
        `Workspace object migrations took ${workspaceObjectMigrationsEnd - workspaceObjectMigrationsStart}ms`,
      );

      // 2 - Sync standard fields on standard and custom objects
      const workspaceFieldMigrationsStart = performance.now();
      const workspaceFieldMigrations =
        await this.workspaceSyncFieldMetadataService.synchronize(
          context,
          manager,
          storage,
        );

      const workspaceFieldMigrationsEnd = performance.now();

      this.logger.log(
        `Workspace field migrations took ${workspaceFieldMigrationsEnd - workspaceFieldMigrationsStart}ms`,
      );

      // 3 - Sync standard relations on standard and custom objects
      const workspaceRelationMigrationsStart = performance.now();

      let workspaceRelationMigrations: Partial<WorkspaceMigrationEntity>[] = [];

      // if (true) {
      workspaceRelationMigrations =
        await this.workspaceSyncFieldMetadataRelationService.synchronize(
          context,
          manager,
          storage,
        );
      // } else {
      //   workspaceRelationMigrations =
      //     await this.workspaceSyncRelationMetadataService.synchronize(
      //       context,
      //       manager,
      //       storage,
      //     );
      // }

      const workspaceRelationMigrationsEnd = performance.now();

      this.logger.log(
        `Workspace relation migrations took ${workspaceRelationMigrationsEnd - workspaceRelationMigrationsStart}ms`,
      );

      // 4 - Sync standard indexes on standard objects
      const workspaceIndexMigrationsStart = performance.now();
      const workspaceIndexMigrations =
        await this.workspaceSyncIndexMetadataService.synchronize(
          context,
          manager,
          storage,
        );

      const workspaceIndexMigrationsEnd = performance.now();

      this.logger.log(
        `Workspace index migrations took ${workspaceIndexMigrationsEnd - workspaceIndexMigrationsStart}ms`,
      );

      // 5 - Sync standard object metadata identifiers, does not need to return nor apply migrations
      const workspaceObjectMetadataIdentifiersStart = performance.now();

      await this.workspaceSyncObjectMetadataIdentifiersService.synchronize(
        context,
        manager,
        storage,
      );

      const workspaceObjectMetadataIdentifiersEnd = performance.now();

      this.logger.log(
        `Workspace object metadata identifiers took ${workspaceObjectMetadataIdentifiersEnd - workspaceObjectMetadataIdentifiersStart}ms`,
      );

      const workspaceMigrationsSaveStart = performance.now();

      // Save workspace migrations into the database
      workspaceMigrations = await workspaceMigrationRepository.save([
        ...workspaceObjectMigrations,
        ...workspaceFieldMigrations,
        ...workspaceRelationMigrations,
        ...workspaceIndexMigrations,
      ]);

      await fs.writeFile(
        'workspace-migrations.json',
        JSON.stringify(workspaceMigrations, null, 2),
      );

      const workspaceMigrationsSaveEnd = performance.now();

      this.logger.log(
        `Workspace migrations save took ${workspaceMigrationsSaveEnd - workspaceMigrationsSaveStart}ms`,
      );

      // If we're running a dry run, rollback the transaction and do not execute migrations
      if (!options.applyChanges) {
        this.logger.log('Running in dry run mode, rolling back transaction');

        await queryRunner.rollbackTransaction();

        await queryRunner.release();

        return {
          workspaceMigrations,
          storage,
        };
      }

      await queryRunner.commitTransaction();

      // Execute migrations
      this.logger.log('Executing pending migrations');
      const executeMigrationsStart = performance.now();

      await this.workspaceMigrationRunnerService.executeMigrationFromPendingMigrations(
        context.workspaceId,
      );
      const executeMigrationsEnd = performance.now();

      this.logger.log(
        `Execute migrations took ${executeMigrationsEnd - executeMigrationsStart}ms`,
      );
    } catch (error) {
      this.logger.error('Sync of standard objects failed with:', error);

      if (error instanceof QueryFailedError && (error as any).detail) {
        this.logger.error((error as any).detail);
      }
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
      await this.workspaceMetadataVersionService.incrementMetadataVersion(
        context.workspaceId,
      );
    }

    return {
      workspaceMigrations,
      storage,
    };
  }
}
