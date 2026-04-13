// Re-sign the entire .app bundle with a single consistent ad-hoc signature.
// macOS Tahoe (26+) rejects apps where the main binary and frameworks
// have mismatched Team IDs, which happens with electron-builder's default
// ad-hoc signing that signs components separately.
const { execSync } = require("child_process");
const path = require("path");

exports.default = async function (context) {
  if (context.electronPlatformName !== "darwin") return;

  const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  console.log(`  • re-signing app bundle (deep)  path=${appPath}`);
  execSync(`codesign --force --deep -s - "${appPath}"`, { stdio: "inherit" });
};
