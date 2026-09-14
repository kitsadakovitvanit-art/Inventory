import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";

export default function BarcodeScanner({ onDetected }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [status, setStatus] = useState("starting");
  const [error, setError] = useState(null);
  const [lastCode, setLastCode] = useState(null);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    let cancelled = false;

    reader
      .listVideoInputDevices()
      .then((devices) => {
        if (cancelled) return;
        if (!devices.length) {
          setStatus("no-camera");
          return;
        }
        const preferred = devices.find((d) => /back|rear|environment/i.test(d.label)) || devices[devices.length - 1];
        setStatus("scanning");
        reader.decodeFromVideoDevice(preferred.deviceId, videoRef.current, (result, err) => {
          if (result) {
            setLastCode(result.getText());
            onDetected(result.getText());
          }
          if (err && !(err instanceof NotFoundException)) {
            // Non-fatal per-frame errors are expected while searching for a code.
          }
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus("error");
        setError(err?.message || "Could not access the camera.");
      });

    return () => {
      cancelled = true;
      try {
        reader.reset();
      } catch {
        // no-op: reader may already be stopped
      }
    };
  }, [onDetected]);

  return (
    <div>
      <div className="scanner-wrap">
        <video ref={videoRef} muted playsInline />
        {status === "scanning" && <div className="scanner-frame" />}
      </div>
      {status === "starting" && <p className="scanner-status">Requesting camera access…</p>}
      {status === "scanning" && <p className="scanner-status">Point the camera at a barcode.</p>}
      {status === "no-camera" && <p className="scanner-status">No camera was found on this device.</p>}
      {status === "error" && (
        <p className="scanner-status">
          {error || "Camera access was denied."} You can also type a barcode manually below.
        </p>
      )}
      {lastCode && (
        <div className="scanner-result">
          Last scanned: {lastCode}
        </div>
      )}
    </div>
  );
}
