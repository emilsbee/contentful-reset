## Contentful reset

### Usage
This is meant to be used with npx. To use it run the following `npx contentful-reset -m {MANAGEMENT_TOKEN} -s {SPACE_ID}` adding your respective Contentful management token and space id.

### Publish to NPM
First increment the version in `package.json` then make a build with `npm run build` and finally publish with `npm publish`.