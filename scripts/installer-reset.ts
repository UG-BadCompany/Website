import { resetInstallation } from '../lib/server/installation';

const isProduction = process.env.NODE_ENV === 'production' || process.env.CONTEXT === 'production';
const confirmed = process.env.CONFIRM_RESET_INSTALLER === 'reset-installer';

if (isProduction && !confirmed) {
  console.error('Refusing to reset installer in production without CONFIRM_RESET_INSTALLER=reset-installer.');
  process.exit(1);
}

const status = await resetInstallation();
console.log('Installer reset complete:', status);
