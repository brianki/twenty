import { YogaDriverConfig } from '@graphql-yoga/nestjs';
import GraphQLJSON from 'graphql-type-json';

import { NodeEnvironment } from 'src/engine/core-modules/environment/interfaces/node-environment.interface';

import { useCachedMetadata } from 'src/engine/api/graphql/graphql-config/hooks/use-cached-metadata';
import { useThrottler } from 'src/engine/api/graphql/graphql-config/hooks/use-throttler';
import { CacheStorageService } from 'src/engine/core-modules/cache-storage/services/cache-storage.service';
import { EnvironmentService } from 'src/engine/core-modules/environment/environment.service';
import { ExceptionHandlerService } from 'src/engine/core-modules/exception-handler/exception-handler.service';
import { useGraphQLErrorHandlerHook } from 'src/engine/core-modules/graphql/hooks/use-graphql-error-handler.hook';
import { DataloaderService } from 'src/engine/dataloaders/dataloader.service';
import { renderApolloPlayground } from 'src/engine/utils/render-apollo-playground.util';

export const subscriptionModuleFactory = async (
  environmentService: EnvironmentService,
  exceptionHandlerService: ExceptionHandlerService,
  dataloaderService: DataloaderService,
  cacheStorageService: CacheStorageService,
): Promise<YogaDriverConfig> => {
  const config: YogaDriverConfig = {
    autoSchemaFile: true,
    subscriptions: {
      'graphql-ws': true,
    },
    renderGraphiQL() {
      return renderApolloPlayground({ path: 'subscription' });
    },
    resolvers: { JSON: GraphQLJSON },
    plugins: [
      useThrottler({
        ttl: environmentService.get('API_RATE_LIMITING_TTL'),
        limit: environmentService.get('API_RATE_LIMITING_LIMIT'),
        identifyFn: (context) => {
          return context.req.user?.id ?? context.req.ip ?? 'anonymous';
        },
      }),
      useGraphQLErrorHandlerHook({
        exceptionHandlerService,
      }),
      useCachedMetadata({
        cacheGetter: cacheStorageService.get.bind(cacheStorageService),
        cacheSetter: cacheStorageService.set.bind(cacheStorageService),
        operationsToCache: ['ObjectMetadataItems'],
      }),
    ],
    path: '/subscription',
    context: () => ({
      loaders: dataloaderService.createLoaders(),
    }),
  };

  if (environmentService.get('NODE_ENV') === NodeEnvironment.development) {
    config.renderGraphiQL = () => {
      return renderApolloPlayground({ path: 'playground' });
    };
  }

  return config;
};
