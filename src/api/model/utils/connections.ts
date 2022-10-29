import {
  GraphQLBoolean,
  GraphQLFieldConfigMap,
  GraphQLInt,
  GraphQLInterfaceType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from 'graphql';
import { GraphQLFieldConfigArgumentMap } from 'graphql/type/definition';
import { GraphRequestContext } from '../../../events/apollo';

export interface Connection<T> {
  getPageInfo: () => Promise<PageInfo>;
  getEdges: () => Promise<Edge<T>[]>;
  getTotal: () => Promise<number>;
}

export interface Edge<T> {
  node: T;
  cursor: Cursor;
}

export interface PageInfo {
  startCursor?: Cursor;
  endCursor?: Cursor;

  hasNextPage: boolean;
  hasPreviousPage: boolean;

  total?: number;
}

export type Cursor = string;

export const paginationFirstArgs: GraphQLFieldConfigArgumentMap = {
  first: {
    type: GraphQLInt,
  },
  after: {
    type: GraphQLString,
  },
};

export const paginationLastArgs: GraphQLFieldConfigArgumentMap = {
  last: {
    type: GraphQLInt,
  },
  before: {
    type: GraphQLString,
  },
};

export const paginationArgs = { ...paginationFirstArgs, ...paginationLastArgs };

export const PageInfoType = new GraphQLObjectType<PageInfo, GraphRequestContext>({
  name: 'PageInfo',
  description: 'Describes the current state of pagination',
  fields: {
    startCursor: {
      type: GraphQLString,
      description: 'The cursor used to retrieve this page, if any',
    },
    endCursor: {
      type: GraphQLString,
      description: 'The cursor to use to get the next page, if any',
    },
    hasNextPage: {
      type: new GraphQLNonNull(GraphQLBoolean),
      description: 'Whether or not there are any more pages after this one',
    },
    hasPreviousPage: {
      type: new GraphQLNonNull(GraphQLBoolean),
      description: 'Whether or not there are any more pages before this one',
    },
  },
});

export const buildEdgeType = <T>(nodeType: GraphQLObjectType<T, GraphRequestContext> | GraphQLInterfaceType) =>
  new GraphQLObjectType<Edge<T>, GraphRequestContext>({
    name: `${nodeType.name}Edge`,
    description: 'A single edge of a connection, containing the item and its cursor',
    fields: {
      node: {
        type: new GraphQLNonNull(nodeType),
        description: 'The item in the list',
      },
      cursor: {
        type: new GraphQLNonNull(GraphQLString),
        description: 'The cursor at this item, for use in pagination',
      },
    },
  });

interface ConnectionTypeOptions<T> {
  edgeType?: GraphQLObjectType<Edge<T>, GraphRequestContext>;
  nodeType?: GraphQLObjectType<T, GraphRequestContext> | GraphQLInterfaceType;
  includeTotal?: boolean;
  additionalFields?: GraphQLFieldConfigMap<T, GraphRequestContext>;
}

export const buildConnectionType = <T>({
  edgeType,
  nodeType,
  includeTotal,
  additionalFields,
}: ConnectionTypeOptions<T>) => {
  if (!edgeType && !nodeType) {
    throw new Error('Must provide edge type or node type');
  }

  const totalFields = includeTotal
    ? {
        total: {
          type: new GraphQLNonNull(GraphQLInt),
          description: 'The total number of items',
          resolve: (conn: Connection<T>) => conn.getTotal(),
        },
      }
    : undefined;

  const typeName = edgeType?.name || nodeType?.name;
  return new GraphQLObjectType<Connection<T>, GraphRequestContext>({
    name: `${typeName}Connection`,
    description: 'Contains a list of items of a particular type',
    fields: {
      pageInfo: {
        type: new GraphQLNonNull(PageInfoType),
        description: 'The page information',
        resolve: (conn) => conn.getPageInfo(),
      },

      edges: {
        type: new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(edgeType || buildEdgeType<T>(nodeType!)))),
        description: 'The list of edges',
        resolve: (conn) => conn.getEdges(),
      },

      ...totalFields,
      ...additionalFields,
    },
  });
};

export const emptyPageInfo = { hasNextPage: false, hasPreviousPage: false };

export const createEdgesFromArray = <T>(nodes: T[]): Edge<T>[] =>
  nodes.map((node, index) => ({
    node,
    cursor: index.toString(),
  }));

export const createConnectionFromArray = <T>(nodes: T[]): Connection<T> => ({
  getPageInfo: async () => emptyPageInfo,
  getEdges: async () => createEdgesFromArray(nodes),
  getTotal: async () => nodes.length,
});

export const createConnectionFromArrayResolver = <T>(
  resolveData: () => Promise<T[]>,
  resolveTotal: () => Promise<number>,
): Connection<T> => ({
  getPageInfo: async () => emptyPageInfo,
  getEdges: async () => createEdgesFromArray(await resolveData()),
  getTotal: resolveTotal,
});
