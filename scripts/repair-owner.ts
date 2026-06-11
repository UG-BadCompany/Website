import { repairOwnerAccess } from '../lib/server/installation';

const ownerEmailArg = process.argv.find((arg) => arg.startsWith('--owner-email='));
const ownerEmail = ownerEmailArg?.slice('--owner-email='.length) || process.env.OWNER_EMAIL;

repairOwnerAccess({ ownerEmail })
  .then((summary) => {
    console.log(JSON.stringify(summary, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
