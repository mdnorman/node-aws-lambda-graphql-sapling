import { GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { dateToIsoDateTime, IsoDateTime, isoDateTimeToDate } from '../../utils/dates';

const isoDateTimeConfig: GraphQLScalarTypeConfig<Date, IsoDateTime> = {
  name: 'ISODateTime',
  specifiedByUrl: 'https://en.wikipedia.org/wiki/ISO_8601',
  serialize: (value: Date | string): IsoDateTime => (typeof value === 'string' ? value : dateToIsoDateTime(value)),
  parseValue: (value: IsoDateTime): Date => isoDateTimeToDate(value),
};
export const IsoDateTimeType = new GraphQLScalarType(isoDateTimeConfig);
