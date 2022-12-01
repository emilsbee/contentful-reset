import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config()
import * as contentful from 'contentful-management';

const accessToken = process.env.ACCESS_TOKEN;
const spaceId = process.env.SPACE_ID;

const masterClient = contentful.createClient({
  accessToken,
}, {
  type: 'plain',
  defaults: {
    spaceId,
    environmentId: 'master',
  },
});

const developClient = contentful.createClient({
  accessToken,
}, {
  type: 'plain',
  defaults: {
    spaceId,
    environmentId: 'develop',
  },
});

const deleteEverything = async (client: contentful.PlainClientAPI) => {
  const entries = await client.entry.getMany({});

  for (const entry of entries.items) {
    await client.entry.unpublish({ entryId: entry.sys.id });
    await client.entry.delete({ entryId: entry.sys.id });
  }

  const assets = await client.asset.getMany({});
  
  for (const asset of assets.items) {
    await client.asset.unpublish({ assetId: asset.sys.id });
    await client.asset.delete({ assetId: asset.sys.id });
  }
  

  const contentTypes = await client.contentType.getMany({});

  for (const contentType of contentTypes.items) {
    await client.contentType.unpublish({ contentTypeId: contentType.sys.id });
    await client.contentType.delete({ contentTypeId: contentType.sys.id });
  }
};

const main = async () => {
  await deleteEverything(masterClient);
  await deleteEverything(developClient);
};

main();
