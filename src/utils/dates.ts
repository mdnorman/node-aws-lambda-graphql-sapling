import moment from 'moment';

export type IsoDateTime = string;

export const isoDateTimeToDate = (isoDateTime: IsoDateTime): Date => moment(isoDateTime).toDate();

export const dateToIsoDateTime = (date: Date): IsoDateTime => date.toISOString();

export const now = (): Date => new Date();
