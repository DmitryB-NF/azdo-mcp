import { getClient } from './client';
import config from './config';
import pkg from '../package.json' with { type: 'json' };


export const tokenProvider = async () => config.pat;
export const clientProvider = async () => getClient();
export const userAgentProvider = () => `${pkg.name}/${pkg.version}`;
