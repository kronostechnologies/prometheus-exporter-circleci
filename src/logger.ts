import winston from 'winston';
import appConfig from './config';

// tslint:disable-next-line:no-default-export
export default winston.createLogger({
    level: appConfig.log.level,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        // @ts-ignore
        winston.format[appConfig.log.format](),
    ),
    transports: [
        new winston.transports.Console({ level: appConfig.log.level }),
    ],
});
