// Drivers for a receipt printer plugged straight into this terminal (USB or
// Bluetooth-as-serial), as opposed to a network printer the backend or a
// print bridge reaches over TCP. Both WebSerial and WebUSB are secure-context
// APIs: they simply don't exist on a page loaded over plain http from a LAN
// IP (e.g. http://192.168.1.20:5173) — only on https:// or http://localhost.
// This project already hit that exact trap once with crypto.randomUUID()
// (see PosPage.tsx); every entry point here feature-detects instead of
// assuming the API exists, so an unsupported browser/origin degrades to a
// clear message instead of a crash.

export type LocalPrinterTransport = "serial" | "usb";

export interface PrinterDriver {
  transport: LocalPrinterTransport;
  label: string;
  print(bytes: Uint8Array): Promise<void>;
  disconnect(): Promise<void>;
}

export function isWebSerialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

export function isWebUsbSupported(): boolean {
  return typeof navigator !== "undefined" && "usb" in navigator;
}

export function isLocalPrintingSupported(): boolean {
  return isWebSerialSupported() || isWebUsbSupported();
}

// Common ESC/POS thermal printer USB vendor IDs, to bias the browser's device
// picker toward printers instead of every USB device on the system. A model
// from a vendor not listed here simply won't show up in the USB picker —
// its WebSerial (COM/virtual serial port) path usually still works, since
// most of these printers also expose a serial interface.
const KNOWN_PRINTER_VENDOR_IDS = [
  0x04b8, // Epson
  0x0519, // Star Micronics
  0x1504, // Bixolon
  0x1d90, // Citizen Systems
  0x0483, // STMicroelectronics (common in generic/OEM thermal printers)
  0x1a86, // QinHeng/WCH (common USB-serial chip in cheap thermal printers)
  0x0dd4, // Custom Engineering
  0x154f, // SNBC
];

class SerialPrinterDriver implements PrinterDriver {
  transport: LocalPrinterTransport = "serial";
  label: string;

  constructor(
    private port: SerialPort,
    private writer: WritableStreamDefaultWriter<Uint8Array>
  ) {
    const info = port.getInfo();
    this.label = info.usbProductId
      ? `Serial (VID ${info.usbVendorId?.toString(16)} PID ${info.usbProductId.toString(16)})`
      : "Serial port";
  }

  async print(bytes: Uint8Array): Promise<void> {
    await this.writer.write(bytes);
  }

  async disconnect(): Promise<void> {
    try {
      this.writer.releaseLock();
      await this.port.close();
    } catch {
      // Already closed/disconnected — nothing more to do.
    }
  }
}

class UsbPrinterDriver implements PrinterDriver {
  transport: LocalPrinterTransport = "usb";
  label: string;

  constructor(
    private device: USBDevice,
    private endpointNumber: number
  ) {
    this.label = device.productName || `USB device ${device.vendorId.toString(16)}:${device.productId.toString(16)}`;
  }

  async print(bytes: Uint8Array): Promise<void> {
    const result = await this.device.transferOut(this.endpointNumber, bytes);
    if (result.status !== "ok") {
      throw new Error(`USB transfer to printer failed (${result.status})`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.device.close();
    } catch {
      // Already closed/unplugged.
    }
  }
}

// Must be called from a user gesture (a click handler) — browsers refuse to
// show the port/device picker otherwise. Baud rate is a guess: it's the most
// common default among USB-to-serial thermal printers, but not universal —
// if printing comes out as garbage characters, this printer likely uses a
// different rate and needs a code change here (there's no way to ask the
// printer, and the OS doesn't expose it).
export async function pairSerialPrinter(baudRate = 9600): Promise<PrinterDriver> {
  if (!isWebSerialSupported()) {
    throw new Error("This browser/connection doesn't support serial printers (needs Chrome/Edge over HTTPS or localhost).");
  }
  const port = await navigator.serial!.requestPort();
  await port.open({ baudRate });
  if (!port.writable) {
    throw new Error("Serial port opened but isn't writable");
  }
  const writer = port.writable.getWriter();
  return new SerialPrinterDriver(port, writer);
}

// Re-attaches to a serial port the user already granted permission for in an
// earlier visit, without prompting again. Returns null if there's nothing to
// reconnect to (nothing paired yet, or the OS doesn't currently see it).
export async function reconnectSerialPrinter(baudRate = 9600): Promise<PrinterDriver | null> {
  if (!isWebSerialSupported()) return null;
  const ports = await navigator.serial!.getPorts();
  const port = ports[0];
  if (!port) return null;
  await port.open({ baudRate });
  if (!port.writable) return null;
  const writer = port.writable.getWriter();
  return new SerialPrinterDriver(port, writer);
}

async function openUsbDevice(device: USBDevice): Promise<PrinterDriver> {
  await device.open();
  if (device.configuration === null) {
    await device.selectConfiguration(1);
  }
  // Assume the printer's data interface is the first one — true for the
  // overwhelming majority of USB thermal printers, which expose exactly one
  // interface. A multi-function device may need a different index here.
  const iface = device.configuration!.interfaces[0];
  await device.claimInterface(iface.interfaceNumber);
  const endpoint = iface.alternates[0].endpoints.find((e) => e.direction === "out");
  if (!endpoint) {
    throw new Error("This USB device has no outgoing endpoint — it doesn't look like a printer");
  }
  return new UsbPrinterDriver(device, endpoint.endpointNumber);
}

export async function pairUsbPrinter(): Promise<PrinterDriver> {
  if (!isWebUsbSupported()) {
    throw new Error("This browser/connection doesn't support USB printers (needs Chrome/Edge over HTTPS or localhost).");
  }
  const device = await navigator.usb!.requestDevice({
    filters: KNOWN_PRINTER_VENDOR_IDS.map((vendorId) => ({ vendorId })),
  });
  return openUsbDevice(device);
}

export async function reconnectUsbPrinter(): Promise<PrinterDriver | null> {
  if (!isWebUsbSupported()) return null;
  const devices = await navigator.usb!.getDevices();
  const device = devices[0];
  if (!device) return null;
  return openUsbDevice(device);
}
