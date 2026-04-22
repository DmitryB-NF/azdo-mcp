import { WebApi, getPersonalAccessTokenHandler } from 'azure-devops-node-api';
import config from './config';


let client: WebApi | undefined;

export function getClient(): WebApi {
  client ??= new WebApi(config.orgUrl, getPersonalAccessTokenHandler(config.pat));
  return client;
}
