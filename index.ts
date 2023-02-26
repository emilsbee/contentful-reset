import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config()
import * as contentful from 'contentful-management';

const accessToken = process.env.ACCESS_TOKEN;
const spaceId = process.env.SPACE_ID;
const masterEnvironmentId = 'master';
const developEnvironmentId = 'develop';

const masterClient = contentful.createClient({
  accessToken,
}, {
  type: 'plain',
  defaults: {
    spaceId,
    environmentId: masterEnvironmentId,
  },
});

const developClient = contentful.createClient({
  accessToken,
}, {
  type: 'plain',
  defaults: {
    spaceId,
    environmentId: developEnvironmentId,
  },
});

/**
 * Checks whether an environment with id "develop" exists in Contentful.
 */
const developExists = async (client: contentful.PlainClientAPI): Promise<boolean> => {
  try {
    await client.environment.get({
      spaceId,
      environmentId: developEnvironmentId,
    });
  
    return true;
  } catch {
    return false;
  }
};

const deleteEverything = async (client: contentful.PlainClientAPI) => {
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
  const appsRes = await fetch(`https://api.contentful.com/spaces/${spaceId}/environments/${masterEnvironmentId}/app_installations`, {
    headers: {
      'authorization': `Bearer ${accessToken}`,
    }
  });
  const apps = await appsRes.json();

  if (apps?.includes?.ResolvedAppDefinition) {
    for (const app of apps?.includes?.ResolvedAppDefinition) {
      const appId = app.sys.id;

      await fetch(`https://api.contentful.com/spaces/${spaceId}/environments/${masterEnvironmentId}/app_installations/${appId}`, {
        method: 'DELETE',
        headers: {
          'authorization': `Bearer ${accessToken}`,
        }
      });
    }
  }
};

const main = async () => {
  await deleteEverything(masterClient);

  const isDevelop = await developExists(masterClient);

  if (isDevelop) {
    await developClient.environment.delete({ spaceId, environmentId: developEnvironmentId });
  }
};

main();
