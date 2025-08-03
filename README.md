# JoplinView
## Read-only display of notes synced to S3 via Jopin
Developed in Replit, adjusted for hosting in Netlify

## Setup Jopin (using Backblaze)
- create a new Bucket in Backblaze
- Generate an api key
- In the Joplin app, go to Synchronization configuration and fill in the settings

## Notes for getting Replit hosted in Netlify
### Code changes
- Create a `/netlify/functions/api.ts` file
  - see the one in this repo for example
- Create `/netlify.toml` file
   - see the one in this repo for example
- Modify `routes.ts` to export the `registerRoutes` function
### Replit
- Create a repository in github and sync the project
### Netlify
- Create an app from the github repository
- Set the publish route to `/dist/public`
- Make sure the deployment succeeds and the site is accessible
- Go through the Domain Management to hook up an external domain
### Cloudflare
- create a new dns record for that domain/subdomain
