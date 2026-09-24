// Stand-in for a LAN thermal printer, for testing printing without hardware.
// Listens on raw TCP (like a real printer's port 9100), saves each job's bytes
// to fake-printer-output/, and prints a readable preview to the console.
//
//   npx tsx scripts/fake-printer.ts            # port 9100
//   npx tsx scripts/fake-printer.ts 9101 9102  # several "printers" at once
import net from "net";
import fs from "fs";
import path from "path";

const ports = process.argv.slice(2).map(Number).filter(Boolean);
if (ports.length === 0) ports.push(9100);

const outDir = path.join(__dirname, "..", "fake-printer-output");
fs.mkdirSync(outDir, { recursive: true });

const CUT = Buffer.from([0x1d, 0x56]);
const DRAWER = Buffer.from([0x1b, 0x70]);

// Strips ESC/POS commands well enough to eyeball the text layout.
function preview(buf: Buffer): string {
  let out = "";
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b === 0x1b || b === 0x1d) {
      const cmd = buf[i + 1];
      // ESC p m t1 t2 (drawer) takes 3 args; GS V m [n] (cut); most others take 1.
      if (b === 0x1b && cmd === 0x70) i += 4;
      else if (b === 0x1b && cmd === 0x40) i += 1;
      else i += 2;
      continue;
    }
    if (b === 0x0a) out += "\n";
    else if (b >= 0x20 && b < 0x7f) out += String.fromCharCode(b);
  }
  return out;
}

for (const port of ports) {
  net
    .createServer((socket) => {
      const chunks: Buffer[] = [];
      socket.on("data", (c) => chunks.push(c));
      socket.on("end", () => {
        const buf = Buffer.concat(chunks);
        const file = path.join(outDir, `${port}-${Date.now()}.bin`);
        fs.writeFileSync(file, buf);
        const flags = [buf.includes(CUT) && "CUT", buf.includes(DRAWER) && "DRAWER-KICK"].filter(Boolean).join(" ");
        console.log(`\n=== :${port} received ${buf.length} bytes ${flags ? `[${flags}]` : ""} -> ${path.basename(file)}`);
        console.log(preview(buf));
      });
    })
    .listen(port, () => console.log(`Fake printer listening on :${port}`));
}
