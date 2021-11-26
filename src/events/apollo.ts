import { ApolloServer, Config, CreateHandlerOptions } from 'apollo-server-lambda';
import {
  ApolloServerPlugin,
  GraphQLRequestContext,
  GraphQLRequestContextDidEncounterErrors,
  GraphQLRequestContextDidResolveOperation,
  GraphQLRequestContextExecutionDidStart,
  GraphQLRequestContextParsingDidStart,
  GraphQLRequestContextResponseForOperation,
  GraphQLRequestContextValidationDidStart,
  GraphQLRequestContextWillSendResponse,
  GraphQLRequestListener,
  GraphQLResponse,
  GraphQLServiceContext,
} from 'apollo-server-plugin-base';
import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { Context as LambdaContext } from 'aws-lambda/handler';
import { GraphQLError } from 'graphql';

import { schema } from '../api';
import { isProduction } from '../config/common';
import { toJson } from '../utils/logger';
import { createEventDebugLogger } from './logger';
import { ArgumentError } from '../utils/errors';

const debug = createEventDebugLogger('apollo');
const trace = createEventDebugLogger('apollo:trace');

export interface GraphRequestContext {}

const createLoggingPlugin = (): ApolloServerPlugin<GraphRequestContext> => ({
  serverWillStart: async (service: GraphQLServiceContext): Promise<void> => {
    trace`serverWillStart: ${toJson(service.schema)}`;
  },

  requestDidStart: async (requestContext: GraphQLRequestContext): Promise<GraphQLRequestListener> => {
    trace`requestDidStart: ${toJson(requestContext.context)}`;
    return {
      parsingDidStart: async (requestContext: GraphQLRequestContextParsingDidStart<GraphRequestContext>) => {
        trace`parsingDidStart: ${toJson(requestContext.source)}`;
      },

      validationDidStart: async (requestContext: GraphQLRequestContextValidationDidStart<GraphRequestContext>) => {
        trace`validationDidStart: ${toJson(requestContext.source)}`;
      },

      executionDidStart: async (requestContext: GraphQLRequestContextExecutionDidStart<GraphRequestContext>) => {
        trace`executionDidStart ${requestContext.operationName}: ${toJson(requestContext.document)}`;
      },

      didEncounterErrors: async (requestContext: GraphQLRequestContextDidEncounterErrors<GraphRequestContext>) => {
        debug`didEncounterErrors: ${requestContext.errors}`;
      },

      didResolveOperation: async (requestContext: GraphQLRequestContextDidResolveOperation<GraphRequestContext>) => {
        trace`didResolveOperation ${requestContext.operationName}: ${toJson(requestContext.document)}`;
      },

      responseForOperation: async (
        requestContext: GraphQLRequestContextResponseForOperation<GraphRequestContext>,
      ): Promise<GraphQLResponse | null> => {
        trace`responseForOperation: ${requestContext.operationName}`;
        return null;
      },

      willSendResponse: async (requestContext: GraphQLRequestContextWillSendResponse<GraphRequestContext>) => {
        trace`willSendResponse: ${toJson(requestContext.response)}`;
      },
    };
  },
});

const buildApolloServerConfig = (): Config => ({
  schema,
  debug: !isProduction(),
  context: async ({ event, context }): Promise<GraphRequestContext> => {
    debug`event: ${toJson(event)}`;
    trace`context: ${toJson(context)}`;

    const { body, headers, requestContext } = event;

    trace`body: ${toJson(body)}`;
    trace`headers: ${toJson(headers)}`;
    trace`requestContext: ${toJson(requestContext)}`;

    return {};
  },

  formatError: (err: GraphQLError) => {
    if (err.extensions?.code === 'INTERNAL_SERVER_ERROR') {
      console.error('Error:', err.originalError);

      if (isProduction()) {
        return new Error('Internal server error');
      }

      return err;
    }

    debug`Error: ${err}\n${err.originalError?.stack}`;
    return err;
  },

  plugins: [createLoggingPlugin()],
});

const server = new ApolloServer(buildApolloServerConfig());

const buildApolloHandlerOptions = (): CreateHandlerOptions => ({});

const apolloLambdaHandler: APIGatewayProxyHandler = server.createHandler(buildApolloHandlerOptions());

// noinspection JSUnusedGlobalSymbols
export const handler = async (event: APIGatewayProxyEvent, context: LambdaContext): Promise<APIGatewayProxyResult> => {
  try {
    const result = await apolloLambdaHandler(event, context, () => {});
    if (!result) {
      console.error('No result and no error executing Apollo lambda');
      throw new ArgumentError('No result');
    }

    debug`Apollo lambda result: ${toJson(result)}`;
    return result;
  } catch (error) {
    console.error('Error while executing Apollo lambda', error);
    throw error;
  }
};
