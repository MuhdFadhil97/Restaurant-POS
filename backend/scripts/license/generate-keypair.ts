// Run once, by the vendor, not per client:
//   npm run license:keygen
//
// Writes an RSA keypair used to sign/verify license keys.
// - license-private-key.pem : keep this secret. It never ships to a client
//   deployment — only this script and issue-license.ts ever read it.
// - license-public-key.pem  : ship this to every client deployment as the
//   LICENSE_PUBLIC_KEY env var. It can verify a license but can't forge one.
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { generateKeyPairSync } from "crypto";
import path from "path";

const outDir = process.argv[2] ?? path.join(__dirname, "../../keys");
const privateKeyPath = path.join(outDir, "license-private-key.pem");
const publicKeyPath = path.join(outDir, "license-public-key.pem");

if (existsSync(privateKeyPath)) {
  console.error(`A keypair already exists at ${outDir}.`);
  console.error(
    "Refusing to overwrite it: replacing the keys invalidates every license already issued with the old ones."
  );
  console.error("Delete the existing files yourself first if you really intend to rotate keys.");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
writeFileSync(publicKeyPath, publicKey);

console.log(`Keypair written to ${outDir}\n`);
console.log(`  ${privateKeyPath}`);
console.log("    KEEP THIS SECRET. Back it up somewhere safe outside the repo. Never send it to a client.\n");
console.log(`  ${publicKeyPath}`);
console.log("    Ship this to every client deployment as the LICENSE_PUBLIC_KEY env var.");
