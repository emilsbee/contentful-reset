#!/usr/bin/env node
// The above is necessary to run this with npx: https://www.sheshbabu.com/posts/publishing-npx-command-to-npm/
import * as dotenv from 'dotenv'; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import 
dotenv.config();
import * as contentful from 'contentful-management';
import commandLineArgs, { OptionDefinition } from 'command-line-args';
import fetch from 'node-fetch';

const MASTER_ENVIRONMENT_ID = 'master';

const optionDefinitions: OptionDefinition[] = [
  { name: 'managementToken', alias: 'm', type: String },
  { name: 'spaceId', alias: 's', type: String },
];

const options = commandLineArgs(optionDefinitions);

const getCredentials = (): { spaceId: string; accessToken: string; } => {
  if (process.env.MANAGEMENT_TOKEN && process.env.SPACE_ID) {
    return {
      spaceId: process.env.SPACE_ID,
      accessToken: process.env.MANAGEMENT_TOKEN,
    }
  }

  if (
    options['spaceId'] && typeof options['spaceId'] === 'string'
    && options['managementToken'] && typeof options['managementToken'] === 'string'
  ) {
    return {
      spaceId: options['spaceId'],
      accessToken: options['managementToken']
    }
  }

  throw new Error('No credentials provided!')
};

const deleteEverything = async (client: contentful.PlainClientAPI, accessToken: string, spaceId: string) => {
  // Delete non master environments (thereby deleting entries, assets, content types and apps)
  const environments = await client.environment.getMany({});
  for (const environment of environments.items) {
    // Only delete the environment if it's not master and not aliased because in both cases
    // it would throw.
    if (environment.sys.id !== 'master' && (!environment.sys.aliases?.length || environment.sys.aliases?.length === 0)) {
      await client.environment.delete({ environmentId: environment.sys.id });
    }    
  }

  /**
   * Delete everything from the master environment
   */

  // Delete entries
  const entries = await client.entry.getMany({});
  for (const entry of entries.items) {
    await client.entry.unpublish({ entryId: entry.sys.id });
    await client.entry.delete({ entryId: entry.sys.id });
  }

  // Delete assets
  const assets = await client.asset.getMany({});
  for (const asset of assets.items) {
    await client.asset.unpublish({ assetId: asset.sys.id });
    await client.asset.delete({ assetId: asset.sys.id });
  }
  
  // Delete content types
  const contentTypes = await client.contentType.getMany({});
  for (const contentType of contentTypes.items) {
    await client.contentType.unpublish({ contentTypeId: contentType.sys.id });
    await client.contentType.delete({ contentTypeId: contentType.sys.id });
  }

  // Delete apps
  const appsRes = await fetch(`https://api.contentful.com/spaces/${spaceId}/environments/${MASTER_ENVIRONMENT_ID}/app_installations`, {
    headers: {
      'authorization': `Bearer ${accessToken}`,
    }
  });
  const apps = await appsRes.json() as any;

  if (apps?.includes?.ResolvedAppDefinition) {
    for (const app of apps?.includes?.ResolvedAppDefinition) {
      const appId = app.sys.id;

      await fetch(`https://api.contentful.com/spaces/${spaceId}/environments/${MASTER_ENVIRONMENT_ID}/app_installations/${appId}`, {
        method: 'DELETE',
        headers: {
          'authorization': `Bearer ${accessToken}`,
        }
      });
    }
  }

  // Delete preview environments
  const previewEnvironmentRes = await fetch(`https://api.contentful.com/spaces/${spaceId}/preview_environments`, {
    headers: {
      'authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/vnd.contentful.management.v1+json'
    }
  });

  const previewEnvironments = await previewEnvironmentRes.json() as any;

  for (const previewEnvironment of previewEnvironments.items) {
    const previewEnvironmentId = previewEnvironment.sys.id;

    await fetch(`https://api.contentful.com/spaces/${spaceId}/preview_environments/${previewEnvironmentId}`, {
      method: 'DELETE',
      headers: {
        'authorization': `Bearer ${accessToken}`,
      }
    })
  }

  // Delete locales and set the default to English (en)
  const locales = await client.locale.getMany({});
  for (const locale of locales.items) {
    if (locale.default) {
      // @ts-ignore
      await client.locale.update({
        localeId: locale.sys.id,
      }, {
        code: 'en',
        name: 'English',
        fallbackCode: null,
        contentDeliveryApi: true,
        contentManagementApi: true,
        optional: false,
        sys: locale.sys,
      });
    } else {
      await client.locale.delete({ localeId: locale.sys.id });
    }
  }
};

const main = async () => {
  const { accessToken, spaceId } = getCredentials();

  const masterClient = contentful.createClient({
    accessToken,
  }, {
    type: 'plain',
    defaults: {
      spaceId,
      environmentId: MASTER_ENVIRONMENT_ID,
    },
  });

  console.log('Started deleting everything.');
  
  await deleteEverything(masterClient, accessToken, spaceId);

  console.log('Everything succesfully deleted.');
};

main();
